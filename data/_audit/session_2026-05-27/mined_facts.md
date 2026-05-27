# Mined facts library (Y4 A-to-E MCQ bank)

Consolidated, deduplicated, attributed clinical facts mined from screenshot batches 1-4 of the emedici Question Bank. Each fact is tagged with the source filename(s) it was mined from, the named AU guideline body it should be cited against in the rationale, and any cutoffs / doses / decision rules to embed.

Generators MUST treat these as starting points - every number should be double-checked against the named source before commit. Where two batches gave slightly different numbers (e.g. MCDA twin delivery timing), the conflict is flagged.

Domain index:
- A. Paeds - emergency / acute
- B. Paeds - cardiology
- C. Paeds - infectious disease
- D. Paeds - gastroenterology / hepatology
- E. Paeds - haematology
- F. Paeds - dermatology
- G. Paeds - orthopaedics
- H. Paeds - neurology
- I. Paeds - nephrology
- J. Paeds - endocrine / metabolic
- K. Paeds - DSD / adolescent
- L. Neonatology
- M. Obstetrics - antenatal screening
- N. Obstetrics - antenatal complications
- O. Obstetrics - intrapartum / labour
- P. Obstetrics - postpartum
- Q. Obstetrics - medication in pregnancy
- R. Gynaecology - benign
- S. Gynaecology - oncology
- T. Gynaecology - cervical screening (CST)
- U. Gynaecology - contraception
- V. Reproductive endocrinology / adolescent
- W. Psychiatry - perinatal
- X. Sexual health / infectious disease (adult)

---

## A. Paeds - emergency / acute

### A1. Anaphylaxis (batch1.md)
- **Diagnosis**: clinical, acute onset of EITHER (a) typical skin features (urticaria, flushing, angioedema) PLUS respiratory, cardiovascular, or persistent severe GI involvement, OR (b) cardiovascular (hypotension) and/or respiratory (bronchospasm, upper airway obstruction) without skin features.
- **First-line**: IM adrenaline. Child >30 kg: 300 micrograms (0.3 mg). Repeat every 5 minutes if needed.
- Adjuncts: 100% O2 via face mask, normal saline 20 mL/kg IV, nebulised salbutamol 5 mg for bronchospasm, dexamethasone 8 mg PO for biphasic-reaction prevention.
- Source: ASCIA Anaphylaxis Guidelines. Australasian Society of Clinical Immunology and Allergy.

### A2. Meningitis in children (batch1.md)
- Empirical: cefotaxime 50 mg/kg IV 6-hourly (max 2 g) OR ceftriaxone 50 mg/kg IV 6-hourly; PLUS dexamethasone 0.15 mg/kg IV 6-hourly; ADD aciclovir 20 mg/kg IV 8-hourly if HSV encephalitis cannot be excluded.
- Do NOT delay empirical antibiotics for LP or CT.
- Photophobia in infant: described as "becomes irritable when room light is turned on" (lay-language paraphrase).
- Source: Therapeutic Guidelines (eTG): Antibiotic, Meningitis; Royal Children's Hospital Melbourne Clinical Practice Guidelines (RCH CPG): Meningitis.

### A3. Retropharyngeal abscess (batch3.md)
- Age peak: 6 months to 4 years.
- Triad: fever + drooling + restricted neck extension (the child "is unable to look upwards"). Inability to extend neck distinguishes from peritonsillar abscess (trismus).
- Confirmation: lateral cervical spine X-ray OR contrast-enhanced CT neck.
- Differential discriminators: peritonsillar abscess = trismus + unilateral tonsillar swelling + uvular deviation, mostly older children; epiglottitis = now rare due to Hib vaccination, rapid onset, tripod posture, stridor.
- Source: RCH CPG: Retropharyngeal Abscess; eTG: Antibiotic, Upper Respiratory Tract Infections.

### A4. Intussusception (batch1.md, batch3.md)
- Age peak: 3 months to 3 years (commonest 6-18 months).
- Presentation: intermittent severe distress, lethargy between episodes, "passing maroon-coloured stool" (currant-jelly stool - late), bilious vomiting ("milky to yellow/green" lay paraphrase), "long, thin mass in the RUQ" (sausage-shaped paraphrase).
- Diagnosis: abdominal ultrasound (~98% sensitivity, ~98% specificity, performed by trained paediatric ultrasonographer). RCH currently recommends ultrasound first to confirm.
- Definitive treatment if no peritonism / perforation: air enema.
- If peritonism, perforation, failed enema: laparotomy.
- Sources: RCH CPG: Intussusception; The Victorian Royal Children's Hospital guidelines (named in full in stems).

### A5. Cat scratch disease (batch3.md)
- Organism: Bartonella henselae.
- Inoculation-to-lymphadenopathy interval: 1-3 weeks.
- Self-limiting in immunocompetent patients without systemic symptoms - observation alone.
- Macrolides (azithromycin) ONLY for immunocompromised, persistent, or severe cases.
- Source: ASHM / eTG: Antibiotic, Skin and Soft Tissue.

---

## B. Paeds - cardiology

### B1. ASD (batch3.md)
- Murmur: mid-systolic ejection murmur, best heard upper left sternal border, with FIXED splitting of S2 (does not vary with respiration).
- Mechanism of fixed splitting: equalisation of respiratory effects on both right and left ventricular output due to the atrial communication.
- Often asymptomatic in infancy and early childhood; presents with murmur on routine 6-12 month review.
- Source: NHFA/CSANZ: Paediatric Congenital Heart Disease Guidance.

### B2. Coarctation of the aorta (batch3.md)
- Hallmark: blood pressure differential between upper and lower limbs (>10 mmHg arm-leg gradient); weak/absent femoral pulses; radio-femoral delay; cold cyanosed feet.
- Newborn presentation: BP differential e.g. right arm 60/30 vs right leg 40/40, weak femorals, low SpO2 in lower limbs.
- Initial diagnostic investigation in Australia: transthoracic echocardiography. GP-orderable with Medicare rebate.
- Gold-standard for anatomical definition: MRI of the aorta. Second-line; pre-procedural planning only.
- Chest X-ray (rib notching) only in older children.
- 5-15% of CoA patients have Turner syndrome; conversely ~30% of Turner syndrome patients have CoA.
- Source: NHFA/CSANZ; RCH CPG: Coarctation of the Aorta.

### B3. Other paediatric murmurs (batch1.md, batch3.md)
- VSD: pansystolic, lower left sternal border (smaller VSDs louder).
- HCM: systolic ejection murmur, may radiate.
- Mitral stenosis: low-pitched mid-diastolic murmur; rare in children.
- PDA: continuous machinery murmur.

### B4. SVT in children (batch1.md)
- Typical heart rate: 220-300/min.
- Most common mechanism: AVRT via accessory pathway, then AVNRT.
- First-line acute treatment: adenosine (rapid onset, short half-life).
- Source: eTG: Cardiovascular; NHFA paediatric arrhythmia guidance.

### B5. Pericarditis vs myocarditis (batch1.md)
- Pericarditis: chest pain varies with respiration and posture; diffuse ST elevation on ECG; normal troponin does not exclude.
- Myocarditis: more non-specific or localised ST-T changes; typically causes troponin elevation; can coexist with pericarditis (myopericarditis).

### B6. Syndrome - cardiac associations (batch3.md)
- Turner: coarctation of the aorta (most common); bicuspid aortic valve.
- Noonan: pulmonary valve stenosis; hypertrophic cardiomyopathy.
- Williams: supravalvular aortic stenosis; renal artery stenosis.
- DiGeorge (22q11.2): conotruncal anomalies (truncus arteriosus, tetralogy of Fallot).

---

## C. Paeds - infectious disease

### C1. Acute rheumatic fever (ARF) risk factors (batch3.md)
- High-risk groups (any of):
  - Aboriginal or Torres Strait Islander person.
  - Maori or Pacific person residing in an overcrowded household or low socioeconomic environment.
  - Past history of ARF or rheumatic heart disease.
  - Household member with recent ARF or RHD.
- Source: RHDAustralia: Australian guideline for prevention, diagnosis and management of acute rheumatic fever and rheumatic heart disease.

### C2. Impetigo (batch3.md)
- Non-bullous impetigo: honey-coloured crusts.
- Treatment by ARF risk:
  - Low-risk + localised: topical mupirocin 2% TDS for 5 days.
  - High-risk OR extensive: oral cefalexin OR benzathine benzylpenicillin G (single dose) for ARF prevention.
- Source: eTG: Antibiotic, Skin and Soft Tissue; RHDAustralia.

### C3. Community-acquired pneumonia with aspiration risk (batch3.md)
- Child with cerebral palsy + PEG-fed + recent choking event: aspiration risk.
- First-line antibiotic: amoxicillin-clavulanate (covers anaerobes and beta-lactamase producers).
- Plain amoxicillin: lacks anaerobic cover.
- Azithromycin / other macrolides: reserved for atypical pneumonia (Mycoplasma).
- Cefuroxime: reserved for severe pneumonia or children unable to tolerate enteral therapy.
- Ceftriaxone: parenteral, severe disease.
- Source: eTG: Antibiotic, Respiratory; RCH CPG: Community Acquired Pneumonia.

### C4. Scabies (batch1.md)
- Extremely contagious. Household contacts + bedding need treatment.
- First-line: topical permethrin 5% cream to whole body excluding face (under 6 months: include face), repeat in 7 days.
- Dermoscopy signs: "delta sign" / "jet with comet pattern".
- Resistant or crusted scabies: oral ivermectin 200 micrograms/kg weekly x 2.
- Source: eTG: Antibiotic, Skin and Soft Tissue; The Australasian College of Dermatologists.

### C5. Meckel diverticulum (batch1.md)
- Commonest cause of painless rectal bleeding in children 1-5 years.
- Diagnosis: technetium-99m pertechnetate scan (Meckel scan) detecting ectopic gastric mucosa.
- Source: RCH CPG: Painless rectal bleeding.

### C6. Nasolacrimal duct obstruction (batch1.md)
- Conservative management (lacrimal sac massage): first-line in infants under 12 months.
- Spontaneous resolution: ~90% by 12 months.
- Probing: indicated when conservative management fails beyond 12 months. Success rate ~95% under 12 months, decreasing with age.
- Source: Royal Australian and New Zealand College of Ophthalmologists (RANZCO).

---

## D. Paeds - gastroenterology / hepatology

### D1. Coeliac disease in children (batch3.md)
- First-degree relatives of an index case: screen even if asymptomatic.
- HLA-DQ2/DQ8: present in ~30% of the population; absence has excellent negative predictive value.
- Most common extra-intestinal manifestation in children: anaemia (iron, B12, folate deficiency).
- Treatment: strict gluten-free diet for life.
- DEXA: not routinely required at initial paediatric diagnosis.
- Source: RACP / Coeliac Australia.

### D2. Biliary atresia / prolonged neonatal jaundice (batch1.md)
- Any jaundice persisting beyond 14 days of life: requires SPLIT bilirubin (conjugated + unconjugated).
- Conjugated bilirubin >20% of total OR >25 micromol/L: pathological.
- Pale stools + dark urine + conjugated hyperbilirubinaemia: refer paediatric surgery URGENTLY (Kasai portoenterostomy best operated <60 days for success).
- Source: RCH CPG: Jaundice in early infancy; Kids Health Info Fact Sheet.

### D3. Hand, foot and mouth disease (HFMD) (batch2.md)
- Organism: Coxsackievirus A16 + enterovirus 71.
- Self-limiting in immunocompetent children.
- No congenital syndrome / no evidence of increased miscarriage risk from maternal exposure.
- Pregnant contacts: NO specific intervention required (contrast with rubella, varicella, measles, parvovirus B19).
- Source: NSW Health / DoH Communicable Diseases Network Australia (CDNA).

---

## E. Paeds - haematology

### E1. Warm autoimmune haemolytic anaemia vs G6PD (batch3.md)
- Pattern: anaemia + reticulocytosis + indirect hyperbilirubinaemia + splenomegaly.
- First test: Direct Antiglobulin Test (Coombs) - cheapest, fastest, differentiates immune from non-immune haemolysis.
- DAT positive: warm AIHA most likely; commonly follows recent viral infection in children.
- DAT negative: consider hereditary spherocytosis (eosin-5-maleimide flow cytometry of red cell membrane proteins), G6PD deficiency (X-linked recessive; females rarely manifest without significant trigger exposure), enzymopathy.
- Source: RCH CPG: Haemolytic anaemia.

---

## F. Paeds - dermatology

### F1. Strawberry haemangioma (infantile haemangioma) (batch1.md)
- Natural history: rapid growth 6-18 months, then involutes.
- ~10% involute by age 5; ~90% involute by age 9.
- First-line management for uncomplicated lesion: reassurance, parental education, monitoring.
- Beta-blockers (propranolol or atenolol) reserved for functional impairment, ulceration, cosmetic disfigurement, periorbital lesions.
- Source: The Australasian College of Dermatologists; RCH CPG: Vascular birthmarks.

---

## G. Paeds - orthopaedics

### G1. Distal humeral / supracondylar fracture in children (batch3.md)
- Accounts for ~50% of paediatric elbow fractures.
- Most common complication: loss of range of motion.
- Brachial artery injury: recognised but less common, mainly in displaced fractures.
- Radial nerve injury: classic for distal-third humeral shaft fracture, NOT supracondylar (median > anterior interosseous > radial).
- Source: RCH CPG: Supracondylar fractures.

### G2. Limping child - septic arthritis vs osteomyelitis vs transient synovitis (batch1.md)
- Kocher-style criteria: elevated inflammatory markers (ESR >40 mm/h, CRP elevated, WCC >12) + fever + non-weight bearing differentiates septic arthritis/osteomyelitis from transient synovitis.
- Tenderness over bone with preserved joint ROM: suggests osteomyelitis over septic arthritis.
- Blood cultures BEFORE antibiotics in suspected osteomyelitis.
- Source: RCH CPG: Acute osteomyelitis and septic arthritis.

---

## H. Paeds - neurology

### H1. Guillain-Barré syndrome in adolescents (batch1.md)
- Trigger: post-Campylobacter (recent diarrhoeal illness) is classic.
- Investigation of choice: CSF analysis showing albuminocytological dissociation (elevated protein with normal WCC) - present in only ~50% in the first 3 days, increasing to ~80% after week 1.
- Adjunctive: nerve conduction studies, spirometry (vital capacity for respiratory deterioration).
- Source: Australian and New Zealand Association of Neurologists.

---

## I. Paeds - nephrology

### I1. IgA nephropathy vs post-streptococcal glomerulonephritis (batch1.md)
- IgA nephropathy: synpharyngitic haematuria (concurrent with URTI, day-of or day-after).
- Post-streptococcal: 1-2 weeks after streptococcal infection (post-infectious, not concurrent).
- IgA nephropathy diagnosis: renal biopsy showing mesangial IgA deposits.
- Source: RACP / Kidney Health Australia.

---

## J. Paeds - endocrine / metabolic

### J1. Jittery neonate (batch1.md)
- Differential: hypoglycaemia, neonatal abstinence syndrome (NAS), seizure, hypocalcaemia, hypomagnesaemia.
- First investigation: blood glucose. NAS does NOT exclude hypoglycaemia.
- Jitteriness that STOPS when limbs are held but RESUMES on release: suggests jitteriness over seizure (seizure continues).
- Source: RCH CPG: Neonatal jitteriness and hypoglycaemia.

---

## K. Paeds - DSD / adolescent

### K1. Disorders of sex development / primary amenorrhoea (batch3.md)
- Complete androgen insensitivity syndrome (CAIS): 46,XY karyotype, female phenotype (peripheral aromatisation gives breast development), absent or scant pubic/axillary hair, absent uterus and upper vagina, testosterone in MALE range with NO virilisation (androgen receptor dysfunction).
- Mullerian agenesis (Mayer-Rokitansky-Kuster-Hauser, MRKH): 46,XX, normal female phenotype + normal puberty + absent uterus + normal FSH/LH/oestradiol.
- Turner syndrome: short stature, delayed puberty; mosaicism may mimic delayed puberty without short stature.
- Constitutional delay: bone age delayed, normal eventual progression.
- Source: RANZCOG / Australasian Paediatric Endocrine Group.

### K2. Heavy menstrual bleeding in adolescents (batch3.md)
- First-line management: combined oral contraceptive pill (stabilises the endometrium and controls bleeding).
- Coagulation factor (vWD) testing: indicated only if HMB persists despite COCP or with family history of bleeding disorder.
- Transabdominal pelvic ultrasound: NOT routinely indicated in adolescents - structural causes rare.
- Hysteroscopy: invasive, not indicated as initial management in adolescents with typical anovulatory bleeding.
- HMB definition: blood loss >80 mL per cycle OR periods >7 days that interfere with quality of life.
- Source: RANZCOG: Heavy menstrual bleeding statement.

---

## L. Neonatology

### L1. Neonatal sepsis / UTI (batch3.md)
- UTI: most common serious bacterial infection in neonates 0-3 months. Often presents with non-specific signs (poor feeding, lethargy, jaundice, mottling, hypothermia or fever).
- Full septic workup: blood culture + urine culture + lumbar puncture.
- Urine WCC >300 x 10^6/L strongly suggests UTI source.
- Empirical: per local guidelines (typically benzylpenicillin + gentamicin, or amoxicillin + gentamicin + cefotaxime per RCH).
- Source: RCH CPG: Neonatal sepsis.

### L2. Meconium aspiration syndrome (MAS) (batch1.md)
- First step: continuous pulse oximetry + supplemental oxygen.
- GBS prophylaxis is given to MOTHER IN LABOUR, not to the neonate post-delivery; not first-step in MAS.
- Surfactant: considered in severe MAS with respiratory failure, NOT first step.
- Source: RCH CPG: Meconium aspiration.

### L3. Midgut volvulus (neonatal bilious vomiting) (batch1.md)
- Bilious vomiting in a neonate = volvulus until proven otherwise.
- Ultrasound signs: duodenal dilatation, malposition of SMA/SMV, whirlpool sign.
- Definitive management: Ladd procedure, same admission.
- Source: RCH CPG: Neonatal bilious vomiting.

---

## M. Obstetrics - antenatal screening

### M1. Twin-to-twin transfusion syndrome (TTTS) surveillance (batch1.md)
- MCDA twins: 2-weekly ultrasound from 16 weeks gestation until delivery.
- DCDA twins: not at risk of TTTS.
- Source: RANZCOG: Management of monochorionic twin pregnancy.

### M2. MCDA vs DCDA delivery timing (batch4.md)
- MCDA: deliver 36+0 to 36+6 weeks (per RANZCOG and the bank's bullet wording).
- DCDA: deliver 37+0 to 37+6 weeks.
- NOTE: batch4.md flags an apparent guideline drift where an item key marked 37+0 to 37+6 as correct for MCDA. Always cite the current RANZCOG statement and pick ONE; do not generate questions on this exact threshold without confirming current guidance.
- Source: RANZCOG: Twin pregnancy statement.

### M3. Anti-D in pregnancy (batch2.md)
- Routine doses: 625 IU at 28 and 34 weeks; 625 IU postpartum if baby is RhD positive.
- Sensitising events triggering anti-D: miscarriage, chorionic villus sampling, amniocentesis, abdominal trauma, external cephalic version, antepartum haemorrhage.
- 250 IU for sensitising events in the first trimester; 625 IU for sensitising events beyond 12 weeks.
- NON-sensitising: NIPT, live vaccines (MMR), routine speculum/digital examination, future blood transfusion.
- Source: National Blood Authority Australia (NBA): Anti-D Guidelines.

### M4. Bishop score (batch3.md, batch4.md)
- Components: cervical dilation, effacement, consistency, position, fetal station.
- Scoring:
  - Dilation (cm): Closed=0, 1-2=1, 3-4=2, 5-6=3
  - Effacement (%): 0-30=0, 40-50=1, 60-70=2, 80+=3
  - Consistency: Firm=0, Medium=1, Soft=2
  - Position: Posterior=0, Mid=1, Anterior=2
  - Station: -3=0, -2=1, -1/0=2, +1/+2=3
- Interpretation: total >=6 = favourable cervix for induction with ARM +/- oxytocin. <6 = ripen with prostaglandin or balloon catheter FIRST.
- Source: RANZCOG: Induction of labour statement.

### M5. Vasa praevia (batch3.md)
- Risk factors: low-lying placenta, succenturiate or accessory placental lobe, velamentous cord insertion, multifetal pregnancy.
- Investigation: detailed follow-up ultrasound with colour Doppler by maternal-fetal medicine team.
- Management if diagnosed: planned caesarean delivery at 34-36 weeks AFTER antenatal corticosteroids.
- Source: RANZCOG: Vasa praevia.

### M6. Cervical screening in Aboriginal and Torres Strait Islander people (batch3.md)
- Aboriginal and Torres Strait Islander people aged 25-74 years are eligible for cervical screening regardless of HPV vaccination history.
- Aboriginal and Torres Strait Islander people are at higher risk of underlying high-grade abnormality and require EARLIER referral to colposcopy in equivocal pathways.
- Source: The National Cervical Screening Program (NCSP) guidelines.

---

## N. Obstetrics - antenatal complications

### N1. Pre-eclampsia / eclampsia (batch1.md, batch2.md)
- Severe pre-eclampsia: BP >=160/110 plus end-organ involvement (HELLP, neurological, renal, hepatic, proteinuria/creatinine).
- First-line for eclampsia prevention: intravenous magnesium sulfate (NOT sulphate - AMH INN).
- Magnesium mechanism: calcium antagonist (smooth-muscle vasodilation), cerebral vasospasm reduction, neuronal membrane stabilisation.
- Fluid restriction 80-100 mL/hour to avoid pulmonary oedema.
- Pulmonary oedema risk: excessive IV fluid boluses + oxytocin's antidiuretic effect.
- Transfer contraindicated when patient in advanced labour (>=8 cm cervical dilation).
- Source: SOMANZ Guideline for the Management of Hypertensive Disorders of Pregnancy; RANZCOG.

### N2. PPROM / preterm labour (batch4.md)
- PPROM: spontaneous rupture of membranes before 37+0 weeks.
- First medication: betamethasone 2 doses of 11.4 mg IM 24 hours apart. Optimal window: 48 hours to 7 days before delivery; useful up to 34+6 weeks.
- Erythromycin in PPROM (ORACLE I trial, n=4809): decreased delivery at 7 days, decreased surfactant, decreased positive blood cultures, decreased chronic lung disease and major cerebral haemorrhage.
- Preterm labour categories: extremely preterm <28 weeks; very preterm 28-32; moderate-to-late preterm 32-36+6.
- Partosure / Actim Partus testing: bedside qualitative test for risk of delivery within 7 days. Strong negative predictive value.
- Tocolysis: nifedipine 20 mg PO every 20 minutes x 3 doses, then TDS (avoid if bleeding).
- Magnesium sulfate neuroprotection: <30 weeks, strongly indicated 28-29+6.
- Source: RANZCOG: PPROM and Preterm Labour statements.

### N3. Cord prolapse (batch4.md)
- Highest-risk situation: rupture of membranes (ROM) + non-cephalic presentation (especially transverse lie).
- Management: immediate caesarean section; manual elevation of presenting part off cord; knee-chest position; fill bladder with 500-700 mL saline.
- Source: RANZCOG: Cord prolapse.

### N4. Chorioamnionitis (batch4.md)
- Diagnostic constellation: maternal fever + tachycardia + leucocytosis + raised CRP + fetal tachycardia.
- Immediate delivery indicated.
- Source: RANZCOG.

### N5. Parvovirus B19 in pregnancy (batch4.md)
- Maternal infection: weekly USS for 12 weeks monitoring middle cerebral artery peak systolic velocity (MCA-PSV) for fetal anaemia, plus signs of hydrops (ascites, pleural effusions, skin oedema).
- Hydrops typically develops 2-12 weeks after maternal infection.
- IUT (intrauterine transfusion) only if hydrops or severe anaemia confirmed.
- Source: RANZCOG: Maternal infections in pregnancy.

### N6. Overt diabetes in pregnancy vs GDM (batch4.md)
- Overt diabetes diagnostic criteria (any of): fasting plasma glucose >=7.0 mmol/L; 2-hour 75 g OGTT >=11.1 mmol/L; HbA1c >=6.5% (48 mmol/mol); random plasma glucose >=11.1 with symptoms.
- GDM 75 g OGTT thresholds (any one positive): fasting >=5.1; 1-hour >=10.0; 2-hour >=8.5.
- Universal screening: at booking (high-risk) or 24-28 weeks.
- Source: Australasian Diabetes in Pregnancy Society (ADIPS).

### N7. CTG patterns (batch4.md)
- Late decelerations: indicative of uteroplacental insufficiency and fetal hypoxia.
- Persistent late decelerations + reduced variability + meconium: expedite delivery.
- Sinusoidal pattern (must persist >=20 minutes): highly suggestive of severe fetal anaemia (consider fetomaternal haemorrhage, parvovirus B19).
- Source: RANZCOG: Intrapartum Fetal Surveillance.

### N8. Kleihauer-Betke / fetomaternal haemorrhage (batch1.md)
- Detects fetal red cells in maternal circulation, quantifies FMH.
- Positive Kleihauer prompts urgent fetal wellbeing assessment.
- Source: NBA Australia.

### N9. Vascular Ehlers-Danlos in pregnancy (batch2.md)
- Family history of sudden death in young relative + hyperextensibility = consider vEDS.
- Significant maternal mortality from arterial rupture during pregnancy.
- Urgent echocardiogram for suspected aortic dissection.
- Source: RACP.

### N10. Caesarean scar ectopic pregnancy (batch2.md)
- Ultrasound features: empty endometrial cavity + gestational sac in anterior lower uterine segment at site of prior caesarean scar + myometrium <5 mm between sac and bladder + increased Doppler vascularity.
- Gold standard: transvaginal ultrasound.
- Differential from cervical ectopic: cervical = sac below internal os, hourglass uterus appearance.
- Source: RANZCOG: Ectopic pregnancy.

### N11. Incomplete miscarriage (batch4.md)
- Diagnostic constellation: history of heavy vaginal bleeding + tissue passage + ultrasound showing retained products (heterogeneous echogenic material) without gestational sac.
- A closed cervical os does NOT exclude incomplete miscarriage if USS shows retained products.
- Source: RANZCOG.

### N12. Late termination of pregnancy (batch2.md)
- Late TOP (>23 weeks): feticide first (intracardiac KCl under USS guidance), then medical induction with mifepristone + misoprostol.
- Mife + miso alone is inappropriate >23 weeks due to risk of live birth.
- Caesarean for TOP: never first line; reserved for maternal indication.
- Source: RANZCOG: Late termination of pregnancy.

---

## O. Obstetrics - intrapartum / labour

### O1. Labour progress (batch2.md)
- Active phase begins at 4-6 cm cervical dilation.
- Expected dilatation: 0.5-1 cm/hour in nulliparous women; ~1.5 cm/hour in multiparous.
- Partogram for monitoring.
- Source: RANZCOG: Intrapartum care.

### O2. Cholecystitis in pregnancy (batch2.md)
- Laparoscopic cholecystectomy is safe through the third trimester and preferred over conservative management (better outcomes, fewer recurrent presentations).
- Open cholecystectomy not justified; percutaneous drain reserved for unwell patients.
- Source: RACS / RANZCOG.

---

## P. Obstetrics - postpartum

### P1. Postpartum haemorrhage (PPH) (batch1.md, batch2.md)
- Definitions: PPH >=500 mL; severe PPH >=1000 mL; major haemorrhage >=2500 mL.
- 4 Ts: tone, trauma, tissue (retained products), thrombin.
- Genital tract trauma with active bleeding (uterus contracted): direct pressure to bleeding site FIRST, then definitive surgical repair.
- Tone (atony): oxytocin IV first-line.
- Ergometrine: CONTRAINDICATED in hypertension, pre-eclampsia (risk of stroke, coronary spasm). Where ergometrine would be appropriate: atony in a normotensive patient who has failed oxytocin.
- Carboprost: 3rd-line uterotonic.
- Tranexamic acid: adjunct (administer within 3 hours of bleeding onset).
- Bakri balloon: tamponade for ongoing atony.
- Source: RANZCOG: PPH; SOMANZ.

### P2. Ureteric injury post-hysterectomy (batch1.md)
- Investigation of choice: retrograde pyelogram.
- CT with IV contrast: alternative if RPG not available.
- New symptoms after a recent procedure: presume related to the procedure until proven otherwise.
- Source: Royal Australasian College of Surgeons (RACS) / RANZCOG.

### P3. Tubal ligation (batch4.md)
- Lifetime pregnancy risk after tubal ligation: ~1 in 200.
- Reversal (tubal re-anastomosis) success: 40-85%, decreasing with maternal age and depending on prior procedure.
- If pregnancy occurs after tubal ligation, the absolute risk of intrauterine pregnancy is still HIGHER than the absolute risk of ectopic - despite the RELATIVE risk of ectopic being increased compared to baseline. This is the common board misconception.
- Modified Pomeroy technique: portion of each Fallopian tube cut and removed.
- Source: RANZCOG: Female sterilisation.

---

## Q. Obstetrics - medication in pregnancy

### Q1. Antiepileptic drugs in pregnancy (batch2.md)
- Sodium valproate: teratogen (neural tube defects, skeletal abnormality, developmental delay); avoid if alternative available.
- Phenytoin: fetal hydantoin syndrome (cleft lip/palate, developmental delay).
- Carbamazepine: fetal hydantoin syndrome, spina bifida.
- Lamotrigine and levetiracetam: preferred AEDs in pregnancy.
- Folic acid 5 mg daily for all women with epilepsy planning pregnancy.
- AED continuation: do NOT stop; uncontrolled seizures more dangerous than continued therapy.
- Fetal bradycardia during maternal GTC seizure: may occur, typically resolves without sequelae.
- Source: RANZCOG; Australian and New Zealand Association of Neurologists.

### Q2. NSAIDs in pregnancy (batch2.md)
- Avoid >20 weeks gestation (premature closure of ductus arteriosus, fetal renal toxicity).
- Mechanism: prostaglandin inhibition.
- Source: AMH; RANZCOG.

### Q3. Paracetamol: safe across pregnancy. SSRIs (sertraline, citalopram): preferred in pregnancy; mild risk of low birth weight and transient neonatal respiratory distress; do not switch a stable patient. Iron tablets: safe; adjust dose per investigations. (batch2.md, batch4.md)

### Q4. Continuing SSRI postpartum / in next pregnancy (batch4.md)
- Stable patient on SSRI with history of severe recurrent postnatal depression requiring hospitalisation: CONTINUE the current SSRI in the next pregnancy.
- Fluoxetine: >10,000 first-trimester exposures reported, not associated with increased major malformation rate above baseline.
- Sertraline and citalopram: generally preferred first-line in pregnancy, but continuing an effective agent usually preferable to switching.
- Source: RANZCP perinatal guidance; The Australian and New Zealand Journal of Psychiatry perinatal mental health statement.

---

## R. Gynaecology - benign

### R1. Adnexal masses / ovarian cysts in pre-menopausal women (batch2.md)
- Simple cyst <5 cm: observation only.
- Simple cyst 5-7 cm: ultrasound follow-up in 2-4 months via GP.
- Simple cyst >=7 cm or with malignant features: refer gynae, consider further imaging + CA-125.
- Source: RANZCOG: Ovarian masses statement.

### R2. Dermoid cyst (mature cystic teratoma) (batch2.md)
- ~20% of all ovarian neoplasms; most common germ cell tumour.
- USS: hyperechoic material (fat) + calcification + fluid-fluid level.
- Reproductive-age woman; risk of torsion + rupture.

### R3. Uterine septum / recurrent miscarriage (batch2.md)
- 3D transvaginal ultrasound (or MRI) for diagnosis: single fundus, normal external contour, midline septum.
- Hysteroscopic metroplasty (septal resection): RANZCOG-recommended for symptomatic uterine septum.
- Endometrial ablation: CONTRAINDICATED in those wanting to conceive.
- Wait 2-3 months after metroplasty to attempt conception.
- Source: RANZCOG.

### R4. Stress urinary incontinence (batch4.md)
- Conservative first: pelvic floor exercises (6 months trial).
- Surgical: colposuspension (or mid-urethral sling) after failed conservative.
- NOT first-line for SUI: oxybutynin, solifenacin (anticholinergics - for urge incontinence), duloxetine (limited evidence), botulinum injections (refractory detrusor overactivity).
- Source: RANZCOG / Continence Foundation of Australia.

### R5. Perimenopausal migraine with aura (batch4.md)
- Combined hormonal contraception (COCP, vaginal ring, patch): CONTRAINDICATED in migraine with aura due to ischaemic stroke risk - regardless of age.
- Transdermal menopausal hormone therapy: preferred for perimenopausal vasomotor symptoms when migraine with aura is present (avoids first-pass hepatic metabolism, more stable serum oestrogen, lower VTE risk).
- Source: RACGP HRT guidance; The International Menopause Society.

---

## S. Gynaecology - oncology

### S1. Epithelial ovarian cancer (batch2.md, batch4.md)
- Post-menopausal woman, fixed unilateral mass, raised CA-125 (>=35 U/mL elevated; >450 markedly so).
- CA-125 elevated in ~80% of epithelial ovarian cancers but also raised in many benign conditions.
- Risk of Malignancy Index (RMI): CA-125 x menopausal status x ultrasound features.
- Source: RANZCOG; The Cancer Council Australia.

### S2. Germ cell ovarian cancer (batch2.md, batch4.md)
- Typically teens to early 20s.
- Tumour markers: AFP, beta-hCG, LDH (NOT primarily CA-125).
- Initial workup panel for a complex solid-cystic ovarian mass in a young woman: LDH + AFP + beta-hCG (+ CA 19-9, +/- CA-125).
- Rapidly growing pelvic mass; characteristic USS features include fat and calcifications.

### S3. Endometrial cancer staging (batch4.md)
- Early-stage endometrial cancer: total laparoscopic hysterectomy + bilateral salpingo-oophorectomy by a gynaecological oncologist.
- MRI assesses myometrial invasion and lymph node involvement.
- Vaginal hysterectomy by general gynae: inadequate upper abdomen assessment; not staged surgery.
- Source: RANZCOG; The Cancer Council Australia.

---

## T. Gynaecology - cervical screening (CST)

### T1. Australian cervical screening basics (batch1.md, batch2.md, batch3.md, batch4.md)
- 5-yearly HPV testing for people aged 25-74 years.
- Self-collected sample acceptable in all eligible groups including Aboriginal and Torres Strait Islander people.
- A CST = HPV with reflex LBC if applicable; a CO-TEST = HPV plus LBC, used for symptomatic patients.

### T2. CST decision tree (consolidated)
| Result | Next step |
|---|---|
| HPV not detected | Routine 5-yearly screening |
| HPV (not 16/18) + LBC normal or pLSIL | Repeat HPV test in 12 months |
| HPV (not 16/18) + atypical glandular cells (any LBC) | Refer for colposcopy (NCSP Consensus recommendation 6.48) |
| HPV (not 16/18) + LBC HSIL | Refer for colposcopy |
| HPV 16/18 (any LBC, any method) | Refer for colposcopy |
| HPV 16/18 on self-collected sample (reflex LBC not possible) | Direct colposcopy; LBC taken at colposcopy |
| HPV 16/18 on self-collected, second-pathway preference | Clinician-collected sample for reflex LBC |

### T3. CST in Aboriginal and Torres Strait Islander women
- Higher risk of underlying high-grade abnormality.
- Earlier referral to colposcopy in equivocal pathways.

### T4. Post-LLETZ surveillance
- Test of cure HPV at 6 months, then HPV every 12 months until two consecutive negatives, then return to 5-yearly.

### T5. HPV vaccination
- School programme covers up to age 19; catch-up to age 26.
- Not routinely funded after 26 except for specific immunocompromised contexts or men who have sex with men, per Australian Immunisation Handbook.

Sources: The National Cervical Screening Program (NCSP) guidelines; The Australian Immunisation Handbook.

---

## U. Gynaecology - contraception

### U1. UKMEC categories (batch2.md)
- Category 1: no restriction.
- Category 2: advantages outweigh risks.
- Category 3: risks usually outweigh advantages.
- Category 4: unacceptable health risk.

### U2. UKMEC quick references for common scenarios

| Method | BMI >=35 | Smoker (any) | Smoker stopped >1 yr | Migraine with aura |
|---|---|---|---|---|
| COCP | Category 3 | Category 3 (age 35+) | Category 2 | Category 4 |
| POP | Category 1 | Category 2 | Category 1 | Category 1 |
| DMPA | Category 2 | Category 1 | Category 1 | Category 1 |
| Cu-IUD | Category 1 | Category 1 | Category 1 | Category 1 |
| LNG-IUS | Category 1 | Category 1 | Category 1 | Category 1 |
| Implant (etonogestrel) | Category 1 | Category 1 | Category 1 | Category 1 |

- Multiple risk factors compound risk and may escalate category.
- Source: UK Medical Eligibility Criteria for Contraceptive Use (UKMEC); RACGP contraception statement.

---

## V. Reproductive endocrinology / adolescent

### V1. PCOS guidelines (batch3.md)
- Reference: The 2023 International Evidence-based Guideline for the Assessment and Management of Polycystic Ovary Syndrome (sometimes cited by emedici in adolescent menorrhagia explanations).

### V2. Heavy menstrual bleeding in adolescents - see K2.

---

## W. Psychiatry - perinatal

(Coverage in batches 1-4 was limited; batch4 captured Q3 fluoxetine continuation. The rules below are extrapolated from RANZCP/Beyond Blue but should be confirmed against the cited source before generation.)

### W1. SSRI continuation in subsequent pregnancy - see Q4.

### W2. Untreated antenatal depression: risks (named by emedici): poor self-care, preterm birth, low birth weight, increased risk of postpartum depression.

### W3. Sertraline and citalopram: preferred first-line antidepressants in pregnancy; do NOT switch a stable patient.

### W4. Fluoxetine in lactation: longer half-life than sertraline; sertraline often preferred in lactation but fluoxetine acceptable when antenatally established.

Sources: RANZCP perinatal guidance; The Australian and New Zealand Journal of Psychiatry perinatal mental health statement; Beyond Blue clinical guidance.

---

## X. Sexual health / infectious disease (adult)

### X1. Secondary syphilis (batch2.md)
- Triad: copper-coloured maculopapular rash including palms and soles + generalised painless lymphadenopathy + condylomata lata.
- Organism: Treponema pallidum.
- Treatment: benzathine penicillin G (single dose for early infection; three weekly doses for late or unknown duration).
- All women of childbearing age with suspected syphilis: pregnancy test (congenital syphilis = miscarriage, stillbirth, neonatal death, preterm labour, IUGR).
- Higher notification rates in remote Aboriginal and Torres Strait Islander communities, especially Northern Territory.
- Notifiable condition.
- Source: ASHM STI Management Guidelines; The Australasian Sexual Health Alliance.

### X2. Asymptomatic ureaplasma colonisation (batch4.md)
- Ureaplasma urealyticum and U. parvum are normal urogenital microbiota; colonisation rate ~40-80% in sexually active women.
- Asymptomatic detection on private-test (online) urine PCR: NO treatment indicated. Reassurance.
- Not part of routine STI screening per ASHM / RANZCOG.
- Source: ASHM STI Management Guidelines; RANZCOG.

### X3. Routine STI screening (asymptomatic, non-pregnant): risk-based per RANZCOG and ASHM. Avoid universal testing; focus on chlamydia, gonorrhoea, HIV, syphilis, hep B per risk.

---

## Generation reminders for cited facts

1. Every fact above is provisional - confirm against the named source before commit.
2. Where two analyses disagree (e.g. MCDA delivery timing in M2), confirm CURRENT RANZCOG before using.
3. When citing, use the full institutional name on first mention in the rationale (per `explanation_craft.md` section 2.5).
4. AU INN spelling for drugs: "magnesium sulfate" (not sulphate). Other AU spellings throughout.
5. Doses live in the rationale or explanation body, not in the option text (unless the question is explicitly about dosing).
6. For each fact used in a question, ensure the question has at least one disconfirming finding seeded in the stem to lift it above L3.
