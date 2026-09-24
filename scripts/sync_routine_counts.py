#!/usr/bin/env python3
"""Refresh the counts the scheduled remote routine is given, from the bank
the site serves.

Writes total_questions and by_topic into data/meta.json, the snapshot blocks
in the routine's context file, and .routine_prompt_latest.txt (gitignored):
the live prompt with its totals line updated. Paste that into the routine
with RemoteTrigger.

The prompt and context file live outside this repo, which is public and
served from its root. Two environment variables locate them:

    ATOE_PRIVATE_DIR       required; holds routine_prompt*.txt
    ATOE_ROUTINE_CONTEXT   optional; path of the context file to update

Usage:
    ATOE_PRIVATE_DIR=<dir> python3 scripts/sync_routine_counts.py
"""
import json, os, re, sys, collections

from bank import SERVABLE_TOPICS, is_servable

REPO = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PRIVATE = os.environ.get('ATOE_PRIVATE_DIR') or None
CTX = os.environ.get('ATOE_ROUTINE_CONTEXT') or None


def served_questions():
    """The questions the site serves, loaded the way loadData() does: the
    four main files, every batch in batches_manifest.json, every file in
    inbox_manifest.json; unservable records dropped first, then deduped by
    id with the first copy winning. A file that is missing or unparseable
    contributes nothing, as on the site, and is reported.

    live_totals() and live_difficulty() both read this, so the module
    counts and the difficulty counts describe the same bank."""
    paths = [os.path.join(REPO, f'data/questions_{m}.json')
             for m in ('paeds', 'obgyn', 'psych', 'medicine')]
    for rel, key in (('data/batches_manifest.json', 'batches'),
                     ('data/inbox_manifest.json', 'inbox')):
        full = os.path.join(REPO, rel)
        if not os.path.exists(full):
            continue
        mani = json.load(open(full))  # an unreadable manifest aborts: counts would be wrong
        paths += [os.path.join(REPO, 'data', b) for b in mani.get(key, []) if isinstance(b, str)]
    seen, out = set(), []
    for p in paths:
        try:
            data = json.load(open(p))
        except (FileNotFoundError, json.JSONDecodeError) as exc:
            print(f'WARNING: {os.path.relpath(p, REPO)} contributes nothing: {exc}', file=sys.stderr)
            continue
        if not isinstance(data, list):
            print(f'WARNING: {os.path.relpath(p, REPO)} is not a JSON array', file=sys.stderr)
            continue
        for q in data:
            if not is_servable(q) or q['id'] in seen:
                continue
            seen.add(q['id'])
            out.append(q)
    return out


def live_totals(questions=None):
    """Unique served questions per module."""
    totals = collections.Counter(q['topic'] for q in (questions or served_questions()))
    return {t: totals[t] for t in SERVABLE_TOPICS}


def live_difficulty(questions=None):
    """Served questions per difficulty tier. The routine decides whether to
    generate L5 from these numbers, so they have to be refreshed with the
    module counts rather than left to go stale."""
    return collections.Counter(q['difficulty'] for q in (questions or served_questions()))


# Per-tier share of each topic, from the live routine prompt.
TIER_TARGETS = {1: 1, 2: 28, 3: 46, 4: 19, 5: 6}


def update_difficulty(tiers):
    """Rewrite Section 2's difficulty snapshot.

    Every share is a share of the WHOLE BANK. A previous run read L5 as a
    share of the L3-L5 tiers instead, got 6.03% against a 4.36% true share,
    and skipped L5 generation on the strength of it.
    """
    total = sum(tiers.values())
    if not total:
        return False
    lines = ['Live distribution snapshot (autosynced by '
             'scripts/sync_routine_counts.py). Every percentage below is a '
             'share of the WHOLE BANK of ' + str(total) + ' questions, not of '
             'any subset of tiers:']
    for d in (1, 2, 3, 4, 5):
        n = tiers.get(d, 0)
        pct = TIER_TARGETS[d]
        target = int(round(pct / 100 * total))
        side = 'below' if n < target else 'at or above'
        lines.append(f'- L{d}: {n} ({100 * n / total:.2f}% of bank) <- {side} '
                     f'the ~{pct}% target ({target} Qs)')
    block = '\n'.join(lines) + '\n'
    if not CTX or not os.path.exists(CTX):
        print(f'WARNING: context file {CTX or "(ATOE_ROUTINE_CONTEXT unset)"} not found; '
              f'difficulty snapshot not synced')
        return False
    text = open(CTX).read()
    pattern = r'Live distribution snapshot \(.*?\n(?:- L\d: [^\n]*\n){5}'
    if not re.search(pattern, text, flags=re.DOTALL):
        print(f'WARNING: difficulty snapshot block not found in {CTX}')
        return False
    new = re.sub(pattern, block, text, count=1, flags=re.DOTALL)
    open(CTX, 'w').write(new)
    return new != text


def update_meta(totals):
    """Write total_questions + by_topic into data/meta.json so the
    portfolio fetch can show a live question count."""
    path = os.path.join(REPO, 'data/meta.json')
    # An unreadable meta.json aborts. Defaulting to {} rewrote the file with
    # only the counts and lost version, updated and last_added.
    try:
        meta = json.load(open(path))
    except (OSError, json.JSONDecodeError) as exc:
        raise SystemExit(f'ABORT: cannot read {path} ({exc}); meta.json left untouched')
    if not isinstance(meta, dict):
        raise SystemExit(f'ABORT: {path} is not a JSON object; meta.json left untouched')
    meta['total_questions'] = sum(totals.values())
    meta['by_topic'] = totals
    with open(path,'w') as f:
        json.dump(meta, f, indent=2); f.write('\n')

def update_context(totals):
    """Rewrite Section 2's 'Current snapshot' block with fresh numbers."""
    if not CTX or not os.path.exists(CTX):
        print(f'WARNING: context file {CTX or "(ATOE_ROUTINE_CONTEXT unset)"} not found; '
              f'snapshot not synced')
        return False
    text = open(CTX).read()
    block = (
        "Current snapshot (autosynced by scripts/sync_routine_counts.py; "
        "always read live state via the status check below before deciding cluster):\n"
        f"- Paeds: {totals['Paediatrics']}\n"
        f"- Obgyn: {totals['Obstetrics & Gynaecology']}\n"
        f"- Psych: {totals['Psychiatry']}\n"
        f"- Medicine: {totals['Medicine']}\n"
        f"- Total: {sum(totals.values())}\n"
    )
    pattern = r'Current snapshot \(.*?\):\n(?:- [^\n]*\n){4,6}'
    if not re.search(pattern, text, flags=re.DOTALL):
        print(f'WARNING: snapshot block not found in {CTX}')
        return False
    new = re.sub(pattern, block, text, count=1, flags=re.DOTALL)
    open(CTX,'w').write(new)
    return new != text

# The routine's prompt lives in ATOE_PRIVATE_DIR and is edited there; this
# script only refreshes its totals line. Keeping a copy of the prompt here
# let a regeneration silently revert the live one.
PROMPT_GLOB = re.compile(r'^routine_prompt(_\d{4}-\d{2}-\d{2})?\.txt$')
TOTALS_LINE = re.compile(
    r'As of \d{4}-\d{2}-\d{2} the per-topic totals were Paediatrics \d+, '
    r'Obstetrics & Gynaecology \d+, Psychiatry \d+, Medicine \d+, total \d+\.')


def live_prompt_path():
    """The newest routine_prompt*.txt in ATOE_PRIVATE_DIR (dated names sort
    by date; an undated routine_prompt.txt wins)."""
    if not PRIVATE or not os.path.isdir(PRIVATE):
        return None
    names = sorted(n for n in os.listdir(PRIVATE) if PROMPT_GLOB.match(n))
    if 'routine_prompt.txt' in names:
        return os.path.join(PRIVATE, 'routine_prompt.txt')
    return os.path.join(PRIVATE, names[-1]) if names else None


def build_prompt(totals, today=None):
    """The live prompt with its totals line brought up to date. Returns
    (prompt, source path), or (None, reason) when it cannot be built."""
    path = live_prompt_path()
    if not path:
        return None, f'no routine_prompt*.txt in {PRIVATE}'
    text = open(path, encoding='utf-8').read()
    today = today or __import__('datetime').date.today().isoformat()
    line = (f'As of {today} the per-topic totals were '
            f'Paediatrics {totals["Paediatrics"]}, '
            f'Obstetrics & Gynaecology {totals["Obstetrics & Gynaecology"]}, '
            f'Psychiatry {totals["Psychiatry"]}, Medicine {totals["Medicine"]}, '
            f'total {sum(totals.values())}.')
    new, n = TOTALS_LINE.subn(line, text, count=1)
    if not n:
        return None, f'totals line not found in {path}; prompt not rebuilt'
    return new, path


def main():
    if not PRIVATE or not os.path.isdir(PRIVATE):
        print('ABORT: set ATOE_PRIVATE_DIR to the directory that holds '
              'routine_prompt*.txt (currently '
              f'{PRIVATE or "unset"}); nothing was written', file=sys.stderr)
        return 2
    served = served_questions()
    totals = live_totals(served)
    print(f'Live totals: Paeds={totals["Paediatrics"]} Obgyn={totals["Obstetrics & Gynaecology"]} Psych={totals["Psychiatry"]} Medicine={totals["Medicine"]} Total={sum(totals.values())}')
    tiers = live_difficulty(served)
    print('Live difficulty: ' + ' '.join(
        f'L{d}={tiers.get(d, 0)}' for d in (1, 2, 3, 4, 5)))
    update_meta(totals)
    changed = update_context(totals)
    changed = update_difficulty(tiers) or changed
    print(f'context file updated: {changed}')
    prompt, source = build_prompt(totals)
    if prompt is None:
        print(f'WARNING: {source}')
        return 1
    out_path = os.path.join(REPO, '.routine_prompt_latest.txt')
    open(out_path, 'w', encoding='utf-8').write(prompt)
    print(f'Prompt from {source} written to {out_path} ({len(prompt)} chars); '
          f'pass it to RemoteTrigger update.')
    return 0

if __name__ == '__main__':
    sys.exit(main())
