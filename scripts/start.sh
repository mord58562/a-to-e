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
  # Custom server: static files + POST /api/paste -> data/inbox/. The
  # paste-questions UI uses this so new content auto-lands in the
  # auditable inbox. Falls back to localStorage if not running.
  python3 "$(dirname "$0")/server.py" >/tmp/y4-mcq.log 2>&1 &
  sleep 0.6
fi

# Bookmark hint:  http://127.0.0.1:8765/   (also accessible as http://localhost:8765/)
echo "Open: ${URL}"
open "${URL}"
