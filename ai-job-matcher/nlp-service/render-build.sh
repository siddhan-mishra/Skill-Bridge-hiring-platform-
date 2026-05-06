#!/usr/bin/env bash
set -e

echo "==> Python version:"
python --version

echo "==> Upgrading pip..."
pip install --upgrade pip

echo "==> Installing numpy + pandas with binary only (no C compilation)"
pip install --only-binary=:all: numpy==1.26.4 pandas==2.2.2

echo "==> Installing spacy with binary only"
pip install --only-binary=:all: spacy==3.7.6 || pip install --only-binary=:all: spacy==3.5.4 || pip install spacy --prefer-binary

echo "==> Installing skillNer"
pip install skillNer==1.0.6 --no-deps
pip install requests jsonschema

echo "==> Installing remaining requirements"
pip install -r requirements.txt

echo "==> Downloading spacy model"
python -m spacy download en_core_web_sm

echo "==> Build complete!"
