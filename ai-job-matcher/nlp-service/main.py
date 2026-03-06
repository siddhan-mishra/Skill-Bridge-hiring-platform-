import spacy
from spacy.matcher import PhraseMatcher
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from skillNer.skill_extractor_class import SkillExtractor

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
