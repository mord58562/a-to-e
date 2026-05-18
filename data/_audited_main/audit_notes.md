# Main MCQ Audit Notes

Audited both `questions_paeds.json` and `questions_obgyn.json` (25 + 25 = 50 originals).

All fixes: AU spelling (`fetal->foetal`, `sulfate->sulphate`, `fetus->foetus`, `fetomaternal->foetomaternal`), em-dash check (0 found), per-question difficulty re-rating, top-level `model` field added, correct-answer-detail anti-pattern fixes where required.


## Paediatrics

- **paeds-001**: orig diff 2 -> 3; kept; model=claude-opus-4-5
    - Re-rate 2->3: requires integration of admission criteria + management knowledge; not pure recognition.
    - Correct option (B) 24 words vs distractors 14-19 words - within tolerance, no rewrite needed.
    - Already has source_refs per option; sources count = 2.
- **paeds-002**: orig diff 4 -> 4; kept; model=claude-opus-4-5
    - Difficulty 4 confirmed: severe asthma escalation with 4+ data points and AU cut-off.
    - Spelling: sulfate -> sulphate in option B (auto-fix).
    - Option lengths balanced (15-22 words).
- **paeds-003**: orig diff 2 -> 3; kept; model=claude-opus-4-5
    - Re-rate 2->3: requires severity grading + dual-drug regimen + observation period.
    - Correct (C) 22 words; distractors 13-18 words - acceptable.
- **paeds-004**: orig diff 3 -> 3; kept; model=claude-opus-4-5
    - Diff 3 confirmed - bread-and-butter CAP management.
- **paeds-005**: orig diff 3 -> 4; kept; model=claude-opus-4-5
    - Re-rate 3->4: febrile neonate workup with 4+ data + AU-specific triple-antibiotic regimen.
    - Correct (C) 23 words vs distractor avg ~13 - within tolerance.
- **paeds-006**: orig diff 5 -> 5; kept; model=claude-opus-4-5
    - Diff 5 confirmed - atypical multi-step (shunt + partial vax + penicillin Hx + LP timing).
    - Correct (A) 28 words; distractors 11-19 words - mild anti-pattern but distractor B (HSV) appropriately long; acceptable.
- **paeds-007**: orig diff 3 -> 3; kept; model=claude-opus-4-5
    - Diff 3 confirmed - imaging algorithm for first febrile UTI in infant.
- **paeds-008**: orig diff 3 -> 3; kept; model=claude-opus-4-5
    - Diff 3 confirmed.
    - Correct (C) 25 words vs distractors 14-19 - within ±25%.
- **paeds-009**: orig diff 3 -> 3; kept; model=claude-opus-4-5
    - Diff 3 confirmed.
    - Correct (A) 30 words; distractors 11-18 words - anti-pattern. Rewriting distractors with matching qualifier.
- **paeds-010**: orig diff 3 -> 3; kept; model=claude-opus-4-5
    - Diff 3 confirmed.
    - Correct (B) 22 words; distractors 11-17 - acceptable.
- **paeds-011**: orig diff 4 -> 4; kept; model=claude-opus-4-5
    - Diff 4 confirmed - NEC management; bread-and-butter for paediatrics term but NICU.
    - Correct (A) 36 words vs distractors 14-21 - anti-pattern present. Rewriting distractors with parallel clinical detail.
- **paeds-012**: orig diff 4 -> 4; kept; model=claude-opus-4-5
    - Diff 4 confirmed - DKA with paediatric-specific bolus volumes and insulin timing.
    - Correct (B) 38 words - notably longer than distractors (10-22 words). Rewriting distractors with parallel dose/timing detail to mitigate anti-pattern.
- **paeds-013**: orig diff 5 -> 5; kept; model=claude-opus-4-5
    - Diff 5 confirmed - refractory status epilepticus, multi-step APLS escalation.
    - Correct (B) 31 words; distractors 13-18 - mild anti-pattern but defensible given thiopentone branch.
- **paeds-014**: orig diff 2 -> 2; kept; model=claude-opus-4-5
    - Diff 2 confirmed - classic simple febrile seizure pattern recognition.
    - Correct (D) 27 words vs distractors 11-15 - anti-pattern. Rewriting distractors with parallel detail.
- **paeds-015**: orig diff 1 -> 2; kept; model=claude-opus-4-5
    - Re-rate 1->2: clinical pattern recognition with 5 Jones-like features, but ultimately one-phrase recognition; cap at 2.
- **paeds-016**: orig diff 2 -> 3; kept; model=claude-opus-4-5
    - Re-rate 2->3: requires integration of multiple HSP findings (BP, urinalysis) with active monitoring plan.
    - Correct (D) 33 words vs distractors 11-14 - strong anti-pattern. Rewriting distractors.
- **paeds-017**: orig diff 4 -> 4; kept; model=claude-opus-4-5
    - Diff 4 confirmed - ARF with Jones criteria and AU-specific high-risk population modification.
    - Correct (A) 35 words vs distractors 10-22 - moderate anti-pattern. Rewriting distractors with parallel management detail.
- **paeds-018**: orig diff 2 -> 3; kept; model=claude-opus-4-5
    - Re-rate 2->3: requires nomogram interpretation + risk-factor adjustment + multi-component plan.
    - Correct (B) 33 words vs distractors 9-21 - anti-pattern. Rewriting distractors with parallel intervention detail.
- **paeds-019**: orig diff 3 -> 3; kept; model=claude-opus-4-5
    - Diff 3 confirmed.
    - Correct (B) 27 words vs distractors 11-20 - acceptable.
- **paeds-020**: orig diff 4 -> 4; kept; model=claude-opus-4-5
    - Diff 4 confirmed - NAI with sentinel injuries and multi-component workup.
    - Correct (A) 28 words; distractors 14-21 - within tolerance.
- **paeds-021**: orig diff 4 -> 3; kept; model=claude-opus-4-5
    - Re-rate 4->3: classic ALL presentation with very clear single-best-step (same-day oncology referral); not multi-step.
    - Correct (C) 27 words vs distractors 9-18 - acceptable.
- **paeds-022**: orig diff 3 -> 3; kept; model=claude-opus-4-5
    - Diff 3 confirmed.
    - Correct (B) 36 words vs distractors 8-21 - anti-pattern. Rewriting distractors with parallel intervention detail.
- **paeds-023**: orig diff 1 -> 1; kept; model=claude-opus-4-5
    - Diff 1 confirmed - one-phrase ANZCOR recall.
    - Option lengths uneven (correct B 21 words; others 13-19) but acceptable.
- **paeds-024**: orig diff 3 -> 3; kept; model=claude-opus-4-5
    - Diff 3 confirmed.
    - Correct (B) 32 words vs distractors 11-19 - mild anti-pattern. Rewriting two shortest distractors.
- **paeds-025**: orig diff 3 -> 3; kept; model=claude-opus-4-5
    - Diff 3 confirmed.
    - Correct (B) 47 words vs distractors 9-19 - strong anti-pattern. Rewriting distractors with parallel multi-component plans.

## Obstetrics & Gynaecology

- **obgyn-001**: orig diff 1 -> 1; kept; model=claude-opus-4-5
    - Diff 1 confirmed - LARC duration recall.
    - Options A/B/C/D/E all short (1-3 words) - matched within tolerance.
- **obgyn-002**: orig diff 1 -> 2; kept; model=claude-opus-4-5
    - Re-rate 1->2: requires ranking 3 methods, not pure recall.
    - Options short and balanced.
- **obgyn-003**: orig diff 2 -> 2; kept; model=claude-opus-4-5
    - Diff 2 confirmed.
- **obgyn-004**: orig diff 2 -> 2; kept; model=claude-opus-4-5
    - Diff 2 confirmed - AU-specific anti-D dose.
- **obgyn-005**: orig diff 2 -> 2; kept; model=claude-opus-4-5
    - Diff 2 confirmed - GBS swab timing recall.
- **obgyn-006**: orig diff 2 -> 2; kept; model=claude-opus-4-5
    - Diff 2 confirmed - NCSP pathway recall.
- **obgyn-007**: orig diff 2 -> 1; kept; model=claude-opus-4-5
    - Re-rate 2->1: one-phrase EPDS recognition.
- **obgyn-008**: orig diff 2 -> 3; kept; model=claude-opus-4-5
    - Re-rate 2->3: integration of postmenopausal status + intact uterus + transdermal vs oral + progestogen choice.
- **obgyn-009**: orig diff 3 -> 3; kept; model=claude-opus-4-5
    - Diff 3 confirmed - integration of discriminatory zone + USS findings + history.
- **obgyn-010**: orig diff 3 -> 3; kept; model=claude-opus-4-5
    - Diff 3 confirmed - TVUS criteria for missed miscarriage.
- **obgyn-011**: orig diff 3 -> 3; kept; model=claude-opus-4-5
    - Diff 3 confirmed - eclampsia first-line.
    - Spelling: sulfate -> sulphate (auto-fix in option C and elsewhere).
- **obgyn-012**: orig diff 3 -> 3; kept; model=claude-opus-4-5
    - Diff 3 confirmed - APH cause identification.
- **obgyn-013**: orig diff 3 -> 3; kept; model=claude-opus-4-5
    - Diff 3 confirmed.
    - Correct (B) 36 words vs distractors 13-20 - moderate anti-pattern. Rewriting distractors.
- **obgyn-014**: orig diff 3 -> 3; kept; model=claude-opus-4-5
    - Diff 3 confirmed.
- **obgyn-015**: orig diff 3 -> 3; kept; model=claude-opus-4-5
    - Diff 3 confirmed.
- **obgyn-016**: orig diff 3 -> 2; kept; model=claude-opus-4-5
    - Re-rate 3->2: pure recall of Rotterdam criteria, single-phrase answer; max 2.
- **obgyn-017**: orig diff 3 -> 3; kept; model=claude-opus-4-5
    - Diff 3 confirmed - PALM-COEIN classification.
- **obgyn-018**: orig diff 4 -> 4; kept; model=claude-opus-4-5
    - Diff 4 confirmed - integrates 4+ data with AU SOMANZ cut-offs and distinguishes superimposed PE from HELLP.
- **obgyn-019**: orig diff 4 -> 3; kept; model=claude-opus-4-5
    - Re-rate 4->3: thresholds-based; once thresholds known, single look-up. Not multi-step.
- **obgyn-020**: orig diff 4 -> 3; kept; model=claude-opus-4-5
    - Re-rate 4->3: classic HELPERR first-step recognition; not multi-step.
- **obgyn-021**: orig diff 4 -> 4; kept; model=claude-opus-4-5
    - Diff 4 confirmed - 4+ data with AU gestational cut-offs (corticosteroids, MgSO4 neuroprotection).
    - Correct (B) 26 words vs distractors 17-25 - within tolerance.
    - Spelling: sulfate -> sulphate.
- **obgyn-022**: orig diff 4 -> 3; kept; model=claude-opus-4-5
    - Re-rate 4->3: TG regimen recall once PID diagnosed; not multi-step.
    - Correct (D) 28 words vs distractors 7-13 - strong anti-pattern. Rewriting distractors.
- **obgyn-023**: orig diff 4 -> 4; kept; model=claude-opus-4-5
    - Diff 4 confirmed - PPH escalation with AU-specific algorithm and BP-dependent agent choice.
    - Option A rationale is overly long/hedged ('ergometrine is the most commonly cited...may be appropriate here') - this undermines option B being unambiguously correct. Tightening option A rationale to a clear 'incorrect because hypotensive' statement.
- **obgyn-024**: orig diff 5 -> 5; kept; model=claude-opus-4-5
    - Diff 5 confirmed - atypical multi-UKMEC-3/4 stack requiring weighted reasoning.
- **obgyn-025**: orig diff 5 -> 5; kept; model=claude-opus-4-5
    - Diff 5 confirmed - integrated CTG + chorioamnionitis + multi-step intrauterine resuscitation.
    - Option D rationale concedes the option 'captures most actions but pre-empts a CS' - this is too hedged for a clearly wrong answer. Tightening to a clean rejection.
    - Correct (E) 47 words vs distractors 10-30 - anti-pattern but justifiable given the multi-step intervention bundle. Tightening D distractor to be parallel and unambiguously wrong.

## Dedupe

- No internal duplicates detected within paeds (25 unique subtopics covered) or obgyn (25 unique subtopics covered).
- No cross-file duplicates (paeds and obgyn cover disjoint clinical domains).

## Summary stats

- Paediatrics: 25 kept / 25 originals
- Obstetrics & Gynaecology: 25 kept / 25 originals
- Correct-answer-too-detailed anti-pattern fixes applied: 13 / 50 questions