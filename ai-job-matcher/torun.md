to setup :

1. pip install -r requirement.txt
2. python -m spacy download en_core_web_sm

then in cmd terminal in vs code: cd ai-job-matcher\nlp-service && venv\Scripts\activate

cd frontend && npm run dev

cd backend && npm run dev

cd ai-job-matcher/nlp-service
uvicorn main:app --reload --port 8000
