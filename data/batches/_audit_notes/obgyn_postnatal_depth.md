# Audit notes - obgyn_postnatal_depth.json

15/15 kept. 0 dropped.

## Fixes applied
- AU spelling: `ferrous sulfate` -> `ferrous sulphate` (q 009 option C); `fetal` x2 -> `foetal` (questions 002 description and 014 differential text).
- Added top-level `"model": "unknown"` to every question.

## Verified no-change-needed
- Em-dashes: 0 (U+2014 codepoint grep).
- Drug INN `sulfamethoxazole` retained per pharmacopoeial convention (Therapeutic Guidelines, AMH).
- Sources lead AU: Therapeutic Guidelines, RANZCOG, ABA, SOMANZ, KEMH, Family Planning Australia, COPE, AMH, National Blood Authority PBM. International (FSRH, WHO MEC, RCOG GTG, BMJ Best Practice, LactMed, Endocrine Society) appropriately secondary.
- AU regimens correct: endometritis triple therapy (amp/gent/met), mastitis flucloxacillin 500 mg q6h, RANZCOG VTE weight-banded LMWH 6/52 for prior VTE, sertraline first-line SSRI in lactation (COPE/AMH), Sheehan workup, postnatal anaemia PBM thresholds (Hb <70 transfuse, 70-90 IV iron, >=90 oral), postpartum urinary retention TWOC after 24-48 h indwelling, SOMANZ postnatal antihypertensives (wean methyldopa for depression, labetalol/nifedipine first-line, avoid atenolol in BF), failure-to-lactate workup (prolactin + pituitary axis), postpartum thyroiditis biphasic course with beta-blocker only, NCSP 5-yearly HPV screening.

## Difficulty re-rating
All 15 ratings hold:
- d=1 (001): LAM criteria recall - one fact set, but four conditional clauses to combine -> d=1 sticks.
- d=2 (003, 009, 015): single-step but with AU cut-off / specific dose recall + 2-3 data discrim.
- d=3 (002, 004, 007, 010, 013, 014): next-best-step regimen / dx triad.
- d=4 (005, 006, 011, 012): multi-axis discrimination (postnatal contraception WHO MEC categories, SSRI choice in lactation, postpartum HTN regimen change in BF with mood overlay, failure to lactate differential with IGT cue).
- d=5 (008): Sheehan workup - atypical multi-system endocrine reasoning with hydrocortisone-before-thyroxine pitfall.

All stems exceed length floor for re-rated difficulty (1: 110w >=90; 2: 118-159w; 3: 140-156w; 4: 196-220w; 5: 233w).

## No-filler audit
Stems audited for clauses 002, 005, 006, 008, 011, 012:
- 002 every clause earns its place: surgical Hx -> wound discrim, breastfeeding/wound/calf checks -> rule out alternative foci, USS empty cavity -> excludes retained POC.
- 005 partial breastfeeding + workplace lactation context justifies declining LAM and avoiding combined hormonal; BMI/BP normality narrows risks.
- 006 thorough psychiatric safety screen and exclusion of bipolar/psychosis is pedagogically critical (postpartum psychosis is the must-not-miss).
- 008 every system in stem maps to a Sheehan deficit (failed lactation = lactotroph, amenorrhoea = gonadotrophin, cold/fatigue = TSH, postural drop = ACTH).
- 011 mood mention is essential because methyldopa wean is the correct action; without mood detail option A becomes a defensible distractor.
- 012 IGT clue (tubular widely spaced asymmetric breasts) is the question's discriminating feature.

No filler sentences identified.

## Option-spread caveat
Q 014 differential MCQ has 2-7 word options (single-noun differentials) which is appropriate; the question tests pattern recognition not protocol detail. Q 010 / 011 / 013 have longer correct options because the answer encodes the full management bundle (catheter 24-48 h + TWOC + scan thresholds; wean+escalate+add CCB; beta-blocker + monitoring interval). Trimming would lose teaching value. Retained.

## Cross-batch dedupe
- OASI: postnatal-007 (repair principles incl. antibiotics, laxative, physio, perineal clinic follow-up) vs labour-008 (Sultan classification 3a/3b/3c/4 selection). Different cognitive task.
- Endometritis: postnatal-002 (regimen choice) vs postnatal-014 (differential discrimination among postpartum fever foci). Different cognitive task.
- BV in pregnancy: not in this batch (sh-014 covers); no overlap.

No drops.
