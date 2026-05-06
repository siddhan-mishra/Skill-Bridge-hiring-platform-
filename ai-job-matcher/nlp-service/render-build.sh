#!/usr/bin/env bash
set -e

echo "==> Python version:"
python --version

echo "==> Upgrading pip..."
pip install --upgrade pip

echo "==> Installing numpy + pandas (latest compatible binaries)"
pip install --prefer-binary "numpy>=1.26,<3" "pandas>=2.0,<3"

echo "==> Installing spacy with binary only"
pip install --prefer-binary "spacy>=3.5,<3.8"

echo "==> Downloading spacy model"
python -m spacy download en_core_web_sm

echo "==> Installing skillNer"
pip install skillNer==1.0.6 --no-deps
pip install requests jsonschema

echo "==> Installing remaining requirements"
pip install --prefer-binary -r requirements.txt

echo "==> Build complete!"
