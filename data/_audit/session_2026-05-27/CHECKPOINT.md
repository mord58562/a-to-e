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
- [~] Phase E: UI/UX redesign vs AI-tells - audit + plan written, implementation in progress (background agent)
- [~] Phase F: bank audit + rewrites - in progress (background agent)
- [ ] Phase G: final sweep + commit
- [ ] Phase H: update generation prompt template in index.html with universal rule additions

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
