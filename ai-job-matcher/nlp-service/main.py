import re
import os
import io
import time
import spacy
import json
from spacy.matcher import PhraseMatcher
from fastapi import FastAPI, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from skillNer.skill_extractor_class import SkillExtractor
import pdfplumber
from google import genai as genai_new
from dotenv import load_dotenv

load_dotenv()

try:
    from skillNer.general_params import SKILL_DB
except ImportError:
    from skillNer.utils import load_skill_db
    SKILL_DB = load_skill_db()

app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

nlp = spacy.load("en_core_web_sm")
skill_extractor = SkillExtractor(nlp, SKILL_DB, PhraseMatcher)

_key = os.environ.get("GEMINI_API_KEY")
if not _key:
    raise RuntimeError("GEMINI_API_KEY not set in nlp-service/.env")
gemini = genai_new.Client(api_key=_key)

# Model fallback chain — if one is rate-limited, try the next
# gemini-1.5-flash has a SEPARATE free-tier quota from gemini-2.0-flash
GEMINI_MODELS = [
    "gemini-2.0-flash",
    "gemini-1.5-flash",
    "gemini-1.5-flash-8b",   # smallest/fastest, most generous quota
]


class TextIn(BaseModel):
    text: str

class SkillsOut(BaseModel):
    skills: list[str]


@app.get("/health")
def health_check():
    return {"status": "healthy"}


@app.post("/extract-skills", response_model=SkillsOut)
def extract_skills(payload: TextIn):
    """SkillNer on short text only (headline + summary). Fast."""
    doc = skill_extractor.annotate(payload.text)
    results = doc.get("results", {})
    skills = set()
    for key in ["full_matches", "ngram_scored_filtered", "ngram_scored", "keyword_scored"]:
        for item in (results.get(key) or []):
            if isinstance(item, dict):
                name = item.get("skill_name") or item.get("doc_node_value")
                if name:
                    skills.add(name.strip())
    return {"skills": sorted(skills)}


# ── PDF text extraction ──────────────────────────────────────────────────────
def pdf_to_text(data: bytes) -> str:
    text = ""
    with pdfplumber.open(io.BytesIO(data)) as pdf:
        for page in pdf.pages:
            t = page.extract_text()
            if t:
                text += t + "\n"
    return text.strip()


# ── Regex contact extractors ─────────────────────────────────────────────────
def rx_email(t):     m = re.search(r'[\w\.-]+@[\w\.-]+\.\w+', t);                 return m.group(0) if m else None
def rx_phone(t):     m = re.search(r'(\+?\d[\d\s\-().]{7,}\d)', t);              return m.group(0).strip() if m else None
def rx_linkedin(t):  m = re.search(r'linkedin\.com/in/[\w\-]+', t, re.I);         return "https://" + m.group(0) if m else None
def rx_github(t):    m = re.search(r'github\.com/[\w\-]+', t, re.I);              return "https://" + m.group(0) if m else None
def rx_portfolio(t):
    hits = re.findall(r'https?://(?!.*linkedin)(?!.*github)[\w\-\.]+\.[a-z]{2,}[\S]*', t, re.I)
    return hits[0] if hits else None


# ── Gemini call with model fallback + retry on 429 ───────────────────────────
def call_gemini(prompt: str) -> str:
    """
    Try each model in GEMINI_MODELS. On 429, wait the retry-after hint then try
    the next model. Returns raw text or raises if all models fail.
    """
    last_err = None
    for model in GEMINI_MODELS:
        try:
            print(f"[gemini] trying model={model}")
            resp = gemini.models.generate_content(model=model, contents=prompt)
            print(f"[gemini] success model={model}")
            return resp.text.strip()
        except Exception as ex:
            msg = str(ex)
            last_err = ex
            if "429" in msg or "RESOURCE_EXHAUSTED" in msg:
                # Extract retry-after hint if present, wait at most 10s then try next model
                delay = 5
                m = re.search(r'retryDelay.*?(\d+)s', msg)
                if m:
                    delay = min(int(m.group(1)), 10)
                print(f"[gemini] 429 on {model}, waiting {delay}s then trying next model")
                time.sleep(delay)
                continue  # try next model
            else:
                # Non-rate-limit error — still try next model
                print(f"[gemini] error on {model}: {ex}")
                continue
    raise last_err or RuntimeError("All Gemini models failed")


def strip_fences(raw: str) -> str:
    """Strip markdown code fences Gemini sometimes wraps around JSON."""
    if "```" not in raw:
        return raw
    parts = raw.split("```")
    for part in parts:
        p = part.strip()
        if p.startswith("json"):
            p = p[4:].strip()
        if p.startswith("{"):
            return p
    return raw


# ── /parse-resume: Gemini ONLY — SkillNer not used (too slow on full PDF) ────
@app.post("/parse-resume")
async def parse_resume(file: UploadFile = File(...)):
    content = await file.read()
    text = pdf_to_text(content)

    if not text:
        return {"error": "No text extracted — PDF may be image-based (scanned)."}

    # Instant regex extraction — no AI needed for contacts
    email     = rx_email(text)
    phone     = rx_phone(text)
    linkedin  = rx_linkedin(text)
    github    = rx_github(text)
    portfolio = rx_portfolio(text)

    PROMPT = f"""You are an expert resume parser. Extract structured data from the resume below.

RULES (follow strictly):
1. Return ONLY a raw JSON object. No markdown, no triple backticks, no explanation.
2. Use null (JSON null) for truly missing fields.
3. Arrays must be [] if nothing found — never null.
4. yearsOfExp = integer (e.g. 3), not a string.
5. skills = programming languages, frameworks, libraries, technical concepts.
6. tools = software tools, platforms, IDEs, cloud services (Git, Docker, AWS, VS Code).
7. achievements = list of bullet strings from job description.
8. education year = 4-digit graduation year string e.g. "2024".
9. workHistory endDate = "Present" if currently working there.

EXACT OUTPUT FORMAT:
{{
  "fullName": "Jane Smith",
  "headline": "Full Stack Developer with 3 years experience",
  "summary": "Experienced developer specializing in MERN stack...",
  "currentTitle": "Software Engineer",
  "currentCompany": "Google",
  "yearsOfExp": 3,
  "skills": ["JavaScript", "React", "Node.js", "Python", "MongoDB"],
  "tools": ["Git", "Docker", "VS Code", "Postman", "AWS"],
  "workHistory": [
    {{
      "role": "Software Engineer",
      "company": "Google",
      "startDate": "Jan 2021",
      "endDate": "Present",
      "achievements": [
        "Built REST APIs serving 10M+ requests/day",
        "Reduced page load time by 40%"
      ]
    }}
  ],
  "education": [
    {{
      "degree": "B.Tech Computer Science",
      "institute": "KIIT University",
      "year": "2021",
      "gpa": "8.5"
    }}
  ],
  "certifications": [
    {{
      "name": "AWS Solutions Architect",
      "issuer": "Amazon",
      "year": "2022",
      "link": ""
    }}
  ],
  "languages": ["English", "Hindi"],
  "projects": [
    {{
      "title": "SkillBridge",
      "description": "AI-powered job matching platform",
      "technologies": ["React", "Node.js", "MongoDB"],
      "link": "https://github.com/user/skillbridge"
    }}
  ]
}}

RESUME TEXT:
---
{text[:9000]}
---"""

    parsed = {}
    try:
        raw = call_gemini(PROMPT)
        raw = strip_fences(raw)
        parsed = json.loads(raw)
        print(f"[parse-resume] OK name={parsed.get('fullName')} skills={len(parsed.get('skills', []))} work={len(parsed.get('workHistory', []))}")
    except json.JSONDecodeError as je:
        print(f"[parse-resume] JSON parse error: {je}")
        parsed = {}
    except Exception as ex:
        print(f"[parse-resume] All models failed: {ex}")
        parsed = {}

    return {
        "fullName":       parsed.get("fullName"),
        "email":          email,
        "phone":          phone,
        "linkedinUrl":    linkedin,
        "githubUrl":      github,
        "portfolioUrl":   portfolio,
        "headline":       parsed.get("headline"),
        "summary":        parsed.get("summary"),
        "currentTitle":   parsed.get("currentTitle"),
        "currentCompany": parsed.get("currentCompany"),
        "yearsOfExp":     parsed.get("yearsOfExp"),
        "skills":         parsed.get("skills")         or [],
        "tools":          parsed.get("tools")          or [],
        "workHistory":    parsed.get("workHistory")    or [],
        "education":      parsed.get("education")      or [],
        "certifications": parsed.get("certifications") or [],
        "languages":      parsed.get("languages")      or [],
        "projects":       parsed.get("projects")       or [],
    }
