#!/usr/bin/env bash
# Y4 MCQ Bank - launch the local site at http://127.0.0.1:8765
set -euo pipefail

cd "$(dirname "$0")/.."

PORT=8765
URL="http://127.0.0.1:${PORT}/"

# Reuse the existing server if it's already up.
if lsof -nP -iTCP:${PORT} -sTCP:LISTEN >/dev/null 2>&1; then
  echo "Server already running on port ${PORT}."
else
  echo "Starting server on port ${PORT}..."
  python3 -m http.server ${PORT} --bind 127.0.0.1 >/tmp/y4-mcq.log 2>&1 &
  sleep 0.6
fi

# Bookmark hint:  http://127.0.0.1:8765/   (also accessible as http://localhost:8765/)
echo "Open: ${URL}"
open "${URL}"
