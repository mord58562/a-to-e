# Similar-topic dedupe + give-away triage (read-only audit, 2026-06-01)

## Summary

The bank is much more deduplicated than expected at the token-overlap level. Across 3026 live questions in 383 (topic, subtopic) clusters, only **17 high-overlap pairs** (Jaccard >= 0.50 on stem + lead-in tokens) were found across **8 clusters**.

Full JSON at `similar_topic_clusters.json`.

## High-overlap clusters worth manual review

### 1. Obstetrics & Gynaecology / Early pregnancy (7 pairs, 41 Qs)

Several near-duplicate ectopic pregnancy questions. Recommend keeping ONE canonical exemplar at each clinically distinct discriminator and either deleting or rewriting the others to a different angle.

Pairs:
- `obgyn-deficit2-001` (L2) vs `obgyn-defmay27-006` (L2) - same ectopic case, age differs (29 vs 27), same stable haemodynamics, same TVUS finding, same lead-in framing. Recommend: keep one; delete the other from manifest.
- `obgyn-deficit2-001` vs `obgyn-rebal-001-l4` (L3) - same scenario, L3 variant. Worth keeping if the L3 actually has different management discriminator (e.g. methotrexate vs surgery threshold); merge or rewrite if not.
- `obgyn-deficit2-010` (L2) vs `obgyn-defmix-021` (L3) - both post-molar follow-up Qs, different ages. The L2 covers basic surveillance, L3 covers contraception advice. Possibly keep both.

Action proposed: pick one canonical Q per (presentation, level) and remove the duplicates from `batches_manifest.json`. Leaves the source JSON in place for archaeology.

### 2. Medicine / Cardiology (2 pairs)

- `med-pericard-001` (L2) vs `med-fill-020` (L2) - both acute pericarditis, ages 27 vs 34, identical clinical features (pleuritic chest pain, lying flat worse, sitting forward better, viral URTI 10 days prior), same lead-in "most appropriate initial treatment". Duplicate.
- `med-pericard-001` vs `med-rebal27b-008` - same pattern.

Action proposed: keep `med-pericard-001` (in the topic-named batch); remove `med-fill-020` and `med-rebal27b-008` from manifest.

### 3. Obstetrics & Gynaecology / Obstetrics (2 pairs, 42 Qs)

Lower priority.

### 4. Other clusters (1 pair each)

Lower priority; pairs are at the borderline of Jaccard 0.50-0.55.

## Give-away last-sentence audit

38 raw flags from content_audit.json. After filtering for last sentences containing an explicit action verb (consented / agreed to / scheduled for / underwent / received / commenced / etc.), **5 real telegraph candidates** remain (in `give_away_real.json`):

1. `obgyn-antenatal-014-l3` - FIXED 2026-06-01: last sentence "Her endocrinologist asks the obstetric medicine team to advise on antithyroid drug choice, dosing strategy by trimester, and foetal/neonatal surveillance" literally named the three pillars of the correct option. Replaced with neutral "She and her obstetric medicine team are reviewing her medication plan for the pregnancy."
2. `ctb-p39-020` - "agreed to engage with outpatient mental health services" telegraphs option D (community DBT). Borderline because "outpatient" is the broader scope. Recommend: rephrase as "she is keen to engage with longer-term mental health care" (drops the "outpatient" word that points at community).
3. `obgyn-batch-056` - "received the first dose of betamethasone 11.4 mg IM 6 hours ago" is FACTUAL stem content (clinically required to know to choose timing). NOT a telegraph. False positive.
4. `obgyn-batch-059` - same pattern as 056: betamethasone history is clinical input. False positive.
5. `paeds-rash-003-r2` - long list of contacts is the stem's substantive content; last sentence isn't the telegraph. False positive.

Action proposed: fix `ctb-p39-020` next session; leave the rest.

## Notes for future passes

- Token-overlap clustering misses **structural** similarity (same lead-in pattern, same option archetypes, same discriminator). A round 2 dedupe might cluster on `(topic, subtopic, lead_in_pattern, correct_option_archetype)` to catch those.
- The give-away heuristic in content_audit.json is too coarse: it flags any token overlap between last sentence and correct option. Tightened heuristic (action-verb in last sentence) reduced 38 -> 5; still 4/5 were false positives. Future iteration: action-verb + correct-option-also-contains-the-verb-or-its-direct-object.
