# emedici round 2 mining (session 2026-06-01)

Round 2 of the emedici screenshot mining. Source: `~/Desktop/a to e prompt/emedici images/` (~79 new screenshots dated 2026-05-28; ~181 prior screenshots in the `questions/` subfolder were the basis for round 1). Read in place via symlinks at `/tmp/emedici_round2_links/`. No images copied into the repo.

This report supplements `~/y4-mcq/data/_audit/session_2026-05-27/universal_rules_addendum.md`. Section headings here align to the round-1 sections so the two read as one document where useful.

Sample coverage in round 2 skewed obstetrics-and-gynaecology heavy (questions 1 through 62 of an O and G bank, plus a paediatrics block: anaphylaxis follow-up, mumps orchitis, CAP fever management, decompensated VSD heart failure, otitis externa, Mongolian spots, cleft lip and palate feeding assessment) and one psychiatry item (Edinburgh Postnatal Depression Scale). Question topics included: levonorgestrel emergency contraception mechanism, intermenstrual bleeding management, PPROM at 25 weeks management, pre-eclampsia prophylaxis options (aspirin agent selection AND aspirin gestational-age timing), ventricular bigeminy on ECG in pregnancy, cervical screening in a 45-year-old with type 2 diabetes, uncomplicated chlamydia in pregnancy, pelvic organ prolapse types, chorionic villus sampling vs non-invasive prenatal testing in raised nuchal translucency, low-dose aspirin gestation in a multipara with prior pre-eclampsia, placenta praevia vs placenta accreta vs vasa praevia, switching ACE inhibitor to methyldopa preconception, post-menopausal bleeding investigation, intrauterine growth restriction parameter selection, dichorionic twin discordance, IVF preterm-birth complication risk, candidiasis vaginitis treatment in pregnancy, Edinburgh Postnatal Depression Scale cutoff, PID pelvic ultrasound role, complex ovarian cyst surveillance, cystic fibrosis prepregnancy carrier screening, congenital adrenal hyperplasia enzyme, mumps complication, CAP fever management, decompensated VSD diagnosis, otitis externa antibiotic selection, Mongolian spots, cleft lip and palate feeding step.

---

## Part 1. Confirmation and refinement of round-1 rules

Round-1 rules that held up across the new sample, with refinement notes where relevant.

### Confirmed without change

- A1 (one late anchor): held. Q5 PPROM-at-25-weeks puts "the rolls 24 hours later has now developed signs of chorioamnionitis, indicated by maternal fever, tachycardia, uterine tenderness, elevated white cell count, and raised C-reactive protein" as the disconfirming anchor at the very bottom of the stem.
- A2 (lay language for findings the candidate must medicalise): held; Q10 postpartum psychosis paeds-adjacent case describes "appears agitated and is expressing bizarre beliefs about her baby being possessed by evil spirits", never naming "delusion".
- A4 (reference ranges in parentheses): held universally.
- A5 (explicit closure of red-herring avenues): held. Q9 microcytic anaemia uses "She has a balanced diet. Her menstrual periods began at age 13 and are regular, light, and last three days." to defuse iron deficiency, then "Her mother has a known thalassaemia trait" seeds the discriminator.
- A6 (disconfirming finding): held; this is the dominant L4 to L5 mechanism in round 2 as well.
- A7 (all vitals reported even when only one is abnormal): held in every full-vitals stem.
- A8 (numeric, not adjective): held. Q11 ECG-in-pregnancy gives "pulse rate of 80/min, blood pressure 110/80 mmHg, respiratory rate 17/min, SpO2 98% on room air" then the ECG IS the discriminator.
- A12 (110 to 180 words natural exam range): held; round-2 stems averaged ~ 130 words.
- A14 (setting is a clue): held; rural ED Q4 paeds anaphylaxis cluster, Birth Suite Q25 nitrous oxide in labour, Special Care Nursery for cleft palate feeding Q19, all use setting to scope the answer.
- A16 (standardised social negatives): held; the phrase "no significant medical history and takes no regular medications" appeared near-verbatim in over 70% of round-2 stems.
- B (lead-in library): held; round 2 added one new lead-in pattern, captured below in Part 2.
- C1 (doses absent from antibiotic option text, except dose questions): held. Q53 vaginal candidiasis in pregnancy gave full dose+route+frequency on every option because the discrimination was within an azole class.
- C4 (discrete-decision-axis): held strongly. Q41 gestation-of-aspirin-start (16, 20, 23, 26 weeks) is a pure threshold axis.
- D2 (option-by-option discussion in display order): held universally.
- D3 (each distractor names the context in which it WOULD be correct): held universally and is again the highest-pedagogy-ROI craft move.
- D4 (full source name on first mention): held; Q8 pre-eclampsia prophylaxis names "The Society of Obstetric Medicine of Australia and New Zealand (SOMANZ)" in full. Q32 endometrial biopsy names "current guidelines" without specifying which (mild miss vs the rule, but only when no single body owns the recommendation).
- F1 (irrelevant-but-true red herring): held strongly. Q6 paeds asthma-attack-mid-CAP combines a real asthma history with a CAP fever scenario - the asthma is real and relevant in real life but is NOT the discriminator for this admission's antibiotic choice. The stem leaves the asthma deliberately unresolved as a red herring on top of the actual answer.

### Refinements to round-1 rules

- A11 (diagnosis first asserted in sentence 1 of the explanation). Refinement: when the lead-in is "most likely diagnosis" and the correct option is the diagnosis name, the explanation opens with "This presentation is consistent with [option text]." instead of "This patient has X." Same idea, but the option-text is quoted exactly to anchor the reader's recall.
- C5 (physician + procedure pairing). Refinement: when the question is investigation-selection rather than referral, pair the investigation with WHO interprets or supervises it. Q21 (chorionic villus sampling vs amniocentesis vs NIPT vs detailed anatomy USS) does NOT pair, and the answer space loses one credible discriminator. We can add it.
- D5 (closing "In context" paragraph). Refinement: the emedici body-text equivalent is a final paragraph that integrates the rationale rather than a labelled section. Our explicit "In context" header remains a strength.
- E2 (telegraph phrases to grep). Refinement: add "the classic", "the textbook", "highly suggestive of", "a classic case of", "a classic picture of" (Q7 paeds 4yo-bilious-vomiting-malrotation contained "This case presents a classic picture of midgut volvulus" inside the explanation; that is OK in explanation prose but a stem must NEVER carry "classic picture of"). The grep is for stem only.
- C9 / banned options. Refinement: "expectant management with serial ultrasound monitoring" is a real option, but distinguish it from "no specific intervention required" (we already covered both; round-2 confirms that the wording must be specific enough to be actionable in the rationale - "expectant management" must always be paired with a follow-up modality and timing).

---

## Part 2. NEW universal rules (additive to the round-1 set)

### A21. The "investigations" inline block immediately after exam findings

When the stem includes one or two pre-question investigations whose results determine the answer, emedici places them in a small inline labelled block after the examination findings and before the lead-in:

```
Tier 1
- Estimated fetal weight 1200g (50th centile)
- Normal amniotic fluid volume
- Normal umbilical artery Doppler

Tier 2
- Estimated fetal weight 850g (below 5th centile)
- Normal amniotic fluid volume
- Normal umbilical artery Doppler
```

This pattern is observed at Q48 (dichorionic twin growth discordance) and at Q57 (IUGR parameter choice). It is different from a `data_table` because it is a small list of named results, not a multi-row table. Adopt as a permitted stem element when comparing two foetuses, two visits, or before-and-after results within one patient. Format: bold tier label, dashed list of named results with units. Do not use this format for single-time-point routine labs; those stay inline.

### A22. The "scrolling scenario" stem variant

When the natural unit is a longitudinal pathway, emedici reuses the same patient across two or three sequential questions: Q30 (32-year-old preconception counselling for chronic hypertension on lisinopril) is later mirrored by Q41 (similar patient with prior pre-eclampsia, aspirin timing). The patients are not literally the same, but the case template is. This is a question-set design choice not a per-question rule; for our bank we should NOT chain across question IDs because users randomise. Instead, when a topic genuinely splits into "before" and "after" decisions, write two separate questions with overlapping but DIFFERENT stems.

### A23. Single concrete number as the only abnormality among normal vitals

Refines A7. Several round-2 stems isolate one number as the abnormality in an otherwise wholly-within-range vital set, and that number IS the discriminator. Q11 in obstetrics ECG (pulse 80, BP 110/80, RR 17, SpO2 98%, temp 36.8 - then "An ECG is performed" with the image carrying the abnormality). Q25 nitrous oxide in labour: vitals normal, the cue is the maternal request and the active labour state, not vitals. This confirms that when vitals are fully normal, they should ALL be reported (not omitted) so the candidate learns to scan-for-abnormal and find none.

### A24. The "minor symptom + worrying timing" combination

Q23 (raised nuchal translucency on first-trimester USS at 13 weeks) and Q57 (IUGR detection at 36 weeks first-pregnancy growth scan): the abnormal finding is single and modest in isolation but timed at a decision point. Stem must not foreshadow the decision urgency with words like "concerning" or "alarming"; instead, give the finding plain and let the candidate apply the cutoff. We capture this under existing A8 (numeric not adjective) but elevate it: timing of the measurement is itself the discriminator in a substantial fraction of obstetric questions.

### A25. Explicit "she requests" or "her partner asks" framing for counselling and shared-decision questions

Several round-2 stems carry a deliberate request from the patient or partner that scopes the answer to a counselling action rather than a clinical decision. Q24 (38-year-old "requesting non-invasive prenatal testing"), Q30 ("for preconception counselling"). The lead-in then often uses "Which one of the following is the most appropriate recommendation". When this framing is present, the stem must include the explicit request verbatim (not paraphrased), and at least one option must reflect "no change / continue current plan" so candidates cannot pattern-match the request to a new action.

### A26. Specialty-society named guidance as the discrimination authority

Round 2 frequently anchors the correct answer to an Australian or Australasian society guideline rather than to general clinical reasoning. SOMANZ (Society of Obstetric Medicine of Australia and New Zealand) for pre-eclampsia prophylaxis. RANZCOG for cervical screening intervals and NIPT timing. NHMRC for BreastScreen Australia thresholds. AHPRA for prescribing scope. Our existing D4 covers this; the new emphasis is that the SAME case can be reframed by changing the named authority in the lead-in:

- "Which one of the following is the most appropriate recommendation according to SOMANZ guidelines?" - tests SOMANZ-specific cutoffs.
- "Which one of the following is the most appropriate recommendation regarding her cervical screening?" - tests National Cervical Screening Program intervals.

A lead-in that names the guideline body is otherwise banned (existing E5). The exception is when the guideline body's PUBLISHED cutoff IS the question, in which case naming the body in the lead-in is acceptable - but the better pattern is to leave the body out of the lead-in and name it in the rationale.

### A27. Distractor "would also be correct in a different context" pattern formalised

Round 2 made it clear that round-1 D3 has a structural payoff at OPTION-design time, not just rationale-design time. Each distractor should be picked because it is the right answer to an adjacent question with one parameter changed. Concretely:

- Q41 (low-dose aspirin from 16 weeks): the distractor "from 20 weeks" is wrong here but right in some pre-eclampsia low-risk-with-other-factors scenarios. The distractor "from 12 weeks" is wrong here but right in some international guidelines. Each distractor is a defensible answer in a near-neighbour case.

Audit rule: for any question rated 4 or 5, every distractor must have a one-sentence "right-in-the-following-case" justification in the rationale. If a distractor is right in no case, it is a strawman and should be replaced.

### A28. Lead-in addition: "with regard to ..." scoping

Round 2 introduces a new lead-in pattern not in our B-table:

> "Which one of the following is the most appropriate advice to give the patient with regard to screening at this stage?"

This is a hybrid management-and-counselling lead-in scoped by a noun phrase. Useful when the action is communication of a specific decision (screening, contraception choice, immunisation timing). Adds nuance to the existing "patient education" lead-in by anchoring on a specific clinical task. Add to the lead-in rotation.

### A29. Inline ECG / image as the discriminator with terse caption

Round-2 sample includes ECG-in-pregnancy at Q11 and otoscopy (otitis externa) at Q10 paeds. Caption is one short line: "An ECG is performed" or "Otoscopy reveals the following". The image carries the answer; the stem must NOT describe what the image shows in prose. We already have A13; the refinement is that the caption must be MAXIMALLY terse and modality-named. No "the ECG demonstrates a wide-complex tachycardia in pattern X" - that is duplication leak.

### A30. "Negative test" framing for pertinent negatives

Round 2 includes Q53 vaginitis with "Pelvic examination is normal" AS a one-clause closure of structural pelvic causes. This is distinct from "no fever, no weight loss, no night sweats" because it is the result of a performed examination, not a list of denied symptoms. Treat negatives-from-performed-examinations as separate from denied-symptom negatives; the former count as ONE closure (per A5), even if they cover three implicit findings.

### A31. Cohort-percentage data as a NOT-in-stem element (UI question)

emedici displays per-option cohort-percentage selection in the right-hand info pane (e.g. "57% selected this option" next to the correct option in Q7 midgut volvulus). This is a UI choice. Do not import; per our G5. Round 2 confirms this is consistently the right call: when learners see "57% picked this", they treat 57% as a difficulty proxy, which short-circuits the reasoning step. Keep cohort analytics off the option row.

### A32. Image post-explanation re-display

emedici shows the image in the stem AND repeats it (or a related image) inside the explanation when the explanation's reasoning re-anchors on imaging features. Q10 paeds otoscopy (otitis externa) is the example. For our bank: when imaging is the discriminator, the explanation must include the same image AND callouts. We can use a small reduced-size copy.

---

## Part 3. Mined clinical facts (AU-specific cutoffs and AU-guideline-named facts)

Pearls that should be available to the generator. Each item names a fact + a guideline body. All written in AU spelling.

### O and G

- Low-dose aspirin for pre-eclampsia prophylaxis: 100 to 150 mg nocte; ideally started between **12 and 16 weeks gestation**; SOMANZ (Society of Obstetric Medicine of Australia and New Zealand) recommendation. Initiating after 20 weeks is not routinely recommended.
- Pre-eclampsia high-risk indications for aspirin: previous personal or family history of pre-eclampsia, nulliparity, multiple gestation, medical conditions such as autoimmune disease, chronic hypertension, diabetes mellitus, assisted conception.
- ACE inhibitor in pregnancy is contraindicated; pre-conception switch to methyldopa is the appropriate step BEFORE confirmation of pregnancy when an ACE inhibitor is currently used for essential hypertension.
- Cervical screening: BreastScreen Australia and the National Cervical Screening Program (NCSP) do NOT recommend cervical screening prior to age 25 nor after age 70 for asymptomatic, low-risk women in the absence of additional risk factors. The 45-year-old type 2 diabetic remains in routine 5-year HPV-test interval; diabetes is NOT a cervical-screening modifier.
- Non-invasive prenatal testing (NIPT): may be performed from 10 weeks gestation. Combined first-trimester screening (cFTS) is performed at 11 to 13+6 weeks. NIPT screens for chromosomal abnormalities only; it does NOT detect structural abnormalities and is not a diagnostic test - positive results require confirmation by CVS or amniocentesis.
- Chorionic villus sampling (CVS): performed between 11 and 14 weeks gestation. Provides definitive diagnosis when the patient's history of a previous miscarriage AND a positive screening (e.g. raised nuchal translucency above 3.5 mm) makes diagnostic certainty preferable to a repeated screen.
- Amniocentesis: usually performed in the second trimester, around 16 weeks; can detect structural and chromosomal abnormalities.
- Maternal serum screening for first-trimester combined screen (cFTS): uses PAPP-A and free beta-hCG with NT; sensitivity ~ 85% for trisomy 21. NIPT sensitivity ~ 99% for trisomy 21.
- Nitrous oxide in active labour: safe and effective first-line analgesic; can be self-administered; does not delay onset of labour; no need for IV access; no significant risk of neonatal respiratory depression; rapid onset and offset (30 to 60 seconds). Does not affect sensation or mobility of the lower limbs (contrast with epidural). Close monitoring is not required due to self-limiting nature. Not the most appropriate analgesia for prolonged labour requiring sustained relief, where epidural may be considered.
- PPROM (preterm premature rupture of membranes) with chorioamnionitis: urgent delivery is indicated regardless of gestational age. At 25 weeks, expectant management is NOT appropriate in the presence of chorioamnionitis. Caesarean section is the most appropriate next step when there are signs of fetal compromise or when vaginal delivery is not imminent.
- Oligohydramnios in PPROM increases the risk of cord prolapse and fetal compromise.
- Magnesium sulfate for neuroprotection in preterm delivery: indicated between 24 and 32 weeks gestation when delivery is imminent.
- Postpartum psychosis: typically presents within the first two weeks postpartum. Incidence approximately 1 to 2 per 1000 births. Risk factors include past personal or family history of bipolar disorder, prior postpartum psychosis (recurrence rate 30 to 50%). Management requires urgent inpatient admission ideally to a mother-and-baby unit; mother-baby separation should be avoided where possible. Lithium is the most established treatment for bipolar-spectrum postpartum psychosis but is incompatible with breastfeeding. Risk of recurrence in subsequent pregnancies is high.
- Edinburgh Postnatal Depression Scale (EPDS): validated screening tool (NOT diagnostic) used in the perinatal period. Cutoff of 13 or more on a 30-point scale indicates need for further assessment. A score of 7 to 9 suggests symptoms requiring follow-up. Item 10 ("the thought of harming myself has occurred to me") is screened separately for self-harm or suicide risk regardless of the total score. Repeat at 4 to 6 weeks if score is 10 to 12. Australian guidelines recommend routine EPDS screening during pregnancy and postpartum.
- Cystic fibrosis carrier screening: pre-pregnancy screening of the partner is recommended when one parent is a known carrier. CFTR mutation frequency in Australia approximately 1 in 25 carriers in the general population, with affected birth approximately 1 in 2500. Currently 178 variants of CFTR are tested for in prenatal carrier screening. IVF with PGT-M is an option for pre-implantation diagnosis when both partners are carriers. Chorionic villus sampling with molecular testing is recommended for early diagnosis of CF when CVS is feasible.
- Pre-eclampsia prophylaxis with low-dose aspirin (100 to 150 mg nocte, initiated between 12 and 16 weeks): more effective than initiation after 16 weeks. Aspirin started after 20 weeks confers minimal benefit and is not routinely recommended. Low-molecular-weight heparin in addition to aspirin is NOT routinely recommended unless there is a clear thrombophilia indication.
- Pelvic organ prolapse types: cystocele (anterior vaginal wall prolapse, bladder descends into anterior vagina); rectocele (posterior vaginal wall prolapse, rectum bulges into posterior vagina); uterine prolapse (uterus descends into vagina); enterocele (small bowel herniates into upper posterior vaginal wall, classically post-hysterectomy); vaginal vault prolapse (apical prolapse following hysterectomy). Cystocele symptoms include vaginal heaviness, dragging sensation, urinary incontinence; examination shows bladder descent into the anterior vaginal wall, worsened with Valsalva.
- Vaginal candidiasis in pregnancy: topical clotrimazole 1% cream is the recommended first-line treatment, applied intravaginally once nightly for up to 7 nights. Fluconazole 150 mg orally is contraindicated in pregnancy due to potential teratogenic effects in the first trimester. Trimethoprim is for urinary tract infection, not candidiasis. Recurrent candidiasis (4 or more episodes per year) prompts consideration of underlying causes including diabetes mellitus, immunosuppression, sexual transmission.
- Chlamydia trachomatis in pregnancy with positive urine NAAT: azithromycin 1 g single oral dose is the recommended first-line treatment for uncomplicated genital chlamydia in pregnancy. Doxycycline is contraindicated in pregnancy. Amoxicillin is a second-line alternative when azithromycin is contraindicated. Repeat test of cure is recommended at 3 to 4 weeks post-treatment. Partners require notification and treatment for sexual contacts within the previous 6 months.
- Placenta praevia versus placenta accreta versus vasa praevia: praevia is placenta covering or near the internal cervical os; accreta is abnormal placental adherence to or through the myometrium, with risk factors including previous caesarean delivery, placenta praevia, advanced maternal age, multiple gestation; vasa praevia is fetal vessels traversing the membranes near the internal os, not covered by Wharton jelly. Painless bleeding with previous caesarean strongly suggests praevia AND increases risk of accreta. Diagnostic ultrasound (transvaginal where possible) is the first-line investigation; MRI used when ultrasound findings inconclusive. Referral to Maternal Fetal Medicine recommended for placenta accreta spectrum.
- Endometrial biopsy in postmenopausal bleeding: hysteroscopy with endometrial biopsy is the gold-standard diagnostic investigation. A transvaginal ultrasound showing endometrial thickness 4 mm or less makes endometrial pathology less likely but does not exclude it; any postmenopausal bleeding warrants definitive tissue diagnosis.
- IUGR (intrauterine growth restriction) detection: serial measurements of head circumference and serial measurements of biparietal diameter are USED but the single ultrasound parameter that has been found to reach its growth potential due to a pathological process is serial measurement of fetal abdominal circumference. Subcutaneous fat deposition, both of which are preferentially reduced when fetal nutrition is compromised, are reflected in abdominal circumference. Estimated fetal weight (EFW) is a composite calculation; for detecting growth restriction it is less sensitive than serial AC measurements.
- Dichorionic diamniotic twin growth discordance: greater than or equal to 20% growth difference is significant and may indicate selective fetal growth restriction (sFGR). Serial growth scans every 2 to 4 weeks recommended; umbilical artery Doppler routinely included.
- Twin-to-twin transfusion syndrome (TTTS): occurs in monochorionic diamniotic twin pregnancies only (NOT in DCDA twins).
- Twin reversed arterial perfusion (TRAP) sequence: rare complication of monochorionic twins where one twin has an absent or non-functioning heart (acardiac twin); perfusion is supplied by the co-twin via placental vascular anastomoses.
- IVF complications elevating risk in subsequent pregnancy: preterm birth ~ 40% to 60% increase; gestational diabetes mellitus more common; pre-eclampsia approximately 15% to 20% versus general 5% to 8%; twin pregnancy with associated additional risks; placental abruption marginally more common.
- Mumps orchitis: presents 4 to 7 days after onset of parotitis in up to 30% of post-pubertal males with mumps. Supportive care with analgesia is the management. Antibiotics are not indicated unless bacterial superinfection. Scrotal ultrasound is NOT routinely needed for diagnosis (clinical diagnosis); reserved if testicular torsion suspected. Vaccination is the most effective prevention - MMR per the Australian Immunisation Handbook.
- Levonorgestrel emergency contraception (LNG-EC): primary mechanism is suppression of pre-ovulatory luteinising hormone surge, thereby delaying or preventing ovulation. Does NOT destroy a fertilised ovum, does NOT prevent implantation of an established fertilised ovum (this is a common misconception but is not supported as the primary mechanism). Effective up to 72 hours after unprotected intercourse; though best within 12 hours. Approval up to 120 hours but reduced efficacy. Most effective taken within 72 hours.
- Cleft lip and palate feeding: feeding assessment is the most appropriate initial step in management of cleft lip and palate. Specialised cleft palate teats, bottles, or breast pumps are options. Craniofacial surgical consultation is typically arranged at age 3 to 6 months for cleft lip and 9 to 12 months for cleft palate, but the immediate next step in a newborn is feeding assessment.

### Paediatrics

- Mongolian spots: benign blue-grey patches typically presenting at birth on the lumbosacral or buttock regions. More common in African, Asian, and Hispanic populations. Resolve spontaneously by school age. Do NOT require treatment. NOT indicative of non-accidental injury; documentation of presence and reassurance of caregivers is appropriate management. Contact child protection services is NOT indicated in the absence of other concerning features.
- Mumps in children: most common complication is preputial orchitis (in post-pubertal males); typically occurs 4 to 7 days after onset of parotitis. Treatment is supportive care with analgesia. Bacterial orchitis in children is usually secondary to epididymitis and requires appropriate antibiotic therapy. Testicular torsion must be excluded in any child presenting with acute testicular pain. Prevention through vaccination per the Australian Immunisation Handbook.
- Community-acquired pneumonia (CAP) fever management in children: antipyretics (paracetamol or ibuprofen) are NOT required in all febrile patients as they only treat a cause but should be administered to patients with high fever (greater than or equal to 38.5 degrees C) or those who are particularly uncomfortable. Fever is a normal physiological response that can aid in fighting infection. Antibiotics indicated when bacterial CAP suspected; amoxicillin first-line per the Royal Children's Hospital Melbourne Clinical Practice Guidelines (RCH CPG).
- Decompensated VSD with congestive heart failure in infant: large VSD presents with congestive heart failure features 6 weeks to 3 months of age due to fall in pulmonary vascular resistance and increased left-to-right shunting. Examination findings: pansystolic murmur at left lower sternal border (often heard early), tachypnoea, hepatomegaly, failure to thrive, sweating with feeds. Coarctation of aorta in older infants more commonly presents with hypertension, headache, leg pains rather than heart failure (though severe coarctation in neonates can present with cardiogenic shock). Eisenmenger syndrome is a late complication of unrepaired large left-to-right shunts, developing over years to decades.
- Otitis externa (chronic suppurative otitis media also covered): aminoglycoside-containing ear drops (dexamethasone + framycetin + gramicidin) are first-line for uncomplicated otitis externa when the tympanic membrane is intact OR when the perforation is small and there is no exposed middle ear. Ciprofloxacin alone ear drops are preferred when there is a known perforation. Avoid systemic absorption when intact TM, but Australian and New Zealand consensus permits topical aminoglycosides in many short-course externa contexts. Amoxicillin clavulanate and oral antibiotics are not first-line treatment for uncomplicated otitis externa; reserved when there is spread beyond the canal. Flucloxacillin and oral antibiotics are not indicated for bacterial CSOM; fungal otitis externa requires antifungal therapy.

### Psychiatry

- Edinburgh Postnatal Depression Scale (EPDS): see O and G section above; the tool is a SCREEN not a diagnostic instrument; total greater than or equal to 13 indicates further mental health assessment is needed; item 10 (suicidality) is reviewed independently of the total. Routine screening recommended in pregnancy and postpartum.
- Postpartum psychosis: see O and G section; admission to a mother-and-baby unit is the most appropriate next step, preserving the mother-infant bond while ensuring safety. Discharge home with community mental health follow-up is NOT appropriate due to the acute risk of harm to the mother or the infant.

---

## Part 4. What makes emedici questions "tricky" - round 2 catalogue

Round 1 catalogued: irrelevant-but-true red herring, disconfirming finding, guideline-cutoff at threshold, two near-identical options where the discriminator is one word, counter-intuitive correct answer, lead-in single-word pivot, lay-language paraphrasing.

Round 2 adds the following:

### T1. Adjacent-guideline distractor

Each distractor matches the right answer to an adjacent question in the same topic with one parameter changed. Q41 (aspirin from 16 weeks): distractors are "20 weeks" (right under a different guideline), "12 weeks" (right under USPSTF), "26 weeks" (right when only on calcium supplementation). A candidate who memorises a single threshold without the surrounding decision tree picks the adjacent-correct distractor.

### T2. The "request" framing trap

When the stem says "she requests test X", the candidate's instinct is to engage with X. The correct answer often instead REFRAMES the test choice or adds a contextual test that should accompany it (Q24: NIPT requested at 24 weeks, the correct answer adds maternal serum screening for AFP because gestational age has moved past NIPT's window for sole reliance).

### T3. Mechanism vs management trap

Stem describes a mechanism question disguised as a management question (Q1: levonorgestrel mechanism). The wrong-shaped reasoning is to ask "what should I do for her?" - the right reasoning is "what does the drug do?". The lead-in carries this entirely. The trickiness comes from candidates skimming the lead-in.

### T4. The "specific test for a specific subset" trap

Q57 IUGR detection: every option is a real obstetric ultrasound parameter. The discriminator is which parameter is the single ultrasound parameter most specifically reduced under growth restriction. Candidates who know "all of these are done" without knowing the relative sensitivity pick "head circumference" or "EFW" - both reasonable but not the most specific. The answer is abdominal circumference because of fat deposition physiology.

### T5. The "right test, wrong gestation" trap

Q23 (raised nuchal at 13 weeks): CVS is correct because it provides definitive diagnosis AND it is within the CVS window. NIPT is wrong NOT because it is the wrong test in general but because at 13 weeks the patient already has a positive screen and needs a diagnostic, not another screen. Amniocentesis is wrong because at 13 weeks the gestation is too early for amniocentesis. The trick is recognising that one parameter (gestation) gates two distinct test choices.

### T6. The "no actionable additional information" reassurance trap

Q11 paeds Mongolian spots: ALL the action options (refer to child protection, dermatology, social photography for documentation, genetic testing) are real activities a doctor might do. The correct answer is documentation and reassurance because there is no actionable abnormality. The trick is that candidates trained in vigilance for non-accidental injury pattern-match to the action options. Defuse by ensuring the stem explicitly establishes no concerning features ("the rest of the examination is unremarkable. He is behaving appropriately for his development.").

### T7. The "first vs definitive" trap

Q19 paeds cleft lip and palate: "feeding assessment" is the FIRST step. "Craniofacial surgical consultation" is part of the management pathway and is correct in the medium term. The trick is that a candidate who has read about cleft lip and palate knows surgery is the definitive treatment and picks it. The lead-in must say "initial step" to disambiguate.

### T8. The "competing investigation timing" trap

Q21 (third-trimester screening question): the question asks the most appropriate diagnostic investigation. CVS is wrong because the patient is past CVS's window. Amniocentesis is right because the patient is within amniocentesis's window. The trick is the candidate knowing CVS gives definitive results but failing to track the gestational age window.

### T9. The "polypharmacy / multiple-condition" stem with one focused discriminator

Q30 (32-year-old preconception on lisinopril): the stem mentions "essential hypertension" AND "active trying to conceive" AND "no contraindications to pregnancy". The discriminator is just the ACE inhibitor switch. Many candidates introduce extra concerns about pregnancy planning, BMI, folate, etc., and pick options that address those rather than the ACE inhibitor switch.

### T10. The "subtle option re-phrasing" trap

Q5 PPROM at 25 weeks: "Caesarean section" is correct. "Continued expectant management" is wrong (because of chorioamnionitis). "External cephalic version" is a malposition correction not applicable here. "Induction of labour" is wrong because of fetal compromise risk. "Amnioinfusion" is wrong as primary management with chorioamnionitis. The trick is that ALL five options are legitimate obstetric interventions in DIFFERENT clinical contexts; the discriminator is the disconfirming chorioamnionitis line in the stem.

### T11. The "absent" option

Sometimes the correct option is literally absent from the options as a deliberate test of the candidate's willingness to accept a "best available" answer. Q11 Mongolian spots: "documentation and reassurance" is the right answer; "no action required" is NOT one of the listed options. The candidate must accept that "documentation" IS an action and reassurance IS an action. Closely related to the "reassurance is real management" pattern.

### T12. The "context-sensitive contraindication" trap

Q53 vaginal candidiasis in pregnancy: fluconazole would be correct in a non-pregnant patient. Clotrimazole IS the correct answer in pregnancy. The trick is that candidates who memorise "fluconazole single dose for candidiasis" pick fluconazole and miss the pregnancy contraindication. Defused only by reading the stem carefully.

### T13. The "wrong-rationale right-answer" pseudo-trap

Some distractors arrive at the right answer for the wrong reason (e.g. Q4 paeds CAP fever: "administer paracetamol" is partly defensible because paracetamol does treat fever, but the GUIDANCE is that paracetamol is not REQUIRED in all febrile patients; only patients with high fever (greater than or equal to 38.5 C) or particular discomfort warrant antipyretic). Round-2 confirms: the correct answer must be correct for the STATED reason in the rationale.

---

## Part 5. What emedici does WRONG (additions to round 1 G-list)

### G8. Inconsistent guideline-naming density

emedici sometimes anchors to a named society (SOMANZ, RANZCOG, RCH Melbourne CPG) and sometimes uses anonymous "current guidelines" or "Australian guidelines". This shifts trust per question. Our rule (D4) requires full name on first mention every time. Do NOT adopt the anonymous-guideline pattern.

### G9. Repeated near-identical stems for the SAME condition across the bank

Round 2 noted at least three near-identical pre-eclampsia prophylaxis scenarios (Q8 first-pregnancy aspirin agent choice, Q41 multipara with prior pre-eclampsia aspirin timing, Q50 IVF preterm risk profile). They use the same scaffold with one parameter changed. This is INTENTIONAL on emedici's part (revisits the same template at different parameters) and pedagogically defensible, but for our randomised single-best-answer bank, two questions that share most of the same stem text feel duplicative. Vary the patient (age, parity, BMI, comorbidity) substantially so the candidate cannot pattern-match.

### G10. Cohort percentage badges next to option text inside the option row

Already noted in G5. Round 2 confirms this is a strong UX pull on the candidate. Do not import.

### G11. "Previous contributors" credential stack in the right pane

Already noted in G7. Round 2 shows this is per-question and can include 3 to 5 photo-and-credential cards. Costs vertical space, adds no learning value. Don't import.

### G12. The "Leave Feedback" bar at the top of every question's right pane

emedici's "Leave feedback / Good Item / Too easy / Too hard" pill bar is at the top of every question's right pane. The position is wrong (above the question content visually) AND the categories are too narrow ("good item" is the only positive); we should NOT replicate the position. If we offer feedback, position it after the next-question CTA, not above the question.

### G13. The "References N" deferred citation expander

Already noted in G2. Round 2 shows the count is often blank or "Reference 1" with a single inline link. We cite inline in the rationale. Confirm: do NOT import.

### G14. Right-hand pane density when not load-bearing

emedici's right pane shows Notebook, Highlight controls, Leave Feedback, Last Review timestamp, Previous Contributors, and small UI affordances. This is dense without being functional. Audit our own UI: the right pane should hold (a) per-user notes, (b) "next question" CTA, (c) report-an-error link - nothing more.

### G15. The Q4 paeds otitis externa explanation mentions "consensus permits" without naming the consensus body

For an exam-grade bank we should never use anonymous-consensus phrasing. If a consensus is named, name it (e.g. Therapeutic Guidelines (eTG), Australian Medicines Handbook (AMH)). Round-2 saw this misstep at least twice and we should avoid it.

### G16. The explanation paragraph that re-states the option text without adding information

Multiple round-2 explanations have a paragraph that simply says "Option X is incorrect because [option text restated]" without adding new information. This is a pseudo-D3. Our binding rule is that each distractor paragraph names the condition / context in which the distractor WOULD be correct + a clinical clue that distinguishes the present case. Audit-reject if a distractor paragraph just rewords the option.

### G17. Mid-stem image insertion (paeds Q10 otoscopy)

emedici occasionally inserts an image mid-stem rather than after the prose. Our A13 says image always at the end. Confirm: do NOT import.

### G18. Inconsistent units within a single option set

Already noted in G3. Round 2 confirms: emedici Q14 chlamydia has "1 g" (azithromycin) and "100 mg twice daily for 7 days" (doxycycline) and "500 mg three times daily for 7 days" (amoxicillin) in the same option set. Acceptable in real practice; for our exam bank, when doses appear in options, format must be parallel (e.g. all use "X mg PO Y times daily for Z days" OR all are agent-only).

---

## Part 6. Generation-time additions (slot into the Section H pre-output gate)

Append the following to the existing 15-item checklist in round-1 Section H:

16. For every L4-L5 question, verify each distractor has a one-sentence "right-in-the-following-case" justification in the rationale. If no such case exists, the distractor is a strawman; replace it.
17. If the stem includes a patient request ("she requests" / "her partner asks"), include the request verbatim and offer at least one option that maintains or modifies the current plan.
18. If the lead-in is "with regard to [scope]", confirm the scope is genuinely the discrimination axis and not a decoration.
19. If the stem has a small inline labelled results block (the "Tier 1 / Tier 2" / "Visit 1 / Visit 2" / "Twin A / Twin B" pattern), use bold tier label + dashed list of named results with units. Reserve for genuinely two-time-point comparisons.
20. If imaging is the discriminator, the caption is one short sentence naming the modality only; the prose must not duplicate what the image shows.
21. Cohort-percentage analytics never appear in option rows.
22. Named source on first mention; never anonymous "current guidelines" or "consensus".
23. Each distractor rationale paragraph adds new information beyond restating the option text.
24. Image (when used) is always at the end of the stem, not mid-paragraph; if reused in the explanation, name the modality each time.
25. Across a batch of 30, no two questions share most of the same scaffold even if one parameter differs; vary patient demographics substantially.

---

## Part 7. Five headline findings (for orchestrator summary)

1. The "adjacent-guideline distractor" is the defining trickiness lever (T1): every L4-L5 distractor should be the right answer to a near-neighbour case with one parameter changed. Encode as a binding generation rule.
2. The progress sidebar's success is a two-arc donut + chip grid + restraint on saturated colour - documented in `emedici_sidebar_spec.md` for direct adaptation to the A to E "x/YYY" dropdown.
3. SOMANZ, RANZCOG, NCSP, RCH Melbourne CPG, the Australian Immunisation Handbook, eTG, AMH are the cited Australian authorities; named-source-on-first-mention is the reproducible mark of professional medical content; emedici sometimes uses anonymous "current guidelines" and we should not.
4. A new lead-in pattern - "Which one of the following is the most appropriate advice to give the patient with regard to [scope]" - is worth adding to the lead-in rotation; it scopes a counselling action by clinical task.
5. Eight new trickiness mechanisms documented (T1 to T13 above), including the "first vs definitive" trap, "right test, wrong gestation" trap, "context-sensitive contraindication" trap, and "competing investigation timing" trap - each is reusable across topic areas as a difficulty lever.

---

End of round 2 report.
