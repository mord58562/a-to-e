#!/usr/bin/env python3
"""Sync the scheduled remote routine's prompt + .remote-agent-context.md with
the LIVE module totals from data/. Run after any commit that adds/removes
questions so the prompt always reflects the current state of the bank.

Usage:
    python3 scripts/sync_routine_counts.py                  # update both files in place + show patch
    python3 scripts/sync_routine_counts.py --remote         # also push the new prompt to the routine via RemoteTrigger
"""
import json, os, re, sys, subprocess, collections

REPO = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CTX  = os.path.join(REPO, '.remote-agent-context.md')

def live_totals():
    totals = collections.Counter()
    for p in [os.path.join(REPO,'data/questions_paeds.json'),
              os.path.join(REPO,'data/questions_obgyn.json')]:
        try:
            for q in json.load(open(p)): totals[q.get('topic','?')] += 1
        except FileNotFoundError: pass
    mani = json.load(open(os.path.join(REPO,'data/batches_manifest.json')))
    for b in mani.get('batches',[]):
        try:
            for q in json.load(open(os.path.join(REPO,'data',b))):
                totals[q.get('topic','?')] += 1
        except FileNotFoundError: pass
    return {
        'Paediatrics': totals['Paediatrics'],
        'Obstetrics & Gynaecology': totals['Obstetrics & Gynaecology'],
        'Psychiatry': totals['Psychiatry'],
        'Medicine': totals['Medicine'],
    }

def update_context(totals):
    """Rewrite Section 2's 'Current snapshot' block with fresh numbers."""
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
    new = re.sub(
        r'Current snapshot \(.*?\):\n(?:- [^\n]*\n){4,6}',
        block,
        text, count=1, flags=re.DOTALL
    )
    if new == text:
        print('WARNING: snapshot block not found / unchanged in .remote-agent-context.md')
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

PROMPT_TEMPLATE = """You are the scheduled remote agent for the A to E MCQ Bank (Rob Russell, Y4 Australian medical exam prep).

=================================================================
LIVE BANK STATE (autosynced by scripts/sync_routine_counts.py)
=================================================================

At last sync the module totals were:
- Paediatrics: {paeds}
- Obstetrics & Gynaecology: {obgyn}
- Psychiatry: {psych}
- Medicine: {medicine}
- TOTAL: {total}

These numbers may be slightly stale; ALWAYS run the live state-check in `.remote-agent-context.md` Section 3 Step 1 before deciding which module to target. Use the numbers above only as the most recent confirmed reference.

=================================================================
STEP 0 - PUSH PROBE. RUN THIS FIRST. NO EXCEPTIONS.
=================================================================

Rob has a STRICT 15-runs-per-day quota. Every aborted run that did not push wasted a slot. Before generating ANYTHING, prove push works. If it does not, exit IMMEDIATELY before generating a single question. Generation costs tokens; the push probe costs ~3 git commands.

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
  echo 'Rob: investigate push path before re-enabling routine.'
  exit 1
fi
git push origin --delete $PROBE 2>/dev/null || true
echo 'PUSH PROBE OK - proceeding with generation'
```

If the probe fails: EXIT. Do not try alternative push methods (gh CLI, MCP push_files, PR fallback). The previous prompt's fallback ladder masked the failure and wasted quota. We want to FAIL FAST and FAIL VISIBLY.

=================================================================
STEP 1 onwards - only if STEP 0 succeeded
=================================================================

1. Read `.remote-agent-context.md` from the repo root, end-to-end. It is your full operating context.
2. Read the prompt template in `index.html` lines 413-1012. Every rule there is binding.
3. Run the state-check script from `.remote-agent-context.md` Section 3 Step 1 to see LIVE module totals (the numbers in the LIVE BANK STATE block above may be stale).
4. **Module-selection algorithm (apply in order, against LIVE totals):**
   - If any module is below 250: pick that one (catch-up phase).
   - If all four are >=250 but not yet all >=500: pick the LOWEST-count module to keep totals approaching equal as they approach 500 each.
   - **Once all four modules are >=500 (i.e., total >=2000): continue generating but produce questions for each topic EQUALLY. Pick the LOWEST-count module each run so totals stay tight across all four indefinitely.** Do not stop at 500-each; keep going while quota remains.
5. Pick an unstapled cluster from Section 7 of `.remote-agent-context.md`. Check `data/batches/` and `data/batches_manifest.json` to confirm the cluster has not already been generated.
6. Generate ONE batch of EXACTLY 30 MCQs. Use the full quality bar from `index.html` template + `.remote-agent-context.md` Section 5 audit pass. Do NOT bundle multiple clusters into one batch.
7. Write to `data/batches/<descriptive_name>.json` with a unique snake_case name.
8. Run the self-audit (banned tokens, JSON validity, stem-floor compliance, source_refs all map to a label in sources, AU spellings).
9. Append the path to `data/batches_manifest.json` `batches` array (in-place edit).
10. Bump `data/meta.json` `last_added` to today's UTC date.
11. Commit and push:
```
git add data/
git commit -m "Add <batch_name>.json batch (30 Qs) via scheduled remote agent

<one-line cluster summary>

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
git push origin main
```
If this push fails (it should not, since Step 0 succeeded), emit a clear error and exit. Do not retry with fallbacks.
12. Stop. The next scheduled run will pick the next cluster.

=================================================================
Hard constraints
=================================================================

- ONE batch per run, EXACTLY 30 questions. Do not bundle multiple clusters.
- **Module choice is determined by the algorithm in STEP 4, applied against LIVE totals each run.** Do not hardcode which module to target.
- Long-term target: 500 of each module (2000 total). After hitting that, KEEP GENERATING with equal distribution across all four modules; the bank does not have a stop point until Rob disables the routine.
- ZERO em-dashes (U+2014). Audit by `grep -P '\\x{{2014}}'` on every generated file.
- NEVER the abbreviation 'ATSI'. NEVER the word 'canonical'. NEVER uni-specific framing (UNE, JMP, MEDI6101).
- Mandatory `model` field on every question = your specific model version string (e.g. 'Claude Opus 4.7 (1M context)').
- Australian sources first; AU SI units; AU spellings (paediatric, gynaecology, foetal, oesophagus, oedema, anaemia, leukaemia, caesarean, dyspnoea, diarrhoea). Exception: drug INN 'magnesium sulfate' per AMH.
- Every option's `source_refs` must match a label in the question's `sources` array exactly.
- Rate difficulty DOWN if unsure. Past agents inflated by 1-2 levels.
- No weight-based dose arithmetic in lead-ins. Test reasoning, not multiplication.
- FAIL FAST. If anything is wrong, exit before spending more tokens. Do not invent workarounds. Quota is sacred.

=================================================================
Why this matters
=================================================================

Rob's plan caps the routine at 15 fires per day. Each wasted run reduces tomorrow's generation capacity. Token cost of a failed run with generation is ~50x the cost of a probe-only abort. ALWAYS run STEP 0 first.

The long-term goal is a balanced 2000+ question bank across all four modules. There is no hard upper bound; once each module hits 500, keep going with equal distribution until Rob disables the routine.

Begin now. Read `.remote-agent-context.md` AFTER the push probe succeeds, not before."""

def push_remote(prompt):
    """Call the remote-trigger update endpoint via curl. Requires ANTHROPIC_API_KEY etc;
    in practice this is invoked through Claude Code's RemoteTrigger tool. This is a
    placeholder that just prints what would be sent."""
    print('---NEW PROMPT---')
    print(prompt[:500] + '...\n[truncated; full length: %d chars]' % len(prompt))

def main():
    totals = live_totals()
    print(f'Live totals: Paeds={totals["Paediatrics"]} Obgyn={totals["Obstetrics & Gynaecology"]} Psych={totals["Psychiatry"]} Medicine={totals["Medicine"]} Total={sum(totals.values())}')
    changed = update_context(totals)
    print(f'.remote-agent-context.md updated: {changed}')
    prompt = build_prompt(totals)
    out_path = os.path.join(REPO, '.routine_prompt_latest.txt')
    open(out_path,'w').write(prompt)
    print(f'Latest prompt written to {out_path} ({len(prompt)} chars)')
    print('Pass this content to RemoteTrigger update via Claude Code, or use --remote (not implemented in pure CLI).')

if __name__ == '__main__':
    main()
