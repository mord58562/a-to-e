# Australian Medical System Reference, Part 2

Generated 2026-06-01 as a continuation of `au_medical_system.md`. This file fills gaps left by part 1 and is intentionally non-overlapping. Where part 1 already covers a topic at adequate depth, this file does not repeat it; where part 1 mentions a topic in passing, this file expands it.

Style rules carried forward: no em-dashes (codepoint U+2014); no emojis; "Aboriginal and Torres Strait Islander" written in full, never abbreviated; Australian spellings; the candidate is always the doctor.

---

## Gaps identified in part 1

- Notifiable diseases, public-health reporting flow, who to call.
- AHPRA, mandatory reporting (impaired practitioner, child protection by state), Working with Children Checks.
- Coroner referral criteria, reportable deaths, death certification.
- Advance care planning, substitute decision-making, end-of-life law by state.
- Aged care system, RACF, ACAT/ACAS assessment, RAD/DAP, MyAgedCare.
- DVA, NDIS, Centrelink medical certificates, workers' compensation and motor-accident schemes by state.
- Opioid stewardship and opioid agonist treatment (methadone, buprenorphine) access pathway.
- Section 100 (s100) prescribing: HIV antiretrovirals, hepatitis B antivirals, hepatitis C direct-acting antivirals, growth hormone, IVF drugs, clozapine, dialysis-related items.
- Highly specialised drugs program and Life Saving Drugs Program (LSDP).
- ADHD prescribing rules by state and the s8 / authority pathway.
- Smoking cessation PBS pathway and dosing of varenicline / NRT / bupropion.
- HMR / RMMR / DAA: medication management review framework.
- Insulin pump, continuous glucose monitor (CGM), and Flash GM access (NDSS).
- Travel medicine, yellow fever vaccination centres, malaria prophylaxis decision algorithm.
- Aboriginal and Torres Strait Islander health communication and cultural protocols beyond what part 1 listed; Closing the Gap targets; specific helplines (13YARN).
- Helplines and crisis lines the generator should reach for over American equivalents.
- Antimicrobial stewardship: eTG empirical regimens that commonly appear in MCQs.
- Common Australian renal replacement and transplant context, donation pathway.
- Death and dying paperwork: cremation certificate, life-extinct, viewing arrangements.
- Sexual assault, forensic, and domestic-violence reporting by state.
- Common Australian-specific reference intervals not in part 1 (troponin assays, BNP, CRP, eGFR formula, AU lipid units).
- Imaging request etiquette: who can order MRI under Medicare; common item-number traps.
- Additional AU-specific snakebite / spider / marine / centipede / tick management granularity.
- Communication and consent quirks: interpreter access (TIS National 131 450), Auslan, telehealth-after-hours rebates.
- Updated 2026 PBS thresholds and Medicare fee schedule indexation values.

---

## 11. Notifiable diseases and public-health reporting

Each state and territory has its own public health act with a slightly different notifiable disease list, but the National Notifiable Diseases Surveillance System (NNDSS) aggregates the core list. The generator should never write "call CDC" or "report to PHE"; the AU answer is "notify the local public health unit (PHU) of the relevant state or territory health department" or "submit a notification through the relevant jurisdiction's online portal".

State public health portals and core phone routes:
- NSW: Public Health Unit (PHU) covering each LHD; 1300 066 055 connects to the local PHU 24 hours.
- Vic: Department of Health, Communicable Disease Section; notifications via Public Health Event Surveillance System (PHESS); urgent calls 1300 651 160.
- Qld: Queensland Health Communicable Disease Branch; notifications via NoCS (Notifiable Conditions System); urgent calls via local HHS PHU.
- WA: WA Health Communicable Disease Control Directorate (CDCD); WANIDD (notifications). Urgent 08 9222 8588.
- SA: SA Health Communicable Disease Control Branch (CDCB); urgent 1300 232 272.
- Tas: Department of Health Communicable Diseases Prevention Unit (CDPU); 1800 671 738.
- ACT: ACT Health Communicable Disease Control; 02 5124 9213.
- NT: Centre for Disease Control (CDC), Royal Darwin and Alice Springs; 08 8922 8044 (Top End) and 08 8951 7540 (Central Australia).

Urgent (telephone immediately, do not wait for written notification): measles, meningococcal disease, diphtheria, viral haemorrhagic fevers, polio, plague, rabies, Hendra, anthrax, botulism, smallpox, SARS, MERS, novel influenza, cholera, paratyphoid, typhoid, foodborne outbreak suspected. Also: tuberculosis (clinical suspicion).

Written within 5 working days (typical, varies by state): hepatitis A acute, hepatitis B acute, hepatitis C, HIV, chlamydia, gonorrhoea, syphilis, pertussis, Q fever, leptospirosis, brucellosis, salmonella, shigella, rotavirus, listeriosis, Legionella, malaria, dengue, Ross River, Barmah Forest, Murray Valley encephalitis, Japanese encephalitis, hydatid disease, leprosy, melioidosis, varicella, mumps, rubella, congenital rubella syndrome, invasive pneumococcal, Hib invasive.

MCQ pearl: if the stem features a child with suspected meningococcal disease in a regional setting, the steps are (1) give parenteral antibiotic now (ceftriaxone 50 mg/kg IV or IM up to 2 g), (2) call retrieval, (3) phone PHU on the urgent number for contact tracing of household and "kissing" contacts. Do not delay antibiotic for LP. The PHU, not the doctor, organises ciprofloxacin / rifampicin chemoprophylaxis for contacts.

---

## 12. AHPRA, registration, and mandatory reporting

The Australian Health Practitioner Regulation Agency (AHPRA) administers the National Registration and Accreditation Scheme for 16 health professions. Medical Board of Australia (MBA) sets standards for doctors. Notifications to AHPRA can be voluntary or mandatory.

Mandatory notification thresholds for a doctor about another health practitioner (Health Practitioner Regulation National Law, s.140):
- Practised while intoxicated by alcohol or drugs.
- Engaged in sexual misconduct in connection with the profession.
- Placed the public at risk of substantial harm because of an impairment.
- Placed the public at risk of harm because of a significant departure from accepted professional standards.

The 2020 amendments (commenced 1 March 2020) raised the threshold so a treating practitioner notifying about their patient (who happens to be another practitioner) must reasonably believe the conduct creates a "substantial risk of harm" before mandatory notification is required. The intent was to encourage practitioners to seek help.

Doctors must also self-report:
- A criminal charge punishable by 12 months' imprisonment or more, or a conviction.
- Loss of professional indemnity insurance.
- Refusal, cancellation, or conditions on registration in another jurisdiction.

Working with Children Check is a state-administered separate check (NSW WWCC, Vic WWCC, Qld Blue Card, WA WWCC, SA Working with Children Check, Tas Registration to Work with Vulnerable People, ACT WWVPC, NT Ochre Card). Required for any role involving children, including paediatric clinical work in many positions.

Mandatory reporting of suspected child abuse (varies by state, generic position):
- NSW: Children and Young Persons (Care and Protection) Act 1998; threshold "risk of significant harm" (ROSH); report to Department of Communities and Justice, eReporting or 132 111.
- Vic: Children, Youth and Families Act 2005; report to Child Protection (DFFH), 13 12 78 (after hours).
- Qld: Child Protection Act 1999; report to Department of Child Safety, Seniors and Disability Services.
- WA: Children and Community Services Act 2004; report to Department of Communities (Child Protection).
- SA: Children and Young People (Safety) Act 2017; report to Child Abuse Report Line 13 14 78.
- Tas: Children, Young Persons and Their Families Act 1997; Strong Families Safe Kids 1800 000 123.
- ACT: Children and Young People Act 2008; Child and Youth Protection Services 1300 556 729.
- NT: Care and Protection of Children Act 2007; Child Abuse Hotline 1800 700 250.

Doctors are mandatory reporters in every jurisdiction. The threshold is reasonable belief of abuse or neglect; the doctor is protected from civil and criminal liability when reporting in good faith.

---

## 13. Coroner referral and death certification

Reportable deaths to the Coroner (Coroners Acts vary slightly by state; common categories):
- Unexpected, unnatural, or violent death.
- Death within 24 hours of an anaesthetic, surgery, or invasive medical procedure.
- Death within 24 hours of admission, presentation to ED, or transfer from another facility (jurisdiction-dependent).
- Death of a person in custody or care (police custody, prison, mental-health detention, child in out-of-home care, NDIS-funded supported accommodation in many states).
- Death where the cause is unknown.
- Death where the deceased was not seen by a doctor in the relevant pre-death window (commonly 3 months in NSW and Vic, varies).
- Death of a person whose identity is unknown.
- Death from a notifiable industrial disease.

If the death is reportable, the doctor must NOT complete the Medical Cause of Death Certificate (MCCDC). The doctor instead notifies the Coroner (via police or the Coroners Court) and completes a "life extinct" form only.

For non-reportable deaths:
- Medical Certificate of Cause of Death (MCCDC) completed by the attending doctor.
- Cremation certificate (separate form) requires a doctor to have viewed the body after death and may require a second independent doctor in some states (NSW, Qld, WA, SA).
- No-pacemaker / no-radioactive-implant attestation required for cremation.

Life extinct verification can be performed by a registered nurse or other authorised practitioner in most jurisdictions; certification of cause of death must be a doctor.

---

## 14. Advance care planning, substitute decision-making, voluntary assisted dying

Substitute decision-makers (hierarchy applies in absence of an appointed enduring guardian / medical treatment decision-maker):
- NSW: Person Responsible hierarchy under Guardianship Act 1987; order is appointed guardian, spouse / de facto, unpaid carer, close friend or relative.
- Vic: Medical Treatment Planning and Decisions Act 2016; appointed Medical Treatment Decision Maker (MTDM); if none, the first willing and available person from the statutory hierarchy.
- Qld: Powers of Attorney Act 1998 (EPOA for personal/health) and Guardianship and Administration Act 2000; Statutory Health Attorney (SHA) hierarchy if no EPOA.
- SA: Advance Care Directives Act 2013; Substitute Decision Maker appointed under an ACD.
- WA: Guardianship and Administration Act 1990; Enduring Power of Guardianship.
- Tas: Guardianship and Administration Act 1995.
- ACT: Powers of Attorney Act 2006; Medical Treatment (Health Directions) Act 2006.
- NT: Advance Personal Planning Act 2013.

Advance Care Directive (ACD) is the generic AU term; each state has a specific statutory form (Statutory ACD in SA, Advance Care Directive in Vic, etc.). A common-law ACD can also be valid where statute does not exclude it.

Voluntary Assisted Dying (VAD) commencement and eligibility table (current 2026):
- Vic: from 19 June 2019; 12 months residency; expected death within 6 months (12 months neurodegenerative); two doctors must be Australian registered, one a specialist, both VAD-trained.
- WA: from 1 July 2021; very similar; allows nurse practitioner involvement for some steps.
- Tas: from 23 October 2022.
- SA: from 31 January 2023.
- Qld: from 1 January 2023; expected death within 12 months (single timeframe; no neurodegenerative carve-out needed).
- NSW: from 28 November 2023.
- ACT: commenced 3 November 2025; notable for no minimum prognosis timeframe, instead "advanced, progressive condition expected to cause death" without a fixed window.
- NT: legislation under development as of mid-2026.

MCQ pearl: a doctor must not initiate the VAD discussion in some states (Vic, SA, formerly), although the Vic Act was amended to allow doctors to initiate discussion provided they also inform the patient of available palliative care options; the patient must always be the one to request VAD. The doctor may decline to participate on conscience grounds but must inform the patient of how to access another practitioner.

---

## 15. Aged care, RACF, and home-based care

Aged Care Quality and Safety Commission regulates residential and home aged care.
- ACAT / ACAS assessment: Aged Care Assessment Team (NSW, Vic abbreviation ACAS); determines eligibility for Home Care Packages (HCP levels 1 to 4), Residential Aged Care (low, high), Transition Care Programme, respite.
- My Aged Care: 1800 200 422 gateway and online portal; entry point.
- Refundable Accommodation Deposit (RAD) vs Daily Accommodation Payment (DAP): the lump sum and daily-equivalent options for residential aged care accommodation cost.
- Means-tested fee on top of basic daily fee; assessed by Services Australia.
- Commonwealth Home Support Programme (CHSP): short-term and entry-level home services for over-65s (over-50s for Aboriginal and Torres Strait Islander people).
- New Aged Care Act commenced 1 November 2026, replacing the Aged Care Act 1997. Introduces "Support at Home" program merging HCP and CHSP. MCQ stems set after Nov 2026 should refer to "Support at Home" rather than "Home Care Packages".

RACF medical care:
- GP cycle-of-care visits attract specific MBS items (90020, 90035, 90043 etc; updated 2024 with telehealth aged-care items).
- After-hours and weekend visits attract loading.
- Medication charts must be the National Residential Medication Chart (NRMC) under the PBS arrangements that allow nurse-administered PBS dispensing without separate scripts.

ATSI elders: 50 years and over qualify for aged care services (rather than the general 65), reflecting earlier onset of frailty conditions.

---

## 16. DVA, NDIS, Centrelink, workers compensation, motor accident schemes

The generator must know that funding stream determines clinical pathways and prescribing.

DVA (Department of Veterans' Affairs):
- Gold card: covers all clinically necessary care for the cardholder (typically war widow/er, totally and permanently incapacitated veteran).
- White card: covers treatment for specific accepted conditions.
- DVA prescribers use a separate prescription pad / electronic flag; certain non-PBS items may be available via DVA Repatriation Pharmaceutical Benefits Scheme (RPBS).

NDIS (National Disability Insurance Scheme):
- Permanent and significant disability under 65 at first access.
- Plans funded for "reasonable and necessary supports". Does not fund mainstream healthcare (that remains Medicare). NDIS may fund therapy assistants, AT (assistive technology), home modifications, support coordination.
- NDIS commencements after the Independent Assessments controversy (2021) reverted to provider reports; the new framework from 2024-25 introduced foundational supports and tightened access.
- For paediatric stems: ECEI (Early Childhood Early Intervention) pathway for under-7s.

Centrelink medical certificate:
- Doctor completes a "Centrelink Medical Certificate" (online, MyGov-linked) for income support recipients with capacity changes; the form documents diagnosis, work capacity, expected duration.
- For Disability Support Pension (DSP): doctor completes the "Treating Doctor's Report" and Job Capacity Assessment refers to it.

Workers Compensation (state-based, varies):
- NSW: icare workers insurance (formerly WorkCover NSW); claim via injured worker's employer; "Certificate of Capacity" is the dedicated AU form completed by the treating doctor every 28 days.
- Vic: WorkSafe Victoria; "Certificate of Capacity".
- Qld: WorkCover Queensland; "Work Capacity Certificate".
- WA: WorkCover WA; "First Certificate of Capacity" then progress certificates.
- SA: ReturnToWorkSA; "Work Capacity Certificate".
- Tas: WorkCover Tasmania.
- ACT: ACT Insurance Authority and private insurers.
- NT: NT WorkSafe.

Motor accident / CTP schemes:
- NSW: SIRA (State Insurance Regulatory Authority) administers CTP (green slip); also covers Lifetime Care and Support Authority for catastrophic injury.
- Vic: TAC (Transport Accident Commission), no-fault scheme.
- Qld: MAIC (Motor Accident Insurance Commission).
- WA: Insurance Commission of WA.
- SA: CTP via approved insurers, regulated by CTPRegulator.
- Tas: MAIB (Motor Accidents Insurance Board), no-fault.
- NT: TIO (Territory Insurance Office) and MACA.

MCQ pearl: if a stem involves a work-related injury, the AU answer pattern includes lodging a workers comp claim, completing the relevant Certificate of Capacity, and informing the employer; do not write "fill out a SOAP note for HR" or "submit a 1500 form" (US Medicare term).

---

## 17. PBS s100, Highly Specialised Drugs, and Life Saving Drugs Program

Section 100 (s100) of the National Health Act 1953 permits special supply arrangements outside ordinary PBS pharmacy distribution. Common s100 programs:

- Highly Specialised Drugs (HSD) Program: medicines that must be supplied through public hospitals or accredited private specialists. Common MCQ items:
  - HIV antiretrovirals (raltegravir, dolutegravir, bictegravir / emtricitabine / tenofovir alafenamide as Biktarvy, etc).
  - Hepatitis B antivirals (entecavir, tenofovir disoproxil, tenofovir alafenamide).
  - Hepatitis C direct-acting antivirals (glecaprevir / pibrentasvir as Maviret; sofosbuvir / velpatasvir as Epclusa). Note that since March 2016 any GP can prescribe DAAs under PBS s100 GP Authority for HCV, expanding access dramatically.
  - Clozapine (HSD).
  - Growth hormone for paediatric and adult indications.
  - Eculizumab and ravulizumab for atypical haemolytic uraemic syndrome and paroxysmal nocturnal haemoglobinuria.
  - Pulmonary hypertension agents (bosentan, macitentan, sildenafil, tadalafil for PAH, riociguat).
  - Cystic fibrosis modulators (ivacaftor, lumacaftor-ivacaftor, elexacaftor-tezacaftor-ivacaftor as Trikafta).
  - Some immunosuppressants for transplant.

- HIV PrEP (tenofovir disoproxil / emtricitabine): PBS-listed since 1 April 2018 as a general item; accessible from GPs after a sexual health risk assessment. Specific eligibility includes HIV-negative status confirmed within 7 days, baseline renal function, hepatitis B serology, STI screen at baseline and quarterly.

- Hepatitis C management cascade in primary care: confirmed HCV RNA positive plus any of the genotypes (treatments are now pangenotypic); 8 or 12 weeks of Maviret or Epclusa; SVR12 testing at 12 weeks post-treatment; fibroscan or APRI for cirrhosis staging.

- Life Saving Drugs Program (LSDP): funds expensive medicines for rare conditions not viable under PBS cost-effectiveness rules; includes enzyme replacement therapies for Gaucher, Fabry, Pompe, MPS I/II/VI, plus eculizumab for some indications, and idursulfase. LSDP requires application to Services Australia.

- Botulinum toxin (Botox, Dysport): PBS-listed for specific neurological and urological indications (spasticity post-stroke, cervical dystonia, blepharospasm, hemifacial spasm, chronic migraine, neurogenic detrusor overactivity, idiopathic overactive bladder); Authority Required Streamlined.

- Biologics for inflammatory disease: PBS Authority Required, with mandatory disease activity criteria (e.g. DAS28 greater than 5.1 for severe rheumatoid arthritis, or PASI greater than 15 for psoriasis), failure of conventional DMARDs, and prescriber must be a specialist in the field (e.g. rheumatologist, gastroenterologist, dermatologist).

---

## 18. ADHD prescribing by state

Stimulants (methylphenidate, dexamfetamine, lisdexamfetamine) are Schedule 8 and additionally regulated by each state's drugs and poisons authority.

- NSW: NSW Stimulant Prescribing Authority required for any new initiation. Specialist (psychiatrist, paediatrician, neurologist) holds the authority; GPs may co-prescribe under an approved Shared Care plan.
- Vic: paediatrician or psychiatrist must initiate; ongoing prescribing by trained GP allowed. Drugs and Poisons Regulation: SafeScript mandatory check.
- Qld: Initiation by specialist (psychiatrist, paediatrician, neurologist); GP can continue under an approved Drug Treatment Authority. As of late 2024 Queensland Health is piloting GP-initiated ADHD prescribing for adults under defined training and audit conditions.
- SA: Drugs of Dependence Unit (DDU) authority required before initiation; specialist-led.
- WA: Stimulant Regulatory Scheme; specialist-led.
- Tas: specialist-led; DAPIS / DORA check.
- ACT: specialist-led; Canberra Script check.
- NT: specialist-led.

The MCQ pearl: a stem framing a GP initiating dexamfetamine alone is incorrect in every Australian jurisdiction in 2026; the correct answer involves referral to a paediatrician (child) or psychiatrist (adult) for diagnostic confirmation and initiation, with the GP continuing under shared-care arrangements.

---

## 19. Smoking cessation, opioid agonist treatment, and addiction medicine

Smoking cessation pharmacotherapy (PBS):
- Nicotine replacement therapy: patches PBS-listed for one course per 12 months for Aboriginal and Torres Strait Islander people and for those who attended a smoking cessation service; gum, lozenge, inhalator, mouth spray available over the counter.
- Varenicline (Champix): PBS-listed, two scripts per 12 months; titrate 0.5 mg daily for 3 days, 0.5 mg twice daily for 4 days, then 1 mg twice daily for 11 weeks. Australian supply was disrupted 2021-2023 and is now restored. Mental health monitoring during course.
- Bupropion (Zyban): PBS-listed, 150 mg daily for 3 days then 150 mg twice daily for 7-9 weeks. Lowers seizure threshold; contraindicated in seizure disorder, eating disorders.
- Nortriptyline: not PBS-listed for smoking cessation but used off-label in some clinics.
- Cytisine: not PBS-listed; emerging evidence.

Opioid agonist treatment (OAT) for opioid use disorder:
- Methadone: liquid (syrup) dispensed daily at an accredited pharmacy, takeaways earned by stability.
- Buprenorphine sublingual (Suboxone, Subutex): daily or alternate-day dosing; combined with naloxone (Suboxone) to deter injection.
- Long-acting injectable buprenorphine (Sublocade, Buvidal): weekly or monthly subcutaneous; expanding rapidly through 2020s; PBS-listed.
- Prescriber must be authorised under state regulations:
  - NSW: NSW Health Pharmaceutical Services Branch authority.
  - Vic: DH Drugs and Poisons Regulation Unit authority; mandatory completion of OAT training.
  - Qld: Queensland Opioid Treatment Program (QOTP).
  - WA: WA Health Medicines and Poisons Regulation Branch.
  - SA: Drugs of Dependence Unit authority.
  - Tas, NT, ACT: similar state-based authorities.
- Take-home naloxone: nationally funded since July 2022; supplied free without prescription through pharmacies enrolled in the Take Home Naloxone Program. Intranasal (Nyxoid) and intramuscular formulations.

---

## 20. HMR, RMMR, DAA, and pharmacy-medical interface

- Home Medicines Review (HMR, MBS 900): GP-initiated, conducted by an accredited consultant pharmacist in the patient's home, then the pharmacist reports back to the GP; GP develops a medication management plan.
- Residential Medication Management Review (RMMR, MBS 903): equivalent for RACF residents; pharmacist visits and reports.
- MedsCheck and Diabetes MedsCheck: pharmacist-conducted in-pharmacy reviews, government-funded.
- Dose Administration Aid (DAA, Webster-pak, blister pack): commonly arranged for elderly polypharmacy patients; not Medicare-funded directly but often subsidised through aged-care or community arrangements.
- 60-day dispensing reform (commenced September 2023): selected stable chronic medicines (originally tranche of 92 medicines including some antihypertensives, statins, oral diabetes agents) can be dispensed as 2 months' supply per script, halving co-payments for eligible patients. Expanded in subsequent tranches through 2024.

---

## 21. Insulin pump, CGM, and NDSS

The National Diabetes Services Scheme (NDSS) is the Australian Government program providing subsidised diabetes consumables. Registration is free; products are subsidised through community pharmacies.
- Type 1 diabetes registrants under 21 and women with T1DM planning pregnancy or pregnant qualify for fully subsidised CGM (Dexcom G6/G7, Libre 2/3) since 1 March 2022; expanded in subsequent rounds.
- All T1DM adults qualify for subsidised CGM since 1 July 2022 (varied product availability).
- Insulin pump consumables subsidised through NDSS; pump devices typically funded through private health insurance (Hospital cover Gold or equivalent tier).
- Type 2 diabetes patients access subsidised blood glucose strips on a 6-monthly access cycle if on insulin or sulfonylurea.

---

## 22. Travel medicine and vaccination

Yellow fever vaccination centres: only AHPRA-accredited Yellow Fever Vaccination Centres can administer YF vaccine and issue the International Certificate of Vaccination or Prophylaxis (ICVP).
- Yellow fever required for entry to certain African and South American destinations.
- Single dose now considered lifelong protection (WHO 2016).

Malaria prophylaxis decision (eTG and the smartraveller.gov.au country list):
- Atovaquone-proguanil (Malarone): start 1-2 days before, daily during, 7 days after.
- Doxycycline 100 mg daily: start 2 days before, daily during, 4 weeks after; cheap; photosensitivity, oesophagitis.
- Mefloquine: weekly; neuropsychiatric adverse effects; avoid in epilepsy, depression, anxiety.
- Primaquine: terminal prophylaxis for vivax; G6PD test required before.
- Tafenoquine: G6PD test required.

Common travel vaccines (NIP excludes most): hepatitis A, typhoid (oral or injected Vi polysaccharide), Japanese encephalitis, rabies (pre-exposure 3-dose), cholera (Dukoral), tick-borne encephalitis (limited AU supply), meningococcal ACWY for Hajj.

---

## 23. Aboriginal and Torres Strait Islander health, expanded

This section deepens part 1 Section 1.8 and 4.2. The generator must treat Aboriginal and Torres Strait Islander health as a clinical literacy area, not a sociology backdrop.

Closing the Gap (refreshed 2020 National Agreement) targets relevant to MCQs:
- Close the life expectancy gap by 2031 (current gap approximately 8.6 years for men, 7.8 years for women, 2023 AIHW).
- Healthy birthweight: 91% of babies born to Aboriginal and Torres Strait Islander mothers at healthy birthweight by 2031.
- Early childhood education and developmental milestones targets.
- Reduce suicide rates of Aboriginal and Torres Strait Islander people towards zero.
- Reduce overrepresentation in out-of-home care and adult incarceration.

Specific clinical priorities:
- Acute rheumatic fever and rheumatic heart disease: highest documented rates globally in remote NT communities; secondary prophylaxis adherence is the single largest preventive lever (see part 1 Section 3.8).
- Otitis media: chronic suppurative otitis media (CSOM) prevalence over 10% in some remote communities; "tympanic perforation" is more common, and lower thresholds for ENT referral, hearing screening (DEADLY EARS in Qld is a relevant program), and grommets apply.
- Trachoma: Australia remains the only high-income country with endemic trachoma in remote Aboriginal communities (NT, WA, SA). SAFE strategy: surgery, antibiotics (azithromycin), facial cleanliness, environmental improvement.
- Chronic kidney disease: dialysis prevalence high; remote-to-urban relocation for dialysis is a major social issue; "return to country" pathways and Purple House / Western Desert Nganampa Walytja Palyantjaku Tjutaku (WDNWPT) provide remote dialysis.
- Hepatitis B chronic carriage: subgenotype C4 in NT may respond differently; lifelong screening of carriers for HCC with 6-monthly ultrasound and AFP.
- Diabetes: onset 10-15 years earlier than non-Indigenous Australian average; aggressive primary prevention starts at 18 in many guidelines.
- Cardiovascular risk: AU CVD risk calculator starts assessment at age 30 for Aboriginal and Torres Strait Islander people.
- Suicide and self-harm: rate 2 to 3 times the non-Indigenous rate; 13YARN (13 92 76) is the dedicated Aboriginal and Torres Strait Islander crisis line.
- Eye health: diabetic retinopathy screening uptake; retinal cameras in remote ACCHS.
- Cancer screening: NCSP, BreastScreen, NBCSP all have lower uptake among Aboriginal and Torres Strait Islander people; self-collection HPV CST particularly suited to remote contexts.

Communication and cultural concepts the generator should recognise:
- "Yarning" is a culturally appropriate communication style; some clinicians employ structured "yarning" assessment tools (e.g. for social and emotional wellbeing).
- "Sorry business" refers to mourning practices following a death; may affect appointment attendance, treatment decisions; doctors should ask sensitively and avoid using the deceased's name where culturally inappropriate.
- "Shame" describes a culturally specific affect that may inhibit health-seeking; distinct from clinical shame or guilt; gender-discordant clinician care is often important.
- "Men's business" and "women's business" refers to gender-specific health and cultural matters; particularly relevant in remote communities.
- Naming protocols: photographs and names of recently deceased people should be removed or used with cultural permission; ACCHS clinics maintain protocols.
- AHWs (Aboriginal Health Workers) and AHPs (Aboriginal Health Practitioners) are clinical staff; the Practitioner role is registered under AHPRA (since 2012) and has prescribing rights for specific medicines.

Asking the identification question: every patient should be asked "Are you of Aboriginal or Torres Strait Islander origin?" as a yes/no/both/prefer not to say question, recorded in the medical record. This unlocks 715 health assessment, Closing the Gap PBS Co-payment, and culturally targeted screening.

ACCHS funding: a mix of Commonwealth Indigenous Australians' Health Programme (IAHP) block funding, MBS billings, and state grants. Distinct from a mainstream Aboriginal Medical Service (state-run) which is more common in NSW.

---

## 24. Helplines and crisis lines the generator should reach for first

When a stem ends with a referral or signposting decision, the AU answer should pull from this list, not from American equivalents.

- 000: emergency (ambulance, police, fire).
- 112: mobile emergency override.
- 106: TTY emergency for hearing or speech impaired.
- 13 HEALTH (13 43 25 84): Qld nurse-on-call equivalent.
- HealthDirect: 1800 022 222 (NSW, ACT, NT, SA, Tas, WA after-hours): nurse triage line.
- Nurse-on-Call (Vic): 1300 60 60 24.
- Poisons Information Centre: 13 11 26 (one national number, routed to nearest centre).
- Lifeline: 13 11 14 (suicide prevention, mental health crisis).
- Beyond Blue: 1300 22 4636 (depression, anxiety information line).
- 13YARN: 13 92 76 (Aboriginal and Torres Strait Islander crisis line).
- Suicide Call Back Service: 1300 659 467.
- MensLine Australia: 1300 78 99 78.
- Kids Helpline: 1800 55 1800 (5 to 25).
- 1800RESPECT: 1800 737 732 (sexual assault, domestic and family violence).
- QLife: 1800 184 527 (LGBTIQ+ peer support).
- NDIS: 1800 800 110.
- My Aged Care: 1800 200 422.
- Translating and Interpreting Service (TIS National): 131 450 (24 hours, free for medical use).
- National Auslan Booking Service (NABS): 1800 246 945 for sign language interpreters.
- 13COVID: 1800 020 080 (legacy COVID hotline; still active for general health emergencies in some states).
- Drug and Alcohol Clinical Advisory Service (DACAS) and equivalents:
  - NSW: Drug and Alcohol Specialist Advisory Service (DASAS) 02 9361 8006 (Sydney metro); 1800 023 687 (rural NSW).
  - Vic: Drug and Alcohol Clinical Advisory Service (DACAS) 1800 812 804.
  - Qld: Alcohol and Drug Information Service (ADIS) 1800 177 833.
- Hospital After-Hours GP Helpline: 1800 022 222 (HealthDirect).
- Sexual Assault helplines vary by state, e.g. NSW Rape Crisis 1800 424 017.

The MCQ pearl: if the stem ends "what advice would you give the patient?" with an option naming an American hotline, that option is automatically wrong.

---

## 25. Antimicrobial stewardship: eTG empirical regimens commonly tested

The generator should anchor antibiotic options to current Therapeutic Guidelines (Antibiotic) regimens. Selected common regimens (always check current eTG):

- Community-acquired pneumonia, low severity (CORB or SMART-COP not high): amoxicillin 1 g orally 8-hourly for 5 days, plus doxycycline 100 mg orally 12-hourly for 5 days if atypical cover wanted. Or moderate severity: benzylpenicillin 1.2 g IV 6-hourly plus doxycycline 100 mg orally 12-hourly.
- Severe CAP (ICU): ceftriaxone 2 g IV daily plus azithromycin 500 mg IV daily.
- Acute exacerbation of COPD: amoxicillin 500 mg orally 8-hourly for 5 days, or doxycycline 100 mg orally 12-hourly for 5 days.
- Acute pyelonephritis: amoxicillin plus gentamicin IV initial; switch to oral once sensitivities known (commonly augmentin or cefalexin); ciprofloxacin reserved for resistant.
- Uncomplicated cystitis in non-pregnant adults: trimethoprim 300 mg orally for 3 days, or nitrofurantoin 100 mg orally 6-hourly for 5 days.
- Acute bacterial meningitis empirical: ceftriaxone 2 g IV 12-hourly plus benzylpenicillin 2.4 g IV 4-hourly for Listeria cover if over 50 or immunocompromised; add dexamethasone 10 mg IV 6-hourly before or with first antibiotic dose.
- Cellulitis, non-severe: cefalexin 500 mg orally 6-hourly for 5 days, or dicloxacillin / flucloxacillin 500 mg orally 6-hourly for 5 days. Severe: flucloxacillin 2 g IV 6-hourly.
- Necrotising fasciitis: meropenem 1 g IV 8-hourly plus clindamycin 600 mg IV 8-hourly plus vancomycin; urgent surgical debridement.
- Sepsis empirical (unknown source, immunocompetent): piperacillin-tazobactam 4.5 g IV 6-hourly or ceftriaxone 2 g IV daily plus gentamicin 5 mg/kg IV single dose with renal adjustment.
- Pelvic inflammatory disease: ceftriaxone 500 mg IM single dose plus doxycycline 100 mg orally 12-hourly for 14 days plus metronidazole 400 mg orally 12-hourly for 14 days.
- Chlamydia uncomplicated: doxycycline 100 mg orally 12-hourly for 7 days (preferred over azithromycin since 2022 due to Mycoplasma genitalium resistance considerations).
- Gonorrhoea uncomplicated genital: ceftriaxone 500 mg IM single dose plus azithromycin 1 g orally single dose.
- Syphilis primary, secondary, early latent: benzathine benzylpenicillin 1.8 g IM single dose.
- Syphilis late latent or unknown duration: benzathine benzylpenicillin 1.8 g IM weekly for 3 doses.

Note Australian dosing convention for benzathine benzylpenicillin is expressed as 1.8 g (equivalent to 2.4 million units). The international "2.4 MU" expression is acceptable in rationales but the AU stem reads in grams.

---

## 26. Sexual assault, forensic, and domestic violence

Sexual assault presentation:
- Refer to the state Sexual Assault Service for forensic examination and care; do not perform forensic examination unless trained:
  - NSW: ECAV-trained doctors and dedicated Sexual Assault Services at major hospitals.
  - Vic: Victorian Forensic Paediatric Medical Service for under-18s; CASA House and Sexual Assault Crisis Line for adults.
  - Qld: Statewide Sexual Assault Helpline 1800 010 120.
- Forensic samples can be collected up to 7 days post-assault (longer in some scenarios); decision-making about reporting to police is separate from forensic and medical care.
- HIV post-exposure prophylaxis: assess risk; consider tenofovir-emtricitabine plus dolutegravir or raltegravir for 28 days, started within 72 hours.
- Emergency contraception: levonorgestrel up to 96 hours, ulipristal acetate up to 120 hours, copper IUD up to 120 hours (most effective).
- STI screen and offer empirical chlamydia/gonorrhoea/trichomonas prophylaxis.
- Document injuries with diagrams and consent for photographs.

Domestic and family violence:
- Universal questioning ("Have you ever felt afraid of a partner or family member?") in primary care and antenatal care.
- Safety planning, refer to 1800RESPECT, local DV service, women's shelter.
- Mandatory reporting to police of DV varies by state; doctors are not generally mandated reporters of DV against an adult except where serious bodily harm has occurred or child witnessing creates child protection concerns.
- Coercive control criminalised: NSW (1 July 2024), Qld (May 2025 Hannah's Law for related provisions), Tas (long-standing), with similar legislation in progress in Vic and SA as of 2026.

---

## 27. Australian reference intervals and lab nuances

Common adult AU reference intervals (RCPA harmonised, 2026):
- Sodium 135 to 145 mmol/L.
- Potassium 3.5 to 5.2 mmol/L.
- Chloride 95 to 110 mmol/L.
- Bicarbonate 22 to 32 mmol/L.
- Urea 3.0 to 8.0 mmol/L.
- Creatinine: 60 to 110 micromol/L (men), 45 to 90 micromol/L (women). eGFR by CKD-EPI 2009 formula (the 2021 race-free CKD-EPI is being adopted; AU labs were transitioning through 2023-2025; by 2026 most have moved).
- Calcium (total) 2.10 to 2.60 mmol/L; corrected for albumin.
- Ionised calcium 1.10 to 1.30 mmol/L.
- Phosphate 0.75 to 1.50 mmol/L.
- Magnesium 0.70 to 1.10 mmol/L.
- Albumin 35 to 50 g/L.
- Total protein 60 to 80 g/L.
- ALT under 40 U/L (man), under 30 U/L (woman); AST similar.
- ALP 30 to 110 U/L adult (much higher in adolescents and during pregnancy).
- GGT under 50 U/L.
- Total bilirubin under 20 micromol/L; conjugated under 4.
- CRP under 5 mg/L typically.
- Procalcitonin under 0.1 microgram/L.
- Troponin: assay-specific; high-sensitivity troponin I or T cut-offs vary. Common AU labs use Abbott hs-cTnI with 99th percentile around 26 ng/L (men) and 16 ng/L (women); Roche hs-cTnT around 14 ng/L.
- BNP under 100 ng/L for ruling out heart failure; NT-proBNP under 125 ng/L (under 75 years), under 450 (75 and over).
- D-dimer cut-offs typically 500 microgram/L FEU; age-adjusted in over-50s.
- HbA1c reported as both % NGSP and mmol/mol IFCC: AU labs report both; rationales should cite both (e.g. 6.5% (48 mmol/mol)).
- Lipids: total cholesterol, HDL, LDL, triglycerides, all in mmol/L. AU lipid targets in part 1 Section 7.
- TSH 0.4 to 4.0 mIU/L; lower upper limit in pregnancy (0.1 to 2.5 first trimester typical, lab-dependent).
- Vitamin D 25-OH: greater than 50 nmol/L sufficient, 30 to 49 mild deficiency, less than 30 moderate, less than 12 severe.
- B12 over 220 pmol/L; folate red cell over 545 nmol/L (assay-dependent).
- Ferritin: women 20 to 200, men 30 to 300 microgram/L; less than 30 diagnostic for iron deficiency.

Haematology:
- Haemoglobin g/L (men 130 to 180, women 120 to 165 typical).
- WCC 4.0 to 11.0 x 10 to the 9 per L.
- Platelets 150 to 400 x 10 to the 9 per L.
- INR target 2.0 to 3.0 for AF and DVT; 2.5 to 3.5 for mechanical mitral valve.
- APTT 25 to 35 seconds.
- Fibrinogen 2.0 to 4.0 g/L.

Important: AU pathology labs report haemoglobin in g/L. A stem quoting "Hb 11.0" without units is ambiguous; the generator should always write "Hb 110 g/L" (anaemic) or "Hb 11.0 g/dL" only when explicitly comparing to a non-AU source.

---

## 28. Imaging request etiquette and Medicare quirks

Medicare-rebated MRI requirements:
- A patient must be referred by a specialist for a Medicare rebate on the great majority of MRI item numbers.
- Selected MRI items are GP-referrable: paediatric MRIs of head, spine, hip, elbow, knee in specified circumstances; suspected acute scaphoid fracture in adults with normal X-ray (since 2019 expansion); chronic headache or unexplained neurological signs with red flags (limited).
- This contrasts with CT, which is universally GP-referrable under MBS.
- Stems requiring "GP refers a 35-year-old for MRI brain for chronic headache without red flags" would not attract a rebate; the rationale should mention this.

Ultrasound: GP-referrable for nearly all indications.
Nuclear medicine: most GP-referrable (e.g. bone scan, V/Q, sentinel node).
PET-CT: specialist referral; PBS-tagged indications (lymphoma staging, NSCLC staging, recurrent colorectal, melanoma high-risk, sarcoma).

Bulk-billed radiology: most Medicare-rebated imaging in metropolitan AU is bulk-billed for concession-card holders; non-concession may face out-of-pocket gap for MRI in particular.

DXA bone densitometry: Medicare-rebated for women over 70, men over 70, prior minimal-trauma fracture in over-50s, prolonged corticosteroid use (more than 7.5 mg prednisolone equivalent for more than 3 months), other defined high-risk groups.

---

## 29. Envenomation, snakebite, marine stings: granular update

This expands part 1 Section 4.1.

Snakebite first aid: pressure-immobilisation bandage (PIB) over entire limb; splint; immobilise patient; do NOT wash the bite site (venom on skin enables identification); transfer to a hospital with antivenom and laboratory.

Venom detection kit (VDK): swab of bite site, urine, or clotted blood; specific to elapid groups (brown, tiger, black, taipan, death adder). Result guides choice of monovalent antivenom; polyvalent is reserved for unknown culprit in tropical northern Australia where multiple species coexist or VDK is negative but envenomation is clinically obvious.

Geographic species distribution informs the empirical choice:
- Southern Australia: tiger snake (Notechis), brown snake (Pseudonaja), red-bellied black (Pseudechis porphyriacus).
- Northern Australia: taipan (Oxyuranus scutellatus), brown, death adder (Acanthophis).
- Tasmania: tiger snake only (no antivenom choice ambiguity).
- WA: dugite (Pseudonaja affinis, a brown), gwardar.

Clinical signs of envenomation:
- Brown snake: venom-induced consumptive coagulopathy (VICC), thrombotic microangiopathy, sudden collapse.
- Tiger snake: VICC, neurotoxicity, myotoxicity.
- Taipan: severe VICC, neurotoxicity, cardiotoxicity, myotoxicity.
- Death adder: pure post-synaptic neurotoxicity; reversible with antivenom and supportive care; no coagulopathy.
- Red-bellied black: myolysis, mild anticoagulant coagulopathy (not VICC), local pain.

Lab pattern for VICC: INR unrecordable, fibrinogen undetectable, D-dimer markedly elevated, platelets often normal initially; coagulation restored within 6 hours of antivenom in most cases but factor depletion takes 12 to 24 hours to recover.

Spider bites:
- Redback (Latrodectus hasselti): "latrodectism" with severe local and regional pain, sweating, hypertension, abdominal pain. Antivenom now restricted use (RAVE study showed limited efficacy over standard analgesia); opioid analgesia and clinical observation often sufficient. Confusingly, AU clinical practice has shifted away from routine redback antivenom since 2014.
- Sydney funnel-web (Atrax robustus) and other funnel-webs: medical emergency; pressure-immobilisation bandage; antivenom rapidly effective; mainly NSW eastern coast and ranges.
- White-tailed spider (Lampona): does NOT cause necrotic arachnidism (myth debunked, Isbister 2003); reassurance.

Marine envenomation:
- Box jellyfish (Chironex fleckeri): immediate severe pain, cardiac arrest possible. Vinegar to neutralise undischarged nematocysts (does not relieve pain), CPR, box jellyfish antivenom (CSL).
- Irukandji syndrome (Carukia barnesi and others): minutes-to-30-minutes delayed onset; severe pain, hypertension, "feeling of impending doom", catecholamine surge, takotsubo cardiomyopathy, pulmonary oedema. Treatment: opioids, magnesium sulfate infusion; no specific antivenom.
- Bluebottle (Physalia, Portuguese man o'war locally called bluebottle in Australia): hot water immersion (45 degrees, 20 minutes), not vinegar (vinegar worsens bluebottle stings).
- Stonefish (Synanceia): excruciating pain; hot water immersion; stonefish antivenom for severe.
- Cone snail (Conus): paralysis; supportive ventilation.
- Blue-ringed octopus (Hapalochlaena): tetrodotoxin; respiratory paralysis; supportive ventilation until clearance.

Tick bites:
- Paralysis tick (Ixodes holocyclus): east coast; ascending paralysis in pets and rarely humans; remove tick by freezing with Wartoff or ethyl chloride spray (Australian Society of Clinical Immunology and Allergy guidance) rather than tweezers, to reduce mammalian meat allergy (alpha-gal) sensitisation.
- Mammalian meat allergy (alpha-gal syndrome): delayed (3 to 6 hours) anaphylaxis after red meat following tick bites; AU east coast is a recognised global hotspot.

Centipede and scorpion bites: painful but generally not life-threatening in AU.

---

## 30. Consent, capacity, and special populations

- Adult capacity: presumption of capacity from age 18 under common law and statute; assess decision-specific capacity using understanding, retaining, weighing, communicating (the four UK Mental Capacity Act limbs are commonly applied in AU practice though not all states have codified the test).
- Adolescent capacity: Gillick competence (since Marion's case 1992 in AU). A mature minor can consent to treatment if able to fully understand the proposed treatment and consequences.
- Special procedures requiring court or tribunal: sterilisation of a child who cannot consent, gender-affirming treatment, organ donation by a child (now Family Court route only in limited cases; gender affirming care of minors no longer requires court approval after Re Imogen and Re Kelvin clarifications, but disputes about consent still go to Family Court).
- Interpreter access: TIS National 131 450 free for Medicare-billed services. Use a professional interpreter, not a family member, for anything beyond trivial conversations and especially for consent.
- Telehealth Medicare rules: telephone and video consultations bulk-billable and rebatable with item-number rules including a 12-month existing GP relationship (the "existing relationship" rule, introduced 1 July 2022 with exceptions for under-12 months children, homeless, victims of natural disasters, after-hours).

---

## 31. Additional Australian items the generator must use

- "GP" not "PCP" or "family physician".
- "Bulk-bill" as a verb is correct.
- "On the floor" of ED = the clinical area.
- "Resus bay" not "trauma bay" typically.
- "Theatres" not "the OR".
- "Lab" or "pathology"; "labs" colloquial; "blood test" lay.
- "Casualty" is archaic UK; never used in 2026 AU stems.
- "Doctor" or "Doctor surname"; "Dr." preferred written form.
- "Caesarean section" (or "caesarean"); not "C-section" in formal writing though acceptable colloquially.
- "Operation" or "procedure"; not "surgery" used as a synonym for procedure ("the patient had a knee surgery" is American phrasing).
- "Allied health" covers physiotherapy, occupational therapy, dietetics, social work, podiatry, psychology, speech pathology, osteopathy, exercise physiology.
- "Practice nurse" not "office nurse".
- "Outreach" describes peripheral or remote clinic visits.
- "On the wards" = inpatient setting.
- "Long stay" or "long-term care" not "skilled nursing facility" (SNF is US).
- "Rehab" or "rehabilitation"; "subacute" or "GEM (Geriatric Evaluation and Management)" is AU-specific subacute care.
- "Day surgery" or "day procedure unit" not "outpatient surgery" exclusively.
- "Public list" / "private list" for elective surgery.
- "Discharge summary" with copy to GP; "TTH" (to take home) for discharge medicines; "TTAs" (to take away).

---

## 32. Updated 2026 PBS, Medicare, and related thresholds

- PBS general co-payment (2026): approximately AUD 31.60 per script (set by indexation each January). Concessional approximately AUD 7.70.
- PBS Safety Net 2026: general AUD 1647.90 threshold then concessional co-payment; concessional threshold AUD 277.20 then zero co-payment.
- 60-day dispensing applies to defined chronic medicines (over 300 items by 2026 end of three-tranche rollout).
- Medicare levy: 2.0% of taxable income; Medicare Levy Surcharge tiered for those without private hospital cover and earning over the threshold.
- Medicare Safety Net Original 2026 threshold approximately AUD 580.30; EMSN threshold approximately AUD 2544.30 (general), AUD 811.80 (concessional and FTB-A).
- MBS indexation has resumed annually since 2019 after the freeze (Medicare indexation freeze 2014-2019); each year on 1 July most items rise by approximately 1.5% to 3%.

---

## 33. Final generator-side cross-check

When generating an Australian stem, run this expanded cross-check (additional to part 1 Section 8):

- If the stem involves a death, check whether it is reportable to the Coroner per Section 13. If yes, the doctor does not complete the MCCDC; the rationale must say so.
- If the stem involves a notifiable disease per Section 11, the management answer should include notification; never say "report to CDC".
- If the stem involves a workers compensation injury, motor accident, or DVA-eligible patient, the funding stream matters and the rationale should name the correct scheme (Section 16).
- If the stem involves stimulants for ADHD, ensure specialist initiation is named (Section 18); never let a GP solely initiate.
- If the stem involves antiretrovirals, hepatitis B/C antivirals, growth hormone, CF modulators, or other HSD items, the supply pathway is s100 not regular PBS (Section 17).
- If the stem involves a paediatric emergency in a regional or remote setting, the retrieval service named must match the state (Section 1.7 in part 1, expanded here only by adding PHU notification where relevant).
- If the stem involves an Aboriginal or Torres Strait Islander patient, ensure the writing uses the full phrase, never the abbreviation, and the clinical content reflects actual priority conditions (Section 23). Do not tokenise.
- If the stem cites a helpline, ensure the number is Australian (Section 24); American hotlines as distractors are reasonable but the correct answer is AU.
- If the stem cites a lab value, use AU units (Section 27): mmol/L glucose, micromol/L creatinine, g/L haemoglobin, mg/L paracetamol.
- If the stem cites an antibiotic regimen, anchor it to current eTG (Section 25); avoid US dosing conventions (e.g. amoxicillin 875 mg twice daily is US; AU writes amoxicillin 1 g 8-hourly).

End of part 2. Generator: read this alongside the original `au_medical_system.md`. The two files together comprise the AU practice anchor.
