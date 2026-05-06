#!/usr/bin/env bash
set -e

echo "==> Python version:"
python --version

echo "==> Upgrading pip..."
pip install --upgrade pip

echo "==> [1/4] Installing numpy + pandas (binary wheels only — no C compilation)"
pip install --prefer-binary "numpy>=1.26,<3" "pandas>=2.0,<3"

echo "==> [2/4] Installing spacy (binary wheels only)"
pip install --prefer-binary "spacy>=3.5,<3.8"

echo "==> [3/4] Downloading spacy language model"
python -m spacy download en_core_web_sm

echo "==> [4/4] Installing all remaining requirements"
pip install --prefer-binary -r requirements.txt

echo ""
echo "==> Build complete! All packages installed."
