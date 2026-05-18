# Audit notes - obgyn_labour_high_yield.json

15/15 kept. 0 dropped. 0 rejected.

## Fixes applied
- AU spelling: `fetal`/`fetus` -> `foetal`/`foetus` and related compounds (`fetoplacental`, `fetal-placental`); 29 substitutions across 15 stems/rationales/explanations.
- Added top-level `"model": "unknown"` to every question (no model previously recorded).

## Verified no-change-needed
- Em-dashes: 0 (codepoint grep U+2014).
- AU lexicon scan: no `cesarean`, `edema`, `anemia`, `haemorrhage` mispellings, `pediatric`, `gynecology`, `fiber`, `color`, `behavior`, `sulfate` (drug-name `sulfamethoxazole` retained as INN).
- All sources lead with Australian guidance: RANZCOG, KEMH, NSW Health, Therapeutic Guidelines, SOMANZ, RWH; NICE/RCOG/Cochrane appropriately supplementary.
- AU-specific cut-offs correct: second-stage delay (3 h nullip + epidural), Bishop ripening pathway, IOL 41+0 (SWEPIS), FIGO 2015 CTG nomenclature, RANZCOG IFSM 2019, OASI Sultan grading, active 3rd stage (oxytocin 10 IU IM), 30-min retained-placenta threshold, GBS allergy stratification per TG (cefazolin non-severe, clindamycin severe + susceptible), Hannah TermPROM, failed forceps -> cat 1 CS (no sequential instruments), Twin Birth Study.
- Anti-D dose not invoked in this batch (no rhesus question). MgSO4 dosing limited to top-level summary, not stem arithmetic.

## Difficulty re-rating (strict regrade)
All 15 ratings hold after regrade:
- d=1 (001): one-number recall but 4 data + epidural + nullipara discrimination -> borderline d=1/2; kept d=1 (single fact recall once data parsed).
- d=2 (003, 007, 009): each requires 2-3 data points and AU-specific cut-off; appropriate.
- d=3 (002, 004, 005, 006, 010, 012): next-best-step plus AU regimen detail.
- d=4 (008, 011, 013, 014): 4+ data + cut-off + look-alike option discrimination.
- d=5 (015): atypical multi-step (twin 2 transverse, IPV+BE vs alternatives).

All stems meet length floors for their (re-)rated difficulty.

## No-filler audit (per-sentence)
Spot-checked stems 008, 011, 014, 015: every clause justified (booking BMI -> VTE risk, GBS swab -> intrapartum decisions, EFW/centile -> dystocia/instrumental risk, Doppler -> growth-restriction exclusion, theatre on standby -> trial of instrumental disposition). No filler sentences identified; minor restatements (e.g. epidural noted twice in 014) are pedagogically justified.

## Option-spread caveat
Several `correct` options are 1.5-2x the length of distractors because they encode the full management bundle (e.g. 005, 010, 013, 014). Distractors are succinct anti-patterns. Trimming the correct option would erase the educational payload; expanding distractors would mislead readers about what makes them wrong. Spread retained intentionally.

## Cross-batch dedupe
- OASI (008 here) vs postnatal-007: 008 focuses on Sultan grading + 3a vs 3b vs 3c vs 4 selection; postnatal-007 focuses on repair location, antibiotics, laxatives, physiotherapy. Distinct teaching points.
- PPH prevention (009 here) vs postnatal-009: 009 here is active-management components; postnatal-009 is iron-deficiency Rx after PPH. Distinct.
- GBS (012 here) is intrapartum prophylaxis; not duplicated in other two batches.

No drops.
