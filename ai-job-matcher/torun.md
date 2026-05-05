then in cmd terminal in vs code: cd ai-job-matcher\nlp-service && venv\Scripts\activate

to setup :

1. pip install -r requirement.txt
2. python -m spacy download en_core_web_sm

if downloaded node then good
then in cmd
cd ai-job-matcher/backend
npm install
npm install mongodb

npm install multer cloudinary multer-storage-cloudinary

---

cd frontend && npm run dev

cd backend && npm run dev or node server.js

cd ai-job-matcher/nlp-service
uvicorn main:app --reload --port 8000

## ex requirement txt

fastapi
uvicorn[standard]
spacy
skillNer
IPython
pdfplumber
python-multipart
google-generativeai
google-genai
python-dotenv
sentence-transformers
scikit-learn
torch
python-docx
groq
