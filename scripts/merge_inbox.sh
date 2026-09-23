#!/usr/bin/env bash
# Y4 MCQ Bank - inbox -> main merge with structural validation.
#
# Validates every JSON file in data/inbox/ (excluding _merged + _rejected).
# A passing file's questions are appended to the main questions_*.json file
# for their topic, and the file moves to data/inbox/_merged/. A failing file
# moves to data/inbox/_rejected/ with a one-line reason beside it.
#
# Usage:  ./scripts/merge_inbox.sh [--dry-run]
#
# Structural pass only. The maintainer (or agent) still does the judgment
# pass (calibration check, source spot-check, anti-pattern audit, and
# scripts/dupe_gate.py --new) separately before running this.
#
# SAFETY CONTRACT (same shape as merge_batches.sh)
# ------------------------------------------------
#   * All four disciplines map to a main file. A topic outside the four
#     rejects the file; nothing is dropped on a fall-through branch.
#   * Ids are checked against everything the site serves (main files, every
#     manifest-listed batch, every other inbox-manifest file). A reused id
#     rejects the file: appended to a main file it would shadow the
#     published copy, because the loader keeps the first copy of an id.
#   * The served id set is computed before and after. After must equal
#     before plus the merged ids, exactly. Otherwise every touched file is
#     restored and the script exits non-zero.
#   * No stem word floors. They were retired on 2026-05-20, and 88% of the
#     live bank sits below them.
#
# A previous version branched on topic.startswith('Paed') / ('Obstet'), so
# Psychiatry and Medicine questions fell through, the file still moved to
# _merged/ and its manifest entry was pruned: those questions left the bank.

set -euo pipefail
cd "$(dirname "$0")/.."

python3 - "$@" << 'PY'
import datetime
import glob
import json
import os
import shutil
import sys

DRY_RUN = "--dry-run" in sys.argv[1:]
for arg in sys.argv[1:]:
    if arg != "--dry-run":
        print(f"ABORT: unknown argument {arg!r} (usage: merge_inbox.sh [--dry-run])",
              file=sys.stderr)
        raise SystemExit(2)

MAIN_FILES = [
    ("Paediatrics", "data/questions_paeds.json"),
    ("Obstetrics & Gynaecology", "data/questions_obgyn.json"),
    ("Psychiatry", "data/questions_psych.json"),
    ("Medicine", "data/questions_medicine.json"),
]
TOPIC_TO_FILE = dict(MAIN_FILES)
MAIN_ORDER = [path for _, path in MAIN_FILES]
MANIFEST = "data/batches_manifest.json"
INBOX_MANIFEST = "data/inbox_manifest.json"
META = "data/meta.json"
MERGED_DIR = "data/inbox/_merged"
REJECTED_DIR = "data/inbox/_rejected"
REQUIRED_KEYS = {"id", "topic", "subtopic", "difficulty", "tags", "stem",
                 "lead_in", "options", "explanation", "sources"}
EM_DASH = "\u2014"


def abort(msg):
    print(f"ABORT: {msg}", file=sys.stderr)
    print("Nothing was written.", file=sys.stderr)
    raise SystemExit(2)


def read_json(path, what):
    try:
        with open(path, encoding="utf-8") as fh:
            return json.load(fh)
    except FileNotFoundError:
        abort(f"{what} is missing: {path}")
    except (json.JSONDecodeError, OSError, UnicodeDecodeError) as exc:
        abort(f"{what} cannot be parsed: {path}: {exc}")


def list_paths(manifest_path, key):
    if not os.path.exists(manifest_path):
        return []
    m = read_json(manifest_path, "a manifest")
    if not isinstance(m, dict) or not isinstance(m.get(key), list):
        abort(f"{manifest_path} has no {key!r} array")
    return [p for p in m[key] if isinstance(p, str)]


def served_files(exclude=()):
    """Every file the loader reads, in its order (assets/app.js loadData)."""
    out = list(MAIN_ORDER)
    for rel in list_paths(MANIFEST, "batches") + list_paths(INBOX_MANIFEST, "inbox"):
        full = os.path.normpath(os.path.join("data", rel))
        if os.path.exists(full) and full not in exclude:
            out.append(full)
    return out


def served_ids(exclude=()):
    ids = set()
    for path in served_files(exclude):
        data = read_json(path, "a served file")
        if not isinstance(data, list):
            abort(f"a served file is not a JSON array: {path}")
        ids.update(q.get("id") for q in data if isinstance(q, dict) and q.get("id"))
    return ids


def has_em_dash(node):
    if isinstance(node, str):
        return EM_DASH in node
    if isinstance(node, list):
        return any(has_em_dash(x) for x in node)
    if isinstance(node, dict):
        return any(has_em_dash(v) for v in node.values())
    return False


def validate(arr, taken):
    """First reason this file cannot merge, or None."""
    if not isinstance(arr, list) or not arr:
        return "not a non-empty JSON array"
    seen = set()
    for i, q in enumerate(arr):
        tag = f"item {i} ({q.get('id', '?') if isinstance(q, dict) else '?'})"
        if not isinstance(q, dict):
            return f"item {i}: not an object"
        missing = REQUIRED_KEYS - set(q)
        if missing:
            return f"{tag}: missing {sorted(missing)}"
        if not isinstance(q["id"], str) or not q["id"]:
            return f"{tag}: id is not a non-empty string"
        if q["id"] in seen:
            return f"{tag}: id appears twice in this file"
        seen.add(q["id"])
        if q["id"] in taken:
            return f"{tag}: id already served by another file"
        if q["topic"] not in TOPIC_TO_FILE:
            return f"{tag}: topic {q['topic']!r} is not one of {list(TOPIC_TO_FILE)}"
        if not isinstance(q["difficulty"], int) or not 1 <= q["difficulty"] <= 5:
            return f"{tag}: difficulty must be an integer 1-5"
        if not isinstance(q["stem"], str) or not q["stem"].strip():
            return f"{tag}: empty stem"
        opts = q["options"]
        if not isinstance(opts, list) or len(opts) != 5 or not all(isinstance(o, dict) for o in opts):
            return f"{tag}: options must be 5 objects"
        n_correct = sum(1 for o in opts if o.get("correct") is True)
        if n_correct != 1:
            return f"{tag}: {n_correct} correct options"
        if has_em_dash(q):
            return f"{tag}: em-dash (U+2014) present"
    return None


def dump_like(path, data):
    """Write in the file's existing layout (indent 1 or 2, trailing newline or not)."""
    indent, nl = 1, ""
    if os.path.exists(path):
        with open(path, encoding="utf-8") as fh:
            raw = fh.read()
        old = json.loads(raw)
        for ind, n in ((1, ""), (2, "\n"), (2, ""), (1, "\n")):
            if json.dumps(old, indent=ind, ensure_ascii=False) + n == raw:
                indent, nl = ind, n
                break
    with open(path, "w", encoding="utf-8") as fh:
        fh.write(json.dumps(data, indent=indent, ensure_ascii=False) + nl)


INBOX = sorted(p for p in glob.glob("data/inbox/*.json"))
if not INBOX:
    print("Inbox empty.")
    raise SystemExit(0)

for _, path in MAIN_FILES:
    if not os.path.exists(path):
        abort(f"main file missing: {path}")

before = served_ids()
print(f"served before merge: {len(before)} unique ids")

mains = {path: read_json(path, "a main file") for path in MAIN_ORDER}
accepted, rejected = [], []
claimed = set()
for path in INBOX:
    norm = os.path.normpath(path)
    try:
        with open(path, encoding="utf-8") as fh:
            arr = json.load(fh)
    except (json.JSONDecodeError, OSError, UnicodeDecodeError) as exc:
        rejected.append((path, f"invalid JSON: {exc}"))
        continue
    # Ids this file may not reuse: everything served except this file itself
    # (an inbox-manifest file is already served), plus ids claimed by an
    # earlier inbox file in this run.
    taken = served_ids(exclude={norm}) | claimed
    reason = validate(arr, taken)
    if reason:
        rejected.append((path, reason))
        continue
    claimed.update(q["id"] for q in arr)
    accepted.append((path, arr))

added_ids = set()
for path, arr in accepted:
    counts = {p: 0 for p in MAIN_ORDER}
    for q in arr:
        dest = TOPIC_TO_FILE[q["topic"]]
        mains[dest].append(q)
        counts[dest] += 1
        added_ids.add(q["id"])
    print(f"MERGE  {os.path.basename(path)}: " +
          ", ".join(f"+{counts[p]} {os.path.basename(p)[10:-5]}" for p in MAIN_ORDER))
listed_inbox = {os.path.normpath(os.path.join("data", p)) for p in list_paths(INBOX_MANIFEST, "inbox")}
for path, reason in rejected:
    note = " (listed in inbox_manifest.json, so it is served: left in place)" \
        if os.path.normpath(path) in listed_inbox else ""
    print(f"REJECT {os.path.basename(path)}: {reason}{note}")

if DRY_RUN:
    print("\n--dry-run: nothing written.")
    raise SystemExit(0)

os.makedirs(MERGED_DIR, exist_ok=True)
os.makedirs(REJECTED_DIR, exist_ok=True)
backups, moved = {}, []
try:
    for path in MAIN_ORDER + [INBOX_MANIFEST, MANIFEST, META]:
        if os.path.exists(path):
            shutil.copy2(path, path + ".bak")
            backups[path] = path + ".bak"
    if accepted:
        for path in MAIN_ORDER:
            dump_like(path, mains[path])
    for path, _arr in accepted:
        dest = os.path.join(MERGED_DIR, os.path.basename(path))
        shutil.move(path, dest)
        moved.append((path, dest))
    for path, reason in rejected:
        if os.path.normpath(path) in listed_inbox:
            continue  # served today; moving it would drop live questions
        dest = os.path.join(REJECTED_DIR, os.path.basename(path))
        shutil.move(path, dest)
        moved.append((path, dest))
        with open(dest + ".reason.txt", "w", encoding="utf-8") as fh:
            fh.write(reason + "\n")

    if os.path.exists(INBOX_MANIFEST):
        m = read_json(INBOX_MANIFEST, "the inbox manifest")
        m["inbox"] = [p for p in m.get("inbox", []) if os.path.exists(os.path.join("data", p))]
        with open(INBOX_MANIFEST, "w", encoding="utf-8") as fh:
            fh.write(json.dumps(m, indent=2, ensure_ascii=False) + "\n")
    sys.path.insert(0, "scripts")
    import manifest_hashes
    manifest_hashes.refresh(quiet=True)

    if accepted and os.path.exists(META):
        meta = read_json(META, "meta.json")
        if not isinstance(meta, dict):
            raise AssertionError("meta.json is not an object")
        meta["last_added"] = datetime.date.today().isoformat()
        with open(META, "w", encoding="utf-8") as fh:
            fh.write(json.dumps(meta, indent=2, ensure_ascii=False) + "\n")

    after = served_ids()
    if after != before | added_ids:
        lost = sorted(before - after)
        gained = sorted(after - (before | added_ids))
        raise AssertionError(
            f"served ids changed unexpectedly: {len(before)} before, {len(after)} after; "
            f"lost {lost[:10]} gained {gained[:10]}")
except BaseException as exc:
    print(f"\nFAILED: {exc}", file=sys.stderr)
    print("Restoring every file this run touched.", file=sys.stderr)
    for src, dest in reversed(moved):
        if os.path.exists(dest):
            shutil.move(dest, src)
        if os.path.exists(dest + ".reason.txt"):
            os.remove(dest + ".reason.txt")
    for path, bak in backups.items():
        shutil.copy2(bak, path)
        os.remove(bak)
    print("Restored. The bank is exactly as it was.", file=sys.stderr)
    raise SystemExit(1)

print(f"\nserved after merge: {len(after)} unique ids (+{len(added_ids)}) - invariant holds")
print("Totals: " + ", ".join(f"{t} {len(mains[p])}" for t, p in MAIN_FILES))
PY
echo "Done."
