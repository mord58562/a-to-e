# Explanation craft guide (Y4 A-to-E MCQ bank)

Distilled from emedici screenshot batches 1-4. This document specifies the concrete structure every explanation should follow. The generator + audit must enforce this template. Examples are marked `[e.g.]` and the structural rule itself must generalise to any topic.

---

## 1. The mandatory eight-element template

Every explanation, in order:

1. **Opening one-line diagnosis assertion** (when stem withheld the diagnosis)
2. **Mechanism / pathophysiology paragraph** (3-5 sentences, with prevalence numbers where available)
3. **Option-by-option discussion in display order** (each option's text in bold at the start of its paragraph; for each distractor, name the situation in which it WOULD be correct)
4. **Synthesis paragraph** linking the specific case features to the chosen action (1-3 sentences)
5. **Source named in full inside the prose** (full institutional name on first mention, acronym after)
6. **Inline comparison table** when 3+ similar entities are being discriminated
7. **"In context" closing paragraph** (1-2 sentences lifting the case to a general principle)
8. **Key learning points: 2-3 bullets** (each a standalone, comparator-bearing claim - generation tag `explanation.key_points` array)

Length envelope: 250-500 words for the explanation body (`explanation.summary` plus prose around the option rationales) + the bullets. Long enough to teach all options; short enough that every sentence does work.

---

## 2. Element-by-element specification

### 2.1 Opening one-line diagnosis assertion

When the stem withheld the diagnosis, the first sentence of the explanation must name it confidently.

Permitted openers:
- `"This patient presents with [diagnosis]."`
- `"This neonate likely has [diagnosis]."`
- `"The clinical presentation is most consistent with [diagnosis]."`
- `"This case is characteristic of [diagnosis]."`
- `"In this scenario, the [most concerning / most likely / most relevant] condition is [diagnosis]."`

Forbidden:
- "The correct answer is..." (procedural, not clinical)
- "It is likely that..." (hedging)
- "This could be either X or Y..." (no commitment)

When the lead-in already named the diagnosis ("which one of the following is the most appropriate management of [named condition]?"), skip this element; jump to mechanism.

### 2.2 Mechanism / pathophysiology paragraph

3-5 sentences explaining the underlying biology, drug action, or physiological mechanism. Include prevalence statistics, age peaks, or incidence numbers when known and load-bearing.

`[e.g.]` `"Dermoid cysts (mature cystic teratomas) are benign ovarian tumours containing tissue types from all three germ layers. They account for approximately 20% of all ovarian neoplasms and are the most common germ cell tumour in reproductive-age women. On ultrasound, they classically appear as complex masses containing hyperechoic (fatty) material, calcification, and fluid-fluid levels. The torsion risk is the principal indication for surgical removal."`

Audit rule: every mechanism paragraph must contain at least one of (a) numeric prevalence or incidence, (b) named mechanism of action, (c) named pathway / receptor / organism, (d) named anatomical structure.

### 2.3 Option-by-option discussion in display order

This is the highest-pedagogy element. Each of the five options gets its own paragraph in the order A, B, C, D, E (NOT correct-first). Each paragraph starts with the option text in **bold**, followed by the discussion.

For the correct option:
- State that it is the correct answer (or the most appropriate, the indicated investigation, etc.).
- Explain WHY this option is correct in this specific clinical context.
- Cite the guideline by full name (see 2.5).
- 3-5 sentences.

For each distractor, name the context in which it WOULD be correct, then explain why this patient does not meet that criterion:
- `"[Distractor] would be appropriate if [situation Z]. In this patient, [feature W] makes this option [inappropriate / unnecessary / harmful / second-line]."`
- 2-3 sentences each.

`[e.g.]` `"**Oral azithromycin** would be appropriate in immunocompromised patients or in cat scratch disease complicated by systemic features. This patient is immunocompetent and has no fever or systemic symptoms, so observation alone is sufficient (Australian Sexual Health Alliance, Bartonella henselae guidance)."`

`[e.g.]` `"**Ergometrine** is a uterotonic sometimes used in postpartum haemorrhage. It is relatively contraindicated in patients with hypertensive disorders of pregnancy due to the risk of precipitating hypertension, coronary spasm, and stroke (Therapeutic Guidelines: Obstetrics). Given this patient was induced for gestational hypertension, ergometrine would not be the immediate choice."`

Audit rule: every distractor paragraph must contain a clause beginning with "would be appropriate if", "would be indicated when", "is reserved for", or "becomes the correct choice when". This is the if-then rule the candidate carries to the next encounter.

Length parity: distractor paragraphs should be within ~40% of each other in word count. The correct option's paragraph may be slightly longer (typically 1.3-1.6x a distractor) because of the guideline citation.

### 2.4 Synthesis paragraph

1-3 sentences linking the case features to the chosen action. Often begins with "Given..." or "In this patient...".

`[e.g.]` `"Given the findings of low-lying placenta with a posterior succenturiate lobe at 20 weeks gestation, a detailed follow-up ultrasound with colour Doppler should be performed by a maternal-fetal medicine team to specifically look for vasa praevia. If diagnosed, management typically involves planned caesarean delivery at 34-36 weeks after antenatal corticosteroids."`

### 2.5 Source named in full inside the prose

First mention of any guideline body uses the full institutional name with the acronym in parentheses. Subsequent mentions may use the acronym. Source names live in the prose, not in footnotes.

Full names to use (first-mention):
- The National Cervical Screening Program (NCSP) guidelines
- The Royal Australian and New Zealand College of Obstetricians and Gynaecologists (RANZCOG) guidelines
- The Royal Australasian College of Physicians (RACP)
- The Royal Australian College of General Practitioners (RACGP) guidelines
- The Royal Children's Hospital Melbourne Clinical Practice Guidelines (RCH CPG)
- The Australian Immunisation Handbook
- The Australian Medicines Handbook (AMH)
- Therapeutic Guidelines (eTG) - subspecialty named (e.g. Therapeutic Guidelines: Antibiotic)
- The Australasian Society of Clinical Immunology and Allergy (ASCIA) Anaphylaxis Guidelines
- The Australasian Sexual Health Alliance (ASHM) STI Management Guidelines
- The National Blood Authority (NBA) Australia: Anti-D Guidelines
- The Royal Australian and New Zealand College of Psychiatrists (RANZCP) Practice Guidelines
- The Heart Foundation (NHFA) / Cardiac Society of Australia and New Zealand (CSANZ)
- The 2023 International Evidence-based Guideline for the Assessment and Management of Polycystic Ovary Syndrome
- The UK Medical Eligibility Criteria for Contraceptive Use (UKMEC) - international, used for contraception thresholds in AU practice
- The Australasian Diabetes in Pregnancy Society (ADIPS)
- The Royal Australasian College of Surgeons (RACS)
- The Australian and New Zealand Intensive Care Society (ANZICS) Statement on Sepsis
- The Australian Rheumatology Association (ARA) guidelines

Source citation format inside prose:
- `"...(Therapeutic Guidelines: Antibiotic)..."`
- `"...as per the Royal Children's Hospital Melbourne Clinical Practice Guidelines on intussusception..."`
- `"...the National Cervical Screening Program recommends..."`

Where a specific recommendation number exists, include it:
- `"(NCSP Consensus recommendation 6.48: Colposcopy referral for atypical glandular/endocervical cells)"`

When citing trial evidence:
- `"(ORACLE I trial, a multicentre randomised controlled trial of 4809 women with median gestation 32 weeks)"`

Audit rule: every explanation must cite at least one guideline body by full institutional name. Acronym-only citations fail audit.

### 2.6 Inline comparison table

When 3+ similar entities are being discriminated (drugs vs side-effects, syndromes vs USS features, organisms vs antibiotic coverage, AED vs teratogenicity, miscarriage type vs ultrasound finding), embed a markdown table inside the explanation. This saves prose and lets the candidate scan-compare.

Table format:

```
| Entity | Discriminating feature 1 | Discriminating feature 2 |
|---|---|---|
| A | ... | ... |
| B | ... | ... |
| C | ... | ... |
```

Real examples observed:

```
| AED | Birth-defect risk | Pregnancy use |
|---|---|---|
| Sodium valproate | Neural tube defects, skeletal abnormality, developmental delay | Avoid |
| Phenytoin | Fetal hydantoin syndrome, cleft lip/palate | Avoid if alternative |
| Carbamazepine | Fetal hydantoin syndrome, spina bifida | Avoid if alternative |
| Lamotrigine | No defined increased risk | Preferred |
| Levetiracetam | No defined increased risk | Preferred |
```

```
| Syndrome | Cardiac association |
|---|---|
| Turner | Coarctation of the aorta (30% of Turner have CoA) |
| Noonan | Pulmonary valve stenosis, hypertrophic cardiomyopathy |
| Williams | Supravalvular aortic stenosis, renal artery stenosis |
| DiGeorge | Conotruncal defects (truncus arteriosus, tetralogy of Fallot) |
```

```
| CST result | Next step |
|---|---|
| HPV not detected | 5-yearly screening |
| HPV (not 16/18) + LBC normal/pLSIL | Repeat HPV in 12 months |
| HPV (not 16/18) + LBC atypical glandular | Colposcopy |
| HPV 16/18 (any LBC) | Colposcopy |
```

When NOT to use a table: dichotomous comparisons (two entities) - prose handles these better.

### 2.7 "In context" closing paragraph

1-2 sentences that lift the specific case to a transferable rule. Always present. Phrasings to use:
- `"In context, [condition] in any patient with [feature] should prompt [action] because..."`
- `"This case illustrates the broader principle that..."`
- `"More generally, any [presentation] in [context] warrants [response]."`
- `"The take-home rule: [rule]."`

`[e.g.]` `"In context, any febrile child with throat pain and an inability to extend the neck should be presumed to have a retropharyngeal abscess until proven otherwise; lateral neck X-ray or contrast-enhanced CT confirms the diagnosis (Royal Children's Hospital Melbourne Clinical Practice Guidelines)."`

`[e.g.]` `"This case illustrates the broader principle that demographic priors do not override longitudinal data: a normal haemoglobin three years ago in a patient now anaemic shifts the differential firmly toward acquired causes regardless of heritage."`

### 2.8 Key learning points: 2-3 bullets

These map to the `explanation.key_points` array in the schema.

Each bullet:
- Is a complete declarative clinical claim.
- Carries either a comparator (vs adjacent differential), a mechanism, or a cohort qualifier.
- Is decontextualised - readable as a standalone flashcard.
- Avoids numerics (thresholds live in the explanation body).
- Avoids meta-commentary ("Remember to consider...", "Always check...", "Key learning point...").
- Is written as a portable rule, not a case-specific observation.

`[e.g. good]`
- `"Combined hormonal contraception is contraindicated in individuals with migraine with aura due to an increased risk of ischaemic stroke, regardless of age."`
- `"Transdermal menopausal hormone therapy is preferred over oral formulations when minimising thrombotic risk because it avoids first-pass hepatic metabolism and provides more stable serum oestrogen."`
- `"A blood pressure discrepancy between the upper and lower limbs with radio-femoral delay is the hallmark clinical sign of coarctation of the aorta."`

`[e.g. bad]`
- `"Remember to always check for migraine with aura before prescribing the pill."` (meta-commentary)
- `"This patient should have transdermal HRT."` (case-specific, not portable)
- `"The threshold is BP >=160/110."` (numeric belongs in explanation body)

Audit rule: each bullet must (a) be parseable as a standalone clinical fact, AND (b) contain either a comparator clause, a mechanism clause, or a cohort qualifier.

---

## 3. The `explanation.pearls` field

Per the existing schema, `explanation.pearls` is a single 1-2 sentence pearl: ONE specific, memorable clinical fact (named drug + threshold + timeframe). NOT formulaic ("Remember to consider...", "Always check..."). The pearl must add information not already in the rationale or the key points.

Examples that meet the bar:
- `"In Australia, betamethasone for fetal lung maturation is given as 2 doses of 11.4 mg IM 24 hours apart, optimally 48 hours to 7 days before delivery, with benefit up to 34+6 weeks gestation."`
- `"The Direct Antiglobulin Test (Coombs) is the first-line investigation to differentiate immune from non-immune haemolysis in a child with anaemia + reticulocytosis + indirect hyperbilirubinaemia + splenomegaly."`
- `"Magnesium sulfate is both anticonvulsant and vasodilator in pre-eclampsia; transfer is contraindicated once cervical dilatation is >=8 cm because the risk of delivery en route outweighs the benefit of tertiary care."`

---

## 4. The `explanation.summary` field

3-5 sentences of broader clinical context the question lives in (the wider pathway, indications, contraindications, what happens if missed). NOT a restatement of the correct rationale. This is the "zoomed-out" view; the option-by-option discussion is the "zoomed-in" view.

`[e.g.]` `"Postpartum haemorrhage is defined as blood loss of >=500 mL (severe >=1000 mL, major >=2500 mL). Assessment follows the 4 Ts: tone, trauma, tissue, thrombin. The correct sequence depends on the dominant cause: uterotonics for atony, direct pressure and definitive repair for genital tract trauma, manual removal or curettage for retained tissue, blood-product support and tranexamic acid for coagulopathy. Failure to identify the dominant cause leads to inappropriate uterotonic escalation and missed trauma."`

---

## 5. Worked-example skeleton

A complete explanation showing all eight elements in order. Use this as the structural template for any new question.

> **[1. Opening]** This patient presents with severe pre-eclampsia complicated by HELLP features at 37+2 weeks gestation in active labour.
>
> **[2. Mechanism]** Severe pre-eclampsia is defined by blood pressure >=160/110 plus end-organ involvement, here evidenced by elevated transaminases and proteinuria. Magnesium sulfate acts through multiple mechanisms: it is a calcium antagonist causing smooth-muscle vasodilation, reduces cerebral vasospasm, and stabilises neuronal membranes, raising the seizure threshold. The aim is eclampsia prevention rather than blood-pressure control, although a modest reduction in BP is a useful secondary effect.
>
> **[3. Options A-E in display order]**
>
> **Transfer to tertiary centre immediately** would be appropriate earlier in the labour course or when local services cannot safely deliver. At 8 cm dilation the risk of delivery during transfer outweighs the benefit; the priority is stabilisation in situ.
>
> **Start intravenous magnesium sulfate infusion** is correct. This patient meets criteria for severe pre-eclampsia (BP 165/110, HELLP features, proteinuria) and magnesium sulfate is the first-line agent for eclampsia prevention (RANZCOG: Hypertension in pregnancy guidelines; SOMANZ: Guideline for the Management of Hypertensive Disorders of Pregnancy).
>
> **Strict fluid balance chart and fluid restriction** to 80-100 mL/hour is essential adjunctive care because these patients are at high risk of pulmonary oedema, but it is not the most urgent immediate priority over seizure prevention.
>
> **Start repeated intravenous beta-blocker boluses** would be considered for severe BP control if magnesium sulfate alone is insufficient and labetalol or hydralazine is needed; intermittent boluses without baseline magnesium do not address eclampsia risk.
>
> **Attempt a ventouse delivery** would only be appropriate at full dilatation with confirmed fetal head position; at 8 cm and without an obstetric indication for immediate operative delivery, this is inappropriate.
>
> **[4. Synthesis]** Given the BP, HELLP features, and labour stage, the immediate priority is intravenous magnesium sulfate while continuing cervical assessment and preparing for delivery at full dilatation. Fluid restriction is initiated concurrently; antihypertensive therapy (oral nifedipine or IV labetalol) follows the same evening.
>
> **[5. Source]** The Society of Obstetric Medicine of Australia and New Zealand (SOMANZ) Guideline for the Management of Hypertensive Disorders of Pregnancy and the RANZCOG statement specify magnesium sulfate as first-line for eclampsia prevention.
>
> **[6. Table - omitted here because only one drug is being discussed; would be added if comparing multiple uterotonics or antihypertensives]**
>
> **[7. In context]** This case illustrates the broader principle that in advanced labour with severe pre-eclampsia, eclampsia prevention takes precedence over both transfer logistics and definitive BP control, and that magnesium sulfate is the universally first agent.
>
> **[8. Key learning points - schema: `explanation.key_points`]**
> - Severe pre-eclampsia is defined by BP >=160/110 plus end-organ involvement; magnesium sulfate is the first-line agent for eclampsia prevention regardless of labour stage.
> - Magnesium sulfate acts as both anticonvulsant and modest vasodilator in pre-eclampsia, with fluid restriction (80-100 mL/hour) required concurrently to mitigate pulmonary oedema risk.
> - Transfer to a higher level of care is contraindicated once cervical dilatation is advanced because the risk of unattended delivery outweighs the benefit of tertiary infrastructure.

---

## 6. Audit checklist for explanations

Run on every generated question before commit:

1. Opening sentence names the diagnosis (when stem withheld it).
2. Mechanism paragraph contains at least one numeric prevalence/incidence OR named pathway OR named organism.
3. Five paragraphs, one per option, in display order, each starting with the option text in bold.
4. Every distractor paragraph contains a "would be appropriate if" / "would be indicated when" / "is reserved for" clause.
5. Distractor paragraphs within ~40% word-count parity.
6. At least one guideline body cited by full institutional name.
7. Acronym-only citation: fail.
8. Synthesis paragraph present (1-3 sentences linking case to action).
9. "In context" closing paragraph present.
10. `explanation.key_points` contains 2-3 bullets; each is comparator-bearing or mechanism-tagged; none is meta-commentary; none is purely numeric.
11. `explanation.pearls` contains a specific drug + threshold + timeframe fact NOT already in the rationale.
12. Table embedded if 3+ similar entities being discriminated.
13. Explanation body 250-500 words.
14. No em-dashes (codepoint grep).
15. AU spellings; "magnesium sulfate" (AMH INN).
16. No banned tokens (ATSI, canonical).
17. No author meta-commentary anywhere.
