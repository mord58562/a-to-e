# Audit notes - obgyn_sexual_health_stis.json

15/15 kept. 0 dropped.

## Fixes applied
- AU spelling: `fetus` -> `foetus` (q 009 HIV-in-pregnancy stem, 1 substitution).
- Added top-level `"model": "unknown"` to every question.

## Verified no-change-needed
- Em-dashes: 0 (U+2014 codepoint grep).
- No `cesarean`, `edema`, `anemia`, `hemorrhage`, `pediatric`, `gynecology`, `fiber`, `color`, `behavior`, `sulfate`.
- Sources lead AU: Australasian STI Management Guidelines, Therapeutic Guidelines, ASHM, RANZCOG, Family Planning Australia. International (BASHH, CDC, BMJ Best Practice) supplementary.
- AU regimens correct: BV Amsel + oral metronidazole; genital herpes first-episode aciclovir 400 mg TDS 5-10 d (ASHM); imiquimod 5% / podophyllotoxin 0.5% for warts (podophyllotoxin avoided when pregnancy plausible); chlamydia doxycycline 100 mg BD x 7 d (current first-line, azithromycin alternative); gonorrhoea dual ceftriaxone 500 mg IM + azithromycin 1 g PO; primary syphilis single benzathine 1.8 g IM (acquired <2 y); outpatient PID ceftriaxone IM + doxycycline + metronidazole x 14 d; Fitz-Hugh-Curtis; HIV vertical-transmission mode-of-delivery per ASHM (suppressed VL -> vaginal birth, no IV AZT, neonatal AZT x 4 weeks, no breastfeeding in AU); nPEP TDF/FTC/dolutegravir x 28 d; PrEP daily TDF/FTC for cis women (no on-demand); ASA acute management within 72 h with concurrent forensic + medical streams; ovarian torsion classical features; trichomoniasis metronidazole 2 g stat + partner Rx; BV in pregnancy oral metronidazole 400 mg BD 5-7 d, avoid clindamycin vaginal cream.

## Difficulty re-rating
All 15 ratings hold:
- d=1 (001): single-pathology recognition once Amsel features parsed.
- d=2 (003, 004, 015): AU-specific regimen choice with one discriminating contraindication (pregnancy, allergy, etc.).
- d=3 (002, 005, 006, 007, 011, 014): regimen + duration + AU caveat.
- d=4 (008, 009, 010, 013): complication-pattern recognition or multi-axis decision (HIV delivery, nPEP eligibility, torsion vs ectopic vs PID).
- d=5 (012): genuine atypical multi-step (ASA forensic + EC + STI + PEP + HBV + safety, none-of-the-above-feeling distractors).

All stems exceed length floor.

## No-filler audit
Stems 002, 008, 009, 010, 012 spot-checked - every clause justified (allergy history -> Rx selection; vaccination status -> HBV PEP; LFTs and biliary US -> exclude cholecystitis and confirm perihepatitis; VL trajectory -> mode of delivery; ASA timing -> forensic window). Q 012 long ASA stem deliberately includes the showered/has-not-changed-underwear/eaten/voided detail because it justifies the still-do-the-kit answer.

## Option-spread caveat
- Q 008 (Fitz-Hugh-Curtis) and q 013 (torsion) differential options are short single-noun differentials (2-6 words); appropriate to lead-in.
- Q 012 (ASA) correct option is 48 words vs distractors 16-28 words because the correct answer must enumerate concurrent forensic + EC + STI + PEP + HBV + safety actions. Trimming would teach the wrong thing. Retained.
- Other long-correct-option questions (007, 010, 011, 015) similarly encode bundled regimens; spread retained.

## Cross-batch dedupe
- BV: sh-001 (non-pregnant diagnosis via Amsel) vs sh-014 (pregnancy treatment). Different cognitive task and different correct option set.
- Endometritis/PID: this batch covers PID (sh-007) and Fitz-Hugh-Curtis (sh-008); postnatal-002/014 cover postpartum endometritis. Different populations and decision pathways - no functional overlap.
- HIV: sh-009/010/011 form a coherent set (pregnancy mode of delivery / nPEP / PrEP). No overlap with other batches.

No drops.
