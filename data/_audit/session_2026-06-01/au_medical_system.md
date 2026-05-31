# Australian Medical System Reference for A to E MCQ Bank

Generated 2026-06-01 for Y4 Australian medical student exam-prep MCQ generation. This file is the source of truth the generator must pull from to anchor stems, options, and rationales in genuinely Australian practice. Where a value is jurisdiction-specific (NSW vs Vic vs Qld), the jurisdiction is named. Where the value is endorsed by a named body, the body is cited in full first mention.

Style rules baked into this doc:
- No em-dashes. Use a hyphen with spaces.
- No emojis.
- Never use the "ATSI" abbreviation. Use "Aboriginal and Torres Strait Islander" for general references; use "Aboriginal" or "Torres Strait Islander" alone only when referring to a specific person who is one or the other.
- Refer to candidates and protagonists as "the doctor" or by training grade (intern, RMO, JMO, registrar). Never assume nurse / pharmacist / midwife scope as the discriminator.
- Use Australian generic drug names. Paracetamol, not acetaminophen. Adrenaline, not epinephrine. Frusemide is acceptable as the older spelling, furosemide is the current INN; prefer furosemide.

---

## 1. System structure

### 1.1 Medicare
Medicare is the universal public health insurance scheme, administered by Services Australia (formerly the Department of Human Services) under the Health Insurance Act 1973. Funded primarily through general taxation plus the Medicare levy (2.0% of taxable income) and the Medicare Levy Surcharge for higher-income earners without private hospital cover (tiers from 1.0% to 1.5% as of 2026).

Key concepts the generator should be fluent in:
- Bulk-billing: the practitioner accepts the Medicare Benefits Schedule (MBS) rebate as full payment; the patient pays nothing out of pocket. Bulk-billing rates vary by region; rural and concession-card patients are more often bulk-billed.
- Gap payment: difference between the fee charged and the MBS rebate; paid by the patient out of pocket.
- Medicare Safety Net: once a patient's out-of-pocket gap costs exceed an annual threshold, Medicare rebates higher percentages for further services. Two thresholds: Original Medicare Safety Net (OMSN) and Extended Medicare Safety Net (EMSN).
- MBS item number: a specific code identifying the service, time, and complexity. Generator should reference MBS numbers in stems when the question turns on funding eligibility.

Commonly tested MBS item numbers:
- 23: Level B GP consultation, less than 20 minutes.
- 36: Level C GP consultation, 20 to less than 40 minutes.
- 44: Level D GP consultation, 40 minutes or more.
- 2715: GP Mental Health Treatment Plan (MHTP) preparation, GP has completed Mental Health Skills Training, 20 to 40 minutes.
- 2717: GP MHTP preparation, GP has completed Mental Health Skills Training, more than 40 minutes.
- 2700 / 2701: GP MHTP preparation, GP without Mental Health Skills Training.
- 2712: Review of GP MHTP.
- 721: GP Management Plan (GPMP) preparation for chronic conditions.
- 723: Team Care Arrangement (TCA) preparation. Together with 721 these underpin allied-health access for chronic disease.
- 732: Review of GPMP or TCA.
- 707, 715: Aboriginal and Torres Strait Islander health assessment (715 is the specific assessment item).

### 1.2 Pharmaceutical Benefits Scheme (PBS)
The PBS subsidises medicines listed on the PBS Schedule. Patients pay a co-payment per script: in 2026 the general patient co-payment is approximately AUD 31.60 and the concessional co-payment is approximately AUD 7.70 per script (values move with annual indexation). The PBS Safety Net reduces co-payments once a household's annual expenditure exceeds the relevant threshold.

PBS prescribing concepts the generator should know:
- Restricted Benefit: clinical criteria printed in the PBS Schedule that must be met for the listing to apply. The prescriber attests by writing the script.
- Authority Required (Streamlined): a four-digit code is included on the script; no phone call needed.
- Authority Required: prescriber must contact Services Australia (or use the online HPOS portal) to obtain authority before dispensing.
- Private prescription: written when PBS criteria are not met or for a non-PBS-listed medicine. Patient pays full cost.

### 1.3 Private health insurance
Hospital cover (covers admitted inpatient care in a private hospital, plus a private room in a public hospital if elected) is distinct from Extras cover (dental, optical, physiotherapy, etc). The Private Health Insurance Rebate is a means-tested government rebate on premiums. Lifetime Health Cover (LHC) loading adds 2% per year past age 30 to base premiums if cover is taken out later (capped at 70%).

### 1.4 Public hospital system, state-based jurisdiction
Public hospitals are funded jointly by the Commonwealth (Medicare) and the states/territories, but operated by state and territory health departments. There is no national public hospital system; each jurisdiction sets its own policy, formulary, and clinical guidelines within the broad Commonwealth framework.

Jurisdictions:
- NSW: NSW Health. Local Health Districts (LHDs) e.g. Sydney LHD, Western Sydney LHD, Hunter New England LHD. Sets policies via PD (Policy Directives) and GL (Guidelines), e.g. PD2015_011 for Anti-D. Clinical Excellence Commission (CEC) provides quality-and-safety oversight.
- Victoria: Department of Health (DH, formerly DHHS until 2021). Safer Care Victoria (SCV) is the peak quality-and-safety body; its maternity guidelines are widely used. Health services rather than LHDs; e.g. Monash Health, Alfred Health, Western Health.
- Queensland: Queensland Health, organised by Hospital and Health Services (HHSs); Children's Health Queensland operates the Queensland Children's Hospital.
- South Australia: SA Health. Local Health Networks (LHNs) e.g. Central Adelaide LHN. SA has a distinctive Drugs of Dependence Unit regime (see Section 1.10).
- Western Australia: WA Health. Health Service Providers e.g. North Metropolitan Health Service, WA Country Health Service. Geographic remoteness drives heavy RFDS, telehealth, and FIFO-clinician dependence.
- Tasmania: Department of Health Tasmania. Royal Hobart Hospital, Launceston General Hospital. Very small specialist workforce; many tertiary services require interstate transfer.
- ACT: ACT Health. Canberra Hospital is the tertiary referral centre; serves the surrounding NSW Southern catchment.
- Northern Territory: NT Health. Royal Darwin Hospital and Alice Springs Hospital are the only tertiary centres. Massive remote-area component; ACCHS sector is large; ARF/RHD burden the highest in the world.

### 1.5 GP gatekeeper model and chronic-disease plans
General practice is the entry point for non-emergency care; specialist consultation rebates under Medicare require a valid GP referral (12-month referral for an initial consultation, indefinite if specifically requested).

Chronic Disease Management (CDM) plans:
- GP Management Plan (GPMP, MBS 721): a written plan listing the patient's chronic conditions, goals, and management actions, prepared by the GP for any patient with at least one chronic medical condition.
- Team Care Arrangement (TCA, MBS 723): coordinates care across at least three providers (the GP plus two others). With a GPMP and TCA, the patient becomes eligible for Medicare-rebated allied health under MBS items 10950 to 10970, up to five visits per calendar year combined across all allied-health services.
- Review (MBS 732): periodic review of GPMP and TCA.

Mental Health Treatment Plan (MBS 2715 / 2717 / 2700 / 2701): unlocks the Better Access initiative. The patient becomes eligible for up to 10 Medicare-rebated individual psychology / focused psychological strategies sessions per calendar year (was temporarily 20 during COVID; reverted to 10 from 1 January 2023). Review is at session 6 and at session 10.

### 1.6 Specialist referral pathways
- GP refers to a non-GP specialist or consultant physician. Without a current referral the specialist consult does not attract a Medicare rebate.
- Inter-specialist referrals do not require GP routing but the referring specialist must provide a written referral.
- Emergency Department presentations bypass referral; tertiary admission similarly.

### 1.7 Royal Flying Doctor Service (RFDS) and rural / remote care
The Royal Flying Doctor Service of Australia provides aeromedical retrieval, telehealth, and primary-care clinics across remote Australia. Funded by Commonwealth, states, and donations. RFDS often coordinates with state retrieval services:
- NSW: NSW Ambulance Aeromedical Operations (helicopter retrieval) and CareFlight (charity-operated).
- Victoria: Adult Retrieval Victoria (ARV) and Paediatric Infant Perinatal Emergency Retrieval (PIPER).
- Queensland: Retrieval Services Queensland (RSQ), LifeFlight.
- WA: WA Country Health Service Command Centre + RFDS Western Operations.
- NT and SA: RFDS Central Operations.
- Tas: Ambulance Tasmania.

Rural and remote pathways the generator should respect: stems set in remote settings should involve telehealth advice, ED-to-tertiary transfer, retrieval helicopter or fixed-wing aircraft, and may involve a sole on-call doctor (e.g. RACGP Rural Generalist or ACRRM Fellow) with limited diagnostic backup.

### 1.8 Aboriginal Community Controlled Health Services (ACCHS)
Aboriginal Community Controlled Health Services are primary-care services planned and run by Aboriginal communities through a locally elected board. Represented nationally by NACCHO (National Aboriginal Community Controlled Health Organisation) and at state level by bodies such as AHMRC (NSW), VACCHO (Vic), QAIHC (Qld), AHCWA (WA), AHCSA (SA), AMSANT (NT). Services are typically holistic, employ Aboriginal Health Workers and Aboriginal Health Practitioners, and provide MBS-billed services plus block-funded outreach.

Stems featuring Aboriginal or Torres Strait Islander patients should consider:
- 715 Health Assessment eligibility (annual for adults, two-yearly for younger ages depending on the item).
- Closing the Gap PBS Co-payment Program: eligible patients get further discounts or zero co-payment on PBS scripts.
- Specific disease burdens (ARF/RHD, chronic kidney disease, type 2 diabetes onset earlier, otitis media, trachoma in remote populations, hepatitis B chronic carriage).
- Cultural safety: offer to involve an Aboriginal Health Worker or Liaison Officer, ask about preferred Aboriginal or Torres Strait Islander identification (must always be asked).

### 1.9 State-specific quirks
- South Australia Drugs of Dependence regime: SA Controlled Substances Act 1984 and Regulations require prescribers to obtain authority from the SA Health Drugs of Dependence Unit before initiating Schedule 8 drugs (opioids, stimulants, certain benzodiazepines) for more than 2 months, or any duration in a drug-dependent patient.
- Victoria voluntary assisted dying: the Voluntary Assisted Dying Act 2017 (Vic) commenced June 2019; eligibility includes Australian citizen or permanent resident, Victorian resident for at least 12 months, decision-making capacity, advanced incurable disease expected to cause death within 6 months (12 months for neurodegenerative disease). Two doctors must independently assess; one must be a specialist in the disease.
- Voluntary assisted dying in other states followed: WA 2019, Tas 2021, SA 2021, Qld 2021, NSW 2022. ACT and NT historically barred from legislating until 2022; ACT VAD Act commenced 2025.
- WA mandatory reporting of family and domestic violence: practitioner reporting frameworks differ by state.
- NT Cashless Debit Card and related income-management policies affect remote-population stems concerning alcohol, gambling, social determinants.

### 1.10 Drug schedules (Standard for the Uniform Scheduling of Medicines and Poisons, SUSMP)
Administered by the Therapeutic Goods Administration (TGA) and adopted (with minor variations) by each state's poisons act.
- S2 (Pharmacy Medicine): sold in pharmacies, no prescription needed.
- S3 (Pharmacist Only Medicine): sold by pharmacists with counselling, no prescription needed. Examples: salbutamol inhaler, certain low-dose codeine-free analgesic combinations historically, oral contraceptive pill resupply under continued dispensing arrangements.
- S4 (Prescription Only Medicine): standard prescription required. Most prescription medicines. Includes most benzodiazepines, antidepressants, antibiotics, etc.
- S8 (Controlled Drug): high abuse potential. Includes morphine, oxycodone, methadone, buprenorphine, methylphenidate, dexamphetamine, lisdexamfetamine, ketamine, alprazolam (reclassified from S4 to S8 in 2014). Stringent prescribing rules, often state-specific authority required, separate locked storage in hospital wards, witnessed administration, drug register.
- S9 (Prohibited Substance): heroin, cannabis (for non-medicinal forms), LSD, psilocybin (psilocybin and MDMA were partially down-scheduled to S8 for authorised prescriber use in PTSD and treatment-resistant depression from 1 July 2023).

Real-time prescription monitoring:
- Vic: SafeScript (mandatory since 2020). Doctors must check SafeScript before prescribing or supplying S8 drugs, all benzodiazepines, codeine, gabapentinoids, z-drugs (zolpidem, zopiclone), tramadol, quetiapine.
- NSW: SafeScript NSW (mandatory phased rollout).
- Qld: QScript.
- SA: ScriptCheckSA.
- WA: ScriptCheckWA.
- Tas: DAPIS (Drugs and Poisons Information System Online Remote Access, DORA).
- ACT: Canberra Script.

---

## 2. Guideline bodies

For each: institutional name in full, common acronym, domain, citation style for MCQ rationales.

### Colleges
- Royal Australian and New Zealand College of Obstetricians and Gynaecologists (RANZCOG): obstetrics, gynaecology, antenatal and intrapartum care, contraception, miscarriage, ectopic. Cite as "RANZCOG", e.g. "RANZCOG C-Obs 6 (Anti-D)", "RANZCOG C-Gyn 38 (Miscarriage, Recurrent Miscarriage and Ectopic Pregnancy, April 2025)".
- Royal Australasian College of Physicians (RACP): adult internal medicine, paediatrics (Paediatrics and Child Health Division, RACP-PCHD), rehabilitation, occupational and environmental medicine, public health medicine.
- Royal Australasian College of Surgeons (RACS): general surgery, vascular, urology (jointly with USANZ), orthopaedics (jointly with AOA), cardiothoracic, plastic, paediatric surgery, neurosurgery, otolaryngology (joint with ASOHNS).
- Royal Australian College of General Practitioners (RACGP): general practice. Major publications include the "Red Book" (Guidelines for Preventive Activities in General Practice, 10th edition), "Silver Book" (Aged Care Clinical Guide), "Green Book" (Putting Prevention Into Practice).
- Royal Australian and New Zealand College of Psychiatrists (RANZCP): psychiatry. Publishes clinical practice guidelines for mood disorders, schizophrenia, eating disorders, perinatal and infant psychiatry, addiction. Cite as "RANZCP CPG".
- Australian College of Rural and Remote Medicine (ACRRM): rural generalism, parallel pathway to RACGP for rural practice.
- Royal Australasian College of Medical Administrators (RACMA): medical administration; rarely tested clinically but generator should know name.
- Australasian College for Emergency Medicine (ACEM): emergency medicine. ACEM-administered FACEM is the consultant qualification.
- Australian and New Zealand College of Anaesthetists (ANZCA): anaesthesia and the joint Faculty of Pain Medicine (FPM).
- College of Intensive Care Medicine of Australia and New Zealand (CICM): intensive care.
- Royal Australian and New Zealand College of Radiologists (RANZCR): diagnostic radiology and radiation oncology.
- Royal College of Pathologists of Australasia (RCPA): pathology. Sets reference intervals used by Australian labs; "RCPA Manual" is a clinical reference.
- Australasian Society of Clinical Immunology and Allergy (ASCIA): allergy, anaphylaxis, immunodeficiency. ASCIA action plans (drug allergy, anaphylaxis) are standard.

Note: "RACOG" is the pre-1998 name (Royal Australian College of Obstetricians and Gynaecologists) before the merger with the New Zealand body. Do not use RACOG in a 2026 stem.

### Formularies and prescribing references
- Therapeutic Guidelines (eTG): the de facto Australian prescribing reference. Modules include Antibiotic, Cardiovascular, Endocrinology, Gastrointestinal, Neurology, Oral and Dental, Palliative Care, Psychotropic, Respiratory, Rheumatology, Toxicology and Wilderness, Dermatology. Cite as "Therapeutic Guidelines (eTG)" or "eTG Antibiotic".
- Australian Medicines Handbook (AMH): prescribing reference, drug monographs, drug interactions, doses. Cite as "AMH".
- AMH Children's Dosing Companion (AMH CDC): paediatric dosing.
- MIMS: drug-information database; product information.

### Paediatrics
- The Royal Children's Hospital Melbourne Clinical Practice Guidelines (RCH CPG): widely used across Australia as the practical paediatric reference. Free online. Cite as "RCH Melbourne CPG" or "RCH CPG".
- Sydney Children's Hospitals Network (SCHN) practice guidelines.
- Queensland Children's Hospital paediatric guidelines.
- Australasian Paediatric Endocrine Group (APEG) for paediatric endocrine.
- Paediatric Research in Emergency Departments International Collaborative (PREDICT) for ED-specific paediatric protocols.

### Quality and safety bodies
- Safer Care Victoria (SCV): Vic peak quality body, publishes maternity, paediatric, and acute-care guidance.
- Clinical Excellence Commission (CEC, NSW): NSW peak quality body. Sepsis Kills, Between the Flags (deteriorating patient), Adult Sepsis Pathway, Paediatric Sepsis Pathway.
- Clinical Excellence Queensland (CEQ).
- Australian Commission on Safety and Quality in Health Care (ACSQHC): national, sets the National Safety and Quality Health Service (NSQHS) Standards (2nd edition), Antimicrobial Stewardship, Recognising and Responding to Acute Deterioration.

### Specialist organisations
- NHMRC (National Health and Medical Research Council): funds research, sets ethical guidelines (National Statement on Ethical Conduct in Human Research), and publishes clinical practice guidelines (e.g. Australian Guidelines to Reduce Health Risks from Drinking Alcohol).
- ATAGI (Australian Technical Advisory Group on Immunisation): the expert committee advising the Minister on immunisation. Endorses the Australian Immunisation Handbook (AIH), the practical source for vaccine recommendations. Cite as "Australian Immunisation Handbook (ATAGI)" or "AIH".
- ASHM (Australasian Society for HIV, Viral Hepatitis and Sexual Health Medicine): national STI/HIV/viral hepatitis guidance. Publishes the Australian STI Management Guidelines for Use in Primary Care.
- NCSP (National Cervical Screening Program): the program. Operated by Department of Health, Disability and Ageing; clinical guidelines maintained by the Cancer Council Australia. Updated NCSP Clinical Guidelines came into effect April 2025.
- NBA (National Blood Authority): governs blood and blood-product use; publishes the Patient Blood Management Guidelines and the Guideline for the prophylactic use of Rh D immunoglobulin in pregnancy care (published 2024).
- Cancer Council Australia: clinical guidelines for cancer screening and management (cervical, colorectal, melanoma, lung, breast).
- BreastScreen Australia: national breast cancer screening program, biennial mammography for women aged 50 to 74 (eligible from 40, actively invited 50 to 74). Soon expanding access to age 70 to 74 actively invited.
- National Bowel Cancer Screening Program (NBCSP): biennial faecal immunochemical test (FIT) for Australians aged 50 to 74 (lowered to 45 to 74 from 2024, with self-request available from 45 to 49).
- Australian Resuscitation Council (ARC): basic and advanced life support protocols. ANZCOR is the joint Australian and New Zealand committee.
- National Asthma Council Australia (NAC): Australian Asthma Handbook.
- Heart Foundation: Australian guideline for the assessment of cardiovascular disease risk; CVD risk calculator at cvdcheck.org.au.
- Kidney Health Australia: CARI Guidelines (Caring for Australasians with Renal Impairment) and the CKD Management in Primary Care handbook.
- RHDAustralia: 2020 Australian guideline for prevention, diagnosis and management of acute rheumatic fever and rheumatic heart disease (3rd edition updates in 2022 and 2024).
- Diabetes Australia / ADIPS (Australasian Diabetes in Pregnancy Society): ADIPS 2025 consensus recommendations on gestational diabetes screening, diagnosis, classification (June 2025).
- Australian Bureau of Statistics (ABS) and Australian Institute of Health and Welfare (AIHW): national health data, demographic statistics. Cite for epidemiology figures.

### State health departments
- NSW Health, SA Health, WA Health, Queensland Health, Victorian Department of Health, ACT Health, NT Health, Tasmanian Department of Health. Each issues policy directives, guidelines, and clinical pathways that operationalise national guidance for the jurisdiction.

---

## 3. Major Australian differences from US and UK practice

This section is the core of the document. Each item lists the AU position, the US contrast, the UK contrast, and the practical implication for an MCQ stem.

### 3.1 Cervical screening
- AU position (NCSP, since December 2017, with updated guidelines April 2025): HPV partial genotyping (oncogenic HPV) every 5 years from age 25 to 74. Self-collection (vaginal swab) universally available since 1 July 2022. Exit test after age 70 to 74 if eligible.
- Vocabulary: "Cervical Screening Test (CST)" or "HPV test". The term "Pap smear" is obsolete in routine screening and signals a non-AU stem if used to describe current practice. Liquid-based cytology is now reflex (triage) when HPV is positive for non-16/18 types.
- US contrast: USPSTF (2018) recommends co-testing every 5 years or cytology every 3 years from age 21 to 65.
- UK contrast: NHS Cervical Screening Programme tests every 3 years from 25 to 49 and every 5 years from 50 to 64 (HPV primary screening since 2019 in England).
- MCQ implication: HPV self-collection is now appropriate for under-screened patients including those who decline a speculum exam. The 5-yearly interval is fixed regardless of past sexual history; co-testing is not the AU default.

### 3.2 Antenatal screening and care
- First-visit screening (RANZCOG, Pregnancy Care Guidelines 2018, updated 2024): full blood examination, blood group and antibody screen, rubella IgG, syphilis serology, hepatitis B surface antigen, hepatitis C antibody, HIV antibody, varicella history, MSU for asymptomatic bacteriuria, urinalysis. Vitamin D, ferritin and TSH offered selectively.
- Combined first-trimester screening: NT measurement plus PAPP-A and free beta hCG at 11+0 to 13+6 weeks. Non-invasive prenatal testing (NIPT) is widely used in Australia and is private-pay (not Medicare-rebated for routine screening).
- Morphology scan: 18 to 22 weeks (commonly 20).
- Routine OGTT (75g, 2-hour) at 24 to 28 weeks; if early pregnancy risk factors, an early OGTT at booking.
- Anti-D prophylaxis: as below (Section 3.4).
- Group B Streptococcus (GBS): two approaches accepted in Australia (RANZCOG and Pregnancy Care Guidelines), unlike the US universal-screen model. Either:
  - Universal culture-based screening: low vaginal plus anorectal swab at 35 to 37 weeks; if positive, intrapartum penicillin G or ampicillin.
  - Risk-factor-based: intrapartum prophylaxis offered to women with prior GBS-affected infant, GBS bacteriuria in this pregnancy, intrapartum fever, prelabour rupture of membranes more than 18 hours, gestational age less than 37 weeks.
  - US contrast (ACOG / CDC): universal screening at 36 to 37 weeks.
  - UK contrast (NICE / RCOG): risk-based only; routine universal screening not recommended.
- Pertussis vaccination in pregnancy: dTpa at 20 to 32 weeks (ideally 28 weeks) every pregnancy.
- Influenza vaccination: any trimester, every pregnancy.
- COVID-19 vaccination: any trimester per ATAGI guidance.
- RSV: from 2025 in Australia, maternal RSV-PreF vaccine (Abrysvo) is recommended at 28 to 36 weeks of pregnancy under the National Immunisation Program.

### 3.3 Cervical and other screening (whole-of-life)
- NBCSP: biennial FIT from age 50 to 74 (lowered to 45 to 74 from 1 July 2024). Self-request available from 45.
- BreastScreen Australia: biennial mammography. Actively invites women 50 to 74; women 40 to 49 and 75+ may self-request. The age 40+ active-invitation expansion was announced but rollout is staged.
- Skin cancer (no national program): opportunistic skin checks; melanoma rates highest in the world (after New Zealand).
- AAA screening: not a national program; opportunistic.
- AusDiab and CVD risk: cvdcheck.org.au calculator (updated 2023 Australian Guideline for Assessing and Managing Cardiovascular Disease Risk). Replaced the older Framingham-based AusCVDRisk. Targets primary prevention from 45 (35 for Aboriginal and Torres Strait Islander people, 30 for those with diabetes).

### 3.4 Anti-D immunoglobulin (NBA 2024 guideline, RANZCOG-aligned)
AU uses International Units (IU), not micrograms. 250 IU equals 50 micrograms; 625 IU equals 125 micrograms.

Antenatal routine prophylaxis in Rh D-negative women without preformed anti-D:
- Rh D immunoglobulin 625 IU IM at 28 weeks gestation.
- Rh D immunoglobulin 625 IU IM at 34 weeks gestation.

Postpartum (if baby is Rh D-positive):
- Rh D immunoglobulin 625 IU IM within 72 hours of delivery, with Kleihauer-Betke or flow cytometry to assess for fetomaternal haemorrhage and additional dosing if FMH greater than 6 mL of fetal red cells.

Sensitising events:
- First trimester (less than 12 weeks gestation): 250 IU IM. Includes ectopic pregnancy, miscarriage with intervention, chorionic villus sampling, termination of pregnancy.
- After 12 weeks: 625 IU IM. Includes amniocentesis, antepartum haemorrhage, external cephalic version, abdominal trauma, fetal death in utero, threatened miscarriage with significant bleeding.
- Repeat doses every 6 weeks if ongoing sensitising events.

US contrast: doses are stated in micrograms (typically 300 micrograms = 1500 IU at 28 weeks; only one antenatal dose).
UK contrast: routine antenatal anti-D prophylaxis (RAADP) at 28 to 30 weeks (single 1500 IU dose) or two-dose regimen at 28 and 34 weeks (500 IU each), depending on Trust.

### 3.5 Ectopic pregnancy management thresholds (RANZCOG C-Gyn 38, April 2025)
Beta-hCG thresholds:
- Methotrexate (single-dose, 50 mg/m squared IM) is appropriate for haemodynamically stable women with no evidence of rupture, ectopic mass less than 35 mm, no fetal cardiac activity, and beta-hCG less than 5000 IU/L. Methotrexate efficacy falls progressively above 5000.
- Surgical management (laparoscopic salpingectomy preferred over salpingostomy unless preserving fertility in the contralaterally absent tube) is indicated for ruptured ectopic, haemodynamic instability, mass greater than 35 mm with fetal cardiac activity, beta-hCG greater than 5000 IU/L, contraindication to or failure of methotrexate, or patient preference.
- Expectant management may be considered for declining beta-hCG already less than 1500 IU/L with no signs of rupture, in a reliable patient who can return for follow-up.
- Post-methotrexate monitoring: serum beta-hCG day 4 and day 7; success requires more than 15% fall from day 4 to day 7; weekly thereafter until non-pregnant range.

Note: the 5000 IU/L threshold is RANZCOG's stated upper bound for medical management. The old "3000 cut-off" sometimes seen in UK or older AU sources is superseded.

### 3.6 Gestational diabetes (ADIPS 2025 consensus, June 2025)
Screening: 75 g 2-hour pregnancy oral glucose tolerance test (POGTT) at 24 to 28 weeks for all pregnant women without prior GDM or overt diabetes. Early POGTT for high-risk women (prior GDM, BMI greater than 30, prior macrosomic infant, family history, polycystic ovary syndrome, Aboriginal and Torres Strait Islander, South / South-East / East Asian or Middle Eastern background, age greater than 40).

Diagnostic cut-offs (modified IADPSG, AU-specific):
- Fasting plasma glucose 5.1 to 6.9 mmol/L; or
- 1-hour plasma glucose 10.0 mmol/L or greater (ADIPS 2025 sets the 1-hour cut at 10.6 in the revised consensus, though many AU labs still report against 10.0; check current local lab); or
- 2-hour plasma glucose 8.5 to 11.0 mmol/L (ADIPS 2025 revised the 2-hour upper to 9.0 to 11.0; the long-standing 8.5 lower remains in widespread Australian practice and laboratory reporting through 2026).

Overt diabetes in pregnancy is diagnosed if FPG 7.0 or greater, or 2-hour 11.1 or greater, or HbA1c 6.5% (48 mmol/mol) or greater.

US contrast: ACOG endorses the two-step approach (50 g 1-hour glucose challenge then 100 g 3-hour OGTT) with Carpenter-Coustan or NDDG criteria.
UK contrast: NICE 2015 uses a 75 g 2-hour OGTT but with FPG 5.6 or 2-hour 7.8 cut-offs (different thresholds).

### 3.7 Childhood immunisations (National Immunisation Program, 2026 schedule)
The 2026 NIP schedule (Department of Health, Disability and Ageing) includes (typical sequence):
- Birth: hepatitis B (monovalent, within 7 days, ideally first 24 hours).
- 6 weeks: hexavalent (DTPa-hepB-IPV-Hib), 13-valent pneumococcal conjugate (Prevenar 13 or equivalent), rotavirus (first dose must be by 14 weeks).
- 4 months: hexavalent, pneumococcal conjugate, rotavirus (second dose must be by 24 weeks).
- 6 months: hexavalent. Influenza annually from 6 months.
- 12 months: meningococcal ACWY (NeisVac-C historically, now MenACWY), measles-mumps-rubella (MMR), 13vPCV booster.
- 18 months: MMRV (measles-mumps-rubella-varicella) or MMR plus varicella, DTPa booster, Hib booster.
- 4 years: DTPa-IPV.
- Adolescents (school program, generally Year 7 to 8 depending on jurisdiction): HPV 9-valent (single dose since February 2023), dTpa booster, meningococcal ACWY.
- Aboriginal and Torres Strait Islander children additionally: hepatitis A (12 and 18 months in NT, Qld, SA, WA), 23-valent pneumococcal polysaccharide (Pneumovax 23) at 4 years if at increased risk.
- Maternal pertussis (dTpa) at 20 to 32 weeks of each pregnancy.
- Maternal RSV (Abrysvo) at 28 to 36 weeks of each pregnancy, listed on the NIP from February 2025.
- Infant nirsevimab passive immunisation programs (state-funded, NSW and WA initiated in 2024-25) overlap with maternal RSV vaccination; check local program.

US contrast: ACIP schedule. Differences include US use of hexavalent only in some products, earlier HPV (age 9 to 12 vs Y7-8 in AU), and the universal infant influenza recommendation from 6 months which is shared but timing varies.
UK contrast: UK Green Book. Differences include earlier MenB at 8 weeks (offered universally), no varicella in the UK routine schedule until 2025-26 introduction.

### 3.8 Acute rheumatic fever and rheumatic heart disease
The Australian guideline (RHDAustralia, 3rd edition 2020, updated 2022 and 2024) introduces a "high-risk population" diagnostic category. High-risk populations are:
- Aboriginal and Torres Strait Islander peoples living in rural and remote settings.
- Maori and Pacific Islander peoples.
- Other groups with high incidence as determined by local data.

For high-risk populations, the AU criteria differ from the modified Jones criteria:
- Subclinical carditis on echocardiogram is accepted as a major manifestation.
- Polyarthralgia or aseptic monoarthritis is accepted as a major manifestation (whereas Jones requires polyarthritis).
- The diagnostic threshold is lower because pre-test probability is higher.

Secondary prophylaxis: benzathine benzylpenicillin G (BPG) 1.2 million units IM every 21 to 28 days for at least 10 years after the most recent ARF episode or until age 21, whichever is longer; longer or lifelong if moderate or severe RHD or recurrent ARF.

### 3.9 Iron deficiency anaemia management (Australian PBS rules)
Oral iron is first line where tolerated. When intravenous iron is required, the two PBS-listed IV iron products (and their typical local-formulary positioning) are:
- Iron polymaltose (Ferrum H, Ferrosig): can deliver up to 2500 mg elemental iron in a single infusion, but the infusion takes up to 5 hours. Used in inpatient or supervised settings.
- Ferric carboxymaltose (Ferinject): up to 1000 mg elemental iron, delivered over 15 to 30 minutes. Preferred ambulatory product. PBS unrestricted in iron deficiency anaemia.
- Ferric derisomaltose (Monofer): up to 20 mg/kg, used where doses above 1000 mg are required in a single infusion, or in patients who cannot tolerate ferric carboxymaltose. Listed PBS with restriction.
- Iron sucrose (Venofer): smaller dose (200 mg per infusion), multiple infusions required; more common in nephrology and pregnancy where bolus dosing is contraindicated.

Common test items: ferric carboxymaltose is associated with hypophosphataemia (clinically significant in approximately 5% of single doses, more with repeated dosing); monitor serum phosphate if symptomatic or repeated.

### 3.10 Mental health legislation
- NSW: Mental Health Act 2007 (NSW). Schedule 1 forms allow involuntary admission. Community Treatment Orders (CTOs) made by the Mental Health Review Tribunal. Duration up to 12 months. "Mentally ill person" and "mentally disordered person" are statutory categories with different durations of detention.
- Vic: Mental Health and Wellbeing Act 2022 (Vic, commenced 1 September 2023, replacing the Mental Health Act 2014). Treatment Orders are Temporary (28 days) or Community / Inpatient Treatment Orders (up to 6 months adult, 3 months child). The Mental Health Tribunal reviews orders.
- Qld: Mental Health Act 2016 (Qld). Treatment Authorities.
- SA: Mental Health Act 2009 (SA). Inpatient Treatment Orders (Levels 1, 2, 3) and Community Treatment Orders.
- WA: Mental Health Act 2014 (WA).
- Tas: Mental Health Act 2013 (Tas).
- ACT: Mental Health Act 2015 (ACT).
- NT: Mental Health and Related Services Act 1998 (NT).

Common concepts:
- Voluntary versus involuntary status (the latter requires the criteria of mental illness, risk, and no less restrictive alternative, generally).
- Capacity to consent assessment (state-specific definitions; presumption of capacity in adults).
- ECT consent: independent psychiatric examination required for involuntary patients; tribunal authorisation.
- Restrictive interventions: seclusion and restraint, mandatory reporting in most jurisdictions.

---

## 4. Australian-specific epidemiology

### 4.1 Conditions over-represented in Australian practice
- Melanoma: highest incidence per capita globally (alongside New Zealand). Sun-exposed sites, fair skin. Two-week-rule for suspicious lesion biopsy; SCC and BCC are even more common but lower mortality. Indoor tanning banned across all states. Skin-cancer scenarios are a core AU stem genre.
- Q fever (Coxiella burnetii): occupational disease in abattoir workers, livestock farmers, shearers. Q-VAX vaccine recommended for at-risk workers; requires pre-vaccination skin test and serology.
- Ross River virus and Barmah Forest virus: mosquito-borne alphaviruses, prevalent in tropical and subtropical Australia. Polyarthritis with rash, lethargy.
- Murray Valley encephalitis: rare but reported in NT, Qld, WA, northern NSW.
- Japanese encephalitis: previously rare, now endemic in southeastern Australia after 2022 outbreak; vaccination program in at-risk groups.
- Dengue: imported and local in north Qld.
- Melioidosis (Burkholderia pseudomallei): NT and tropical north; wet-season pneumonia, abscess, septic shock; high mortality. Type 2 diabetes is the dominant risk factor.
- Leptospirosis: tropical north; abattoir workers, farmers.
- Strongyloides stercoralis: high prevalence in Aboriginal and Torres Strait Islander remote communities and migrants from endemic regions. Screen (and treat with ivermectin) before immunosuppression to avoid hyperinfection syndrome.
- Scabies and crusted scabies: high burden in remote NT communities; ivermectin oral, permethrin topical.
- Irukandji syndrome (Carukia barnesi): tropical jellyfish envenomation, north Qld and NT; severe pain, hypertension, pulmonary oedema. Treatment: hot-water immersion (vinegar for box jellyfish first if cnidocyst-bearing), opioids, magnesium.
- Box jellyfish (Chironex fleckeri): immediate cardiac arrest possible; vinegar to deactivate undischarged nematocysts, antivenom.
- Snakebite: brown snake, tiger snake, taipan, red-bellied black, death adder; pressure immobilisation bandage; venom detection kit (VDK) bedside but clinical decision drives polyvalent vs monovalent antivenom. CSL antivenoms.
- Spider bite: redback spider (latrodectism); funnel-web (Sydney funnel-web is the dangerous species; antivenom available). White-tailed spider: necrosis is a myth; reassure.
- Drowning: leading cause of unintentional death in young children in Australia; pool fencing legislation (varies by state).
- Bushfire smoke and heat-related illness.

### 4.2 Aboriginal and Torres Strait Islander health priorities
- Cardiovascular disease, type 2 diabetes (earlier onset, higher prevalence), chronic kidney disease.
- Acute rheumatic fever and rheumatic heart disease (see Section 3.8).
- Chronic suppurative otitis media (CSOM) in children.
- Trachoma (still present in remote communities).
- Hepatitis B chronic carriage (subgenotype C4 in NT).
- Mental health: suicide rate higher; "social and emotional wellbeing" framework is the AU culturally appropriate term, broader than "mental health".
- Lung disease: bronchiectasis (more prevalent), COPD.
- Cancer: lung, cervix, liver higher than non-Indigenous comparators.
- Maternal and child health: higher preterm birth, lower birthweight rates; closing.

### 4.3 Other demographics
- Migrant health: latent TB screening (IGRA or TST) for new arrivals; hepatitis B screening; vitamin D deficiency in covered or dark-skinned populations; female genital cutting affects some communities (legal protection, sensitive counselling).
- Rural / remote: distance-based access barriers; lower clinician density per capita; higher rates of preventable hospitalisations.

---

## 5. Australian clinical vocabulary

### Settings
- "Tertiary centre" or "tertiary referral hospital": a major teaching hospital, e.g. Royal Prince Alfred (NSW), The Alfred (Vic), Royal Melbourne, Royal Brisbane and Women's, Royal Adelaide, Royal Perth, Royal Darwin, Royal Hobart.
- "Quaternary services": cardiothoracic surgery, transplantation, very specialised paediatrics (Royal Children's Melbourne, Sydney Children's, Queensland Children's, Perth Children's, Adelaide Women's and Children's, Royal Darwin paediatrics is limited).
- "Regional hospital": secondary-level hospital outside the metropolitan areas (e.g. Tamworth Base, Bendigo Hospital).
- "Rural hospital" / "rural ED": small hospital often with a single doctor on site after hours.
- "Aboriginal Medical Service (AMS)": informal name for many ACCHS.
- "Transfer for": MCQ verb meaning to arrange retrieval / inter-hospital transfer for higher-level care.

### Specialty titles and training grades
- Intern: PGY1, conditional registration after graduation; mandatory in Australia for general registration.
- Resident Medical Officer (RMO) or Hospital Medical Officer (HMO): PGY2 and above, not yet on a specialty training program.
- Junior Medical Officer (JMO): umbrella term used in NSW especially for interns and RMOs collectively.
- Registrar: doctor on a specialty training program (typical: obstetric registrar, anaesthetic registrar, paediatric registrar, emergency registrar, psychiatry registrar, surgical registrar). Within obstetrics, "labour ward registrar" is on call for delivery suite.
- Senior Registrar / Fellow: post-Fellowship or near-Fellowship registrar.
- Consultant: equivalent to UK consultant or US attending. Holds the Fellowship of the relevant College (e.g. FRACP, FRANZCOG, FRACGP).
- VMO (Visiting Medical Officer): a consultant who attends a hospital under a sessional contract rather than employment.
- Staff Specialist: salaried hospital consultant.

### Drug brand vs generic (common AU usage)
- Paracetamol (Panadol). Not acetaminophen, not Tylenol.
- Salbutamol (Ventolin). Not albuterol.
- Adrenaline (EpiPen, Anapen). Not epinephrine in clinical AU vernacular, though biochemical use of "epinephrine" is acceptable.
- Frusemide / furosemide (Lasix).
- Glyceryl trinitrate (Anginine, GTN). Not nitroglycerin in routine prescribing language.
- Lignocaine (Xylocaine). Lidocaine is the INN now used; both common in Australian practice; "lignocaine" still appears on labels.
- Pethidine (Demerol elsewhere). Pethidine is the AU name.
- Frusemide / "Lasix" common ED parlance.
- Heparin: enoxaparin (Clexane) is the dominant LMWH in Australia, not tinzaparin (more UK) or dalteparin.
- Methoxyflurane (Penthrox, "the green whistle"): handheld inhaled analgesic, characteristic AU prehospital and rural ED use. Not available in the US.
- Tranexamic acid (Cyklokapron, generic).
- Insulin: brand names in widespread use: NovoRapid, Humalog (aspart, lispro); Lantus, Toujeo (glargine); Levemir (detemir); Tresiba (degludec); Actrapid, Humulin R (regular); Protaphane, Humulin NPH (NPH).

### Imaging modality availability by setting
- Tertiary: CT 24/7, MRI in hours and on call, nuclear medicine, interventional radiology, PET-CT.
- Regional: CT 24/7, MRI in hours, limited interventional.
- Rural / remote: plain film X-ray with telehealth-reported, point-of-care ultrasound, possibly portable CT or no CT at all; many remote sites rely on telemedicine review of imaging by metropolitan radiologists.

---

## 6. Things that BETRAY a non-Australian question

If any of the following appear in a generated MCQ, the question is broken and must be rewritten:

### 6.1 USMLE-style idioms
- "What is the next best step in management" is heavily US-flavoured. Acceptable AU rephrasings: "What is the most appropriate next step?", "What is the most appropriate management?", "What should you do next?". Use sparingly; vary stem closes.
- "Which of the following is the best initial test" is acceptable but feel free to localise to "What is the most appropriate initial investigation in this Australian setting?".
- "Pertinent positives" / "pertinent negatives" framing language: acceptable in clinical reasoning but feels American if overused in stems.
- "Differential ruled out by echo" or any back-of-house investigator commentary leaking into the stem: bug.

### 6.2 American-specific drug nomenclature
- Tylenol -> paracetamol.
- Advil / Motrin -> ibuprofen (Nurofen is the common AU brand).
- Acetaminophen -> paracetamol.
- Albuterol -> salbutamol.
- Epinephrine in clinical settings -> adrenaline.
- Lasix is acceptable both sides, but prefer "frusemide" or "furosemide" in the stem.
- "Lab" is acceptable but "laboratory" or "pathology" is more AU.
- "Pharmacy" is fine but "chemist" is colloquial AU; do not use "drugstore".
- "ER" -> "ED" (Emergency Department).
- "OR" -> "theatre" or "operating theatre".

### 6.3 American demographic descriptors
- "African-American" -> not used in AU. Demographic context matters far less in AU stems; if ethnicity is clinically relevant, state the country of origin or the relevant population descriptor: "a man of South Sudanese background", "a woman of Vietnamese background", "an Aboriginal man from a remote community in the Northern Territory".
- Avoid using race as a discriminator unless it carries genuine clinical signal (e.g. ARF risk, Asian-background GDM risk threshold, beta-thalassaemia screening in Mediterranean / South-East Asian background).
- Never use "Caucasian" as a default descriptor in stems; "white Australian" or no descriptor at all is preferable.

### 6.4 UK NHS-specific terminology
- "FY1" / "FY2" -> "intern" / "RMO" / "PGY1" / "PGY2".
- "SHO" -> "RMO" or "junior registrar".
- "ST3 registrar" -> just "registrar" or specify subspecialty.
- "Trust" -> "Local Health District" (NSW), "Health Service" (Vic), "Hospital and Health Service" (Qld), or simply "hospital".
- "NICE recommends" -> use the Australian equivalent body: RANZCOG, RACP, RACGP, RANZCP, eTG, NHMRC, RHDAustralia. Do not cite NICE in an AU rationale unless explicitly framing AU practice as concordant with NICE.
- "Bank holiday" -> "public holiday".
- "GUM clinic" -> "sexual health clinic".
- "A and E" -> "Emergency Department" or "ED".

### 6.5 Dosing units
- Anti-D in micrograms is a UK/US tell. AU uses IU (250 IU, 625 IU, 1500 IU).
- Insulin units are universal; no change.
- Glucose: mmol/L (AU/UK) vs mg/dL (US). AU stems use mmol/L. Always.
- Creatinine: micromol/L (AU/UK) vs mg/dL (US). AU stems use micromol/L.
- Haemoglobin: g/L in AU labs (e.g. 110 g/L), not g/dL. Some Royal College of Pathologists of Australasia (RCPA) reporting also shows g/dL historically; standard 2026 practice is g/L.
- Bilirubin: micromol/L.
- Calcium: mmol/L (corrected for albumin).
- Phosphate: mmol/L.
- Lactate: mmol/L.
- Cholesterol and triglycerides: mmol/L.
- Drug levels: usually micromol/L (for example digoxin nmol/L, paracetamol mg/L in AU toxicology nomograms specifically).

### 6.6 Pap smear vocabulary
The term "Pap smear" was retired from routine cervical screening on 1 December 2017 when the renewed NCSP commenced. Use "Cervical Screening Test (CST)" or "HPV test". A 2026 stem may reference an older patient who last had a Pap smear in 2015 to set the screening history, but the current test must be called the CST.

### 6.7 Other tells to grep before commit
- "obstetrician-gynecologist" with the American spelling -> "obstetrician and gynaecologist" (AU spelling).
- "Pediatrics" -> "paediatrics".
- "Anesthesia" -> "anaesthesia".
- "Hematology" -> "haematology".
- "Esophagus" -> "oesophagus".
- "Diarrhea" -> "diarrhoea".
- "Tumor" -> "tumour".
- "Fetal" is fine (both AU and US use fetal); "foetal" is older AU and now uncommon.
- "Sulfate" vs "sulphate": AU has shifted to "sulfate" in 2026 INN-aligned usage; both acceptable.
- "Aluminum" -> "aluminium".

### 6.8 Date and time conventions
- DD/MM/YYYY (e.g. 1 June 2026, 01/06/2026).
- 24-hour clock common in clinical handover; 12-hour with am/pm fine in stems.

---

## 7. Quick-reference table of Australian-specific cut-offs

### Vital signs and physiological thresholds
- Adult tachycardia (CEC Between the Flags MET trigger, varies): HR greater than 130 calls MET; HR less than 40 also.
- Adult bradycardia MET: HR less than 40.
- Adult hypotension MET: systolic less than 90.
- Adult tachypnoea MET: RR greater than 30 or less than 5.
- Adult hypoxia MET: SpO2 less than 90% on any oxygen.
- Adult altered conscious state: GCS drop greater than or equal to 2, or new altered conscious state.
- Adult oliguria MET: less than 50 mL/h over 4 hours (often).
- Paediatric Between the Flags chart: age-banded triggers.

### Cardiovascular (Australian Guideline for Assessing and Managing Cardiovascular Disease Risk, 2023)
- BP target: less than 140/90 for most adults with hypertension.
- BP target with CKD with albuminuria: less than 130/80.
- BP target post-stroke / TIA: less than 130/80.
- BP target with diabetes: less than 130/80 if tolerated.
- Diagnose hypertension at greater than or equal to 140/90 clinic, or greater than or equal to 135/85 home / ambulatory daytime average.
- LDL targets (Heart Foundation 2023):
  - Established cardiovascular disease (secondary prevention): LDL less than 1.8 mmol/L (with aim less than 1.4 in very high risk).
  - Primary prevention high risk: LDL less than 2.0 mmol/L.
  - Familial hypercholesterolaemia: LDL less than 2.5 mmol/L (and 1.8 if CVD).
- CVD risk calculation: cvdcheck.org.au algorithm gives 5-year risk. High risk threshold greater than or equal to 10% 5-year risk for treatment intensification.
- Lipid therapy: atorvastatin 40 to 80 mg or rosuvastatin 20 to 40 mg as standard high-intensity statins; ezetimibe and PCSK9 inhibitors (PBS criteria) for further reduction.

### Diabetes
- HbA1c target general adult: 7.0% (53 mmol/mol) or less.
- HbA1c target for short-duration diabetes, young, low hypoglycaemia risk: 6.5% (48 mmol/mol).
- HbA1c target older / hypoglycaemia-prone: 8.0% (64 mmol/mol).
- BP target in T2DM: less than 130/80 if tolerated.
- HbA1c diagnostic threshold for diabetes (non-pregnant): 6.5% (48 mmol/mol) or more.
- HbA1c 6.0 to 6.4% (42 to 47 mmol/mol): high risk; offer lifestyle and re-test in 12 months.
- Annual cycle of care: BP, weight, lipids, eGFR, urinary ACR, HbA1c, foot exam, eye exam (biennial fundus photography in most states), mental health screen.

### Anaemia and iron
- Adult haemoglobin lower limits: women 120 g/L, men 130 g/L (RCPA).
- Ferritin diagnostic for iron deficiency: less than 30 microgram/L (with caveats for chronic inflammation, where less than 100 may indicate iron deficiency).
- Transferrin saturation less than 20% suggests iron deficiency.
- Pregnancy: haemoglobin less than 110 g/L first trimester, less than 105 g/L second and third trimesters.

### Renal
- eGFR staging: G1 (90+), G2 (60-89), G3a (45-59), G3b (30-44), G4 (15-29), G5 (less than 15).
- Albuminuria categories (uACR mg/mmol): A1 less than 3, A2 3 to 30, A3 greater than 30.
- Refer to nephrology: eGFR less than 30, or rapid decline, or persistent A3 albuminuria, or unexplained haematuria with proteinuria.

### Sepsis (CEC Adult Sepsis Pathway / ANZICS)
- SIRS criteria + suspected source.
- qSOFA: SBP less than or equal to 100, RR greater than or equal to 22, altered mentation. Two or more = high risk.
- Antibiotics within 1 hour of recognition of septic shock; within 3 hours for sepsis without shock.
- Lactate greater than 2 mmol/L marks tissue hypoperfusion; greater than 4 marks septic shock.

### Obstetric thresholds
- Preterm labour: less than 37 weeks.
- Tocolysis: indicated for women between 24+0 and 34+0 weeks if delivery would prevent administration of antenatal corticosteroids; first-line nifedipine 20 mg PO loading then 10 to 20 mg every 6 to 8 hours.
- Antenatal corticosteroids: betamethasone 11.4 mg IM, two doses 24 hours apart, for anticipated preterm delivery between 24+0 and 34+6 weeks. Single rescue course considered if more than 14 days since first course and still less than 34+6.
- Magnesium sulfate neuroprotection: 4 g IV loading then 1 g/h, for anticipated delivery less than 30+0 weeks.
- Pre-eclampsia diagnostic: BP 140/90 or greater after 20 weeks plus one of proteinuria (PCR greater than 30 mg/mmol or dipstick 2+ confirmed), or other organ dysfunction (renal, liver, neuro, haem, uteroplacental).
- Severe features: SBP 160 or DBP 110 or more, oliguria, raised LFTs, low platelets, severe headache, visual disturbance, eclampsia, pulmonary oedema.
- Treatment: labetalol IV 20 mg then escalate, or oral nifedipine 20 mg, or hydralazine IV; magnesium sulfate for seizure prophylaxis at 4 g IV loading then 1 g/h.
- Postpartum haemorrhage: greater than 500 mL after vaginal delivery, greater than 1000 mL after caesarean (some local definitions). Manage with the "4 Ts": Tone, Trauma, Tissue, Thrombin. Oxytocin 10 IU IM at delivery for active management of third stage; treatment escalation includes ergometrine 250 microg IM, carboprost (Hemabate) 250 microg IM every 15 min, tranexamic acid 1 g IV.
- Antenatal anti-D dosing: see Section 3.4.
- GBS: see Section 3.2.

### Paediatric (RCH Melbourne CPG)
- Bronchiolitis: under 12 months, viral, no nebulised salbutamol, no antibiotics, no chest X-ray routinely. Admit if SpO2 less than 92%, feeding less than 50% normal, apnoea, comorbidity. High-flow nasal cannula for moderate to severe.
- Croup: dexamethasone oral 0.15 mg/kg single dose (range 0.15 to 0.6 mg/kg). Nebulised adrenaline for severe.
- Febrile child under 3 months: full septic workup including LP if fever 38 degrees or more.
- Neonatal jaundice: phototherapy chart, exchange transfusion threshold, follow RCH or local NETS chart by gestational age and hours of life.
- Asthma severity (Australian Asthma Handbook): mild, moderate, severe, critical (life-threatening). Salbutamol via spacer (puffer) preferred over nebuliser for mild-moderate.
- Anaphylaxis: adrenaline 0.01 mg/kg (max 0.5 mg) of 1:1000 IM in the mid-outer thigh (vastus lateralis). ASCIA action plan colours.
- Paediatric maintenance fluids: 4-2-1 rule, isotonic fluid (0.9% saline with or without dextrose, never hypotonic for routine maintenance in Australia since 2014 NSW Health PD).
- DKA paediatric: replace deficit over 48 hours, avoid bolus unless shocked, insulin 0.05 to 0.1 units/kg/h, monitor for cerebral oedema.

### Psychiatry
- First-episode psychosis: refer to local Early Psychosis Prevention and Intervention Centre (EPPIC) where available (e.g. Orygen in Vic).
- Suicide risk assessment: Australian frameworks emphasise narrative and engagement over checklist scoring; the SAFE-T and Columbia scales are used but not mandated.
- Clozapine prescribing: requires registration with the Clozapine Patient Monitoring System; weekly FBE for 18 weeks then monthly; neutrophil thresholds for cease (less than 1.5 x 10^9/L = stop and review; less than 1.0 = withhold; less than 0.5 = cease and admit). Cardiac monitoring (troponin, CRP, echo at baseline; weekly for first 4 weeks).
- Lithium therapeutic range: 0.4 to 1.0 mmol/L maintenance, draw 12 hours post-dose.
- Eating disorders: refer to specialist service (Butterfly Foundation national line, state-funded eating disorder services). Admit if BMI less than 14 or 15, electrolyte derangement, bradycardia less than 40, postural drop greater than 20 mmHg, suicidality, refeeding risk.

### Toxicology (Toxicology and Wilderness eTG, AU-specific nomograms)
- Paracetamol overdose: Australian paracetamol nomogram is a single 150 mg/L at 4 hours treatment line (the "150 line"); no UK-style 100 line. N-acetylcysteine 20-hour protocol (Prescott / 3-bag).
- Salicylate, tricyclic, beta-blocker, calcium-channel blocker overdose protocols all in eTG Toxicology.

---

## 8. Practical generator hints

When the generator drafts an MCQ, before committing it should mentally check:
1. Could this stem read as written in Sydney? If a setting needs to be named, name an Australian one (regional hospital, tertiary centre, ED in regional Victoria, rural NT clinic).
2. Are all drug names Australian generic plus optional Australian brand?
3. Are units mmol/L, micromol/L, g/L, IU?
4. Are guideline citations in the rationale Australian (RANZCOG, eTG, RACGP, RANZCP, RCH, NCSP, NBA, RHDAustralia, ATAGI/AIH) and not NICE / NHS / ACOG / CDC / USPSTF unless explicitly comparing?
5. If the question involves cancer screening, vaccination, or chronic disease management plan, does it reference the correct AU program by name?
6. If the question involves an Aboriginal or Torres Strait Islander patient, is the term written in full (never "ATSI"), and does the clinical content reflect priority conditions (ARF/RHD, CKD, T2DM, otitis media) rather than tokenism?
7. If the question involves a regional or remote setting, does the management pathway include retrieval, telehealth, or limited-investigation realities?

### Generator-side citation format (in rationale "In context" block)
End each rationale with a citation list like:
- Source: RANZCOG C-Gyn 38 (Miscarriage, Recurrent Miscarriage and Ectopic Pregnancy, April 2025).
- Source: Therapeutic Guidelines (eTG), Antibiotic, accessed 2026.
- Source: Royal Children's Hospital Melbourne Clinical Practice Guideline, Bronchiolitis, 2024 review.
- Source: Australian Immunisation Handbook (ATAGI), accessed 2026.
- Source: NBA Guideline for the prophylactic use of Rh D immunoglobulin in pregnancy care, 2024.
- Source: National Cervical Screening Program Clinical Guidelines, April 2025 update.
- Source: ADIPS 2025 Consensus on Gestational Diabetes (MJA 2025).
- Source: RHDAustralia 2020 Guideline for the prevention, diagnosis and management of acute rheumatic fever and rheumatic heart disease (updated 2024).
- Source: Australian Asthma Handbook (National Asthma Council Australia), accessed 2026.
- Source: Australian Guideline for Assessing and Managing Cardiovascular Disease Risk (2023).

---

## 9. Quick lookup index

- Anti-D dose first trimester: 250 IU IM.
- Anti-D dose after first trimester / antenatal routine / postpartum: 625 IU IM.
- Antenatal anti-D schedule: 28 and 34 weeks.
- Cervical screening: HPV CST 5-yearly, age 25 to 74, self-collection available.
- Gestational diabetes screen: 75 g 2-hour POGTT at 24 to 28 weeks; FPG 5.1, 1h 10.0 (or 10.6 ADIPS 2025), 2h 8.5 (or 9.0 ADIPS 2025).
- Ectopic methotrexate threshold: beta-hCG less than 5000 IU/L (RANZCOG).
- Bowel screening: FIT 2-yearly, age 45 to 74.
- Breast screening: 2-yearly mammography, actively invited 50 to 74.
- Influenza vaccination in pregnancy: any trimester.
- Pertussis (dTpa) vaccination in pregnancy: 20 to 32 weeks each pregnancy.
- RSV maternal vaccination: 28 to 36 weeks each pregnancy.
- HPV adolescent vaccine: single dose 9vHPV, Year 7 to 8.
- Bowel cancer screening (NBCSP): biennial FIT 45 to 74.
- Mental Health Treatment Plan: GP item 2715 (20 to 40 minutes, MHST-trained) or 2717 (more than 40 minutes); up to 10 rebated psychology sessions per calendar year.
- ARF secondary prophylaxis: benzathine benzylpenicillin G 1.2 million units IM every 21 to 28 days.
- Paracetamol nomogram (AU): 150 mg/L at 4 hours treatment line.
- BPG dose for syphilis (primary, secondary, early latent): 1.8 g IM single dose.
- Atrial fibrillation rate-control first line: bisoprolol or metoprolol (or diltiazem if no HFrEF).
- AF stroke prevention: CHA2DS2-VASc 1 (men) or 2 (women) or higher: anticoagulate with apixaban, rivaroxaban, dabigatran (PBS-listed DOACs), unless mechanical valve or moderate-to-severe mitral stenosis -> warfarin.
- COPD inhaled escalation (Australian COPD-X guidelines): SABA / SAMA -> LAMA -> LAMA + LABA -> triple therapy (LAMA + LABA + ICS) if eosinophils or exacerbations.
- Asthma stepwise (AAH): SABA reliever, then ICS, then ICS-LABA, etc; AIR (anti-inflammatory reliever) ICS-formoterol now first-line in adolescents and adults per 2024 AAH update.
- Type 2 diabetes pharmacology first line: metformin; second line SGLT2 inhibitor or GLP-1 receptor agonist depending on CVD / CKD / weight context (per Australian Diabetes Society / RACGP 2024).
- Drug schedules: S4 prescription, S8 controlled.

---

## 10. Appendix: list of items the generator should NOT pluralise

Singular-only phrases when used in AU clinical communication:
- "obstetrics and gynaecology" (not "OB-GYN" - too American).
- "general practice" (not "family medicine" - that is US/Canada).
- "emergency medicine" (the discipline) and "Emergency Department" (the place); not "Casualty" or "ER".

End of reference. Generator: pull from this file at every batch; flag any stem failing the Section 6 betrayal checks; cite from Section 2 in every rationale.
