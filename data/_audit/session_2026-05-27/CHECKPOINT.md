# Session checkpoint - 2026-05-27 A to E omnibus audit/redesign

Resume trigger phrase Rob may use in a future session: "resume the A to E omnibus session" - then read this file and the task list.

## Mission (Rob's request, verbatim distilled)

1. Redesign A to E UI/UX against the 75-item AI-design-tells ban list.
2. Analyse 181 emedici paeds + obgyn screenshots at `/Users/robrussell/Desktop/questions` for craft patterns. Derive UNIVERSAL audit + generation rules (must apply to ANY topic), plus explanation-craft tips, plus a deep mine of reusable clinical facts.
3. Audit the full live bank against those new rules.
4. Targeted fixes:
   - Admin left-panel buttons do nothing - wire them up properly OR delete dead controls.
   - "AN" button is ambiguous + nonfunctional - REMOVE the feature entirely.
   - "magnesium sulfate" - keep INN spelling per AMH (already in rules; Rob's first note was a misremember; do NOT change to sulphate. Note: re-confirm against AMH before any sweep.)
   - "(+glucose)" baseline misaligned with "A to E" wordmark - fix in CSS.
   - Rewrite the nonsensical Anti-D / Kleihauer rationale (250 IU dose + Kleihauer in T1 confusion; see Image #1 in Rob's message).
5. Deep-mine the screenshots for ANY site-wide improvement angle.

## Constraints / standing rules in play

- Auto-push: every change to ~/y4-mcq/ commits + pushes to origin/main same turn.
- All projects public-release-safe (pseudonym `mord58562` etc).
- Tier 1 testing + compliance canons.
- Anti-AI-tell canon (75 items) - binding for any UI work.
- Banned tokens: em-dash (U+2014), "ATSI", "canonical", `**bold**` in stems/lead-ins.
- "Aboriginal and Torres Strait Islander" full phrase.
- MCQ schema, difficulty model, parity rules already documented in `index.html` script template (lines 515-744 of index.html as of this session) and `RESEARCH_mcq_design.md`.

## Phase status

- [x] Checkpoint infra
- [x] Phase A: project orientation (key files read; rest read on-demand)
- [x] Phase B: screenshot analysis - 4 reports in `screenshot_analysis/batch{1..4}.md`
- [x] Phase D: targeted fixes (admin sidebar, AN removal, +glucose align, Anti-D rationale rewrite, magnesium spelling)
- [x] Phase C: synthesised - `universal_rules_addendum.md`, `explanation_craft.md`, `mined_facts.md`
- [x] Phase E: UI/UX redesign - audit + plan written, implementation landed (commit 6e8281d). Verify in browser when resumed.
- [partial] Phase F: bank auto-fixes landed (em-dash sweep, AU spellings, asterisk strip) across 70+ batches + main files; audit report + fix queue on disk. Agent STALLED on the diagnosis-leak heuristic - left a note that it was about to tighten the heuristic against false positives. Fix queue may include false positives in the diagnosis-leak severity tier; manually verify before acting on those entries.
- [ ] Phase G: final sweep + smoke test in browser (UI redesign verification, fix-queue triage)
- [ ] Phase H: update the generation-prompt template inside `index.html` (lines ~515-744) to incorporate the universal rule additions (see `universal_rules_addendum.md` section H "one-page generation-time checklist"). Also update `.remote-agent-context.md` so the scheduled cloud routine starts producing rule-compliant questions.

## Resume next session (after 9pm Sydney 2026-05-27 limit reset)

Rob may say: "resume the A to E omnibus session"

Then:
1. Read this file end-to-end.
2. `git log --since='2026-05-27' --oneline` in `~/y4-mcq/` to confirm commit state. Expected HEAD ~= `6e8281d` (or later if cloud routine added more batches via the scheduled remote agent).
3. Open localhost / GH Pages copy of the site and smoke-test the UI redesign changes. Verify:
   - Admin sidebar tabs now click through (Overview/Add&Audit/Quality/Users/Account).
   - AN button is gone.
   - "(+ glucose)" sits on baseline with "A to E".
   - Anti-D Q (`obgyn-anscreen-006` in `data/batches/obgyn_antenatal_screening.json`) shows the rewritten option-C rationale.
4. Open `bank_audit_fix_queue.json` and triage manually - many diagnosis-leak entries may be false positives per agent's stall note. Tighten heuristic + re-run or apply by hand.
5. Update `index.html` generation prompt template (lines ~515-744) with the new binding rules from `universal_rules_addendum.md` section H.
6. Update `.remote-agent-context.md` so scheduled remote agent emits rule-compliant questions.
7. Add what's-new entry to README / portfolio per the always-on rule.
8. Final commit + push.

## Incident log

- 2026-05-27 16:14 AEST: subagent copied 181 emedici screenshots into `_imgs_tmp/` and they got auto-pushed to public repo. Force-pushed to remove from main (HEAD was rewritten over `d2c2cb5`); dangling commit will be GC'd by GitHub in ~90 days. Memory entry `feedback_no_source_material_in_repo.md` created. .gitignore updated.

- 2026-05-27 ~20:55 AEST: hit usage limit (resets 9pm Sydney = ~5 min later). Bank-audit agent stalled mid-verification. Pushed all completed work in commit `6e8281d` so nothing is lost.

## Incident log

- 2026-05-27 16:14 AEST: subagent copied 181 emedici screenshots into `_imgs_tmp/` and they got auto-pushed to public repo. Force-pushed to remove from main; dangling commit `d2c2cb5` will be GC'd by GitHub in ~90 days. Memory entry created so future agents do not repeat (`feedback_no_source_material_in_repo.md`). .gitignore updated.

## Resilience policy this session

- Each phase: write progress note here BEFORE moving on.
- Each subagent: writes its full output to disk under `screenshot_analysis/` not `/tmp/`.
- Commit + push after each phase or every ~10 file edits, whichever comes first.
- If interrupted, the next Claude session reads this file + `git log --since='2026-05-27'` to know exact state.

## Live findings index

Will populate as phases complete:

- Screenshot analysis: `screenshot_analysis/batch1.md`, `batch2.md`, `batch3.md`, `batch4.md`
- Synthesised universal rules: `universal_rules_addendum.md`
- Explanation craft tips: `explanation_craft.md`
- Mined facts library: `mined_facts.md`
- Bank audit findings: `bank_audit.md`
- UI redesign notes: `ui_redesign.md`
