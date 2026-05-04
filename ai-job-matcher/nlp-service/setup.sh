#!/usr/bin/env bash
# run once: bash setup.sh
set -e
echo "[setup] Creating venv..."
python3 -m venv venv
source venv/bin/activate
echo "[setup] Installing requirements..."
pip install --upgrade pip
pip install -r requirements.txt
echo "[setup] Downloading spaCy model..."
python -m spacy download en_core_web_sm
echo "[setup] Pre-downloading SBERT model (all-MiniLM-L6-v2)..."
python -c "from sentence_transformers import SentenceTransformer; SentenceTransformer('all-MiniLM-L6-v2'); print('[setup] SBERT ready')"
echo "[setup] All done. Run: uvicorn main:app --reload --port 8000"
