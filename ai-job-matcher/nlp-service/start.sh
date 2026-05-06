#!/usr/bin/env bash
set -e

# Render sets $PORT dynamically. Fall back to 10000 if not set.
PORT="${PORT:-10000}"

echo "[start] Launching uvicorn on port $PORT"
# render-build.sh installs into system Python (no .venv), so use uvicorn from PATH
exec uvicorn main:app \
  --host 0.0.0.0 \
  --port "$PORT" \
  --workers 1 \
  --timeout-keep-alive 75
