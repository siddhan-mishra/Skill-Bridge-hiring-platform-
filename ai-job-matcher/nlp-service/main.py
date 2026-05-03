import re
import os
import io
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


class TextIn(BaseModel):
    text: str

class SkillsOut(BaseModel):
    skills: list[str]


@app.get("/health")
def health_check():
    return {"status": "healthy"}


@app.post("/extract-skills", response_model=SkillsOut)
def extract_skills(payload: TextIn):
    """SkillNer on short text only (headline + summary)."""
    doc = skill_extractor.annotate(payload.text)
    results = doc.get("results", {})
    skills = set()
    for key in ["full_matches","ngram_scored_filtered","ngram_scored","keyword_scored"]:
        for item in (results.get(key) or []):
            if isinstance(item, dict):
                name = item.get("skill_name") or item.get("doc_node_value")
                if name: skills.add(name.strip())
    return {"skills": sorted(skills)}


# ── PDF text extraction ──────────────────────────────────────────────────────
def pdf_to_text(data: bytes) -> str:
    text = ""
    with pdfplumber.open(io.BytesIO(data)) as pdf:
        for page in pdf.pages:
            t = page.extract_text()
            if t: text += t + "\n"
    return text

# ── Regex helpers ────────────────────────────────────────────────────────────
def rx_email(t):     m=re.search(r'[\w\.-]+@[\w\.-]+\.\w+',t);                  return m.group(0) if m else None
def rx_phone(t):     m=re.search(r'(\+?\d[\d\s\-().]{7,}\d)',t);               return m.group(0).strip() if m else None
def rx_linkedin(t):  m=re.search(r'linkedin\.com/in/[\w\-]+',t,re.I);          return "https://"+m.group(0) if m else None
def rx_github(t):    m=re.search(r'github\.com/[\w\-]+',t,re.I);               return "https://"+m.group(0) if m else None
def rx_portfolio(t):
    hits=re.findall(r'https?://(?!.*linkedin)(?!.*github)[\w\-\.]+\.[a-z]{2,}[\S]*',t,re.I)
    return hits[0] if hits else None


# ── /parse-resume: Gemini ONLY — SkillNer NOT called (too slow on full PDF) ──
@app.post("/parse-resume")
async def parse_resume(file: UploadFile = File(...)):
    content = await file.read()
    text = pdf_to_text(content)

    if not text.strip():
        return {"error": "No text extracted. PDF may be image-based (scanned)."}

    # Regex contacts — instant
    email     = rx_email(text)
    phone     = rx_phone(text)
    linkedin  = rx_linkedin(text)
    github    = rx_github(text)
    portfolio = rx_portfolio(text)

    # Gemini prompt — explicit, strict, with inline examples so model knows exact format
    prompt = f"""You are an expert resume parser. Your job is to extract structured data from a resume.

RULES:
1. Return ONLY a raw JSON object. No markdown, no triple backticks, no explanation.
2. Use null (JSON null, not the string "null") for missing fields.
3. For arrays, return empty [] if nothing found — never null.
4. yearsOfExp must be a number (integer), not a string.
5. skills = programming languages, frameworks, concepts (e.g. React, Node.js, Machine Learning)
6. tools = software tools, platforms, IDEs (e.g. Git, Docker, VS Code, AWS, Postman)
7. achievements must be a list of strings, each one bullet point from the job description.
8. For education year, extract graduation year as a 4-digit string e.g. "2024".
9. For workHistory, if the person is currently working there, set endDate to "Present".

OUTPUT FORMAT (follow exactly):
{{
  "fullName": "John Doe",
  "headline": "Full Stack Developer with 3 years experience",
  "summary": "Experienced developer specializing in MERN stack...",
  "currentTitle": "Software Engineer",
  "currentCompany": "Google",
  "yearsOfExp": 3,
  "skills": ["JavaScript", "React", "Node.js", "Python", "MongoDB"],
  "tools": ["Git", "Docker", "VS Code", "Postman"],
  "workHistory": [
    {{
      "role": "Software Engineer",
      "company": "Google",
      "startDate": "Jan 2021",
      "endDate": "Present",
      "achievements": [
        "Built REST APIs serving 10M+ requests/day",
        "Reduced page load time by 40% using lazy loading"
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
      "year": "2022"
    }}
  ],
  "languages": ["English", "Hindi"],
  "projects": [
    {{
      "title": "SkillBridge",
      "description": "AI-powered job matching platform built with MERN stack",
      "technologies": ["React", "Node.js", "MongoDB", "Python"],
      "link": "https://github.com/user/skillbridge"
    }}
  ]
}}

NOW PARSE THIS RESUME:
---
{text[:9000]}
---"""

    try:
        response = gemini.models.generate_content(
            model="gemini-2.0-flash",
            contents=prompt
        )
        raw = response.text.strip()
        # Strip any markdown fences Gemini might still add
        if "```" in raw:
            parts = raw.split("```")
            # Find the JSON part
            for part in parts:
                p = part.strip()
                if p.startswith("json"):
                    p = p[4:].strip()
                if p.startswith("{"):
                    raw = p
                    break
        parsed = json.loads(raw.strip())
        print(f"[parse-resume] Success: {parsed.get('fullName')} | skills={len(parsed.get('skills',[]))} | work={len(parsed.get('workHistory',[]))}")
    except Exception as ex:
        print(f"[parse-resume] Gemini error: {ex}")
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
        "skills":         parsed.get("skills") or [],
        "tools":          parsed.get("tools") or [],
        "workHistory":    parsed.get("workHistory") or [],
        "education":      parsed.get("education") or [],
        "certifications": parsed.get("certifications") or [],
        "languages":      parsed.get("languages") or [],
        "projects":       parsed.get("projects") or [],
    }
