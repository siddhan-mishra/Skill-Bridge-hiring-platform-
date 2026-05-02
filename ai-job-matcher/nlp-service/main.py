import re
import io
import spacy
from spacy.matcher import PhraseMatcher
from fastapi import FastAPI, UploadFile, File   # ← added UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from skillNer.skill_extractor_class import SkillExtractor
import pdfplumber                               # ← new library

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
    """
    POST a PDF resume as multipart/form-data.
    Returns structured JSON with all extracted profile fields.
    """
    # 1. Read file bytes from the uploaded file
    content = await file.read()

    # 2. Convert PDF to plain text
    text = pdf_to_text(content)

    if not text.strip():
        return {"error": "Could not read text from this PDF. Make sure it is not a scanned image."}

    # 3. Split into lines for heuristic parsing
    lines = [line.strip() for line in text.split('\n') if line.strip()]

    # 4. Full name heuristic: first non-empty line is usually the name
    full_name = lines[0] if lines else None

    # 5. Run SkillNer on full text
    skills = run_skillner(text)

    # 6. Extract contact info
    email     = get_email(text)
    phone     = get_phone(text)
    linkedin  = get_linkedin(text)
    github    = get_github(text)
    portfolio = get_portfolio(text)

    # 7. Extract the summary/bio section
    summary = get_section(
        text,
        section_names=["Summary", "Professional Summary", "Objective", "About Me", "Profile", "About"],
        stop_names=["Experience", "Work History", "Education", "Skills", "Projects", "Certifications", "Languages"]
    )

    # 8. Extract and parse education section
    education_text = get_section(
        text,
        section_names=["Education", "Academic Background", "Qualifications"],
        stop_names=["Experience", "Work History", "Skills", "Projects", "Certifications", "Languages", "References"]
    )
    education = []
    for line in education_text.split('\n'):
        line = line.strip()
        if line:
            education.append({
                "degree": line,
                "institute": "",
                "year": "",
                "gpa": ""
            })

    # 9. Extract and parse work history section
    work_text = get_section(
        text,
        section_names=["Experience", "Work Experience", "Work History", "Employment History"],
        stop_names=["Education", "Skills", "Projects", "Certifications", "Languages", "References"]
    )
    work_history = []
    work_lines = [l.strip() for l in work_text.split('\n') if l.strip()]
    i = 0
    while i < len(work_lines):
        entry = {
            "company": "",
            "role": work_lines[i],
            "startDate": "",
            "endDate": "",
            "achievements": []
        }
        if i + 1 < len(work_lines):
            entry["company"] = work_lines[i + 1]
            i += 2
        else:
            i += 1
        # Collect bullet achievements (lines starting with •, -, *, ◦)
        while i < len(work_lines) and work_lines[i].startswith(('•', '-', '*', '◦')):
            entry["achievements"].append(work_lines[i].lstrip('•-*◦ '))
            i += 1
        work_history.append(entry)

    # 10. Extract certifications
    cert_text = get_section(
        text,
        section_names=["Certifications", "Licenses", "Certificates", "Achievements"],
        stop_names=["Projects", "Languages", "References", "Skills"]
    )
    certifications = []
    for line in cert_text.split('\n'):
        line = line.strip().lstrip('•-*◦ ')
        if line:
            certifications.append({"name": line, "issuer": "", "year": ""})

    # 11. Extract languages
    lang_text = get_section(
        text,
        section_names=["Languages", "Language Skills", "Languages Known"],
        stop_names=["References", "Projects", "Certifications", "Experience"]
    )
    languages = [
        l.strip().lstrip('•-*◦ ')
        for l in lang_text.split('\n') if l.strip()
    ]

    # 12. Return everything
    return {
        "fullName":       full_name,
        "email":          email,
        "phone":          phone,
        "linkedinUrl":    linkedin,
        "githubUrl":      github,
        "portfolioUrl":   portfolio,
        "summary":        summary,
        "skills":         skills,
        "education":      education,
        "workHistory":    work_history,
        "certifications": certifications,
        "languages":      languages,
    }