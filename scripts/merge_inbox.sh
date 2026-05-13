#!/usr/bin/env bash
# Y4 MCQ Bank - inbox -> main merge with structural validation.
#
# Validates every JSON file in data/inbox/ (excluding _merged + _rejected),
# moves passing batches into the main paeds/obgyn files (deduplicated by
# id) and into data/inbox/_merged/, and moves failing batches into
# data/inbox/_rejected/ with a one-line reason.
#
# Structural pass only. The maintainer (or agent) still does the
# judgment pass (calibration check, source spot-check, anti-pattern
# audit) separately before running this.

set -euo pipefail
cd "$(dirname "$0")/.."
mkdir -p data/inbox/_merged data/inbox/_rejected

python3 << 'PY'
import json, os, glob, shutil, datetime

INBOX = sorted(p for p in glob.glob('data/inbox/*.json')
               if '/_merged/' not in p and '/_rejected/' not in p)
if not INBOX:
    print("Inbox empty.")
    raise SystemExit(0)

paeds = json.load(open('data/questions_paeds.json'))
obgyn = json.load(open('data/questions_obgyn.json'))
paeds_ids = {q['id'] for q in paeds}
obgyn_ids = {q['id'] for q in obgyn}

REQUIRED_KEYS = {'id','topic','subtopic','difficulty','tags','stem',
                 'lead_in','options','explanation','sources','created'}
FLOORS = {1:90, 2:110, 3:140, 4:180, 5:220}

for path in INBOX:
    name = os.path.basename(path)
    reasons = []
    try:
        arr = json.load(open(path))
    except Exception as e:
        reasons.append(f"invalid JSON: {e}")
        arr = None
    if isinstance(arr, list) and not reasons:
        for i, q in enumerate(arr):
            if not isinstance(q, dict):
                reasons.append(f"item {i}: not a dict"); break
            missing = REQUIRED_KEYS - set(q.keys())
            if missing: reasons.append(f"item {i} ({q.get('id','?')}): missing {missing}"); break
            if len(q.get('options', [])) != 5:
                reasons.append(f"item {i} ({q['id']}): not 5 options"); break
            n_correct = sum(1 for o in q['options'] if o.get('correct'))
            if n_correct != 1:
                reasons.append(f"item {i} ({q['id']}): {n_correct} correct options"); break
            stem_words = len(q['stem'].split())
            floor = FLOORS.get(q.get('difficulty', 0), 0)
            if stem_words < floor:
                reasons.append(f"item {i} ({q['id']}): stem {stem_words}w < L{q['difficulty']} floor {floor}"); break
            if '—' in q['stem'] or any('—' in str(o.get('rationale','')) for o in q['options']):
                reasons.append(f"item {i} ({q['id']}): em-dash present"); break
    else:
        if not reasons: reasons.append("not a JSON array")
    if reasons:
        dest = f"data/inbox/_rejected/{name}"
        shutil.move(path, dest)
        with open(dest + ".reason.txt", 'w') as f:
            f.write('; '.join(reasons) + '\n')
        print(f"REJECT {name}: {'; '.join(reasons)}")
        continue

    # Passing - merge
    add_p, add_o = [], []
    for q in arr:
        if q.get('topic','').startswith('Paed'):
            if q['id'] not in paeds_ids:
                add_p.append(q); paeds_ids.add(q['id'])
        elif q.get('topic','').startswith('Obstet'):
            if q['id'] not in obgyn_ids:
                add_o.append(q); obgyn_ids.add(q['id'])
    paeds.extend(add_p); obgyn.extend(add_o)
    shutil.move(path, f"data/inbox/_merged/{name}")
    print(f"MERGE  {name}: +{len(add_p)} paeds, +{len(add_o)} obgyn")

# Backup + write main files
for src in ('data/questions_paeds.json', 'data/questions_obgyn.json'):
    shutil.copy(src, src + '.bak')
json.dump(paeds, open('data/questions_paeds.json','w'), indent=2, ensure_ascii=False)
json.dump(obgyn, open('data/questions_obgyn.json','w'), indent=2, ensure_ascii=False)

# Update inbox manifest to drop processed paths
try:
    m = json.load(open('data/inbox_manifest.json'))
    m['inbox'] = [p for p in m.get('inbox', []) if os.path.exists('data/' + p)]
    json.dump(m, open('data/inbox_manifest.json','w'), indent=2)
except Exception: pass

# Bump meta
try:
    meta = json.load(open('data/meta.json'))
    meta['last_added'] = datetime.date.today().isoformat()
    json.dump(meta, open('data/meta.json','w'), indent=2)
except Exception: pass

print(f"\nTotals: {len(paeds)} paeds, {len(obgyn)} obgyn")
PY
echo "Done."
