# Audit notes - obgyn_intrapartum_depth

- Source: `data/batches/obgyn_intrapartum_depth.json`
- Audited output: `data/batches/_audited/obgyn_intrapartum_depth.json`

## Summary

- Input questions: 15
- Kept: 15
- Dropped: 0
- Questions modified: 15

## Global modifications

- Added top-level `model: "unknown"` field (no generator metadata in source).
- Australian spellings applied case-preservingly to all narrative fields (stem, lead-in, subtopic, options, rationales, explanation summary/key_points/pearls, tags, data_table): fetal->foetal, fetus->foetus, sulfate->sulphate, sulfa*->sulpha*, cesarean->caesarean, hemorrhage->haemorrhage etc.
- Source labels NOT modified (proper names of guidelines such as 'RANZCOG Intrapartum Fetal Surveillance Clinical Guideline' must stay as the publishers wrote them).
- Em-dash (U+2014) count: 0 in input, 0 in output.
- Reference-range slugs (`reference_ranges` array) untouched - these are dataset keys, not display text.

## Per-question audit

### obgyn-intrapartum-001

- spelling: fetal→foetal x12, fetus→foetus x1
- added model="unknown"

### obgyn-intrapartum-002

- spelling: fetal→foetal x5
- added model="unknown"

### obgyn-intrapartum-003

- added model="unknown"

### obgyn-intrapartum-004

- spelling: fetal→foetal x3
- added model="unknown"

### obgyn-intrapartum-005

- spelling: fetal→foetal x1
- added model="unknown"
- OPTION-DETAIL ASYMMETRY: correct=31w vs distractor mean=16w (correct-answer-detail tell; flagged but kept - rewriting would lose substantive guideline content)

### obgyn-intrapartum-006

- spelling: fetal→foetal x2
- added model="unknown"

### obgyn-intrapartum-007

- spelling: fetal→foetal x2
- added model="unknown"

### obgyn-intrapartum-008

- spelling: fetal→foetal x7, fetus→foetus x1
- added model="unknown"

### obgyn-intrapartum-009

- added model="unknown"

### obgyn-intrapartum-010

- spelling: fetal→foetal x2, fetus→foetus x1
- added model="unknown"

### obgyn-intrapartum-011

- spelling: fetal→foetal x2
- added model="unknown"

### obgyn-intrapartum-012

- spelling: fetus→foetus x1
- added model="unknown"

### obgyn-intrapartum-013

- spelling: fetal→foetal x2
- added model="unknown"

### obgyn-intrapartum-014

- spelling: fetal→foetal x1
- added model="unknown"
- OPTION-DETAIL ASYMMETRY: correct=17w vs distractor mean=10w (correct-answer-detail tell; flagged but kept - rewriting would lose substantive guideline content)

### obgyn-intrapartum-015

- added model="unknown"

