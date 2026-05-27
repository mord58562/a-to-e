# Universal rules addendum (Y4 A-to-E MCQ bank)

Synthesised from screenshot analysis of the emedici platform (batches 1-4, ~93 questions across paeds, O&G, psych, medicine, surgery). Every rule here is topic-agnostic; illustrative examples are marked `[e.g.]` and the rule itself MUST generalise.

This addendum SUPPLEMENTS the existing prompt in `index.html` and `RESEARCH_mcq_design.md`. Where the existing rules already cover a point, this document only adds refinements or new cases. Apply at generation time AND in audit.

---

## A. STEM CRAFT - new patterns and refinements

### A1. One late anchor, otherwise generic preamble
Bury exactly ONE discriminating finding in the second-to-last sentence of the stem (or as the very last clause before the lead-in). The rest of the stem must be plausibly consistent with three or more options. The signature finding is the only thing that flips the question.

`[e.g. "fixed splitting of S2 best heard at the upper left sternal border" placed once, late; the rest of the stem fits VSD, HCM, PDA equally]`

### A2. Lay-language for findings the candidate must medicalise
When the patient or family reports a finding, use lay language. Reserve medical English for clinician-observed findings (auscultation, oroscopy, exam descriptions, imaging interpretation).

| Lay (patient/family voice) | Medical (clinician voice, banned in stem when the candidate must infer it) |
|---|---|
| "vomit changed from milky to yellow/green" | bilious vomiting |
| "becomes irritable when the room light is turned on" | photophobia |
| "dark coloured urine" | macroscopic haematuria / tea-coloured urine |
| "long, thin mass in the right upper quadrant" | sausage-shaped mass |
| "passing maroon-coloured stool" | currant jelly stool |
| "started crying suddenly, drew his legs up, then settled" | colicky abdominal pain |
| "she has stopped eating and won't make eye contact" | anhedonia, blunted affect |

Every topic area must build its own paraphrase set. Telegraph phrases are a generation-time auto-reject.

### A3. Vitals format - inline prose, fixed order
Vitals appear as ONE comma-separated prose sentence, in this exact order, with units explicit and no abbreviation: pulse rate, blood pressure, respiratory rate, SpO2, temperature. Foetal HR appended when obstetric.

> `[template]` "Her pulse rate is X/min, blood pressure X/X mmHg, respiratory rate X/min, SpO2 X% on room air, and temperature X degrees C."

When vitals are NOT the discriminator, compress to the four-word marker: `"vital signs within normal limits"`. Choose one or the other; do NOT mix (no "vital signs normal except a temperature of 38.4 degrees C" - that is a telegraph).

Switch from prose to a `data_table` only when there are >=5 individual labs OR >=4 lab plus 5 vitals plus exam findings (cognitive-load tip-over point). For 1-4 labs, keep inline with reference range in parentheses on the same line.

### A4. Reference ranges in parentheses after every load-bearing lab, every time
`"haemoglobin 90 g/L (120-160), mean cell volume 60 fL (80-100), ferritin 5 ng/mL (15-200)"`. Never strip the range. A lab quoted without a range signals to the candidate that the lab is decorative - which is itself a leak if the lab IS load-bearing. Conversely, a lab that does NOT matter to the answer should be omitted entirely, not included without a range.

### A5. Explicit closure of red-herring avenues
When a competing differential is plausible but you do not want the candidate to chase it, close that door explicitly with a single short sentence. This is removing a side door, not telegraphing the front door.

`[e.g.]`
- "There is no recent overseas travel." (closes travel-related infections)
- "A pelvic examination is not performed." (closes structural pelvic pathology)
- "She has no personal or known family history of venous thromboembolism." (closes VTE distractor in HRT question)
- "She denies any suicidal ideation or intent." (closes acute-risk admission distractor in mood-disorder question)
- "He has no fever or systemic symptoms." (closes sepsis/malignancy in localised-lump question)

Limit to two closures per stem. Three or more = pertinent-negative pileup (existing rule).

### A6. Disconfirming finding seeded to kill the default answer
This is the dominant L4-to-L5 lever observed across the bank. Seed a single finding that rules out the textbook default differential, forcing the candidate to reason past it.

`[e.g.]`
- "The uterus is contracted, indicating that uterine atony is not the primary cause of the bleeding visualised." (kills atony as cause of PPH, points to trauma)
- "DAT negative, blood groups matched." (kills haemolytic disease of the newborn, points to biliary atresia)
- "Previous blood tests from three years ago showed a haemoglobin greater than 110 g/L." (kills thalassaemia despite Mediterranean heritage, points to acquired anaemia)
- "Renal function and electrolytes are within normal limits." (kills uraemia/SIADH as cause of altered mental state)

Audit rule: every L4-L5 question should have at least one disconfirming finding identifiable in the stem.

### A7. Vital signs include irrelevant-but-normal values for vigilance training
Even when only one vital is abnormal, report all five. This trains the scan-for-abnormal habit and prevents the existing AI-style "abnormal vital prominent in sentence" tell.

### A8. The discriminator is a NUMERIC detail, not an adjective
Avoid "very high BP", "large mass", "thin myometrium". Use the number. The candidate is expected to know the threshold. `"Myometrium between gestational sac and bladder measures 2 mm"`, not "thin myometrium". `"BP 165/110"`, not "severely hypertensive".

### A9. Family history given with relation + age + outcome
Not "family history of aortic dissection" (telegraph). Instead: `"Her mother died suddenly during pregnancy at age 30."` Forces the candidate to infer significance from the pattern, not the label.

### A10. Demographic descriptors only when load-bearing
Volunteer ethnicity, occupation, household structure, sexual orientation, religion ONLY when (a) the discriminator depends on it, OR (b) it is a deliberate red herring you defuse in the rationale. Ethnicity as decoration is a hallmark of AI-generated stems.

Where ethnicity matters: cervical-screening eligibility for Aboriginal or Torres Strait Islander people, acute rheumatic fever risk for Aboriginal or Torres Strait Islander, Maori, and Pacific people in overcrowded housing, thalassaemia screening for Mediterranean/SE Asian heritage. Where it is a red herring: e.g. Egyptian heritage with microcytic anaemia where the actual cause is menorrhagia (the prior normal Hb defuses thalassaemia). Always defuse explicitly in the rationale.

### A11. Diagnosis named for the first time in sentence 1 of the explanation
The stem describes features. The lead-in stays neutral. The explanation's first sentence asserts the diagnosis. `"This patient presents with..."`, `"This neonate likely has..."`, `"The clinical presentation in this case is most consistent with..."`. Never hedge with "could possibly" or "is most likely". Commit.

### A12. Stem length 110-180 words is the natural exam range
Shorter = trivia. Longer = padding. Trim ruthlessly to that band unless the case GENUINELY requires more (e.g. multi-step sequential screening pathway, complex CTG description with multiple cycles).

### A13. Imaging and clinical photos always last in the stem
Never embed an image mid-paragraph. Caption terse, modality named (e.g. `"An X-ray of the right arm is performed."` followed by image). Image must add information not in the prose; do not duplicate.

### A14. Setting is a clue, not decoration
GP clinic / Emergency Department / antenatal clinic / labour ward / Special Care Nursery / acute psychiatric ward / community mental health team / nursing home / rural ED each scopes the answer space. Choose deliberately. A rural ED implies transfer reasoning; an SCN implies neonatal-specific physiology; a community team implies non-acute disposition.

### A15. Sequential history disclosure for screening / longitudinal questions
For questions about ongoing screening or surveillance pathways, present the history as prior result + interval + current result, in chronological prose. `[e.g.]` "Twelve months ago, her test showed X. She has since had Y, which returned showing Z." Allows the candidate to reconstruct the pathway.

### A16. Standardised social negatives in nearly every stem
`"She has no significant medical history and takes no regular medications."` and (for paediatric) `"Her immunisations are up to date."` These appear near-verbatim in ~70% of analysed stems. Their function is to reassure the candidate that no relevant content has been intentionally withheld in those domains, so all remaining content carries discriminating weight. Omit only when the absence itself would be a clue (e.g. an unimmunised child in a suspected-Hib question).

### A17. Counter-intuitive correct answers when defensible
When the obvious choice is over-investigation, over-treatment, or pattern-matching to a higher-acuity differential, the correct answer can be observation / reassurance / lower-acuity follow-up. Trains the right answer to "most common complication" or "most common cause" rather than "most dangerous". Always anchor the correct answer in a guideline citation in the rationale.

### A18. Sideways lead-ins to lift cognitive task without lengthening the stem
Use periodically: `"Which syndrome is most frequently associated with these examination findings?"`, `"Which one of the following best describes the underlying mechanism of this arrhythmia?"`, `"Which one of the following statements would be appropriate patient education regarding this condition?"`. Same stem, different cognitive operation, different difficulty.

### A19. Single-word pivots in the lead-in to test prioritisation
When several options are arguably indicated, the lead-in carries the entire discrimination via one word: `"administer FIRST"`, `"NOW request"`, `"BEFORE delivery"`, `"INITIAL step"`. The question becomes a prioritisation drill, not a recall drill. Useful when multiple plausible actions exist and the discriminator is sequence.

### A20. Forward-pointer one-liner at end of stem
A single concrete fact placed as the very last sentence that defuses the strongest distractor. `[e.g.]` "Previous blood tests from three years ago showed a haemoglobin greater than 110 g/L." This is the structural twin of A6 (disconfirming finding) but operates at sentence position rather than via medical content.

---

## B. LEAD-IN library + when to use which

The lead-in verb is the chief difficulty knob. Same scenario, different lead-in = different cognitive operation = different difficulty. Rotate deliberately across a batch.

| Lead-in pattern | Cognitive task | Typical difficulty | Use when |
|---|---|---|---|
| "Which one of the following is the most likely diagnosis?" | Pattern recognition from illness script | 3 | Stem withholds diagnosis; options are tight differential |
| "Which one of the following is the most appropriate next step in management?" | Apply algorithm to current state | 3-4 | Diagnosis is implicit or stated; options span an acuity axis |
| "Which one of the following is the most appropriate first step in management?" | Prioritise initial action among several indicated | 4 | Multiple credible immediate actions, sequence is the discriminator |
| "Which one of the following is the most appropriate INITIAL diagnostic investigation?" | Order workup correctly | 3-4 | Distinguish first-line from confirmatory |
| "Which one of the following is the most likely complication for this patient?" | Predict pathway / natural history | 4 | After a defined event (e.g. fracture, surgery, drug exposure) |
| "Which one of the following conditions is this patient at greatest risk of developing?" | Risk prediction across competing exposures | 4-5 | Multiple risk factors present; discriminating the dominant one |
| "Which one of the following is most useful in influencing management of this patient's underlying condition?" | Test selection by management impact | 4 | Several tests are reasonable; only one changes the plan |
| "Which one of the following best describes the underlying mechanism of this arrhythmia/condition?" | Pathophysiology | 4 | Test mechanism without rewriting the stem; high reuse |
| "Which one of the following statements would be appropriate patient education regarding this condition?" | Counselling / shared decision making | 3-4 | Test patient-facing communication; options are spoken statements |
| "Which one of the following is the most accurate statement regarding [X] outcomes?" | Knowledge of numeric/probabilistic facts | 4-5 | Counselling-numerics (e.g. failure rates, recurrence risk) |
| "Which one of the following is the most concerning finding that should prompt [action]?" | Triage / red-flag recognition | 4 | Several findings present; one mandates escalation |
| "Which one of the following syndromes is most frequently associated with these findings?" | Association mapping | 4 | Test syndrome-feature link without naming either |
| "Which one of the following is most likely to be helpful in determining [outcome]?" | Test characteristics / clinical utility | 4 | When NPV/PPV considerations distinguish options |
| "Which one of the following is the most appropriate gestational age range for planned delivery?" (or equivalent timing question) | Application of guideline timing cutoffs | 4 | Pure threshold recall + reasoning |

Rotation rule: a batch of 30 should use at least 5 distinct lead-in patterns. A batch of 50 should use at least 7. No more than 40% of any batch on the same lead-in.

Lead-in audit rules (reinforce existing):
- ALWAYS "Which one of the following is the most appropriate..." not "the best..." (neutrality).
- NEVER negative lead-in ("EXCEPT", "is NOT").
- NEVER two-part lead-in.
- NEVER name the diagnosis in the lead-in if the stem withheld it.
- NEVER name the guideline body in the lead-in ("which is recommended by RANZCOG").
- "Choose the single best answer" is implicit; do not state it.

---

## C. OPTIONS - new and refined rules

### C1. Doses absent from antibiotic option text
When the answer is an agent-selection question (which antibiotic, which uterotonic, which AED), give only the drug name in the option text. Dose, route, and frequency live in the rationale. This tests agent selection - not mg/kg recall - and protects answer-length parity.

`[e.g.]` Options: "Amoxicillin / Amoxicillin-clavulanate / Azithromycin / Cefuroxime / Ceftriaxone". Rationale for the correct option: "Amoxicillin-clavulanate (22.5 mg/kg PO BD) is preferred because..."

Exception: when the question is explicitly about dosing (e.g. "Which dose of magnesium sulfate is appropriate for an adult patient in eclampsia?"), then ALL options must give dose+route+frequency in identical format.

### C2. Reassurance / observation can be the correct answer
Include "observation and reassurance", "no specific intervention required", or "no further investigation" as a live correct AND a live wrong option across the bank. Flip the polarity intentionally so candidates cannot pattern-match on option text. When correct, anchor in a guideline citation; when wrong, the rationale explains the active alternative.

`[e.g. correct]` cat scratch disease in immunocompetent child = observation; hand-foot-and-mouth contact in pregnancy = no specific intervention; asymptomatic ureaplasma colonisation = no treatment.
`[e.g. wrong]` parvovirus B19 exposure in pregnancy (reassurance wrong, weekly USS for 12 weeks right); a febrile drooling child (observation wrong, urgent imaging right).

### C3. Every distractor must include a textbook misconception
Each wrong option should be the answer a candidate would give if they (a) misapplied a heuristic, (b) recalled the textbook default that the stem disconfirmed, or (c) confused the condition with an adjacent differential. The rationale explicitly names the misconception ("This is the common board misconception that...").

### C4. Discrete-decision-axis pattern
Build the option set so the five options sit on one explicit axis with one off-axis option. `[e.g.]` time-to-rescreen axis: 6 weeks / 6 months / 1 year / + colposcopy (escalation) / + LLETZ (over-treatment). Or acuity axis: observe / GP review / outpatient referral / inpatient / theatre. Forces the discriminator to be a specific threshold (cm, weeks, dose, mmHg), which the rationale teaches.

### C5. Physician + procedure pairing
For referral-decision questions, pair the procedure with WHO performs it: "by general gynaecologist" vs "by gynaecological oncologist", "by ED registrar" vs "by surgical registrar". Tests the referral decision inside single-best-answer format.

### C6. Truth-claim options for knowledge-axis questions
When testing counselling or numerical fact, each option is a complete declarative statement the doctor might say to the patient. `[e.g.]` "The lifetime risk of pregnancy is approximately 1 in 200." Avoid strawman options. Each must be something a real clinician might genuinely say.

### C7. Option ordering
Options ordered roughly by clinical likelihood, sequence-of-acuity, or alphabetical. NOT by trickiness. Correct answer position varies across A-E. Aim for correct-letter balance across the batch (existing rule).

### C8. Parallel grammar within an option set (existing rule, reinforced)
If one option is a noun phrase, all are noun phrases. If one starts with a verb, all start with a verb. If one specifies route+frequency, all do (or none).

### C9. No "all of the above" / "none of the above". No "do what the local guideline says" (existing rule). No two-part options.

### C10. The correct option must not be uniquely longer, more specific, or more qualified
Audit: max:min char ratio across the 5 option `text` fields <= 1.35 (existing rule). Verify the correct option is not the only one carrying a key clinical word (a dose, "with airway clearance", "no contraindication", "in the setting of"). Either pad distractors with comparable plausible specificity OR shorten the correct option.

---

## D. EXPLANATIONS - structure additions

(Full template lives in `explanation_craft.md`; this section adds the binding audit-level rules.)

### D1. Opening one-line diagnosis assertion (when stem withheld)
First sentence of the explanation names the condition confidently. `"This patient presents with..."`, `"This neonate likely has..."`, `"The clinical presentation is most consistent with..."`. No hedging.

### D2. Option-by-option discussion in display order
Each option, correct or distractor, gets a paragraph led by the option text in bold. Order matches the display order (A, B, C, D, E) - NOT correct-first. Reader can jump to the option they chose.

### D3. Each distractor paragraph names the context in which it WOULD be correct
This is the highest-ROI pedagogy move observed. Instead of "X is wrong because of Y", write "X would be appropriate if [situation Z]; this patient does not meet that criterion because [feature W]." Builds an if-then rule for the next encounter.

### D4. Source named in full inside the prose
Not "(NCSP)". Not "(RANZCOG)". Write the full name on first mention with the acronym in parens: "The National Cervical Screening Program guidelines (NCSP)", "The Royal Australian and New Zealand College of Obstetricians and Gynaecologists (RANZCOG)", "The Victorian Royal Children's Hospital Clinical Practice Guidelines", "The Australian Immunisation Handbook", "The 2023 International Evidence-based Guideline for the Assessment and Management of Polycystic Ovary Syndrome", "Therapeutic Guidelines (eTG)", "The Australian Medicines Handbook (AMH)". Subsequent mentions can use the acronym.

### D5. Closing "In context" paragraph
End the explanation with a 1-2 sentence general-principle paragraph that lifts the case to a transferable rule. `"In context, [condition] in any patient with [feature] should prompt [action], because..."`. Builds the bridge from rote to clinical reasoning.

### D6. Key learning points: 2-3 bullets, comparator-bearing, mechanism-tagged
Each bullet is a complete declarative claim with a comparator (vs adjacent differential), a mechanism, or a cohort qualifier. Designed for spaced-repetition recall. NOT numerics (thresholds belong in the explanation body, not the bullets). NOT meta-commentary ("Remember to consider...").

### D7. Tables embedded in explanations when comparing 3+ similar entities
When the discrimination is among 3+ drugs, 3+ syndromes, 3+ test characteristics, or 3+ USS appearances, use an inline markdown table inside the explanation. Saves prose and lets the candidate scan-compare.

`[e.g.]`
| AED | Birth-defect risk |
|---|---|
| Sodium valproate | Neural tube defects, skeletal abnormality, developmental delay |
| Phenytoin | Fetal hydantoin syndrome, cleft lip/palate, developmental delay |
| Carbamazepine | Fetal hydantoin syndrome, spina bifida |
| Lamotrigine | Preferred in pregnancy |
| Levetiracetam | Preferred in pregnancy |

---

## E. AUDIT TRIGGERS - things to grep for

Add these to the existing grep audit before any batch is committed.

### E1. Mixed dose-unit options inside one option set
Grep: any option text containing `mg` AND another in the same `options[]` containing `microgram` or `mcg` or `g`. Flag.

### E2. Telegraph phrases in stems
Grep (case-insensitive) for any of:
- "compounding the risk"
- "compounding factor"
- "further increasing the risk"
- "classic for"
- "highly suggestive of"
- "pathognomonic"
- "characteristic features include"
- "presents with the classic"
- "in keeping with"
- "consistent with the diagnosis of"
- "sudden severe"
- "the textbook presentation"

These are all telegraphs. Auto-reject if found in `stem` or `lead_in`.

### E3. Pertinent-negative pile-up
Grep stems for chains of "no X, no Y, no Z" beyond 2 items. Flag.

### E4. Diagnosis-leak in options
For any question where the stem withholds the diagnosis (lead-in is not "most likely diagnosis"): grep options for the diagnosis term in the rationale. If any option's `text` field contains the diagnosis name, auto-reject.

### E5. Lead-in guideline-name leak
Grep `lead_in` for: RANZCOG, RCH, RACGP, ASHM, NHMRC, ATAGI, NCSP, NBA, AMH, eTG, RACP, ANZICS, CSANZ, NHFA, ARA, ISPAD. Auto-reject if found.

### E6. "Follow local guidelines" non-option
Grep `options[].text` for "as per local guidelines", "follow local guidelines", "institutional policy", "according to local protocol". Auto-reject.

### E7. Markdown asterisks in stems / lead-in / option text
Grep for `**` in `stem`, `lead_in`, `options[].text`. Auto-reject (allowed only in `explanation.summary` and bullets).

### E8. Author meta-commentary
Grep for: "this distractor", "hooks the", "tests the", "designed to", "trap for", "red herring", "rules out (A|B|C|D|E)", "the candidate is expected to". Auto-reject anywhere except internal generation notes.

### E9. Em-dashes (U+2014)
Codepoint grep: `grep -P '\x{2014}'`. Visual scan misses these. Auto-reject (existing rule, escalated to codepoint-grep).

### E10. Banned tokens
"ATSI", "canonical", "sulphate" outside the word "magnesium sulfate" (AMH INN exception). Audit-reject.

### E11. Doubled structured data
For any question with `data_table`: check that no value in the table also appears verbatim in `stem`. Flag duplicates.

### E12. Risk-escalation telegraph (existing)
Grep stems for: "further compounding", "further increases", "additional risk factor", "stacked risk", "on top of". Auto-reject in stem context.

### E13. Lab without reference range
Regex: numeric value + unit not followed within 20 chars by `(`. Flag any load-bearing lab missing its range.

### E14. Length distribution audit
For each option set, compute `len(longest) / len(shortest)`. If >1.35, auto-reject. (Existing rule, codify in audit script.)

### E15. Correct-letter monotony
Across any 15-question batch, no single letter is correct more than 5 times. Across 30, no more than 9. Reshuffle if violated.

### E16. Lead-in monotony
Across any 30-question batch, no single lead-in pattern used more than 12 times. Rotate.

---

## F. SURPRISES from the analysis worth elevating to rules

### F1. The "irrelevant-but-true" red herring is the L4-to-L5 lever
A finding that is real, contextually consistent, and would matter in a different question - but does NOT change the management here - is the dominant high-quality difficulty mechanism. Examples observed:
- GBS prophylaxis history in a meconium aspiration case (true, but irrelevant to MAS first-step).
- Maternal opioid use disorder on methadone in a neonatal jitteriness case (relevant to NAS, irrelevant to the don't-skip-glucose principle).
- Recent URTI in a Meckel-diverticulum case (epidemiologically reasonable, irrelevant to dx).
- Egyptian heritage in a microcytic anaemia case (Mediterranean prior, but the prior normal Hb rules out thalassaemia).

Engineering one such red herring per L4-L5 question is the highest-ROI craft move. Always defuse explicitly in the rationale ("X is a real consideration in this patient population but is ruled out here by [feature]").

### F2. The same option text appears as correct in some questions and wrong in others
"Observation and reassurance", "no specific intervention required", "amoxicillin", "transfer to tertiary centre" - each appears as the correct answer in one question and as the wrong answer in another. The bank explicitly defeats option-text pattern-matching. Maintain this discipline.

### F3. Apparent guideline drift is feature, not bug
Where the latest evidence has moved (e.g. MCDA twin delivery timing, AED preference, magnesium sulfate dosing windows), choose ONE guideline cutoff per question, cite it by name in the rationale, and ensure the bullet learning points match the option key. If guidelines genuinely conflict (e.g. RCH vs RANZCOG), pick the AU-most-current and note the other in the rationale.

### F4. Hedging only for operational uncertainty
"Failures can occur due to incomplete occlusion" - fine, operational. "It is believed that" / "may possibly" / "could potentially" / "might be considered" without a defined trigger - banned. Hedge sparingly: "approximately", "is typically", "is generally reserved for", "in most cases".

### F5. Stem ends mid-investigation
Sometimes the stem ends with a partial workup result ("Initial ultrasound shows malposition of the SMA", "The Kleihauer test is strongly positive"), forcing the candidate to pick the NEXT step rather than make a gestalt diagnosis. Highly transferable across surgery, medicine, psychiatry.

### F6. Mechanism-of-disease lead-in is high reuse value
The same case stem can support a diagnosis question, a management question, AND a mechanism question - three distinct items from one scenario. Use this when generating cluster-coverage batches.

### F7. Setting-specific stem reductions
A rural ED stem reduces the answer space (transfer vs treat-locally is in scope; tertiary procedures not). A community mental health team stem reduces the space (admit vs community management is in scope; ECT is not). Use setting deliberately to control the differential.

### F8. Counselling questions are an underused difficulty lever
Test the same condition through a "what would you tell the patient about" lens (transmission, prognosis, follow-up timing, expected course post-treatment). Adopt 2-3 per 30-question batch.

### F9. Calculation embedded in the explanation, not the stem
When a calculation is part of the reasoning (Bishop score, blood loss estimation from soaked pads), give the raw components in the stem and the calculation in the explanation. The candidate computes mentally; the explanation confirms.

### F10. Difficulty is reasoning-work, not topic-obscurity (reinforces existing rule)
A common-condition question (simple ovarian cyst) can be easy because reasoning is short. A common-condition question (CST follow-up after non-16/18 HPV with atypical glandular cells) can be very hard because the algorithm has multiple branches. Match difficulty to reasoning depth, not topic rarity. >=25% of L4-L5 must centre on COMMON presentations.

---

## G. Anti-patterns to KEEP avoiding (emedici does, we shouldn't)

### G1. Inline-narrative discrimination replacing an explicit "Why the others are not" section
emedici uses inline narrative for option discrimination. We have a stronger format with explicit per-option paragraphs. KEEP our explicit structure.

### G2. References behind a deferred expander
emedici hides full citations behind a "References" expander and shows only a count badge. Per the Rob feedback rule that every rationale must link to a cited source by name, we cite inline. DO NOT switch to deferred references.

### G3. Mixed-unit option dose formatting within one option set
emedici allows e.g. "300 micrograms" alongside "5 mg" alongside "20 mL/kg" in the same set, on the grounds that real-world units differ. Dose-format parity is a Rob-binding audit rule. DO NOT copy this.

### G4. "Best Answer" / "Your Answer" pill UI
Cosmetic; our UI handles answer-feedback differently. Do not import emedici's labelling vocabulary.

### G5. Cohort percentage in the option row
emedici displays per-option cohort selection rate inline. This is useful but cluttered for our reading flow. If we eventually surface analytics, keep them one click away, not in the option row.

### G6. Stems that flag an irrelevant ethnicity or demographic for inclusivity-decoration purposes
Demographics are weapons, not decoration. If a stem includes ethnicity, occupation, or family structure, that detail must either be load-bearing or a deliberate, defused red herring.

### G7. The "long credential list" provenance pattern
emedici names contributor credentials in a stack (MBBS, BMedSci, FACRRM, etc.) as social proof. Our bank uses guideline-named citations inline; we do not need contributor credentials in the displayed item.

---

## H. Generation-time checklist (one-page version)

Add this to the existing generation prompt as a pre-output gate.

For every question:

1. Stem 110-180 words; ONE late anchor in second-to-last sentence; lay language for findings the candidate must medicalise; medical English for clinician observations.
2. Vitals in inline prose, fixed order (pulse / BP / RR / SpO2 / temp), units explicit; OR compressed to "vital signs within normal limits". No mixed mode.
3. Reference ranges in parentheses after every lab quoted. No naked numbers.
4. At least one disconfirming finding that kills the default answer (for L4-L5).
5. Diagnosis withheld from stem unless lead-in is "most likely diagnosis". No diagnosis-leak in any option text.
6. Lead-in is one of the patterns in Section B. Neutral. No guideline-body name. No negative phrasing. No two-part.
7. Exactly 5 options, parallel grammar, no doses in option text (unless explicitly a dose question), max:min character ratio <= 1.35.
8. Each distractor rationale names the context in which the distractor WOULD be correct + a guideline citation in full institutional name.
9. Explanation opens by naming the diagnosis confidently, walks each option in display order, ends with an "In context" general-principle paragraph.
10. Key learning points: 2-3 bullets, each a standalone comparator-bearing claim.
11. Tables in explanation when comparing 3+ similar entities.
12. Pre-output grep audit (E1-E16) clean.
13. AU units, AU spellings, "magnesium sulfate" (AMH INN), no em-dashes (codepoint grep), no ATSI, no canonical.
14. Difficulty 3, 4, or 5. >=25% of L4-L5 on common presentations.
15. Correct-letter and lead-in distribution checked at batch level.
