import re
import os
import io
import time
import spacy
import json
import numpy as np
from spacy.matcher import PhraseMatcher
from fastapi import FastAPI, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional
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

# ── Sentence Transformers (lazy-loaded on first use to keep startup fast) ────
_sbert_model = None

def get_sbert():
    global _sbert_model
    if _sbert_model is None:
        from sentence_transformers import SentenceTransformer
        print("[sbert] loading all-MiniLM-L6-v2 ...")
        _sbert_model = SentenceTransformer('all-MiniLM-L6-v2')
        print("[sbert] model loaded")
    return _sbert_model

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

# ── Gemini model fallback chain (May 2026 current models) ────────────────────
# gemini-1.5-flash / gemini-1.5-flash-8b REMOVED — deprecated, return 404
GEMINI_MODELS = [
    "gemini-2.0-flash",
    "gemini-2.0-flash-lite",
    "gemini-2.5-flash-preview-05-20",
]

# ── BONUS EXPANSION MAP ───────────────────────────────────────────────────────
# When a seeker writes "MERN" we expand to all component skills for matching.
# Mirrors the Node.js SKILL_SYNONYMS but adds multi-skill shorthands.
# Referenced by /compute-match to boost scores for shorthand-listed skills.
BONUS_EXPANSIONS = {
    'mern':       ['mongodb', 'express', 'react', 'node'],
    'mean':       ['mongodb', 'express', 'angular', 'node'],
    'mevn':       ['mongodb', 'express', 'vue', 'node'],
    'lamp':       ['linux', 'apache', 'mysql', 'php'],
    'fullstack':  ['html', 'css', 'javascript', 'react', 'node', 'mongodb'],
    'full stack': ['html', 'css', 'javascript', 'react', 'node', 'mongodb'],
    'devops':     ['docker', 'kubernetes', 'ci/cd', 'linux', 'git'],
    'data science': ['python', 'pandas', 'numpy', 'machine learning', 'sql'],
    'ml':         ['python', 'machine learning', 'scikit-learn', 'pandas', 'numpy'],
    'ai/ml':      ['python', 'machine learning', 'deep learning', 'tensorflow', 'pytorch'],
}


class TextIn(BaseModel):
    text: str

class SkillsOut(BaseModel):
    skills: List[str]

class SkillSuggestIn(BaseModel):
    title: str = ""
    description: str = ""

class MatchRequest(BaseModel):
    """
    Input for hybrid semantic matching.
    profileText  : full concatenated seeker profile text (headline + summary + skills + work)
    jobText      : full job description + responsibilities
    profileSkills: list of skills from seeker profile (canonical preferred)
    jobSkills    : required skills from job posting
    profileYears : seeker's years of experience (int)
    requiredYears: job's minimum years required (int)
    educationMatch: 0.0–1.0 pre-computed edu match (optional, default 0.5)
    """
    profileText:   str
    jobText:       str
    profileSkills: List[str] = []
    jobSkills:     List[str] = []
    profileYears:  Optional[int] = 0
    requiredYears: Optional[int] = 0
    educationMatch: Optional[float] = 0.5


@app.get("/health")
def health_check():
    return {"status": "healthy", "models": GEMINI_MODELS}


# ── SkillNer extraction (fast, no LLM) ───────────────────────────────────────
@app.post("/extract-skills", response_model=SkillsOut)
def extract_skills(payload: TextIn):
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


# ── /suggest-skills : AI chip suggestions for job posting form ────────────────
@app.post("/suggest-skills")
async def suggest_skills(payload: SkillSuggestIn):
    if not payload.title and not payload.description:
        return {"skills": []}

    PROMPT = f"""You are an expert technical recruiter with deep knowledge of the IT and software industry.

Given the job title and description below, return a JSON array of the most relevant technical and soft skills
required for this role. Follow these rules strictly:

1. Return ONLY a raw JSON array of strings. No markdown, no explanation.
2. Expand shorthand: "MERN" becomes ["MongoDB", "Express.js", "React", "Node.js"] as separate items.
3. Include both hard skills (technologies, frameworks, languages) and soft skills.
4. Normalize capitalization: "JavaScript" not "javascript", "Node.js" not "nodejs".
5. Return 15-25 skills maximum, ordered by importance.
6. Do not include generic terms like "Computer Science" or "Software Development".

Job Title: {payload.title}
Job Description: {payload.description[:3000]}

Return ONLY the JSON array:"""

    try:
        raw = call_gemini(PROMPT)
        raw = strip_fences(raw)
        parsed = json.loads(raw)
        if isinstance(parsed, dict):
            skills = parsed.get("skills", [])
        elif isinstance(parsed, list):
            skills = parsed
        else:
            skills = []
        skills = [str(s).strip()[:50] for s in skills if s]
        print(f"[suggest-skills] returned {len(skills)} skills")
        return {"skills": skills}
    except Exception as ex:
        print(f"[suggest-skills] error: {ex}")
        return {"skills": [], "error": str(ex)}


# ── /compute-match : Hybrid SBERT + skill + experience matching ───────────────
# This is the core of Step 2. Called by Node matchController for every match.
#
# Scoring formula (research-backed, inspired by LinkedIn Talent Insights):
#   40% → SBERT cosine similarity  (semantic understanding of full texts)
#   40% → Skill match ratio        (synonym+fuzzy+bonus expansion aware)
#   20% → Experience + education   (structured requirement matching)
#
# References:
#   - sentence-transformers all-MiniLM-L6-v2 (Hugging Face, 80MB, fast)
#   - "Learning to Retrieve for Job Matching" arXiv 2402.13435
#   - "SBERT-NLP Framework for Job Matching" JETIR2602011
@app.post("/compute-match")
async def compute_match(req: MatchRequest):
    try:
        sbert = get_sbert()

        # 1. SBERT cosine similarity ──────────────────────────────────────────
        from sklearn.metrics.pairwise import cosine_similarity

        profile_emb = sbert.encode([req.profileText], normalize_embeddings=True)
        job_emb     = sbert.encode([req.jobText],     normalize_embeddings=True)
        sbert_score = float(cosine_similarity(profile_emb, job_emb)[0][0])
        # cosine similarity is -1..1; clamp to 0..1
        sbert_score = max(0.0, sbert_score)

        # 2. Skill match ratio ─────────────────────────────────────────────────
        # Expand bonus shorthands in profile skills before comparing
        def expand_skills(skill_list):
            expanded = set()
            for s in skill_list:
                sl = s.strip().lower()
                expanded.add(sl)
                if sl in BONUS_EXPANSIONS:
                    expanded.update(BONUS_EXPANSIONS[sl])
            return expanded

        profile_set = expand_skills(req.profileSkills)
        job_set     = set(s.strip().lower() for s in req.jobSkills)

        if not job_set:
            skill_score = 1.0  # no required skills = anyone qualifies
        else:
            matched = sum(1 for js in job_set if js in profile_set or
                          any(_fuzzy(js, ps) for ps in profile_set))
            skill_score = matched / len(job_set)

        # Track which skills matched / missing for UI breakdown
        matched_skills  = [js for js in job_set if js in profile_set or
                            any(_fuzzy(js, ps) for ps in profile_set)]
        missing_skills  = [js for js in job_set if js not in matched_skills]
        extra_skills    = [ps for ps in profile_set
                           if ps not in job_set and
                           not any(_fuzzy(ps, js) for js in job_set)]

        # 3. Experience + education score ──────────────────────────────────────
        exp_years    = req.profileYears or 0
        req_years    = req.requiredYears or 0
        if req_years == 0:
            exp_score = 1.0
        elif exp_years >= req_years:
            exp_score = 1.0
        elif exp_years >= req_years * 0.7:  # within 30% of required → partial credit
            exp_score = 0.7
        else:
            exp_score = max(0.2, exp_years / req_years)  # floor at 0.2

        edu_score = req.educationMatch  # passed from Node (0.0–1.0)

        structured_score = (exp_score * 0.6) + (edu_score * 0.4)

        # 4. Weighted hybrid final score ───────────────────────────────────────
        # 40% SBERT semantic + 40% skill overlap + 20% structured requirements
        final_raw = (
            0.40 * sbert_score +
            0.40 * skill_score +
            0.20 * structured_score
        )
        final_pct = round(final_raw * 100)

        print(f"[compute-match] sbert={sbert_score:.3f} skill={skill_score:.3f} "
              f"struct={structured_score:.3f} → final={final_pct}%")

        return {
            "score": final_pct,
            "breakdown": {
                "semanticScore": round(sbert_score * 100),
                "skillScore":    round(skill_score * 100),
                "structScore":   round(structured_score * 100),
            },
            "matchedSkills": matched_skills,
            "missingSkills": missing_skills,
            "extraSkills":   list(extra_skills)[:10],  # cap extra skills list
        }

    except Exception as ex:
        print(f"[compute-match] error: {ex}")
        # Fallback: return -1 score so Node.js knows to use local matchUtils
        return {"score": -1, "error": str(ex)}


def _fuzzy(a: str, b: str) -> bool:
    """Simple edit-distance fuzzy match for short canonical skill names."""
    if a == b:
        return True
    if len(a) <= 3 or len(b) <= 3:
        return False
    # Levenshtein distance ≤ 1
    if abs(len(a) - len(b)) > 2:
        return False
    m, n = len(a), len(b)
    dp = list(range(n + 1))
    for i in range(1, m + 1):
        prev = dp[:]
        dp[0] = i
        for j in range(1, n + 1):
            dp[j] = prev[j - 1] if a[i-1] == b[j-1] else 1 + min(prev[j], dp[j-1], prev[j-1])
    return dp[n] <= 1


# ── PDF text extraction ───────────────────────────────────────────────────────
def pdf_to_text(data: bytes) -> str:
    text = ""
    with pdfplumber.open(io.BytesIO(data)) as pdf:
        for page in pdf.pages:
            t = page.extract_text()
            if t:
                text += t + "\n"
    return text.strip()


# ── Regex contact extractors ──────────────────────────────────────────────────
def rx_email(t):     m = re.search(r'[\w\.-]+@[\w\.-]+\.\w+', t);                 return m.group(0) if m else None
def rx_phone(t):     m = re.search(r'(\+?\d[\d\s\-().]{7,}\d)', t);              return m.group(0).strip() if m else None
def rx_linkedin(t):  m = re.search(r'linkedin\.com/in/[\w\-]+', t, re.I);         return "https://" + m.group(0) if m else None
def rx_github(t):    m = re.search(r'github\.com/[\w\-]+', t, re.I);              return "https://" + m.group(0) if m else None
def rx_portfolio(t):
    hits = re.findall(r'https?://(?!.*linkedin)(?!.*github)[\w\-\.]+\.[a-z]{2,}[\S]*', t, re.I)
    return hits[0] if hits else None


# ── Gemini call with model fallback + retry on 429 ───────────────────────────
def call_gemini(prompt: str) -> str:
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
                delay = 5
                m = re.search(r'retryDelay.*?(\d+)s', msg)
                if m:
                    delay = min(int(m.group(1)), 10)
                print(f"[gemini] 429 on {model}, waiting {delay}s")
                time.sleep(delay)
                continue
            else:
                print(f"[gemini] error on {model}: {ex}")
                continue
    raise last_err or RuntimeError("All Gemini models failed")


def strip_fences(raw: str) -> str:
    if "```" not in raw:
        return raw
    parts = raw.split("```")
    for part in parts:
        p = part.strip()
        if p.startswith("json"):
            p = p[4:].strip()
        if p.startswith("{") or p.startswith("["):
            return p
    return raw


# ── /parse-resume : Gemini ONLY (SkillNer too slow on full PDF) ───────────────
@app.post("/parse-resume")
async def parse_resume(file: UploadFile = File(...)):
    content = await file.read()
    text = pdf_to_text(content)

    if not text:
        return {"error": "No text extracted — PDF may be image-based (scanned)."}

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
        print(f"[parse-resume] OK name={parsed.get('fullName')} skills={len(parsed.get('skills', []))}")
    except json.JSONDecodeError as je:
        print(f"[parse-resume] JSON parse error: {je}")
    except Exception as ex:
        print(f"[parse-resume] All models failed: {ex}")

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
