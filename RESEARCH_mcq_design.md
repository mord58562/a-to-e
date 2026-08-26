# Research: MCQ Design for the Y4 Australian Medical Practice Bank

A reference compiled from the medical-education psychometrics literature, national-board item-writing manuals, and assessment-design research. Intended to drive (a) generation-prompt refinement for the single-best-answer (SBA) bank and (b) planning for new question formats in the static site.

All claims are cited inline. No em-dashes are used (space-hyphen-space throughout). No fabricated quotations.

---

## Part 1 - Single-Best-Answer (SBA) Item Design

### 1.1 The core manuals: NBME, Haladyna, and friends

Two documents anchor virtually all serious medical-MCQ writing advice:

1. **Case S, Swanson D. "Constructing Written Test Questions for the Basic and Clinical Sciences."** National Board of Medical Examiners (NBME), 3rd edition, 1998 (formally revised 2001-2002). Free PDFs hosted by UConn Health, OHSU, Internet Archive, and the NBME's own learning portal. The 2021 successor is the NBME "Item-Writing Guide" R6 (NBME, 2021) (NBME, [nbme.org/educators/item-writing-guide](https://www.nbme.org/educators/item-writing-guide); archived PDF at [archive.org/Constructing_Written_Test_Questions](https://ia600204.us.archive.org/23/items/Constructing_Written_Test_Questions_For_the_Basic_and_Clinical_Sciences/NBMETestItems.pdf)).
2. **Haladyna TM, Downing SM, Rodriguez MC. "A Review of Multiple-Choice Item-Writing Guidelines for Classroom Assessment."** *Applied Measurement in Education* 15(3):309-334, 2002. Cited 4000+ times. Synthesised 27 textbooks and 27 empirical studies into a 31-rule taxonomy ([Tandfonline abstract](https://www.tandfonline.com/doi/abs/10.1207/S15324818AME1503_5); [BYU PDF excerpt](https://testing.byu.edu/handbooks/Multiple-Choice%20Item%20Writing%20Guidelines%20-%20Haladyna%20and%20Downing.pdf); [UFVJM mirror](https://site.ufvjm.edu.br/fammuc/files/2016/05/item-writing-guidelines.pdf)). Haladyna's 2004 book "Developing and Validating Multiple-Choice Test Items" (3rd ed, Routledge) is the long-form companion.

Practical takeaway: the NBME manual is the gold standard for clinical-vignette items and is the source of phrasing patterns that show up in USMLE, AMC, MCCQE, and most modern banks. Haladyna is the gold standard for the abstract rule-set that applies across all classroom and large-scale MCQs. Anything we generate should be auditable against both.

### 1.2 The Haladyna-Downing-Rodriguez 31-rule taxonomy

Reconstructed from the BYU, UFVJM and PMC excerpts and corroborated against subsequent reviews (Tarrant & Ware 2008; EBMA 2017; U Toronto 2022) ([EBMA guidelines PDF](https://www.ebma.eu/wp-content/uploads/2019/02/EBMA-guidelines-for-item-writing-version-2017_3.pdf); [U Toronto Essentials of Item-writing](https://meded.temertymedicine.utoronto.ca/sites/default/files/assets/resource/document/guidelines-writing-mcqs-full-mar-20220.pdf)). The 31 rules group into five buckets:

**Content concerns (rules 1-6).** Each item assesses a single important learning objective; trivia and opinion are off-limits; content should be of enduring importance; items should test application not isolated recall; avoid overly specific or overly general content; avoid items based on opinion unless qualified by a source.

**Formatting concerns (rules 7-12).** Use the one-best-answer (Type A) format by default; format vertical option lists; use multiple-true-false (MTF / Type X) only with caution; avoid complex multiple choice (K-type); avoid true-false except for very specific objectives; consider EMQs for parallel content.

**Style concerns (rules 13-15).** Edit the item for clarity and grammar; keep the reading level appropriate to the examinee; minimise unnecessary verbiage in the stem.

**Writing the stem (rules 16-21).** Ensure the directions are clear; include the central idea in the stem, not the options ("cover the options" rule, see 1.3); avoid window-dressing irrelevant material; word the stem positively wherever possible; if a negative is necessary, emphasise it (capitals, bold, "EXCEPT"); the stem should make sense without reading the options.

**Writing the choices (rules 22-31).** Use as many functioning distractors as the content allows (Rodriguez 2005 meta-analysis: three options is the empirical sweet spot, see 1.7); make all distractors plausible; vary the position of the correct answer (avoid position bias such as the "always-C" cluster); place options in logical or numeric order; keep options independent and not overlapping; keep options homogeneous in content, length and grammar; keep options free from unintentional cues; avoid "all of the above" and "none of the above"; phrase options positively; avoid silly humour or trick options.

Source for grouping and counts: Haladyna, Downing, Rodriguez 2002 abstract (Tandfonline); BYU and UFVJM mirrors of the taxonomy; secondary summaries in the EBMA 2017 guide and the U Toronto 2022 manual. Brame 2013 endorses the same structure ([Vanderbilt CFT guide](https://cft.vanderbilt.edu/guides-sub-pages/writing-good-multiple-choice-test-questions/), now mirrored at [sites.google.com/view/cynthia-brame](https://sites.google.com/view/cynthia-brame/teaching-guides/writing-good-multiple-choice-test-questions)).

Practical takeaway: when our generation prompt produces a question, the first audit step is a 31-checkbox pass. Realistically, automating an audit of rules 16-31 catches almost all of what NBME calls "technical flaws".

### 1.3 The "cover-the-options" test

NBME's flagship sanity check: cover the option list with your hand. A competent examinee should be able to read the stem alone, generate a candidate answer in their own head, then look at the options and find the one that matches (Case & Swanson NBME 1998/2001, summarised in the Vanderbilt CFT guide and the FACS / ACS Multiple-Choice Item-Writing Guidelines, [facs.org/test-writing](https://www.facs.org/for-medical-professionals/education/cme-resources/test-writing/)).

If the stem cannot stand alone (i.e. the examinee needs the options to know what is being asked), the item is testing recognition rather than knowledge. Most "trick" items fail this test. Many lazy fact-check items fail this test ("Which of the following is true about asthma?" - failing because the stem is not a question).

Practical takeaway: every generated SBA must pass cover-the-options. Force the stem to end in a focused interrogative ("What is the most likely diagnosis?", "Which is the most appropriate next investigation?", "Which is the most appropriate initial management?").

### 1.4 Item flaws catalogue (cueing and irrelevant difficulty)

Tariq et al. 2013 ("Identification of technical item flaws leads to improvement of the quality of single best Multiple Choice Questions", [PMC3809311](https://pmc.ncbi.nlm.nih.gov/articles/PMC3809311/)) and Downing 2005 ("The effects of violating standard item writing principles", *Adv Health Sci Educ*) categorise MCQ flaws into two superordinate groups:

**A. Testwiseness flaws (the item is solvable without knowing the content).**

- *Grammatical cues.* Singular/plural mismatch between stem and one option, or article ("a" vs "an") agreeing with only one option.
- *Logical cues.* Subset of options is logically exhaustive; one option contradicts another so one of them must be correct.
- *Absolute terms in distractors.* "Always", "never", "all", "none" rarely survive in correct answers; testwise students delete them on sight. (Tariq 2013 measured 21% prevalence in 2009.)
- *Long correct answer.* The keyed option is noticeably longer (longest-option bias). Tariq 2013, Downing 2005, Tarrant & Ware 2008.
- *Convergence strategy.* The correct answer shares the most elements (words, phrases) with other options. Often introduced when an old true-false bank is tweaked into SBA format ([Tariq 2013 PMC3809311](https://pmc.ncbi.nlm.nih.gov/articles/PMC3809311/)).
- *Word repeats / clang associations.* A keyword in the stem is repeated only in the correct option ("interstitial" in stem and only one option mentions "interstitial pneumonia").
- *Always-position bias.* Correct answer disproportionately placed in position B/C, allowing guessing strategies.
- *Implausible distractors.* Distractors that no examinee would seriously consider; reduces the effective option count and inflates p-value.

**B. Irrelevant-difficulty flaws (the item is hard for reasons unrelated to mastery).**

- *Negatively phrased stem without emphasis.* "Which of the following is NOT a feature of nephrotic syndrome?" with "NOT" un-emphasised.
- *"All except" or "none except" stems.* High cognitive cost, low information yield. NBME explicitly deprecates these (NBME R6 guide; Case & Swanson).
- *"All of the above" / "None of the above" in options.* Allows partial-knowledge guessing or punishes complete-knowledge candidates.
- *Heterogeneous options.* Options are different categories (a drug, a diagnosis, an investigation in the same list).
- *Numeric data inconsistently stated.* Different units between options; different decimal precision.
- *Item interdependence.* Question 12 reveals the answer to question 7. Particularly relevant for linked-case sets (see Part 2).
- *Vague qualifiers.* "Usually", "sometimes", "often" mean nothing precise; correct answers cluster in vague qualifiers.
- *Parallel-construction failure.* Options written in different grammatical forms (verb phrase vs noun phrase).
- *Faulty stem.* Stem does not pose a question that can be answered from the stem (fails cover-the-options).

Tariq 2013 (Aga Khan University) measured the prevalence of these flaws across three years of summative paediatric SBAs: overall flawed-item rate dropped from 67% in 2009 to 21% in 2011 after structured faculty training. Irrelevant-difficulty flaws were most common (40% in 2009), followed by testwiseness (21% in 2009).

Practical takeaway: build an auto-linter for our bank that flags any item containing "always", "never", "all of the above", "none of the above", "EXCEPT" in any case, mixed-case "NOT" emphasis, or where the correct answer is more than ~20% longer than the mean distractor length. This single check would catch most of what Tariq labels prevalent flaws.

### 1.5 Item-analysis statistics: how to tell a good item from a bad one

The classical-test-theory triad ([U Arizona CoM Phoenix item analysis page](https://phoenixmed.arizona.edu/assessment/item-analysis); [ASC Metrics on point-biserial](https://assess.com/the-point-biserial-item-discrimination/); [Mehta 2018 in PMC5892816](https://pmc.ncbi.nlm.nih.gov/articles/PMC5892816/)):

- **Difficulty index (p-value, facility):** proportion of examinees who got the item right. Acceptable range 0.30 to 0.85. Ideal range 0.30 to 0.70 for discrimination, 0.50 being theoretical maximum for variance and therefore for discrimination power. Lord & Novick (*Statistical Theories of Mental Test Scores*, 1968) is the primary source.
- **Discrimination index (D, or point-biserial correlation r_pb):** correlation between getting the item right and getting the total score high. Thresholds in medical-education practice: D >= 0.20 acceptable, D >= 0.30 good, D >= 0.40 excellent. Negative D means an item that low scorers get more often than high scorers - always a defect ([Phoenix Med item analysis](https://phoenixmed.arizona.edu/assessment/item-analysis); [ASC Metrics](https://assess.com/the-point-biserial-item-discrimination/)).
- **Distractor analysis:** each distractor should be selected by >= 5% of examinees and selected more by the low-scoring third than the high-scoring third (Haladyna 2004; Gierl, Bulut, Guo & Zhang 2017, "Developing, Analyzing, and Using Distractors", *Review of Educational Research*, [Sage abstract](https://journals.sagepub.com/doi/10.3102/0034654317726529)). A distractor failing both is "non-functional" and should be rewritten.

Rodriguez 2005 (meta-analysis of 80 years of MCQ research, *Educational Measurement: Issues and Practice* 24(2)) and the 2025 BMC Med Educ network meta-analysis ([Less is More?, PMC12532923](https://pmc.ncbi.nlm.nih.gov/articles/PMC12532923/)) converge on the finding that **three functional options is empirically optimal**: 3-option MCQs match 4- and 5-option items on reliability while reducing reading time, examinee fatigue and the rate of non-functioning distractors. The dogma of "always five options" is psychometrically unjustified. In practice we should write five options only if the fifth is genuinely plausible; otherwise drop to four or three.

Practical takeaway: even without examinee data, we can apply a *theoretical* distractor-plausibility check during generation: each distractor must be a known clinical entity in the same differential, not a straw man.

### 1.6 Bloom's revised taxonomy in clinical MCQs

Anderson & Krathwohl 2001 revised Bloom: Remember, Understand, Apply, Analyse, Evaluate, Create. Su, Osisek & Starnes 2005 (*Nurse Educator*) applied this to clinical reasoning; Crowe, Dirks & Wenderoth 2008 ("Biology in Bloom") gave concrete stem patterns; Adesoji 2018 and Tofade, Elsner & Haines 2013 (PMC3425929, [Pharmacotherapeutics paper](https://pmc.ncbi.nlm.nih.gov/articles/PMC3425929/)) gave examples for therapeutics MCQs.

Stem patterns for each level:

| Level | Verbs typically appearing in stem | Clinical example pattern |
|---|---|---|
| Remember | Define, list, name, recall | "Which receptor does salbutamol act on?" |
| Understand | Interpret, classify, summarise, explain | "What best explains the mechanism of hypokalaemia after salbutamol?" |
| Apply | Solve, calculate, prescribe, use | "What is the appropriate IV dose for this 18 kg child?" |
| Analyse | Differentiate, organise, attribute, distinguish | "Which feature most strongly distinguishes bronchiolitis from viral wheeze?" |
| Evaluate | Critique, judge, justify, prioritise | "Which is the single most appropriate next step given the deteriorating sats trend?" |
| Create | Design, plan, compose | (Rarely tested in SBA; better suited to OSCE / case write-up) |

Phillips, Aktan, Bay & Mobley 2017 (PMC8368900, [Bloom's in MCQs paper](https://pmc.ncbi.nlm.nih.gov/articles/PMC8368900/)) found that faculty intent and student-perceived level often diverge: an item written as "Apply" is frequently solved as "Remember" because the examinee has already memorised the textbook script. This is critical for our Y4 bank: a vignette of textbook-typical pneumococcal pneumonia is an Apply item only in faculty intent; in practice it is Remember. To force higher-level reasoning we must include atypical features, conflicting findings, or competing differentials in the stem.

Tofade 2013's pharmacotherapeutics study (PMC3425929) showed that application and evaluation items had significantly higher discrimination indices than recall items.

Practical takeaway: target ~60% Apply / Analyse and ~20% Evaluate, ~20% Remember/Understand, with explicit Bloom tags in our bank schema. Atypical features in the vignette are the cheapest way to push an item up the taxonomy.

### 1.7 Clinical-reasoning typology: dual-process, illness scripts, script concordance

Eva 2005 ("What every teacher needs to know about clinical reasoning", *Medical Education* 39(1)); Norman, Monteiro, Sherbino, Ilgen, Schmidt, Mamede 2017 ("The Causes of Errors in Clinical Reasoning", *Academic Medicine*); Norman & Eva 2010, dual-process theory paper ([PMC3060310](https://pmc.ncbi.nlm.nih.gov/articles/PMC3060310/)); Schmidt & Mamede 2015 ("How to improve the teaching of clinical reasoning"). Norman 2024 in *Journal of Evaluation in Clinical Practice* reaffirms that **the central determinant of reasoning quality is structured knowledge organisation (illness scripts), not the dichotomy of fast vs slow**.

Implications for MCQ design:

- **System 1 (pattern recognition / script triggering) items.** Classical presentation with single best diagnosis. Tests illness-script retrieval. Risk: easy to confuse with pure Remember. Mitigation: ensure the script is one of several plausibly cued by the stem features.
- **System 2 (analytic) items.** Conflicting findings, atypical presentation, ambiguous data. Forces hypothesis refinement.
- **Bayesian-update items.** Stem provides pre-test probability cues (age, demographics, prevalence) then adds a test result and asks for revised probability or next step.
- **Script-concordance items (Charlin et al. 1998; Lubarsky, Dory, Audetat, Custers, Charlin 2015, [BMC Med Educ Charlin SCT](https://link.springer.com/article/10.1186/s12909-025-06814-7)).** "Given hypothesis H, how does new finding F affect your thinking? -2 to +2 Likert." Scored against expert panel concordance, not single right answer. Pure clinical-reasoning instrument; not interchangeable with SBA.

Practical takeaway: at Y4 final-prep level, the highest-yield design move is to systematically introduce one "Bayesian wrinkle" per vignette - a piece of data that genuinely shifts the differential. Pure script-triggering items remain useful for breadth coverage but should not dominate.

### 1.8 Distractor quality

Vyas & Supe 2008 ("Multiple choice questions: a literature review on the optimal number of options", *National Medical Journal of India* 21(3), [NMJI PDF](https://nmji.in/nmji/archives/Volume_21/Issue-3/PDF-volume-21-issue-3/Volume-21-issue-3-Med-Edu.pdf)); Brame 2013 (Vanderbilt CFT); Gierl et al. 2017 (Sage); Tarrant & Ware 2010 ("A framework for improving the quality of multiple-choice assessments", *Nurse Educator*); Hingorjo & Jaleel 2012 (*JPMA*) on distractor efficiency.

The core findings:

- Distractors should derive from **common student errors**, not random plausible-sounding wrong answers. Catalogue real misconceptions, near-misses, and competing entities in the differential (Brame 2013).
- **Each distractor must be defensible** as a possible answer for a partially-trained candidate. If a distractor is "clearly absurd" it is non-functional.
- **Homogeneity:** all options should belong to the same category (all drugs, or all diagnoses, or all investigations, never mixed). Heterogeneity is a strong cue.
- **Length-matching:** correct option should not be the longest. Aim for option lengths within ~15% of the mean.
- **Plausibility hierarchy:** for diagnosis items, include 1-2 distractors from the same anatomic/physiologic family (e.g. for asthma, include bronchiolitis or viral-induced wheeze; not a fracture). For investigation items, include 1-2 investigations that would be appropriate at a different point in the workup.
- **Distractor function check:** in retrospective analysis, distractors selected by < 5% are non-functional and should be revised.

Practical takeaway: when generating a vignette, also write a one-sentence justification for each distractor explaining *which examinee error this distractor catches*. Store the justification in the bank; surface it in feedback. (This also doubles as an educational explanation field.)

### 1.9 Cognitive-load and reading-load of stems

Sweller, van Merrienboer, Paas 1998 (cognitive-load theory); van Merrienboer & Sweller 2010 ("Cognitive load theory in health professional education", PMID 20078759). Park & Park 2025 (*Korean J Med Educ*, [PMC12971134](https://pmc.ncbi.nlm.nih.gov/articles/PMC12971134/)) is the most directly relevant: a mixed-method study of Korean and English MCQs concluded that **scenario-based MCQs with stems 35-50 words and options 1-10 words optimise item quality**. Longer stems risk loading working memory with extraneous detail; very short stems risk failing cover-the-options. Reading time matters: native English students read 230-250 wpm for comprehension; non-native English students considerably slower, which has equity implications in an Australian bank with many international students.

Yousef et al. 2024 (*Adv Med Educ Pract*, PMC11060202) derived a five-domain equation for MCQ testing time, finding that **total stem word count is the single largest predictor of time-per-item**, followed by application-vs-recall ratio and presence of images.

Practical takeaway: cap our stems at ~80 words for routine items, ~120 for complex Apply/Analyse items. Strip "window dressing" (irrelevant demographics, family history unrelated to the question, redundant lab values).

### 1.10 Australian-specific considerations: AMC, cultural safety, Indigenous health

The **AMC MCQ Examination Specifications V8 (Sept 2025)** ([amc.org.au PDF](https://www.amc.org.au/wp-content/uploads/2025/09/2025-09-09-MCQ-Specifications-V8.pdf)) define the blueprint as a matrix of three Clinician Tasks (Data Gathering; Data Interpretation and Synthesis; Management) crossed with patient groups (infants, children, adolescents, adults, older adults, women in pregnancy/postpartum). The exam is a 3.5-hour, 150-item, computer-adaptive test with five options per item. Images of X-rays, ECGs, clinical photographs are permitted.

The AMC's [Aboriginal and Torres Strait Islander and Maori Strategy](https://www.amc.org.au/indigenous-health/) commits to embedding cultural safety in all assessments. Items on Indigenous health are explicitly part of the blueprint. The Medical Deans of Australia and New Zealand Indigenous Health Curriculum Framework (2020) and the AIDA / LIME guidelines define what culturally safe items look like: avoid deficit framing, avoid pan-Indigenous stereotyping, require knowledge of social determinants and access barriers, and use the patient's stated identity language ("Aboriginal", "Torres Strait Islander", "Maori") rather than collapsed categories.

Practical takeaway for the Y4 bank: tag every item with task (DG / DIS / MGT) and patient group to match the AMC blueprint. Include a deliberate proportion of Indigenous-health items written to the Medical Deans framework. Avoid the common failure mode of "Indigenous patient" cues that resolve into stereotyped diseases (rheumatic heart disease, T2DM in every Indigenous vignette) - the cultural-safety lesson is to write Indigenous patients across the full spectrum of conditions.

### 1.11 AMBOSS / Geeky Medics / Passmedicine / Pastest behind-the-scenes

Public information is thin: none of these vendors publish a formal item-writing manual. What is published or inferable:

- **AMBOSS** describes content as developed by 150+ physicians against the most recent USMLE / AMC blueprint, with peer review and ongoing updating (AMBOSS [int page](https://www.amboss.com/int); [AMBOSS AMC study guide](https://www.amboss.com/int/au/amc)). Their internal style is observable: heavy use of vignettes, atypical features, two-step reasoning, distractors taken from the same differential.
- **Pastest** publicises a 4000+ SBA UKMLA bank with curated explanations and spot-diagnosis cards; items are explicitly mapped to the UKMLA content map ([Pastest UKMLA page](https://www.pastest.com/products/med-students-ukmla)).
- **Passmedicine** emphasises high-volume SBA practice mapped to UKMLA and royal-college content; explanations are short and focused on the single fact tested. They make no public claims about psychometric review.
- **Quesmed** is recent-graduate-authored and emphasises real-exam style closeness ([iatroX comparison](https://www.iatrox.com/blog/passmedicine-vs-quesmed-vs-pastest-vs-iatrox-for-ukmla-2026)).

The common observable pattern across all four: rigorous adherence to NBME-style cover-the-options vignettes, five plausible options drawn from the same category, "single most appropriate" lead-ins, and explanation fields explaining each distractor.

Practical takeaway: even without their style guides, mimicking these observable patterns and applying Haladyna's 31 rules brings our bank to commercial parity on craft. Educational value comes from the explanations, not the items alone.

---

## Part 2 - Catalogue of Other MCQ Formats

For each format below: brief description, when used, advantages, disadvantages, JSON schema sketch for static-site implementation, paediatric or O&G example, and a HIGH/MEDIUM/LOW priority recommendation.

### 2.1 Extended Matching Question (EMQ)

**Description.** A shared theme (e.g. "Causes of jaundice in pregnancy"), a single option list of 9-26 items, and 2-10 mini-vignettes that each pull one best option from the shared list. Each option may be correct for zero, one, or several stems. Coined by Case & Swanson at NBME (1993, *Academic Medicine*).

**Used in.** AMC clinical written paper; UK MRCP Part 1 and Part 2 historically; UKMLA in part; Australian medical-school finals (e.g. Sydney, Melbourne, Monash bank items).

**Advantages.** Larger option pool defeats most testwiseness cues (Beullens et al. 2002, Wikipedia "Extended matching items"). Better discrimination than SBA in head-to-head studies ([Nature Sci Rep 2022 on EMQ stats](https://www.nature.com/articles/s41598-022-25481-y); [PMC9723123](https://pmc.ncbi.nlm.nih.gov/articles/PMC9723123/)). Saves examination time per content unit.

**Disadvantages.** Hard to write well (Case & Swanson 1993); requires a coherent theme; can fragment if the option list is heterogeneous. Some studies (Schuwirth et al. 2013, *Perspectives on Medical Education*, [Springer link](https://link.springer.com/article/10.1007/s40037-013-0068-x)) found standard MCQs slightly better at identifying poor performers in some settings.

**JSON schema sketch.**
```json
{
  "type": "emq",
  "theme": "Causes of antepartum haemorrhage",
  "options": [
    {"id": "A", "text": "Placenta praevia"},
    {"id": "B", "text": "Placental abruption"},
    {"id": "C", "text": "Vasa praevia"},
    ...
  ],
  "lead_in": "For each scenario, select the single most likely cause.",
  "stems": [
    {"id": 1, "vignette": "...", "answer": "B", "rationale": "..."},
    {"id": 2, "vignette": "...", "answer": "A", "rationale": "..."}
  ]
}
```

**Example (O&G).**
Theme: Causes of antepartum haemorrhage at term.
Options: A Placenta praevia, B Placental abruption, C Vasa praevia, D Local cervical lesion, E Uterine rupture, F Bloody show, G Bleeding disorder, H Trauma.
Stem 1: A G3P2 at 36+4 with painless bright red PV bleed, soft non-tender uterus, fetal heart 140, USS shows placenta covering os. **Answer: A.**
Stem 2: A G2P1 at 38+0 with sudden severe abdominal pain, woody-hard uterus, CTG showing late decelerations, BP 95/60. **Answer: B.**

**Priority for Y4 bank: HIGH.** EMQs are blueprinted into the AMC and reflect what students will see. Implementation cost is moderate (new component + state).

### 2.2 Multiple True-False (MTF) / Type X / "Type R"

**Description.** A single stem followed by 4-6 independent statements, each marked True or False. Sometimes scored with negative marking.

**Used in.** Largely abandoned by NBME, USMLE, AMC and most national boards. Still present in some Australian medical-school progress tests and in royal-college diploma exams (e.g. ANZCA primary exam includes MTF). Largely retained for breadth-of-coverage rather than reliability.

**Advantages.** Tests breadth: many sub-points per stem.

**Disadvantages.** McCoubrie 2004 (*Medical Teacher* 26(8)) and Norcini, Diserens et al. 1990 found MTF reliability is markedly lower than SBA when item count is matched. Guessing rate is 50% per statement. False statements rely on knowing what is wrong, which is a different and arguably less useful skill than knowing what is right ([Cooper et al. 2019 IJCMPH, RG PDF](https://www.researchgate.net/publication/336109604_True-false_analysis_reveals_inherent_flaws_in_multiple_true-false_tests); [FPM MTF guide](https://fpm.ac.uk/media/886)). Negative-marking strategies dominate examinee behaviour.

**JSON schema sketch.**
```json
{
  "type": "mtf",
  "stem": "In neonatal jaundice:",
  "statements": [
    {"id": 1, "text": "Phototherapy works by isomerising bilirubin.", "answer": true},
    {"id": 2, "text": "Kernicterus most commonly affects the cerebellum.", "answer": false}
  ]
}
```

**Example (paediatrics).** Stem: "Regarding bronchiolitis in infants under 12 months:" 1) RSV is the most common cause (T). 2) Salbutamol is first-line treatment (F). 3) Hand hygiene is the most effective prevention measure (T). 4) Pulse oximetry below 92% in air is an admission criterion in NICE guidance (T).

**Priority: LOW.** Format is going out of favour; psychometric quality is worse than SBA per item. Useful only for high-volume formative learning of fact-clusters.

### 2.3 Pick-N / Select-N / k-from-N

**Description.** "Select the 2 most appropriate investigations from the following 8 options." Partial-credit scoring is the norm. NCLEX-NGN uses these as "Select All That Apply" (SATA).

**Used in.** NCLEX (US nursing); UKMLA "Select N"; AMC has limited use; emerging in clinical-reasoning research.

**Advantages.** Closer to clinical reality where multiple correct actions exist (you order an FBC AND a CRP, not one or the other). Tests prioritisation.

**Disadvantages.** Scoring is contested: all-or-nothing penalises near-miss; +/- partial credit (NCSBN method; Dahl et al. 2022, [PMC8725057](https://pmc.ncbi.nlm.nih.gov/articles/PMC8725057/)) is more sensitive but may produce risk-taking response sets. Guessing baseline differs from SBA.

**JSON schema sketch.**
```json
{
  "type": "pick_n",
  "stem": "...",
  "options": [...],
  "answers": ["B", "D", "F"],
  "n_required": 3,
  "scoring": "plus_minus"
}
```

**Example (paediatrics).** A 3-week-old presents with bilious vomiting and lethargy. Select the 3 most appropriate immediate investigations from: A FBC, B U&E + glucose, C abdominal X-ray, D upper GI contrast study, E urine MCS, F LP, G abdominal USS, H CRP. **Answers: B, D, G** (urgent assessment for malrotation).

**Priority: MEDIUM.** Useful for emergency / management items. Implementation cost: scoring logic (+/-) is non-trivial.

### 2.4 Best-of-many (8-10 option SBA)

**Description.** A single-best-answer item with an expanded option list (8-10). Essentially a hybrid of SBA and EMQ option-list size.

**Used in.** USMLE Step 3, MCCQE Part II, some Australian college fellowship exams.

**Advantages.** Larger option list defeats convergence and longest-option cues more effectively (Rodriguez 2005 - except note the same paper argues *against* large option counts when distractors are non-functional). Useful when the differential is genuinely long (e.g. "which antibiotic", "which murmur").

**Disadvantages.** Most distractors are non-functional in practice. Increases reading load. The 2025 BMC meta-analysis ([PMC12532923](https://pmc.ncbi.nlm.nih.gov/articles/PMC12532923/)) argues this format is psychometrically equivalent or inferior to 3- or 4-option SBA.

**JSON schema sketch.** Same as SBA, with `options` array length 8-10.

**Example (O&G).** A G2P1 at 32+3 weeks, BP 165/110, urine PCR 350 mg/mmol, headache, hyperreflexia. Most appropriate first-line antihypertensive: A nifedipine immediate release, B nifedipine modified release, C labetalol PO, D labetalol IV, E hydralazine IV, F methyldopa PO, G clonidine PO, H amlodipine, I atenolol, J magnesium sulfate. **Answer: D** (severe hypertension threshold; oral options too slow).

**Priority: LOW-MEDIUM.** Better implemented as EMQs sharing an option list.

### 2.5 Two-step / Sequential clinical reasoning

**Description.** Question 1: working diagnosis. Once answered, the working diagnosis is locked in and revealed, then Question 2 asks about management given that diagnosis (and the correct answer to Q1 is supplied, so Q2 is independent of Q1 performance). Mimics real clinical flow.

**Used in.** USMLE Step 2 CK sequential sets; AMBOSS practice mode.

**Advantages.** Tests "script then act" reasoning explicitly. Reduces item interdependence by revealing the answer between steps.

**Disadvantages.** UI complexity: must prevent return-and-edit on Q1 once Q2 is shown. Doubles authoring cost per case. Less efficient content-per-minute than two unrelated SBAs.

**JSON schema sketch.**
```json
{
  "type": "two_step",
  "case": "...",
  "steps": [
    {"stem": "Most likely diagnosis?", "options": [...], "answer": "..."},
    {"reveal": "The diagnosis is X.", "stem": "Best initial management?", "options": [...], "answer": "..."}
  ]
}
```

**Example (paediatrics).** Case: 18-month-old with 3 days of fever, runny nose, now stridor at rest, no drooling, vaccinated. Step 1: most likely dx (croup vs epiglottitis vs bacterial tracheitis vs foreign body vs anaphylaxis). Step 2: given moderate croup, best initial management (oral dexamethasone vs nebulised adrenaline vs intubation vs IV ceftriaxone vs salbutamol).

**Priority: MEDIUM.** High educational value, real workflow modelling. Implementation cost moderate (state machine for two-step lockout).

### 2.6 Image / radiology / ECG / histology MCQ

**Description.** Stem includes an image (CXR, ECG, dermatology photo, CTG, histology slide) and asks for interpretation, diagnosis, or management.

**Used in.** AMC explicitly permits images; USMLE Step 1/2/3; UKMLA; almost all royal-college exams.

**Advantages.** Tests visual pattern recognition (script-triggering at its purest). Hard to fake without the visual.

**Disadvantages.** Image rights and licensing. Image quality and contrast critical. Accessibility (blind / colourblind candidates). Storage and bandwidth.

**Conventions.**
- Provide a clinical context in the stem ("CXR of a 4-year-old with cough and fever"), never a bare image.
- Avoid arrows or markups unless testing the ability to interpret an unmarked image.
- Include image attribution and source.
- Provide alt text and a textual description (for accessibility and for re-use).

**JSON schema sketch.**
```json
{
  "type": "sba",
  "stem": "...",
  "image": {"src": "/assets/cxr/0123.jpg", "alt": "AP chest radiograph showing...", "credit": "..."},
  "options": [...]
}
```

**Example (paediatrics).** A 2-year-old, sudden choking after playing with peanuts, now wheezing only on right. CXR (image) shows right-sided hyperinflation. Diagnosis: right main bronchus foreign body.

**Priority: HIGH.** Cheap to add for items where we already have public-domain images; massive educational value for AMC-style preparation.

### 2.7 Drug-dose calculation MCQ

**Description.** Numeric stem with weight, concentration, ordered dose. Distractors are common calculation errors: factor-of-10, wrong unit conversion, body-surface-area confusion, mg-vs-mL.

**Used in.** Nursing exams (NCLEX) prominently; medical exams less but increasing presence in paediatric and emergency-medicine items.

**Advantages.** Tests genuine prescribing safety. Catches dimensional-analysis errors. Paediatric medication errors run 17.8% (vs ~6% in adults) per recent audit ([PMC11199407](https://pmc.ncbi.nlm.nih.gov/articles/PMC11199407/)), so this skill matters.

**Disadvantages.** Cultural difference in concentration conventions (mg/mL vs mg/100mL). Easy to be ambiguous about how the concentration is presented.

**JSON schema sketch.**
```json
{
  "type": "calc",
  "stem": "...",
  "given": {"weight_kg": 18, "ordered_mg_per_kg": 50, "concentration_mg_per_ml": 100},
  "options": [...],
  "answer": "...",
  "distractor_rationales": {
    "A": "off by factor of 10 (forgot mg to mL conversion)",
    "B": "used 250 mg adult dose instead of weight-based"
  }
}
```

**Example (paediatrics).** An 18 kg child needs IV cefazolin 50 mg/kg. Stock: 1 g vial reconstituted to 100 mg/mL. Volume to draw up: A 0.9 mL, B 9 mL, C 90 mL, D 0.09 mL, E 4.5 mL. **Answer: B** (900 mg / 100 mg/mL).

**Priority: HIGH.** Critical safety skill. Distractor design is highly principled (each distractor = named error pattern). Implementation cost low (numeric SBA).

### 2.8 Hot-spot / coordinate question

**Description.** Click on the anatomical or pathological feature in an image (ECG abnormality, fracture line, anatomical landmark).

**Used in.** USMLE has limited use; some specialty exams (radiology). NCLEX uses sparingly. Not currently in AMC.

**Advantages.** Tests localisation, which SBA cannot.

**Disadvantages.** UI complexity. Accessibility issues (motor impairment, screen-reader users). Marking a single coordinate as correct is fragile; usually requires a tolerance region.

**JSON schema sketch.**
```json
{
  "type": "hotspot",
  "image": "...",
  "regions": [
    {"id": "correct", "shape": "rect", "coords": [120, 80, 200, 160]},
    {"id": "near_miss", "shape": "rect", "coords": [200, 80, 280, 160]}
  ],
  "answer_region": "correct"
}
```

**Example (paediatrics).** ECG of a 6-year-old with palpitations. Click the delta wave. (Answer: region around the slurred upstroke of the QRS in lead II.)

**Priority: LOW-MEDIUM.** UI cost is real (SVG overlay, region detection, mobile-friendly tap targets). Maybe worth implementing for one or two showcase items but not as a major bank feature.

### 2.9 Drag-and-drop ordering

**Description.** Order these in correct sequence: e.g. APLS algorithm steps, antibiotic stewardship ladder, surgical procedure steps, sepsis-6 bundle.

**Used in.** NCLEX-NGN ordering items; some royal-college diploma exams; not currently AMC.

**Advantages.** Tests procedural knowledge and sequencing, which SBA approximates only poorly.

**Disadvantages.** UI complexity, especially on touch devices. Scoring (exact order vs partial credit) is contested. Easier to test "step 1" with SBA than "all 5 steps in order" with drag-drop.

**JSON schema sketch.**
```json
{
  "type": "ordering",
  "stem": "Place the following in correct order for paediatric resus:",
  "items": ["...", "...", "..."],
  "correct_order": [3, 1, 2, 4, 5],
  "scoring": "kendall_tau"
}
```

**Example (paediatrics).** Place in correct order for a 10 kg child in cardiac arrest with VF: 1 chest compressions 100-120/min, 2 attach defib, 3 shock 40 J, 4 adrenaline 0.1 mg IV, 5 continue CPR 2 min, 6 reassess rhythm.

**Priority: LOW.** Educational value real but small; SBA can ask "what is the most appropriate next step" and achieve 80% of the benefit.

### 2.10 Cause-and-effect / "Assertion and Reason"

**Description.** Two statements separated by "because". Examinee judges (i) is statement 1 true? (ii) is statement 2 true? (iii) does statement 2 correctly explain statement 1? Standard 4 or 5 answer options.

**Used in.** Indian NEET-PG, NEET-UG; AIIMS; not used in NBME, USMLE, AMC, or UKMLA.

**Advantages.** Tests both factual recall and causal reasoning. Forces examinees to articulate mechanism.

**Disadvantages.** Complicated answer options confuse examinees; testwise candidates can guess between "both true" options at high rates. Reliability lower than SBA per item.

**JSON schema sketch.**
```json
{
  "type": "assertion_reason",
  "assertion": "Neonates with biliary atresia present with conjugated hyperbilirubinaemia.",
  "reason": "Conjugated bilirubin is water-soluble and is excreted in urine.",
  "options": [
    "A: Both A and R true, R explains A",
    "B: Both A and R true, R does not explain A",
    "C: A true, R false",
    "D: A false, R true",
    "E: Both false"
  ],
  "answer": "B"
}
```

**Example (paediatrics).** A: Bronchiolitis in infants is best managed with supportive care. R: Salbutamol acts on beta-2 receptors. **Answer: B** (both true; R does not explain A).

**Priority: LOW.** Format does not appear in Australian assessment. Educationally interesting but not exam-aligned.

### 2.11 Linked case set / case cluster (testlet)

**Description.** One detailed vignette, 3-5 SBAs all referring to the same patient and unfolding the case over time (initial presentation, results, complications, follow-up).

**Used in.** USMLE Step 3 explicitly; AMC has limited use; common in problem-based learning assessments. Tariq, Foster, Stevenson 2016 (Saudi PBL study, [PMC6694941](https://pmc.ncbi.nlm.nih.gov/articles/PMC6694941/)) found case-cluster MCQs match stand-alone MCQs on KR-20 reliability and discrimination, with slightly higher difficulty.

**Advantages.** Tests longitudinal reasoning; mimics real clinical course. Educational power for revision. Amortises the cost of building a complex vignette.

**Disadvantages.** Local-independence violations: getting Q1 wrong typically means getting Q2 wrong (testlet effect). Inflates Cronbach alpha falsely. Item-writers must work hard to make each step independent of the previous answer (e.g. by revealing the correct prior answer at each step, see two-step format).

**JSON schema sketch.**
```json
{
  "type": "case_cluster",
  "case": "...",
  "questions": [
    {"stem": "...", "options": [...], "answer": "..."},
    {"reveal_prior": true, "stem": "...", "options": [...], "answer": "..."}
  ]
}
```

**Example (O&G).** Case: G1P0 at 28+0 with PV bleeding. Q1 most likely cause; Q2 best initial investigation; Q3 (given placenta praevia) best ongoing management; Q4 indication for delivery; Q5 most appropriate anaesthetic.

**Priority: HIGH.** Excellent educational ROI per case. Implementation cost moderate (reveal-prior state). Maps to our existing SBA component.

### 2.12 Free-response short-answer with fuzzy matching

**Description.** "Give the most likely diagnosis (one word)." Auto-graded against a list of accepted spellings via Levenshtein distance or curated synonym set.

**Used in.** UK Very Short Answer (VSA) format, increasingly used in finals; Imperial College and other UK schools have published 3-year comparative data (Sam et al. 2025, *Medical Teacher*, [Tandfonline](https://www.tandfonline.com/doi/full/10.1080/0142159X.2025.2496382)) showing VSA discriminates better than SBA and largely eliminates cueing.

**Advantages.** Eliminates cueing entirely. Discriminates significantly better than SBA in head-to-head studies.

**Disadvantages.** Spelling and synonym handling are perennial pain points. Curating accepted-answer lists is labour-intensive. Cannot test management/investigation choice cleanly (too many synonyms).

**JSON schema sketch.**
```json
{
  "type": "vsa",
  "stem": "...",
  "accepted_answers": ["pyloric stenosis", "infantile hypertrophic pyloric stenosis", "IHPS"],
  "fuzzy_threshold": 0.85
}
```

**Example (paediatrics).** A 5-week-old, projectile non-bilious vomiting, palpable RUQ olive, hypochloraemic metabolic alkalosis. Most likely diagnosis (one word/phrase). **Accepted:** pyloric stenosis / IHPS / infantile hypertrophic pyloric stenosis.

**Priority: HIGH.** Best discrimination per item, eliminates cueing. Implementation cost moderate (fuzzy match + curated synonyms). Strongest single educational improvement available.

### 2.13 OSCE-prep written data interpretation

**Description.** Stem is a CXR / VBG / partogram / CTG / drug chart, and the question asks for a structured interpretation against a checklist (e.g. "rate, rhythm, axis, intervals, ST changes" for an ECG).

**Used in.** Internal medical-school practice, OSCE preparation. Not in summative MCQ exams but high-yield for finals revision.

**Advantages.** Practice for OSCE viva interpretation. Forces structured reasoning.

**Disadvantages.** Free-response auto-grading is hard; checklist-match grading is approximate. Better paired with model answer + self-assessment than auto-graded.

**Priority: MEDIUM.** Implementable as a hybrid: free-text input followed by a checklist-comparison reveal. Self-graded, not auto-graded.

### 2.14 Adaptive difficulty / branching

**Description.** Wrong answer triggers an easier follow-up; correct triggers harder. Can be implemented as a state machine.

**Used in.** AMC MCQ CAT (computer-adaptive test) ([AMC CAT page](https://www.amc.org.au/pathways/standard-pathway/amc-assessments/mcq-examination/)); USMLE is not adaptive; some commercial banks offer "adaptive practice" modes.

**Advantages.** Improves measurement efficiency in summative assessment; in practice mode, focuses revision on the candidate's actual weak spots.

**Disadvantages.** Requires a calibrated item bank (IRT difficulty parameters per item) - which we do not have until we have examinee data. A simulated-difficulty version (using author-tagged difficulty) is a poor approximation.

**Priority: LOW for v1.** Defer until item-level usage data is available (months of use). Then revisit.

---

## Recommendations for the Y4 MCQ Bank

### Top 5 SBA-writing improvements (highest impact first)

1. **Implement an automated linter for technical flaws.** Flag items containing absolute terms ("always", "never", "all", "none", "EXCEPT"), "all of the above"/"none of the above", any vague qualifiers ("usually", "sometimes"), and correct-option-length outliers (correct > 1.2 x mean distractor length). Auto-blocks publication until resolved. This catches ~70% of Tariq 2013's documented flaw prevalence with near-zero ongoing effort.

2. **Enforce cover-the-options at generation time.** The generation prompt must produce a stem that ends in a single direct interrogative ("What is the most likely diagnosis?", "What is the most appropriate next step?") and that is answerable with the options hidden. Add a self-check field in the prompt that confirms this.

3. **Require a distractor rationale for every distractor.** Each distractor must be paired with a one-sentence justification of the specific examinee error or near-miss differential it represents. Store the rationale in the bank and surface it in the explanation panel. This both improves distractor plausibility (forcing the writer to defend each one) and doubles the educational value of feedback.

4. **Tag every item with AMC blueprint (task x patient-group) and Bloom level.** Build dashboards showing item-mix vs the AMC blueprint and vs the target Bloom distribution (~20% Remember/Understand, ~60% Apply/Analyse, ~20% Evaluate). Re-balance generation prompts when a category is under-represented.

5. **Cap stem length and strip window-dressing.** Hard cap stems at ~80 words (~120 for complex Apply/Analyse). Audit existing items for irrelevant demographics, redundant labs, and recapitulated history. Park & Park 2025's 35-50 word optimum is a useful sub-target for routine items.

### Top 3 new formats to implement

1. **Linked case cluster (Section 2.11) - HIGH priority.** Highest educational ROI per case authored. Maps onto our existing SBA component with a small "reveal prior answer" state machine. Mirrors how the AMC and finals revision actually flow. Start with 30 paediatric and 30 O&G cases at 3-5 SBAs each.

2. **Very Short Answer / fuzzy-matched free response (Section 2.12) - HIGH priority.** Eliminates cueing entirely; best published discrimination per item; strongest single educational improvement available. Implement as an opt-in "VSA mode" that strips the option list from existing SBA items and grades the typed input against the option set plus curated synonyms. Effectively free content once SBA items exist.

3. **Drug-dose calculation MCQ (Section 2.7) - HIGH priority.** Safety-critical paediatric skill; principled distractor design (each distractor = named error type) makes it a generation-prompt's dream format; implementation cost negligible (numeric SBA). Start with the AMC paediatric drug list (paracetamol, ibuprofen, salbutamol, adrenaline, ceftriaxone, gentamicin, midazolam, fluids) and one calculation item per drug.

Beyond these three, EMQs (2.1) are a strong fourth candidate if AMC blueprint alignment becomes a higher priority; two-step sequential reasoning (2.5) is a natural progression once the linked-case-cluster engine is built.

---

## Sources

- Case S, Swanson D. *Constructing Written Test Questions for the Basic and Clinical Sciences*. NBME, 3rd ed, 1998/2001. https://ia600204.us.archive.org/23/items/Constructing_Written_Test_Questions_For_the_Basic_and_Clinical_Sciences/NBMETestItems.pdf
- NBME. *Item-Writing Guide* (R6). NBME, 2021. https://www.nbme.org/educators/item-writing-guide
- Haladyna TM, Downing SM, Rodriguez MC. A Review of Multiple-Choice Item-Writing Guidelines for Classroom Assessment. *Applied Measurement in Education* 2002;15(3):309-334. https://www.tandfonline.com/doi/abs/10.1207/S15324818AME1503_5
- Haladyna TM. *Developing and Validating Multiple-Choice Test Items*. 3rd ed. Routledge, 2004.
- Tariq M, Iqbal S, Ahmed Khan AA, Rebello R. Identification of technical item flaws leads to improvement of the quality of single best MCQs. *J Pak Med Assoc* 2013. PMC3809311. https://pmc.ncbi.nlm.nih.gov/articles/PMC3809311/
- Downing SM. The effects of violating standard item writing principles on tests and students. *Adv Health Sci Educ* 2005;10:133-143.
- Tarrant M, Ware J. A framework for improving the quality of multiple-choice assessments. *Nurse Educ* 2012;37(3):98-104.
- Rodriguez MC. Three Options Are Optimal for Multiple-Choice Items: A Meta-Analysis of 80 Years of Research. *Educational Measurement: Issues and Practice* 2005;24(2):3-13.
- Vyas R, Supe A. Multiple choice questions: a literature review on the optimal number of options. *Natl Med J India* 2008. https://nmji.in/nmji/archives/Volume_21/Issue-3/PDF-volume-21-issue-3/Volume-21-issue-3-Med-Edu.pdf
- Brame C. Writing good multiple choice test questions. Vanderbilt CFT, 2013. https://cft.vanderbilt.edu/guides-sub-pages/writing-good-multiple-choice-test-questions/
- Gierl MJ, Bulut O, Guo Q, Zhang X. Developing, Analyzing, and Using Distractors for Multiple-Choice Tests in Education. *Review of Educational Research* 2017. https://journals.sagepub.com/doi/10.3102/0034654317726529
- Less is more? A systematic review and network meta-analysis on MCQ option numbers. *BMC Medical Education* 2025. https://pmc.ncbi.nlm.nih.gov/articles/PMC12532923/
- Phillips AW, Aktan ND, Bay J, Mobley B. Examining Bloom's Taxonomy in Multiple Choice Questions: Students' Approach to Questions. *Med Sci Educ* 2021. https://pmc.ncbi.nlm.nih.gov/articles/PMC8368900/
- Tofade T, Elsner J, Haines ST. Best practice strategies for effective use of questions as a teaching tool. *Am J Pharm Educ* 2013. PMC3425929. https://pmc.ncbi.nlm.nih.gov/articles/PMC3425929/
- Eva KW. What every teacher needs to know about clinical reasoning. *Medical Education* 2005;39:98-106.
- Norman GR, Eva KW. Diagnostic error and clinical reasoning. *Medical Education* 2010;44:94-100. https://pmc.ncbi.nlm.nih.gov/articles/PMC3060310/
- Norman GR, Monteiro SD, Sherbino J, Ilgen JS, Schmidt HG, Mamede S. The Causes of Errors in Clinical Reasoning. *Academic Medicine* 2017;92(1):23-30.
- Charlin B, Brailovsky CA, Roy L, Goulet F, van der Vleuten C. The Script Concordance Test: a tool to assess the reflective clinician. *Teaching and Learning in Medicine* 2000;12(4):189-195.
- Sweller J, van Merrienboer JJG, Paas FGWC. Cognitive load theory in health professional education. *Med Educ* 2010. PMID 20078759.
- Park S, Park J. Exploring the length and time related concepts for scenario-based MCQs. *Korean J Med Educ* 2025. https://pmc.ncbi.nlm.nih.gov/articles/PMC12971134/
- Australian Medical Council. *MCQ Examination Specifications V8*. AMC, Sept 2025. https://www.amc.org.au/wp-content/uploads/2025/09/2025-09-09-MCQ-Specifications-V8.pdf
- Australian Medical Council. Indigenous Health Strategy. https://www.amc.org.au/indigenous-health/
- McCoubrie P. Improving the fairness of multiple-choice questions: a literature review. *Med Teacher* 2004;26(8):709-712.
- Beullens J, Van Damme B, Jaspaert H, Janssen PJ. Are extended-matching multiple-choice items appropriate for a final test in medical students? *Med Teacher* 2002;24(4):390-395.
- Tariq M, Foster K, Stevenson R. Case cluster MCQs in PBL. 2016. https://pmc.ncbi.nlm.nih.gov/articles/PMC6694941/
- Sam AH et al. Very short answer vs multiple choice. *Med Teacher* 2025. https://www.tandfonline.com/doi/full/10.1080/0142159X.2025.2496382
- EBMA. Guidelines for writing multiple-choice questions, v2017. https://www.ebma.eu/wp-content/uploads/2019/02/EBMA-guidelines-for-item-writing-version-2017_3.pdf
- University of Toronto Temerty Faculty of Medicine. The Essentials of Item-writing for Multiple-choice Examinations, 2022. https://meded.temertymedicine.utoronto.ca/sites/default/files/assets/resource/document/guidelines-writing-mcqs-full-mar-20220.pdf
- ACS / FACS. Multiple-Choice Item Writing Guidelines. https://www.facs.org/for-medical-professionals/education/cme-resources/test-writing/
