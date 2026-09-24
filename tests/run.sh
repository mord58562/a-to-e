#!/bin/sh
# Runs the data gates and every test in this folder against the local
# server, and exits non-zero if any fails. Needs python3, node, curl,
# the site served on ORIGIN (default http://127.0.0.1:8765/, e.g.
# ./scripts/start.sh) and jsdom installed (npm i --no-save jsdom).
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
# Data gates: the split and hashes match the batches, each split pair
# merges back to its batch, and no banned token is served. Output only on
# failure.
gate() {
  name="$1"; shift
  if ! out=$("$@" 2>&1); then
    printf '%s\n' "$out" | tail -n 20
    echo "data gate failed: $name"
    failed="$failed $name"
  fi
}
gate hashes python3 scripts/manifest_hashes.py --check
gate split python3 scripts/split_bank.py --verify
gate tokens python3 scripts/check_tokens.py
gate token-rules python3 scripts/check_tokens.py --selftest
gate dupe-rules python3 scripts/dupe_gate.py --selftest
for t in smoke admin keyboard navigator invite outbox test_commit error_codes report home quiz_flow multitab; do
  node "tests/$t.js" || failed="$failed $t"
done
if [ -n "$failed" ]; then
  echo "FAILED:$failed"
  exit 1
fi
echo "all tests passed"
