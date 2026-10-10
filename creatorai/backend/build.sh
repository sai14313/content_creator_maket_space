#!/usr/bin/env bash
# Build the React frontend and copy it into backend/static so FastAPI can serve
# the entire app from a single Render service (one URL, no CORS / VITE_API_URL).
#
# Render runs this from the service's Root Directory (creatorai/backend):
#   Build command:  bash build.sh
#   Start command:  uvicorn main:app --host 0.0.0.0 --port $PORT
set -euo pipefail

# Resolve paths relative to this script so it works regardless of the caller's cwd.
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$SCRIPT_DIR"
FRONTEND_DIR="$(cd "$SCRIPT_DIR/../frontend" && pwd)"

echo "==> [1/3] Building frontend in $FRONTEND_DIR"
cd "$FRONTEND_DIR"
# npm install (not npm ci) is forgiving if package-lock.json drifts from package.json.
npm install
npm run build

if [ ! -f "$FRONTEND_DIR/dist/index.html" ]; then
  echo "ERROR: frontend build did not produce dist/index.html" >&2
  exit 1
fi

echo "==> [2/3] Copying frontend build into $BACKEND_DIR/static"
rm -rf "$BACKEND_DIR/static"
mkdir -p "$BACKEND_DIR/static"
cp -r "$FRONTEND_DIR/dist/." "$BACKEND_DIR/static/"

echo "==> [3/3] Installing backend Python dependencies"
cd "$BACKEND_DIR"
pip install -r requirements.txt

echo "==> Build complete. static/ is ready for FastAPI to serve."
