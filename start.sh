#!/usr/bin/env bash
set -euo pipefail

echo "[start.sh] Using Node: $(node -v)"
echo "[start.sh] PWD: $(pwd)"

cd backend
echo "[start.sh] In backend: $(pwd)"

# Install production deps if node_modules missing (Railway caches between builds)
if [ ! -d node_modules ]; then
  echo "[start.sh] Installing dependencies..."
  npm ci --omit=dev || npm install --omit=dev
fi

echo "[start.sh] Starting server..."
npm start


