# RCH paeds high-severity fixes applied (2026-06-01)

Applied 14 high-severity flags from rch_paeds_audit.json. Each question id has been suffixed with `-rch` and a `revised: "2026-06-01"` field added per Rob's substantive-revision rule.

## balanced-p12-005

**File**: `data/batches/cross_topic_balanced_p12a_2026-05-29.json`

**Before (correct)**: DMSA scan at 4 to 6 months to assess for renal scarring; no MCUG unless recurrent UTI or abnormal DMSA

**After (correct)**: No further imaging is required after this ultrasound; outpatient paediatric follow-up and parental advice for prompt presentation with any future fever

---

## ctb-p41-007

**File**: `data/batches/cross_topic_balanced_p41b_2026-05-31.json`

**Before (correct)**: Arrange a DMSA scan in 4 to 6 months to assess for renal cortical scarring after this second UTI

**After (correct)**: Repeat renal tract ultrasound and refer to paediatric nephrology for recurrent UTI; no routine DMSA scan in the RCH pathway

---

## paeds-chronic-hy-011-l3

**File**: `data/batches/paeds_chronic_common_hy.json`

**Before (correct)**: DMSA scan 4-6 months after the most recent UTI to detect cortical scarring; reserve MCUG for hydroureter, abnormal DMSA or breakthrough infections

**After (correct)**: Non-urgent renal tract ultrasound and paediatric nephrology referral for recurrent UTI; optimise constipation management concurrently

---

## paeds-renal-003

**File**: `data/batches/paeds_renal_urology.json`

**Before (correct)**: DMSA renal scan in 4-6 months to assess for cortical scarring

**After (correct)**: Renal tract ultrasound and paediatric nephrology referral for recurrent UTI per the RCH Melbourne pathway

---

## ctb-p40-007

**File**: `data/batches/cross_topic_balanced_p40b_2026-05-31.json`

**Before (correct)**: DMSA scan at 4 to 6 months to assess for renal cortical scarring

**After (correct)**: No further imaging required; outpatient paediatric review and parental education to present promptly with any future fever

---

## ctb-p34a-001

**File**: `data/batches/cross_topic_balanced_p34a_2026-05-31.json`

**Before (correct)**: Commence humidified high-flow nasal cannula at 2 L/kg/min with FiO2 titrated to maintain SpO2 above 92% in a monitored high-dependency bed and liaise early with paediatric retrieval and intensive care

**After (correct)**: Commence low-flow nasal prong oxygen at 1 L/min titrated to maintain SpO2 at least 90%, support feeding with nasogastric feeds, and reassess after 2 hours of low-flow before any escalation

---

## ctb-p39-001

**File**: `data/batches/cross_topic_balanced_p39a_2026-05-31.json`

**Before (correct)**: Commence humidified high-flow nasal cannula oxygen at 2 L/kg/min, place a nasogastric tube for continuous feeds at two-thirds maintenance and admit under paediatrics with hourly respiratory observations and senior review

**After (correct)**: Commence low-flow nasal prong oxygen at 1 L/min titrated to maintain SpO2 at least 90%, nasogastric feeds at two-thirds maintenance, and reassess after 2 hours

---

## ctb-p40-001

**File**: `data/batches/cross_topic_balanced_p40a_2026-05-31.json`

**Before (correct)**: Commence high-flow nasal cannula at 2 L/kg/min with FiO2 to target SpO2 92 to 96%

**After (correct)**: Commence low-flow nasal prong oxygen at 1 L/min titrated to maintain SpO2 at least 90% and admit under paediatrics for monitoring

---

## paeds-deficit-002

**File**: `data/batches/paeds_obgyn_l4l5_deficit_2026-05-25.json`

**Before (correct)**: Administer nebulised adrenaline 0.5 mL/kg of 1:1000 solution

**After (correct)**: Nebulised adrenaline 5 mL of 1:1000 as a flat dose with oxygen, with at least 3 hours of post-adrenaline observation per RCH

---

## paeds-batch-016-l3

**File**: `data/batches/paeds_user_paste_emergency_2026-05-20.json`

**Before (correct)**: Minimum 4 hours after the LAST adrenaline with the child stridor-free at rest, no recessions, comfortable on room air, tolerating oral fluids; written safety-net advice before discharge

**After (correct)**: Minimum 3 hours after the LAST adrenaline with the child stridor-free at rest, no recessions, comfortable on room air, tolerating fluids, with written safety-net advice

---

## ctb-p45-002

**File**: `data/batches/cross_topic_balanced_p45a_2026-05-31.json`

**Before (correct)**: Single dose oral dexamethasone 0.6 mg/kg with observation for 4 hours in the emergency department

**After (correct)**: Single dose oral dexamethasone 0.15 mg/kg, observe until stridor at rest settles and oral intake is reliable, then discharge with safety-net advice

---

## paeds-rebal26-027

**File**: `data/batches/paeds_obgyn_l4_deficit_2026-05-26.json`

**Before (correct)**: Prescribe adrenaline autoinjector 150 mcg with action plan and training

**After (correct)**: Prescribe adrenaline autoinjector 300 mcg (EpiPen) with ASCIA Action Plan, training, and allergist referral

---

## paeds-022

**File**: `data/questions_paeds.json`

**Before (correct)**: Repeat IM adrenaline 220 microg, give 440 mL saline bolus, then start adrenaline infusion if no response

**After (correct)**: Repeat IM adrenaline 300 mcg (0.3 mL of 1:1000), give a 20 mL/kg saline bolus, then start an IV adrenaline infusion if no response

---

## paeds-batch-highyield-004

**File**: `data/batches/paeds_user_paste_emergency_2026-05-20.json`

**Before (correct)**: Commence a peripheral intravenous adrenaline infusion.

**After (correct)**: Take blood cultures, give IV ceftriaxone 100 mg/kg and 20 mL/kg 0.9% sodium chloride bolus now and reassess perfusion within minutes

---


# Medium round 3 (nuanced) - 2026-06-01

## ctb-p34a-003-rch

**File**: `data/batches/cross_topic_balanced_p34a_2026-05-31.json`

**Before (correct)**: Arrange a renal tract ultrasound during this admission and add a micturating cystourethrogram only if the ultrasound shows hydronephrosis, scarring or recurrent febrile urinary tract infection occurs subsequently

**After (correct)**: No additional imaging is required after this typical first urinary tract infection; counsel the family on prompt presentation for any future febrile illness

**Length parity**: max:min ratio = 1.22 ([147, 156, 174, 166, 180])

---
## paeds-deficit-013-rch

**File**: `data/batches/paeds_obgyn_l4l5_deficit_2026-05-25.json`

**Before (correct)**: Renal tract ultrasound within 2 weeks of the acute infection

**After (correct)**: No routine imaging is required after this typical first urinary tract infection; counsel the family on prompt urine testing with any future fever

**Length parity**: max:min ratio = 1.05 ([145, 144, 142, 138, 144])

---
## paeds-deficit-012-rch

**File**: `data/batches/paeds_obgyn_l4l5_deficit_2026-05-25.json`

**Before (correct)**: Intravenous cefotaxime plus ampicillin at meningitic doses

**After (correct)**: Intravenous benzylpenicillin (or amoxicillin) plus gentamicin plus cefotaxime, all at meningitic doses, as the Australian regimen for this presentation

**Length parity**: max:min ratio = 1.28 ([118, 151, 128, 135, 148])

---
## ctb-p31-004-rch

**File**: `data/batches/cross_topic_balanced_p31a_2026-05-30.json`

**Before (correct)**: Start oral trimethoprim plus sulfamethoxazole at standard paediatric dosing for 7 days and arrange follow-up with the GP at the end of the course

**After (correct)**: Start oral cefalexin 25 mg/kg/dose three times daily for 7 days while awaiting culture and review at the end of the course with the GP

**Length parity**: max:min ratio = 1.28 ([134, 122, 145, 140, 156])

---
## balanced-p15-001-rch

**File**: `data/batches/cross_topic_balanced_p15a_2026-05-29.json`

**Before (correct)**: Oral cefalexin 25 mg/kg/dose twice daily for 7 days starting now

**After (correct)**: Oral cefalexin 25 mg/kg/dose three times daily for 7 days starting now as the first-line empirical oral antibiotic

**Length parity**: max:min ratio = 1.16 ([103, 119, 108, 114, 115])

---
## ctb-p30-001-rch

**File**: `data/batches/cross_topic_balanced_p30a_2026-05-30.json`

**Before (correct)**: Admit to the paediatric ward for nasal high-flow oxygen and supported feeding via nasogastric tube

**After (correct)**: Admit to the paediatric ward for standard low-flow nasal prong oxygen titrated to SpO2 at least 90% with nasogastric feeding

**Length parity**: max:min ratio = 1.29 ([103, 110, 124, 129, 133])

---
## balanced-p11-001-rch

**File**: `data/batches/cross_topic_balanced_p11a_2026-05-29.json`

**Before (correct)**: Oral dexamethasone 0.6 mg/kg single dose; observe in ED 3 hours (RCH minimum) then reassess for discharge

**After (correct)**: Oral dexamethasone 0.15 mg/kg single dose; observe until stridor at rest settles and oral intake adequate (typically 1-2 hours)

**Length parity**: max:min ratio = 1.09 ([127, 127, 129, 139, 130])

---
## ctb-p40-003-rch

**File**: `data/batches/cross_topic_balanced_p40a_2026-05-31.json`

**Before (correct)**: Oral dexamethasone 0.6 mg/kg plus nebulised adrenaline 5 mL of 1:1000

**After (correct)**: Oral dexamethasone 0.15 mg/kg single dose; observe until stridor at rest settles and oral intake is adequate (typically 1-2 hours)

**Length parity**: max:min ratio = 1.16 ([130, 121, 114, 132, 126])

---
## paeds-batch-073-rch

**File**: `data/batches/paeds_user_paste_emergency_2026-05-20.json`

**Before (correct)**: Start intravenous vasopressin infusion at 0.01 units/min

**After (correct)**: Call PICU and anaesthetics now for bedside takeover, continue titrating the adrenaline infusion upward, and add a noradrenaline infusion if perfusion does not improve

**Length parity**: max:min ratio = 1.34 ([138, 132, 124, 166, 131])

---
## paeds-id-002-rch

**File**: `data/batches/paeds_infectious_diseases_depth.json`

**Before (correct)**: IV ampicillin 50 mg/kg plus IV cefotaxime 50 mg/kg

**After (correct)**: Intravenous benzylpenicillin (or amoxicillin) plus gentamicin as the Australian regimen, adding cefotaxime at meningitic doses if meningitis is suspected

**Length parity**: max:min ratio = 1.24 ([123, 153, 129, 145, 131])

---
## creative-reasoning-017-au-cutoff-sepsis-paeds-rch

**File**: `data/batches/creative_reasoning_types_2026-05-25.json`

**Before (correct)**: 20 mL/kg of 0.9% saline (280 mL) over 5-10 min, reassess, repeat to max 40-60 mL/kg with cardiovascular monitoring; ceftriaxone 50 mg/kg IV (max 2 g) within 60 min of recognition; consider early inotropes if no response to second bolus

**After (correct)**: 10-20 mL/kg of 0.9% sodium chloride over 5-10 minutes, reassess after each bolus to a usual maximum of 40-60 mL/kg, plus ceftriaxone 100 mg/kg (max 4 g) IV within 60 minutes

**Length parity**: max:min ratio = 1.34 ([129, 173, 132, 149, 142])

---
