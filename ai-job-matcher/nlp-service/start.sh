#!/usr/bin/env bash
set -e

# Render sets $PORT dynamically. Fall back to 10000 if not set.
PORT="${PORT:-10000}"

echo "[start] Launching uvicorn on port $PORT"
# Use --timeout-keep-alive 75 to keep connections alive longer
# Do NOT use --reload in production — it adds startup delay
exec .venv/bin/uvicorn main:app \
  --host 0.0.0.0 \
  --port "$PORT" \
  --workers 1 \
  --timeout-keep-alive 75
