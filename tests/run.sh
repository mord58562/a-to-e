#!/bin/sh
# Runs every test in this folder against the local server and exits
# non-zero if any fails. Needs the site served on ORIGIN (default
# http://127.0.0.1:8765/, e.g. ./scripts/start.sh) and jsdom installed
# (npm i --no-save jsdom).
cd "$(dirname "$0")/.." || exit 1
export REPO="$PWD"
ORIGIN="${ORIGIN:-http://127.0.0.1:8765/}"
export ORIGIN
if ! curl -fsS -o /dev/null "$ORIGIN"; then
  echo "no server at $ORIGIN; start one with ./scripts/start.sh" >&2
  exit 1
fi
if ! node -e 'require.resolve("jsdom", { paths: [process.cwd()] })' 2>/dev/null; then
  echo "jsdom not found; run: npm i --no-save jsdom" >&2
  exit 1
fi
failed=""
for t in smoke admin keyboard navigator invite outbox test_commit error_codes report; do
  node "tests/$t.js" || failed="$failed $t"
done
if [ -n "$failed" ]; then
  echo "FAILED:$failed"
  exit 1
fi
echo "all tests passed"
