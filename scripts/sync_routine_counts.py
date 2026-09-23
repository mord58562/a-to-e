#!/usr/bin/env python3
"""Sync the scheduled remote routine's prompt + .routine-context.md with
the LIVE module totals from data/. Run after any commit that adds/removes
questions so the prompt always reflects the current state of the bank.

Usage:
    python3 scripts/sync_routine_counts.py                  # update both files in place + show patch
    python3 scripts/sync_routine_counts.py --remote         # also push the new prompt to the routine via RemoteTrigger
"""
import json, os, re, sys, subprocess, collections

REPO = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
# The routine's context file left the repo on 2026-09-21: this repo is
# public and Pages serves its root, so an internal file at a guessable
# path was fetchable and returned 200. It sits beside the repo now. This
# script kept reading the old location and had been dying on
# FileNotFoundError at every call since, which is a silent failure: the
# routine's snapshot simply stopped being updated.
PRIVATE = os.path.join(os.path.dirname(REPO), 'private-notes')
CTX = next((p for p in (os.path.join(PRIVATE, '.routine-context.md'),
                        os.path.join(REPO, '.routine-context.md'))
            if os.path.exists(p)), None)

SERVABLE_TOPICS = ('Paediatrics', 'Obstetrics & Gynaecology', 'Psychiatry', 'Medicine')


def is_servable(q):
    """Mirror of isServable() in assets/app.js: what the site will show."""
    if not isinstance(q, dict) or not q.get('id') or not isinstance(q.get('stem'), str):
        return False
    if q.get('topic') not in SERVABLE_TOPICS:
        return False
    d = q.get('difficulty')
    if not isinstance(d, int) or isinstance(d, bool) or not 1 <= d <= 5:
        return False
    opts = q.get('options')
    if not isinstance(opts, list) or len(opts) < 2 or not all(isinstance(o, dict) for o in opts):
        return False
    return sum(1 for o in opts if o.get('correct') is True) == 1


def served_questions():
    """The questions the site serves, loaded the way loadData() does: the
    four main files, every batch in batches_manifest.json, every file in
    inbox_manifest.json; unservable records dropped first, then deduped by
    id with the first copy winning. A file that is missing or unparseable
    contributes nothing, as on the site, and is reported.

    live_totals() and live_difficulty() both read this, so the module
    counts and the difficulty counts describe the same bank. They used to
    load separately and disagree on a file that did not parse."""
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
        line = f'- L{d}: {n} ({100 * n / total:.2f}% of bank)'
        if d == 5:
            target = int(round(0.05 * total))
            if n < target:
                line += f' <- below the ~5% target ({target} Qs); keep generating L5'
            else:
                line += ' <- at or above the ~5% target'
        if d == 4:
            line += ' (target 15-20% of bank)'
        lines.append(line)
    block = '\n'.join(lines) + '\n'
    if not CTX:
        print('WARNING: .routine-context.md not found; difficulty snapshot not synced')
        return False
    text = open(CTX).read()
    pattern = r'Live distribution snapshot \(.*?\n(?:- L\d: [^\n]*\n){5}'
    if not re.search(pattern, text, flags=re.DOTALL):
        print('WARNING: difficulty snapshot block not found in .routine-context.md')
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
    if not CTX:
        print('WARNING: .routine-context.md not found; snapshot not synced. '
              'Expected it in ' + PRIVATE)
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
        print('WARNING: snapshot block not found in .routine-context.md')
        return False
    new = re.sub(pattern, block, text, count=1, flags=re.DOTALL)
    open(CTX,'w').write(new)
    return new != text

def build_prompt(totals):
    return PROMPT_TEMPLATE.format(
        paeds=totals['Paediatrics'],
        obgyn=totals['Obstetrics & Gynaecology'],
        psych=totals['Psychiatry'],
        medicine=totals['Medicine'],
        total=sum(totals.values()),
    )

PROMPT_TEMPLATE = """You are the scheduled remote agent for the A to E MCQ Bank (a Y4 Australian medical exam prep project).

=================================================================
LIVE BANK STATE (autosynced by scripts/sync_routine_counts.py)
=================================================================

At last sync the module totals were:
- Paediatrics: {paeds}
- Obstetrics & Gynaecology: {obgyn}
- Psychiatry: {psych}
- Medicine: {medicine}
- TOTAL: {total}

These numbers may be slightly stale; ALWAYS run the live state-check in `.routine-context.md` Section 3 Step 1 before deciding which module to target. Use the numbers above only as the most recent confirmed reference.

=================================================================
STEP 0 - PUSH PROBE. RUN THIS FIRST. NO EXCEPTIONS.
=================================================================

The maintainer has a STRICT 15-runs-per-day quota. Every aborted run that did not push wasted a slot. Before generating ANYTHING, prove push works. If it does not, exit IMMEDIATELY before generating a single question. Generation costs tokens; the push probe costs ~3 git commands.

```
cd a-to-e || cd y4-pocket-companion || {{ echo 'REPO NOT FOUND - abort'; exit 1; }}
git config user.email 'noreply@anthropic.com'
git config user.name 'A to E scheduled agent'
PROBE=probe-$(date -u +%Y%m%dT%H%M%SZ)
git push origin HEAD:refs/heads/$PROBE 2>&1 | tee /tmp/probe.log
if [ ${{PIPESTATUS[0]}} -ne 0 ]; then
  echo '======================================'
  echo 'PUSH UNAVAILABLE - ABORTING BEFORE GENERATION'
  echo 'Reason (from probe log):'
  cat /tmp/probe.log
  echo '======================================'
  echo 'Quota saved: 0 questions generated, 0 tokens spent on generation.'
  echo 'Maintainer: investigate push path before re-enabling routine.'
  exit 1
fi
git push origin --delete $PROBE 2>/dev/null || true
echo 'PUSH PROBE OK - proceeding with generation'
```

If the probe fails: EXIT. Do not try alternative push methods (gh CLI, MCP push_files, PR fallback). The previous prompt's fallback ladder masked the failure and wasted quota. We want to FAIL FAST and FAIL VISIBLY.

=================================================================
STEP 1 onwards - only if STEP 0 succeeded
=================================================================

1. Read `.routine-context.md` end-to-end if it is available. It is no longer in the repo (the repo is public and Pages serves its root); if it is absent from the clone, proceed on this prompt plus the template below, and say so in your report.
2. Read the prompt template at `assets/prompt-template.txt`. Every rule there is binding.
3. Run the state-check script from `.routine-context.md` Section 3 Step 1 to see LIVE module totals (the numbers in the LIVE BANK STATE block above may be stale).
4. **Module-selection algorithm (apply in order, against LIVE totals):**
   - If any module is below 250: pick that one (catch-up phase).
   - If all four are >=250 but not yet all >=500: pick the LOWEST-count module to keep totals approaching equal as they approach 500 each.
   - **Once all four modules are >=500 (i.e., total >=2000): continue generating but produce questions for each topic EQUALLY. Pick the LOWEST-count module each run so totals stay tight across all four indefinitely.** Do not stop at 500-each; keep going while quota remains.
5. Pick an unstapled cluster from Section 7 of `.routine-context.md`. Check `data/batches/` and `data/batches_manifest.json` to confirm the cluster has not already been generated.
6. Generate ONE batch of EXACTLY 30 MCQs. Use the full quality bar from the `assets/prompt-template.txt` template + `.routine-context.md` Section 5 audit pass. Do NOT bundle multiple clusters into one batch.
7. Write to `data/batches/<descriptive_name>.json` with a unique snake_case name.
8. Run the self-audit (banned tokens, JSON validity, source_refs all map to a label in sources, AU spellings).
9. Append the path to `data/batches_manifest.json` `batches` array (in-place edit), then run `python3 scripts/manifest_hashes.py` so the new file gets its cache key.
10. Bump `data/meta.json` `last_added` to today's UTC date.
11. Commit and push:
```
git add data/
git commit -m "Add <batch_name>.json batch (30 Qs) via scheduled remote agent

<one-line cluster summary>

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
git push origin main
```
If this push fails (it should not, since Step 0 succeeded), emit a clear error and exit. Do not retry with fallbacks.
12. Stop. The next scheduled run will pick the next cluster.

=================================================================
Hard constraints
=================================================================

- ONE batch per run, EXACTLY 30 questions. Do not bundle multiple clusters.
- **Module choice is determined by the algorithm in STEP 4, applied against LIVE totals each run.** Do not hardcode which module to target.
- Long-term target: 500 of each module (2000 total). After hitting that, KEEP GENERATING with equal distribution across all four modules; the bank does not have a stop point until the maintainer disables the routine.
- Write in the register set by the VOICE section of `assets/prompt-template.txt`: one Australian registrar's teaching notes, ward abbreviations, digits for quantities, hyphenated compound modifiers, ordinary punctuation. The prompt vocabulary listed in its section 5 (near pair, anti-pattern, discriminator, candidate...) never appears in a question.
- ZERO em-dashes (U+2014). Audit by `grep -P '\\x{{2014}}'` on every generated file. Rewrite the sentence rather than dropping ` - ` into the same slot.
- NEVER the four-letter abbreviation of 'Aboriginal and Torres Strait Islander' (spelled A-T-S-I). NEVER 'the c-word' (spelled c-a-n-o-n-i-c-a-l). NEVER uni-specific framing (UNE, JMP, MEDI6101).
- Mandatory `model` field on every question = your specific model version string (e.g. 'Claude Opus 5').
- Australian sources first; AU SI units; AU spellings (paediatric, gynaecology, fetal, oesophagus, oedema, anaemia, leukaemia, caesarean, dyspnoea, diarrhoea). Exception: drug INN 'magnesium sulfate' per AMH.
- Every option's `source_refs` must match a label in the question's `sources` array exactly.
- Rate difficulty DOWN if unsure. Past agents inflated by 1-2 levels.
- No weight-based dose arithmetic in lead-ins. Test reasoning, not multiplication.
- FAIL FAST. If anything is wrong, exit before spending more tokens. Do not invent workarounds. Quota is sacred.

=================================================================
Why this matters
=================================================================

The maintainer's plan caps the routine at 15 fires per day. Each wasted run reduces tomorrow's generation capacity. Token cost of a failed run with generation is ~50x the cost of a probe-only abort. ALWAYS run STEP 0 first.

The long-term goal is a balanced 2000+ question bank across all four modules. There is no hard upper bound; once each module hits 500, keep going with equal distribution until the maintainer disables the routine.

Begin now. Read `.routine-context.md` AFTER the push probe succeeds, not before."""

def push_remote(prompt):
    """Call the remote-trigger update endpoint via curl. Requires ANTHROPIC_API_KEY etc;
    in practice this is invoked through Claude Code's RemoteTrigger tool. This is a
    placeholder that just prints what would be sent."""
    print('---NEW PROMPT---')
    print(prompt[:500] + '...\n[truncated; full length: %d chars]' % len(prompt))

def main():
    served = served_questions()
    totals = live_totals(served)
    print(f'Live totals: Paeds={totals["Paediatrics"]} Obgyn={totals["Obstetrics & Gynaecology"]} Psych={totals["Psychiatry"]} Medicine={totals["Medicine"]} Total={sum(totals.values())}')
    tiers = live_difficulty(served)
    print('Live difficulty: ' + ' '.join(
        f'L{d}={tiers.get(d, 0)}' for d in (1, 2, 3, 4, 5)))
    update_meta(totals)
    changed = update_context(totals)
    changed = update_difficulty(tiers) or changed
    print(f'.routine-context.md updated: {changed}')
    prompt = build_prompt(totals)
    out_path = os.path.join(REPO, '.routine_prompt_latest.txt')
    open(out_path,'w').write(prompt)
    print(f'Latest prompt written to {out_path} ({len(prompt)} chars)')
    print('Pass this content to RemoteTrigger update via Claude Code, or use --remote (not implemented in pure CLI).')

if __name__ == '__main__':
    main()
