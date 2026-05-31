# RCH paediatrics audit - 2026-06-01

Source-of-truth: RCH Melbourne Clinical Practice Guidelines (https://www.rch.org.au/clinicalguide/).

## Scope

8 high-yield paediatric topics audited across the live bank (~851 paediatric Qs total). RCH CPG pages fetched and cached once per topic; each Q checked against current RCH guidance for thresholds, doses, pathways, and source attribution.

## Headline numbers

| Topic | Flags | High | Medium | Low |
|---|---|---|---|---|
| UTI imaging + antibiotic cascade | 12 | 5 | 4 | 3 |
| Bronchiolitis (HFNC, SpO2 target) | 11 | 3 | 5 | 3 |
| Croup (dex dose, post-adrenaline obs) | 17 | 3 | 8 | 6 |
| Asthma exacerbation | 4 | 1 | 0 | 3 |
| Anaphylaxis (autoinjector strength, obs) | 5 | 1 | 1 | 3 |
| Febrile infant <3 months | 3 | 0 | 2 | 1 |
| Gastroenteritis (ORS rate, ondansetron) | 4 | 0 | 0 | 4 |
| Paediatric sepsis pathway | 5 | 1 | 1 | 3 |
| TOTAL | 61 | 14 | 22 | 25 |

## Patterns driving most flags

1. **NICE/AAP creep into UTI imaging cascade** - 5 Qs prescribe DMSA scan at 4-6 months after first or recurrent UTI. RCH does not include DMSA in its algorithm; it only mentions renal US (with restricted indications). Several Qs cite RCH as source while the answer follows NICE NG224. Fix: replace DMSA-correct options with US-only RCH path; demote DMSA to NICE-aligned distractor.

2. **SpO2 target 92-96% in bronchiolitis** - RCH target is 90%. Multiple Qs use 92% as the admit/oxygen threshold (a NICE/older AAP frame). Fix: change SpO2 target to 90% per RCH.

3. **HFNC as first-line in bronchiolitis** - 4 Qs jump straight to HFNC at 2 L/kg/min. RCH explicitly reserves HFNC for failure of standard low-flow oxygen after >=2 hours with persistent SpO2 <90%. Fix: either add failed-low-flow precondition to stem or change correct option to standard low-flow oxygen first.

4. **4-hour post-adrenaline observation in croup** - 8 Qs specify "at least 4 hours" after nebulised adrenaline. RCH states 3 hours explicitly. Fix: change to 3 hours with extension only for risk factors.

5. **Dex 0.6 mg/kg in mild-moderate croup** - 3 Qs use the 0.6 mg/kg severe-croup dose for clinically moderate stems. RCH dex dose is 0.15 mg/kg for mild/moderate; 0.6 mg/kg reserved for severe/life-threatening.

6. **Per-kg adrenaline dosing instead of RCH banded table** - 3 Qs use the per-kg formula. RCH paediatric anaphylaxis uses age/weight banded mL of 1:1000. Notable: paeds-rebal26-027 prescribes EpiPen Jr 150 mcg for a 22 kg child; RCH/ASCIA threshold is >=20 kg gets the 300 mcg device.

## Top 5 most urgent fixes (high-severity, by q_id)

1. **paeds-batch-highyield-004** (sepsis) - 3-year-old with purpuric rash + shock, correct option goes straight to peripheral adrenaline infusion before fluid or antibiotics. RCH/AU sepsis pathway puts ceftriaxone + 20 mL/kg bolus in the first hour, inotropes only after fluid-refractory shock. Fix: change correct option to "IV/IO access, blood cultures, IV ceftriaxone 100 mg/kg + 20 mL/kg saline within first hour; inotrope only if fluid-refractory".

2. **paeds-rebal26-027** (anaphylaxis discharge) - 22 kg 5-year-old discharged on EpiPen Jr 150 mcg. RCH/ASCIA cut-off: >=20 kg gets EpiPen 300 mcg. Fix: change correct option to "Adrenaline autoinjector 300 mcg (EpiPen) - patient is 22 kg, above the 20 kg threshold".

3. **paeds-022** (anaphylaxis repeat dose) - 6-year-old 22 kg, repeat IM adrenaline 220 mcg (per-kg 10 mcg/kg). RCH banded table for 5-10 years (30 kg) = 0.3 mL of 1:1000 = 300 mcg. Fix: change repeat dose to 300 mcg per RCH band.

4. **paeds-deficit-002** (croup) - 2-year-old with persistent stridor after dex; correct option is nebulised adrenaline "0.5 mL/kg of 1:1000". RCH uses flat 5 mL of 1:1000 regardless of weight; per-kg dosing risks underdose in small child or overshooting the flat 5 mL ceiling. Fix: change to "5 mL of 1:1000 flat dose" with 3-hour observation per RCH.

5. **balanced-p12-005, paeds-deficit-013, ctb-p41-007, ctb-p40-007, paeds-chronic-hy-011-l3** (UTI imaging) - all prescribe DMSA at 4-6 months after first or recurrent UTI. RCH algorithm has no DMSA; the answer follows NICE NG224 not the cited RCH page. Fix: rewrite correct options to RCH-aligned US-only pathway and move DMSA into a NICE-influenced distractor.

## Process notes

- Q grouping by topic used regex on stem+lead-in+options. False positives (e.g. ARF/Kawasaki/JIA Qs in the febrile-infant bucket) noted but not flagged unless contradicting RCH.
- "RCH-aligned" Qs were left unflagged. Flag count is contradictions/divergences only, not Q count audited.
- Anaphylaxis and asthma overlap significantly (allergic peanut wheeze): some Qs were audited in both buckets; flags noted under the primary topic.

## File outputs

- `/Users/robrussell/y4-mcq/data/_audit/session_2026-06-01/rch_paeds_audit.json` - structured flags
- `/Users/robrussell/y4-mcq/data/_audit/session_2026-06-01/rch_paeds_audit.md` - this summary
- `/Users/robrussell/y4-mcq/data/_audit/session_2026-06-01/_paeds_by_topic.json` - working index
- `/Users/robrussell/y4-mcq/data/_audit/session_2026-06-01/_uti_full.json`, `_bronch_full.json` - working dumps
