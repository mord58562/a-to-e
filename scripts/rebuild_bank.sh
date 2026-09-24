#!/bin/sh
# Rebuilds the manifest hashes and data/split/ from the batch files, then
# proves the result: --check finds nothing stale, every split pair merges
# back to its batch exactly, and check_tokens.py passes.
#
#   ./scripts/rebuild_bank.sh          rebuild and check the working tree
#   ./scripts/rebuild_bank.sh --push   CI only: rebuild origin/$BRANCH and
#                                      push the result
#
# .github/workflows/rebuild-bank.yml runs --push on every push to main that
# touches the bank. Whatever wrote the batch (a hand edit, a commit that
# left data/split/ out, the worker, a routine push carrying an older
# manifest), main ends up with hashes and a split built from the batches it
# actually holds.
#
# --push resets the checkout to origin/$BRANCH before each attempt, so it
# refuses to run outside GitHub Actions unless REBUILD_ALLOW_RESET=1. A
# rejected push (someone pushed meanwhile) is retried from the new tip:
# regenerating is cheaper and safer than rebasing generated files.
set -u
# The whole body is one brace group, so sh has parsed all of it before
# the reset below can replace this file with a newer version.
{
cd "$(dirname "$0")/.." || exit 1

BRANCH="${BRANCH:-main}"
ATTEMPTS="${ATTEMPTS:-5}"
GENERATED="data/batches_manifest.json data/inbox_manifest.json data/split"

rebuild() {
  python3 scripts/manifest_hashes.py || { echo "rebuild: manifest_hashes.py failed" >&2; return 1; }
  python3 scripts/manifest_hashes.py --check || { echo "rebuild: still stale after a rebuild" >&2; return 1; }
  python3 scripts/split_bank.py --verify || { echo "rebuild: a split pair does not merge back to its batch" >&2; return 1; }
}

tokens() {
  out=$(python3 scripts/check_tokens.py 2>&1)
  rc=$?
  printf '%s\n' "$out" | tail -n 40
  return $rc
}

case "${1:-}" in
  "")
    rebuild || exit 1
    tokens
    exit $?
    ;;
  --push) ;;
  *)
    echo "usage: $0 [--push]" >&2
    exit 2
    ;;
esac

if [ "${GITHUB_ACTIONS:-}" != "true" ] && [ "${REBUILD_ALLOW_RESET:-}" != "1" ]; then
  echo "--push resets this checkout to origin/$BRANCH; it runs in CI only (REBUILD_ALLOW_RESET=1 overrides)" >&2
  exit 2
fi

attempt=1
while :; do
  git fetch -q origin "$BRANCH" || { echo "fetch of origin/$BRANCH failed" >&2; exit 1; }
  git reset -q --hard "origin/$BRANCH"
  echo "attempt $attempt on $(git rev-parse --short HEAD): $(git log -1 --format=%s)"
  rebuild || exit 1
  # -A under the listed paths only, so split files dropped from the
  # manifest are removed too and nothing else is swept in.
  git add -A -- $GENERATED
  if git diff --cached --quiet; then
    echo "bank already current; nothing to commit"
    break
  fi
  git diff --cached --stat | tail -n 12
  rebuilt=$(git diff --cached --name-only -- data/split \
    | sed -n 's#^data/split/\(.*\)\.[qc]\.json$#\1#p' | sort -u)
  if [ -n "$rebuilt" ]; then
    body="Split rebuilt for: $(echo $rebuilt | sed 's/ /, /g')."
  else
    body="Hashes only; no split pair changed."
  fi
  git -c user.name="github-actions[bot]" \
      -c user.email="41898282+github-actions[bot]@users.noreply.github.com" \
      commit -q -m "Rebuild bank hashes and split" -m "$body"
  if git push -q origin "HEAD:$BRANCH"; then
    echo "pushed $(git rev-parse --short HEAD) to $BRANCH"
    [ -n "${GITHUB_OUTPUT:-}" ] && echo "pushed=true" >> "$GITHUB_OUTPUT"
    break
  fi
  if [ "$attempt" -ge "$ATTEMPTS" ]; then
    echo "push rejected $attempt times; giving up" >&2
    exit 1
  fi
  echo "push rejected; retrying from the new tip" >&2
  sleep $((attempt * 5))
  attempt=$((attempt + 1))
done

# Content problems don't hold back the rebuild (the edit is already on
# main, and stale hashes would hide it from students), but they fail the
# run so the push shows a red cross.
tokens
exit $?
}
