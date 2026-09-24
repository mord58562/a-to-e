#!/usr/bin/env bash
# Y4 MCQ Bank - launch the local site at http://127.0.0.1:8765
# (Y4MCQ_PORT picks another port, as it does for server.py).
set -euo pipefail

cd "$(dirname "$0")/.."

PORT="${Y4MCQ_PORT:-8765}"
URL="http://127.0.0.1:${PORT}/"
LOG="${TMPDIR:-/tmp}"
LOG="${LOG%/}/y4-mcq.log"

# server.py answers an empty paste with 400; a plain static server gives
# 501 and would make every local write fall back to localStorage.
probe() {
  curl -s -o /dev/null -w '%{http_code}' -X POST -H 'Content-Type: application/json' \
    -d '{}' "http://127.0.0.1:${PORT}/api/paste" || true
}

if lsof -nP -iTCP:"${PORT}" -sTCP:LISTEN >/dev/null 2>&1; then
  code=$(probe)
  if [ "$code" != "400" ]; then
    echo "Port ${PORT} is held by something other than scripts/server.py (POST /api/paste gave ${code})." >&2
    echo "Stop it, or set Y4MCQ_PORT to a free port." >&2
    exit 1
  fi
  echo "Server already running on port ${PORT}."
else
  echo "Starting server on port ${PORT} (log: ${LOG})..."
  # Custom server: static files + POST /api/paste -> data/inbox/. The
  # paste-questions UI uses this so new content auto-lands in the
  # auditable inbox. Falls back to localStorage if not running.
  Y4MCQ_PORT="${PORT}" python3 scripts/server.py >"${LOG}" 2>&1 &
  for _ in 1 2 3 4 5 6 7 8 9 10; do
    [ "$(probe)" = "400" ] && break
    sleep 0.3
  done
  if [ "$(probe)" != "400" ]; then
    echo "server.py did not come up on port ${PORT}; see ${LOG}" >&2
    exit 1
  fi
fi

echo "Open: ${URL}"
if command -v open >/dev/null 2>&1 && [ "$(uname)" = "Darwin" ]; then
  open "${URL}"
elif command -v xdg-open >/dev/null 2>&1; then
  xdg-open "${URL}" >/dev/null 2>&1 || true
fi
