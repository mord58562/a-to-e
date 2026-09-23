#!/usr/bin/env bash
# Y4 MCQ Bank - merge staged batch files in data/batches/ into the four main
# questions_*.json files (Paediatrics, Obstetrics & Gynaecology, Psychiatry,
# Medicine).
#
# Idempotent: only merges entries whose id isn't already served. Moves merged
# batches to data/batches/_merged/ so they're not re-imported, and drops the
# moved paths from data/batches_manifest.json.
#
# Usage:  ./scripts/merge_batches.sh [--dry-run]
#
# This is a manual sync step. The site loader already pulls live from
# data/batches/ via batches_manifest.json, so questions are visible even
# before merging - but merging cleans up the staging area and locks the IDs
# into the primary main files.
#
# SAFETY CONTRACT
# ---------------
# This script rewrites the whole served bank, so it fails closed:
#
#   * It counts the unique question ids the site serves (the four main files
#     plus every manifest-active batch plus every inbox-manifest file, deduped
#     by id exactly the way assets/app.js does) before and after the merge.
#     The two counts, and the two id sets, must match exactly. If they do not,
#     every file it touched is restored and it exits non-zero.
#   * If that invariant cannot be computed - a main file missing, any served
#     file unparseable, a manifest unreadable, a question with no id, a topic
#     that maps to no main file - it refuses to run and writes nothing.
#   * Batch files sitting in data/batches/ that are NOT listed in the manifest
#     are not served, so merging them would change the bank. They are skipped
#     and reported, never moved.
#
# A previous version of this script loaded only the Paediatrics and Obstetrics
# main files and branched on topic.startswith('Paed')/('Obstet'), so every
# Psychiatry and Medicine question fell through both branches, was dropped,
# and then had its batch file moved out of the manifest. That would have
# deleted 3,560 questions from the served bank. The invariant below exists to
# make that class of failure impossible rather than merely unlikely.

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
        print(f"ABORT: unknown argument {arg!r} (usage: merge_batches.sh [--dry-run])",
              file=sys.stderr)
        raise SystemExit(2)

# Exact topic strings as they appear in the data. Verified against the bank;
# anything outside this map aborts the run rather than being dropped.
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
MERGED_DIR = "data/batches/_merged"


def abort(msg):
    print(f"ABORT: {msg}", file=sys.stderr)
    print("Nothing was written.", file=sys.stderr)
    raise SystemExit(2)


def read_json(path, what):
    """Parse a file that the invariant depends on. Unreadable means abort."""
    try:
        with open(path, encoding="utf-8") as fh:
            return json.load(fh)
    except FileNotFoundError:
        abort(f"{what} is missing: {path}")
    except (json.JSONDecodeError, OSError, UnicodeDecodeError) as exc:
        abort(f"{what} cannot be parsed, so the served-id invariant cannot be "
              f"checked: {path}: {exc}")


def read_question_list(path, what):
    data = read_json(path, what)
    if not isinstance(data, list):
        abort(f"{what} is not a JSON array: {path}")
    for i, q in enumerate(data):
        if not isinstance(q, dict):
            abort(f"{what} entry {i} is not an object: {path}")
    return data


def manifest_paths(manifest_path, key, what):
    manifest = read_json(manifest_path, what)
    if not isinstance(manifest, dict) or not isinstance(manifest.get(key), list):
        abort(f"{what} has no {key!r} array: {manifest_path}")
    paths = manifest[key]
    for p in paths:
        if not isinstance(p, str):
            abort(f"{what} lists a non-string path: {manifest_path}")
    return manifest, paths


def served_ids():
    """The unique ids the site serves, in the loader's own order.

    Mirrors assets/app.js loadData(): the four main files, then every path in
    batches_manifest.json, then every path in inbox_manifest.json, deduped by
    id with the first occurrence winning. A manifest path that does not exist
    on disk serves nothing (the loader's fetch fails and is counted as empty),
    so a missing file is tolerated here too - but a file that exists and does
    not parse aborts, because then the count cannot be trusted.
    """
    _, batch_paths = manifest_paths(MANIFEST, "batches", "the batch manifest")
    inbox_paths = []
    if os.path.exists(INBOX_MANIFEST):
        _, inbox_paths = manifest_paths(INBOX_MANIFEST, "inbox", "the inbox manifest")

    ordered = list(MAIN_ORDER)
    for rel in list(batch_paths) + list(inbox_paths):
        full = os.path.join("data", rel)
        if os.path.exists(full):
            ordered.append(full)

    seen = []
    seen_set = set()
    for path in ordered:
        for q in read_question_list(path, "a served file"):
            qid = q.get("id")
            if not qid:
                continue  # the loader drops id-less entries too
            if qid in seen_set:
                continue
            seen_set.add(qid)
            seen.append(qid)
    return seen_set


# ---------------------------------------------------------------- preflight

for topic, path in MAIN_FILES:
    if not os.path.exists(path):
        abort(f"main file for {topic} is missing: {path}")

manifest_obj, active_rel = manifest_paths(MANIFEST, "batches", "the batch manifest")
active_full = {os.path.normpath(os.path.join("data", rel)) for rel in active_rel}

before = served_ids()
print(f"served before merge: {len(before)} unique ids")

on_disk = sorted(glob.glob("data/batches/*.json"))
candidates, unregistered = [], []
for path in on_disk:
    if os.path.normpath(path) in active_full:
        candidates.append(path)
    else:
        unregistered.append(path)

if unregistered:
    print(f"\nskipping {len(unregistered)} batch file(s) not listed in the manifest "
          f"(not served, so merging them would change the bank):")
    for path in unregistered:
        print(f"  {os.path.basename(path)}")

if not candidates:
    print("\nNo manifest-active batches to merge.")
    raise SystemExit(0)

# Validate every batch before touching anything. Two phases on purpose: a bad
# topic or a missing id must stop the run while the tree is still untouched.
staged = {}
for path in candidates:
    data = read_question_list(path, "a batch file")
    for i, q in enumerate(data):
        if not q.get("id"):
            abort(f"{path} entry {i} has no id")
        topic = q.get("topic")
        if topic not in TOPIC_TO_FILE:
            abort(f"{path} entry {i} (id {q['id']}) has topic {topic!r}, which maps "
                  f"to no main file. Known topics: "
                  f"{', '.join(repr(t) for t in TOPIC_TO_FILE)}")
    staged[path] = data

# -------------------------------------------------------------------- merge

mains = {path: read_question_list(path, "a main file") for _, path in MAIN_FILES}
# One id set across all four main files: the loader dedupes globally, so an id
# already held by any main file must not be appended to another.
main_ids = {q["id"] for data in mains.values() for q in data if q.get("id")}

merged_files = []
added_total = 0
for path in candidates:
    added = {p: 0 for p in MAIN_ORDER}
    for q in staged[path]:
        if q["id"] in main_ids:
            continue
        dest = TOPIC_TO_FILE[q["topic"]]
        mains[dest].append(q)
        main_ids.add(q["id"])
        added[dest] += 1
    added_total += sum(added.values())
    summary = ", ".join(f"+{added[p]} {os.path.basename(p)[10:-5]}" for p in MAIN_ORDER)
    print(f"{os.path.basename(path)}: {summary}")
    merged_files.append(path)

verb = "would move" if DRY_RUN else "move"
print(f"\n{added_total} question(s) {verb} into the main files "
      f"from {len(merged_files)} batch file(s)")

if DRY_RUN:
    print("\n--dry-run: nothing written.")
    for topic, path in MAIN_FILES:
        print(f"  {topic}: {len(mains[path])} (was "
              f"{len(read_question_list(path, 'a main file'))})")
    raise SystemExit(0)

# ------------------------------------------------------------------- commit
#
# Everything from here is undone in full if the invariant fails.

backups = {}
try:
    os.makedirs(MERGED_DIR, exist_ok=True)

    for path in MAIN_ORDER + [MANIFEST, META]:
        if os.path.exists(path):
            shutil.copy2(path, path + ".bak")
            backups[path] = path + ".bak"

    for path in MAIN_ORDER:
        with open(path, "w", encoding="utf-8") as fh:
            json.dump(mains[path], fh, indent=2, ensure_ascii=False)

    moved = []
    for path in merged_files:
        dest = os.path.join(MERGED_DIR, os.path.basename(path))
        shutil.move(path, dest)
        moved.append((path, dest))

    manifest_obj["batches"] = [rel for rel in manifest_obj["batches"]
                               if os.path.exists(os.path.join("data", rel))]
    manifest_obj["updated"] = datetime.date.today().isoformat()
    with open(MANIFEST, "w", encoding="utf-8") as fh:
        json.dump(manifest_obj, fh, indent=2, ensure_ascii=False)
        fh.write("\n")
    # Per-file cache keys for the loader; drops the merged paths' hashes.
    sys.path.insert(0, "scripts")
    import manifest_hashes
    manifest_hashes.refresh()

    if os.path.exists(META):
        meta = read_json(META, "meta.json")
        if isinstance(meta, dict):
            meta["last_added"] = datetime.date.today().isoformat()
            with open(META, "w", encoding="utf-8") as fh:
                json.dump(meta, fh, indent=2, ensure_ascii=False)

    after = served_ids()
    if after != before:
        lost = sorted(before - after)
        gained = sorted(after - before)
        raise AssertionError(
            f"served ids changed: {len(before)} before, {len(after)} after; "
            f"{len(lost)} lost, {len(gained)} gained. "
            f"lost sample: {lost[:10]} gained sample: {gained[:10]}")

except BaseException as exc:
    print(f"\nFAILED: {exc}", file=sys.stderr)
    print("Restoring every file this run touched.", file=sys.stderr)
    for src, dest in reversed(locals().get("moved", [])):
        if os.path.exists(dest):
            shutil.move(dest, src)
    for path, bak in backups.items():
        shutil.copy2(bak, path)
        os.remove(bak)
    print("Restored. The bank is exactly as it was.", file=sys.stderr)
    raise SystemExit(1)

print(f"\nserved after merge:  {len(after)} unique ids - invariant holds")
print(f"pre-merge copies kept at {', '.join(sorted(backups.values()))} (gitignored)")
print("Totals: " + ", ".join(f"{topic} {len(mains[path])}" for topic, path in MAIN_FILES))
PY
echo "Done. Refresh the site."
