#!/usr/bin/env bash
# Y4 MCQ Bank - merge any staged batch files in data/batches/ into the
# main questions_paeds.json / questions_obgyn.json files.
#
# Idempotent: only merges entries whose id isn't already in the main
# file. Moves merged batches to data/batches/_merged/ so they're not
# re-imported.
#
# Usage:  ./scripts/merge_batches.sh
#
# This is a manual sync step. The site loader already pulls live from
# data/batches/ via batches_manifest.json, so questions are visible
# even before merging - but merging cleans up the staging area and
# locks the IDs into the canonical main files.

set -euo pipefail
cd "$(dirname "$0")/.."

mkdir -p data/batches/_merged

python3 << 'PY'
import json, os, shutil, glob

BATCHES = sorted(glob.glob('data/batches/*.json'))
if not BATCHES:
    print("No batches to merge.")
    raise SystemExit(0)

def load(p):
    try:
        return json.load(open(p))
    except Exception as e:
        return None

paeds = load('data/questions_paeds.json') or []
obgyn = load('data/questions_obgyn.json') or []
paeds_ids = {q['id'] for q in paeds}
obgyn_ids = {q['id'] for q in obgyn}

merged_files = []
for bpath in BATCHES:
    data = load(bpath)
    if not isinstance(data, list) or not data:
        print(f"skip {bpath}: empty or invalid")
        continue
    add_p, add_o = [], []
    for q in data:
        if q.get('topic', '').startswith('Paed'):
            if q['id'] not in paeds_ids:
                add_p.append(q); paeds_ids.add(q['id'])
        elif q.get('topic', '').startswith('Obstet'):
            if q['id'] not in obgyn_ids:
                add_o.append(q); obgyn_ids.add(q['id'])
    paeds.extend(add_p)
    obgyn.extend(add_o)
    print(f"{os.path.basename(bpath)}: +{len(add_p)} paeds, +{len(add_o)} obgyn")
    merged_files.append(bpath)

# Backup main files before writing
for src in ('data/questions_paeds.json', 'data/questions_obgyn.json'):
    if os.path.exists(src):
        shutil.copy(src, src + '.bak')

json.dump(paeds, open('data/questions_paeds.json', 'w'), indent=2, ensure_ascii=False)
json.dump(obgyn, open('data/questions_obgyn.json', 'w'), indent=2, ensure_ascii=False)

# Move merged batches to _merged
for bpath in merged_files:
    dest = os.path.join('data/batches/_merged', os.path.basename(bpath))
    shutil.move(bpath, dest)

# Update manifest to drop merged paths
try:
    manifest = json.load(open('data/batches_manifest.json'))
    remaining = [p for p in manifest.get('batches', [])
                 if not os.path.exists('data/' + p) is False
                 and os.path.exists('data/' + p)]
    manifest['batches'] = remaining
    json.dump(manifest, open('data/batches_manifest.json', 'w'), indent=2)
except Exception as e:
    print('manifest update skipped:', e)

# Bump meta
try:
    import datetime
    meta = json.load(open('data/meta.json'))
    meta['last_added'] = datetime.date.today().isoformat()
    json.dump(meta, open('data/meta.json', 'w'), indent=2)
except Exception:
    pass

print(f"\nTotals: {len(paeds)} paeds, {len(obgyn)} obgyn")
PY
echo "Done. Refresh the site."
