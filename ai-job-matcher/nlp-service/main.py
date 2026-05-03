import re
import os
import io
import spacy
import json
from spacy.matcher import PhraseMatcher
from fastapi import FastAPI, UploadFile, File   # ← added UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from skillNer.skill_extractor_class import SkillExtractor
import pdfplumber                               # ← new library
from google import genai as genai_new
from dotenv import load_dotenv
load_dotenv()  # ← must be called BEFORE os.environ.get()

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

# ---------- NLP INITIALIZATION ----------

nlp = spacy.load("en_core_web_sm")
skill_extractor = SkillExtractor(nlp, SKILL_DB, PhraseMatcher)

gemini = genai_new.Client(api_key=os.environ.get("GEMINI_API_KEY"))

class TextIn(BaseModel):
    text: str

class SkillsOut(BaseModel):
    skills: list[str]

@app.get("/health")
def health_check():
    return {"status": "healthy"}

@app.post("/extract-skills", response_model=SkillsOut)
def extract_skills(payload: TextIn):
    """
    Extract normalized skills from free text (resume, JD, profile, etc.).
    """
    text = payload.text
    doc_annotations = skill_extractor.annotate(text)
    results = doc_annotations.get("results", {})

    # Uncomment this line once to see full structure in terminal
    # print(doc_annotations)

    skills = set()

    # Different SkillNer versions use slightly different keys.
    # We'll check several of them.
    match_keys = [
        "full_matches",
        "ngram_scored_filtered",
        "ngram_scored",
        "keyword_scored",
    ]

    for key in match_keys:
        matches = results.get(key, [])
        if isinstance(matches, dict):
            # some versions may store matches as dicts keyed by index
            matches = matches.values()
        for item in matches:
            # typical field is 'skill_name'
            name = item.get("skill_name") or item.get("doc_node_value")
            if name:
                skills.add(name.strip())

    return {"skills": sorted(skills)}

# ═══════════════════════════════════════════════════════════════
#  RESUME PARSER — /parse-resume
#  Accepts a PDF file, extracts structured profile information
# ═══════════════════════════════════════════════════════════════

# ── Helper: extract plain text from PDF bytes ───────────────────
def pdf_to_text(file_bytes: bytes) -> str:
    """Open PDF from memory (not disk) and get all text."""
    text = ""
    with pdfplumber.open(io.BytesIO(file_bytes)) as pdf:
        for page in pdf.pages:
            page_text = page.extract_text()
            if page_text:
                text += page_text + "\n"
    return text

# ── Helper: regex extractors ────────────────────────────────────
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
    # Match http/https URLs that are NOT linkedin or github
    matches = re.findall(
        r'https?://(?!.*linkedin)(?!.*github)[\w\-\.]+\.[a-z]{2,}[\S]*',
        text, re.IGNORECASE
    )
    return matches[0] if matches else None

# ── Helper: extract a named section from resume text ────────────
def get_section(text, section_names, stop_names):
    """
    Pull out a block of text under a heading.
    section_names = what heading to look for (e.g. ["Summary", "About"])
    stop_names    = what headings come after it (so we know where to stop)
    """
    pattern = (
        r'(?:' + '|'.join(re.escape(h) for h in section_names) + r')\s*\n'
        r'(.*?)'
        r'(?=' + '|'.join(re.escape(h) for h in stop_names) + r'|\Z)'
    )
    m = re.search(pattern, text, re.IGNORECASE | re.DOTALL)
    return m.group(1).strip() if m else ""

# ── Helper: reuse existing SkillNer to extract skills ───────────
def run_skillner(text):
    """Same logic as /extract-skills but as a function."""
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
    return sorted(skills)

# ── THE NEW ENDPOINT ─────────────────────────────────────────────
@app.post("/parse-resume")
async def parse_resume(file: UploadFile = File(...)):
    content = await file.read()
    text = pdf_to_text(content)

    if not text.strip():
        return {"error": "Could not read text from this PDF. Make sure it is not a scanned image."}

    # Regex for contact fields — instant
    email     = get_email(text)
    phone     = get_phone(text)
    linkedin  = get_linkedin(text)
    github    = get_github(text)
    portfolio = get_portfolio(text)

    # Gemini handles EVERYTHING structural including skills
    # SkillNer is NOT called here — too slow on full PDF text
    prompt = f"""
You are a resume parser. Extract structured information from the resume text below.
Return ONLY valid JSON. No explanation. No markdown fences. No extra text.

{{
  "fullName": "string or null",
  "headline": "string or null",
  "summary": "string or null",
  "currentTitle": "string or null",
  "currentCompany": "string or null",
  "yearsOfExp": 0,
  "skills": ["skill1", "skill2"],
  "tools": ["tool1", "tool2"],
  "workHistory": [
    {{"role": "string", "company": "string", "startDate": "string", "endDate": "string", "achievements": ["string"]}}
  ],
  "education": [
    {{"degree": "string", "institute": "string", "year": "string", "gpa": "string or null"}}
  ],
  "certifications": [
    {{"name": "string", "issuer": "string", "year": "string"}}
  ],
  "languages": ["string"],
  "projects": [
    {{"title": "string", "description": "string", "technologies": ["string"], "link": "string or null"}}
  ]
}}

Resume text:
\"\"\"
{text[:8000]}
\"\"\"
"""
    try:
        response = gemini.models.generate_content(
            model="gemini-2.0-flash",
            contents=prompt
        )
        raw = response.text.strip()
        # Strip markdown fences if Gemini adds them
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