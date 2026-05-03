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

# ── NLP init (SkillNer only for /extract-skills endpoint, NOT for resume parsing) ──
nlp = spacy.load("en_core_web_sm")
skill_extractor = SkillExtractor(nlp, SKILL_DB, PhraseMatcher)

_gemini_key = os.environ.get("GEMINI_API_KEY")
if not _gemini_key:
    raise RuntimeError("GEMINI_API_KEY not found. Add it to nlp-service/.env")
gemini = genai_new.Client(api_key=_gemini_key)


class TextIn(BaseModel):
    text: str

class SkillsOut(BaseModel):
    skills: list[str]


@app.get("/health")
def health_check():
    return {"status": "healthy"}


# ── /extract-skills: uses SkillNer on short text (headline/summary) ──────────
@app.post("/extract-skills", response_model=SkillsOut)
def extract_skills(payload: TextIn):
    text = payload.text
    doc_annotations = skill_extractor.annotate(text)
    results = doc_annotations.get("results", {})
    skills = set()
    for key in ["full_matches", "ngram_scored_filtered", "ngram_scored", "keyword_scored"]:
        matches = results.get(key, [])
        if isinstance(matches, dict):
            matches = matches.values()
        for item in matches:
            name = item.get("skill_name") or item.get("doc_node_value")
            if name:
                skills.add(name.strip())
    return {"skills": sorted(skills)}


# ── PDF text extractor ────────────────────────────────────────────────────────
def pdf_to_text(file_bytes: bytes) -> str:
    text = ""
    with pdfplumber.open(io.BytesIO(file_bytes)) as pdf:
        for page in pdf.pages:
            page_text = page.extract_text()
            if page_text:
                text += page_text + "\n"
    return text


# ── Regex contact extractors ──────────────────────────────────────────────────
def get_email(text):
    m = re.search(r'[\w\.-]+@[\w\.-]+\.\w+', text)
    return m.group(0) if m else None

def get_phone(text):
    m = re.search(r'(\+?\d[\d\s\-().]{7,}\d)', text)
    return m.group(0).strip() if m else None

def get_linkedin(text):
    m = re.search(r'linkedin\.com/in/[\w\-]+', text, re.IGNORECASE)
    return "https://" + m.group(0) if m else None

def get_github(text):
    m = re.search(r'github\.com/[\w\-]+', text, re.IGNORECASE)
    return "https://" + m.group(0) if m else None

def get_portfolio(text):
    matches = re.findall(
        r'https?://(?!.*linkedin)(?!.*github)[\w\-\.]+\.[a-z]{2,}[\S]*',
        text, re.IGNORECASE
    )
    return matches[0] if matches else None


# ── /parse-resume: Gemini ONLY — NO SkillNer (too slow on full PDF) ───────────
@app.post("/parse-resume")
async def parse_resume(file: UploadFile = File(...)):
    content = await file.read()
    text = pdf_to_text(content)

    if not text.strip():
        return {"error": "Could not extract text. Make sure PDF is not a scanned image."}

    # Regex contact fields — instant
    email     = get_email(text)
    phone     = get_phone(text)
    linkedin  = get_linkedin(text)
    github    = get_github(text)
    portfolio = get_portfolio(text)

    # Gemini handles ALL structured extraction — skills, tools, work, education, etc.
    prompt = f"""You are a resume parser. Extract structured data from the resume text below.
Return ONLY a valid JSON object. No explanation. No markdown fences. No extra text.

{{
  "fullName": "string or null",
  "headline": "one-line professional title, e.g. Full Stack Developer",
  "summary": "2-4 sentence professional summary or null",
  "currentTitle": "most recent job title or null",
  "currentCompany": "most recent company or null",
  "yearsOfExp": 0,
  "skills": ["React", "Python", "MongoDB"],
  "tools": ["Git", "Docker", "VS Code"],
  "workHistory": [
    {{"role": "string", "company": "string", "startDate": "string", "endDate": "string", "achievements": ["string"]}}
  ],
  "education": [
    {{"degree": "string", "institute": "string", "year": "string", "gpa": "string or null"}}
  ],
  "certifications": [
    {{"name": "string", "issuer": "string", "year": "string"}}
  ],
  "languages": ["English", "Hindi"],
  "projects": [
    {{"title": "string", "description": "string", "technologies": ["string"], "link": "string or null"}}
  ]
}}

Resume text:
\"\"\"
{text[:8000]}
\"\"\""""

    try:
        response = gemini.models.generate_content(
            model="gemini-2.0-flash",
            contents=prompt
        )
        raw = response.text.strip()
        if raw.startswith("```"):
            parts = raw.split("```")
            raw = parts[1] if len(parts) > 1 else raw
            if raw.startswith("json"):
                raw = raw[4:]
        parsed = json.loads(raw.strip())
    except Exception as ex:
        print(f"Gemini parse error: {ex}")
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
        "skills":         parsed.get("skills", []),
        "tools":          parsed.get("tools", []),
        "workHistory":    parsed.get("workHistory", []),
        "education":      parsed.get("education", []),
        "certifications": parsed.get("certifications", []),
        "languages":      parsed.get("languages", []),
        "projects":       parsed.get("projects", []),
    }
