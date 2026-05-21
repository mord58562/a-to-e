#!/usr/bin/env python3
"""Diagnosis-leak scanner for the A to E MCQ Bank.

Strict version: word-boundary matching, narrow trigger list, dedup by label.
"""
import json, glob, re, sys

# (label, trigger_regex_list) - all regex are case-insensitive, anchored with word boundaries
# Use raw strings; \b at both ends.
DIAGNOSES = [
    ("meningitis", [r"\bmeningitis\b", r"\bbacterial meningitis\b"]),
    ("meningococcal disease", [r"\bmeningococcaemia\b", r"\bmeningococcal sepsis\b",
                               r"\bmeningococcal disease\b", r"\binvasive meningococcal\b",
                               r"\bmeningococcal infection\b"]),
    ("encephalitis", [r"\bencephalitis\b"]),
    ("pre-eclampsia", [r"\bpre-?eclampsia\b"]),
    ("eclampsia", [r"\beclampsia\b"]),
    ("HELLP", [r"\bHELLP\b"]),
    ("DKA", [r"\bdiabetic ketoacidosis\b", r"\bDKA\b"]),
    ("HHS", [r"\bhyperosmolar hyperglycaemic\b", r"\bHHS\b"]),
    ("PE", [r"\bpulmonary embolism\b", r"\bpulmonary embolus\b", r"\bPE\b"]),
    ("DVT", [r"\bdeep vein thrombosis\b", r"\bDVT\b"]),
    ("STEMI", [r"\bSTEMI\b"]),
    ("NSTEMI", [r"\bNSTEMI\b"]),
    ("ACS", [r"\bacute coronary syndrome\b", r"\bACS\b"]),
    ("MI", [r"\bmyocardial infarction\b"]),
    ("intussusception", [r"\bintussusception\b"]),
    ("NEC", [r"\bnecrotis?ing enterocolitis\b"]),
    ("SCFE", [r"\bslipped capital femoral\b", r"\bSCFE\b", r"\bSUFE\b", r"\bslipped upper femoral\b"]),
    ("appendicitis", [r"\bappendicitis\b"]),
    ("ectopic pregnancy", [r"\bectopic pregnancy\b", r"\bectopic\b"]),
    ("placental abruption", [r"\bplacental abruption\b"]),
    ("placenta praevia", [r"\bplacenta praevia\b", r"\bplacenta previa\b"]),
    ("placenta accreta", [r"\bplacenta accreta\b", r"\bmorbidly adherent\b"]),
    ("postpartum haemorrhage", [r"\bpostpartum haemorrhage\b", r"\bpost-?partum haemorrhage\b", r"\bPPH\b"]),
    ("uterine rupture", [r"\buterine rupture\b"]),
    ("amniotic fluid embolism", [r"\bamniotic fluid embolism\b", r"\bAFE\b"]),
    ("shoulder dystocia", [r"\bshoulder dystocia\b"]),
    ("cord prolapse", [r"\bcord prolapse\b"]),
    ("chorioamnionitis", [r"\bchorioamnionitis\b"]),
    ("Kawasaki disease", [r"\bKawasaki\b"]),
    ("anaphylaxis", [r"\banaphylaxis\b"]),
    ("croup", [r"\bcroup\b", r"\blaryngotracheobronchitis\b"]),
    ("epiglottitis", [r"\bepiglottitis\b"]),
    ("bronchiolitis", [r"\bbronchiolitis\b"]),
    ("pneumonia", [r"\bpneumonia\b"]),
    ("asthma", [r"\basthma\b"]),
    ("cystic fibrosis", [r"\bcystic fibrosis\b"]),
    ("pertussis", [r"\bpertussis\b", r"\bwhooping cough\b"]),
    ("measles", [r"\bmeasles\b"]),
    ("varicella", [r"\bvaricella\b", r"\bchickenpox\b"]),
    ("HSP", [r"\bhenoch-?schonlein\b", r"\bHSP\b", r"\bIgA vasculitis\b"]),
    ("ITP", [r"\bimmune thrombocytopenic\b", r"\bITP\b"]),
    ("HUS", [r"\bhaemolytic uraemic\b", r"\bhemolytic uremic\b", r"\bHUS\b"]),
    ("nephrotic syndrome", [r"\bnephrotic syndrome\b", r"\bminimal change\b"]),
    ("PSGN", [r"\bpost-?streptococcal glomerulonephritis\b", r"\bPSGN\b"]),
    ("UTI", [r"\burinary tract infection\b", r"\bUTI\b", r"\bpyelonephritis\b"]),
    ("testicular torsion", [r"\btesticular torsion\b"]),
    ("pyloric stenosis", [r"\bpyloric stenosis\b"]),
    ("malrotation", [r"\bmalrotation\b", r"\bvolvulus\b"]),
    ("hirschsprung", [r"\bhirschsprung\b"]),
    ("biliary atresia", [r"\bbiliary atresia\b"]),
    ("septic arthritis", [r"\bseptic arthritis\b"]),
    ("osteomyelitis", [r"\bosteomyelitis\b"]),
    ("perthes", [r"\bperthes\b"]),
    ("DDH", [r"\bdevelopmental dysplasia of the hip\b", r"\bDDH\b"]),
    ("transient synovitis", [r"\btransient synovitis\b", r"\birritable hip\b"]),
    ("ALL", [r"\bacute lymphoblastic leukaemia\b"]),
    ("AML", [r"\bacute myeloid leukaemia\b"]),
    ("neuroblastoma", [r"\bneuroblastoma\b"]),
    ("Wilms tumour", [r"\bWilms\b"]),
    ("retinoblastoma", [r"\bretinoblastoma\b"]),
    ("type 1 diabetes", [r"\btype 1 diabetes\b", r"\bT1DM\b"]),
    ("type 2 diabetes", [r"\btype 2 diabetes\b", r"\bT2DM\b"]),
    ("hypothyroidism", [r"\bhypothyroidism\b"]),
    ("hyperthyroidism", [r"\bhyperthyroidism\b", r"\bthyrotoxicosis\b", r"\bGraves\b"]),
    ("adrenal crisis", [r"\baddisonian\b", r"\badrenal crisis\b", r"\badrenal insufficiency\b"]),
    ("phaeochromocytoma", [r"\bphaeochromocytoma\b", r"\bpheochromocytoma\b"]),
    ("SAH", [r"\bsubarachnoid haemorrhage\b", r"\bSAH\b"]),
    ("ischaemic stroke", [r"\bischaemic stroke\b", r"\bischemic stroke\b"]),
    ("TIA", [r"\btransient ischaemic\b", r"\bTIA\b"]),
    ("status epilepticus", [r"\bstatus epilepticus\b"]),
    ("febrile seizure", [r"\bfebrile seizure\b", r"\bfebrile convulsion\b"]),
    ("autism", [r"\bautism\b", r"\bautistic spectrum\b", r"\bautism spectrum\b"]),
    ("ADHD", [r"\bADHD\b", r"\battention deficit\b"]),
    ("anorexia nervosa", [r"\banorexia nervosa\b"]),
    ("bulimia nervosa", [r"\bbulimia\b"]),
    ("schizophrenia", [r"\bschizophrenia\b"]),
    ("bipolar", [r"\bbipolar\b"]),
    ("PTSD", [r"\bpost-?traumatic stress\b", r"\bPTSD\b"]),
    ("OCD", [r"\bobsessive-?compulsive\b", r"\bOCD\b"]),
    ("serotonin syndrome", [r"\bserotonin syndrome\b"]),
    ("NMS", [r"\bneuroleptic malignant\b"]),
    ("lithium toxicity", [r"\blithium toxicity\b"]),
    ("alcohol withdrawal", [r"\bdelirium tremens\b", r"\balcohol withdrawal\b"]),
    ("Wernicke encephalopathy", [r"\bWernicke\b"]),
    ("opioid overdose", [r"\bopioid overdose\b", r"\bopioid toxicity\b"]),
    ("paracetamol overdose", [r"\bparacetamol overdose\b", r"\bparacetamol toxicity\b"]),
    ("TCA overdose", [r"\btricyclic overdose\b", r"\bTCA overdose\b"]),
    ("cellulitis", [r"\bcellulitis\b"]),
    ("necrotising fasciitis", [r"\bnecrotis?ing fasciitis\b"]),
    ("tonsillitis", [r"\btonsillitis\b"]),
    ("otitis media", [r"\botitis media\b"]),
    ("mastoiditis", [r"\bmastoiditis\b"]),
    ("eczema herpeticum", [r"\beczema herpeticum\b"]),
    ("scabies", [r"\bscabies\b"]),
    ("impetigo", [r"\bimpetigo\b"]),
    ("scarlet fever", [r"\bscarlet fever\b"]),
    ("rheumatic fever", [r"\brheumatic fever\b"]),
    ("endocarditis", [r"\bendocarditis\b", r"\binfective endocarditis\b"]),
    ("pericarditis", [r"\bpericarditis\b"]),
    ("tamponade", [r"\bcardiac tamponade\b", r"\btamponade\b"]),
    ("aortic dissection", [r"\baortic dissection\b"]),
    ("AAA", [r"\babdominal aortic aneurysm\b", r"\bAAA\b"]),
    ("heart failure", [r"\bheart failure\b", r"\bdecompensated heart failure\b"]),
    ("AF", [r"\batrial fibrillation\b"]),
    ("VT", [r"\bventricular tachycardia\b"]),
    ("SVT", [r"\bsupraventricular tachycardia\b"]),
    ("sepsis", [r"\bsepsis\b", r"\bseptic shock\b"]),
    ("variceal bleed", [r"\bvariceal\b", r"\bupper GI bleed\b"]),
    ("peptic ulcer", [r"\bpeptic ulcer\b"]),
    ("ulcerative colitis", [r"\bulcerative colitis\b"]),
    ("crohn", [r"\bcrohn\b"]),
    ("coeliac", [r"\bcoeliac\b", r"\bceliac\b"]),
    ("hepatitis B", [r"\bhepatitis B\b"]),
    ("hepatitis C", [r"\bhepatitis C\b"]),
    ("cirrhosis", [r"\bcirrhosis\b"]),
    ("pancreatitis", [r"\bpancreatitis\b"]),
    ("cholecystitis", [r"\bcholecystitis\b"]),
    ("cholangitis", [r"\bcholangitis\b"]),
    ("bowel obstruction", [r"\bbowel obstruction\b"]),
    ("perforated viscus", [r"\bperforated viscus\b", r"\bviscus perforation\b"]),
    ("rhabdomyolysis", [r"\brhabdomyolysis\b"]),
    ("AKI", [r"\bacute kidney injury\b", r"\bAKI\b"]),
    ("CKD", [r"\bchronic kidney disease\b", r"\bCKD\b"]),
    ("hyperkalaemia", [r"\bhyperkalaemia\b", r"\bhyperkalemia\b"]),
    ("hyponatraemia", [r"\bhyponatraemia\b", r"\bhyponatremia\b"]),
    ("SIADH", [r"\bSIADH\b"]),
    ("tumour lysis", [r"\btumour lysis\b", r"\btumor lysis\b"]),
    ("PCP pneumonia", [r"\bpneumocystis\b"]),
    ("TB", [r"\btuberculosis\b"]),
    ("HIV", [r"\bHIV\b"]),
    ("syphilis", [r"\bsyphilis\b"]),
    ("gonorrhoea", [r"\bgonorrhoea\b", r"\bgonorrhea\b"]),
    ("chlamydia", [r"\bchlamydia\b"]),
    ("PID", [r"\bpelvic inflammatory disease\b"]),
    ("ovarian torsion", [r"\bovarian torsion\b"]),
    ("miscarriage", [r"\bmiscarriage\b", r"\bspontaneous abortion\b"]),
    ("molar pregnancy", [r"\bmolar pregnancy\b", r"\bhydatidiform\b"]),
    ("hyperemesis", [r"\bhyperemesis\b"]),
    ("GDM", [r"\bgestational diabetes\b", r"\bGDM\b"]),
    ("obstetric cholestasis", [r"\bobstetric cholestasis\b", r"\bintrahepatic cholestasis\b"]),
    ("postnatal depression", [r"\bpostnatal depression\b", r"\bpostpartum depression\b"]),
    ("postpartum psychosis", [r"\bpostpartum psychosis\b", r"\bpuerperal psychosis\b"]),
    ("breast abscess", [r"\bbreast abscess\b"]),
    ("mastitis", [r"\bmastitis\b"]),
    ("endometriosis", [r"\bendometriosis\b"]),
    ("fibroids", [r"\bfibroid\b", r"\bleiomyoma\b"]),
    ("polyhydramnios", [r"\bpolyhydramnios\b"]),
    ("oligohydramnios", [r"\boligohydramnios\b"]),
    ("IUGR", [r"\bintrauterine growth restriction\b", r"\bIUGR\b", r"\bFGR\b", r"\bgrowth restriction\b"]),
    ("Down syndrome", [r"\bDown syndrome\b", r"\btrisomy 21\b"]),
    ("Turner syndrome", [r"\bTurner syndrome\b"]),
]

DIAG_LEAD_TRIGGERS = [
    "most likely diagnosis", "which condition", "which best describes",
    "which of the following diagnoses", "what is the diagnosis",
    "what is the most likely diagnosis", "the most likely diagnosis is",
    "best fits", "which diagnosis", "underlying diagnosis",
    "single most likely diagnosis", "most likely cause",
    "which classification best describes", "which is the most likely",
    "best interpretation", "most appropriate interpretation",
    "best classification", "most likely pathology",
    "most likely underlying", "single best diagnosis",
]


def is_diag_lead(lead_in: str) -> bool:
    li = (lead_in or "").lower()
    return any(t in li for t in DIAG_LEAD_TRIGGERS)


def compile_triggers():
    out = []
    for label, pats in DIAGNOSES:
        compiled = [re.compile(p, re.IGNORECASE) for p in pats]
        out.append((label, compiled, pats))
    return out


COMPILED = compile_triggers()


def find_in(text, compiled_list):
    """Return list of (label, raw_pattern_that_matched)."""
    hits = []
    for label, regs, raws in compiled_list:
        for reg, raw in zip(regs, raws):
            if reg.search(text):
                hits.append((label, raw))
                break
    return hits


def find_underlying(q):
    """Find candidate underlying diagnoses from summary + correct rationale + tags."""
    expl = q.get("explanation") or {}
    summary = expl.get("summary") or ""
    key_pts = " ".join(expl.get("key_points") or [])
    correct_rationale = ""
    for o in q.get("options", []):
        if o.get("correct"):
            correct_rationale = o.get("rationale") or ""
            break
    tags = " ".join(q.get("tags") or [])
    pool = " \n ".join([summary, key_pts, correct_rationale, tags])
    return find_in(pool, COMPILED)


def stem_blob(q):
    stem = q.get("stem") or ""
    dt = q.get("data_table") or {}
    if isinstance(dt, dict):
        dt_txt = " ".join(str(v) for v in dt.values())
    else:
        dt_txt = str(dt)
    return stem + " \n " + dt_txt + " \n " + (q.get("lead_in") or "")


def scan():
    results = []
    files = sorted(glob.glob("/Users/robrussell/y4-mcq/data/batches/*.json"))
    for f in files:
        with open(f) as fh:
            try:
                data = json.load(fh)
            except Exception:
                continue
        if not isinstance(data, list):
            continue
        for q in data:
            if q.get("difficulty", 0) < 3:
                continue
            lead_in = q.get("lead_in") or ""
            if is_diag_lead(lead_in):
                continue
            cands = find_underlying(q)
            if not cands:
                continue
            sblob = stem_blob(q)
            stem_hits = find_in(sblob, COMPILED)
            stem_labels = {lab for lab, _ in stem_hits}
            hidden = [(lab, raw) for lab, raw in cands if lab not in stem_labels]
            if not hidden:
                continue
            # Dedup by label
            hidden_labels = {}
            for lab, raw in hidden:
                hidden_labels.setdefault(lab, raw)
            # Build compiled triggers for hidden labels only
            hidden_compiled = []
            for label, regs, raws in COMPILED:
                if label in hidden_labels:
                    hidden_compiled.append((label, regs, raws))
            leaked = []
            for o in q.get("options", []):
                otext = o.get("text") or ""
                ohits = find_in(otext, hidden_compiled)
                if ohits:
                    leaked.append({
                        "letter": o.get("letter"),
                        "text": otext,
                        "correct": bool(o.get("correct")),
                        "leaks": ohits,
                    })
            if leaked:
                results.append({
                    "id": q.get("id"),
                    "file": f.replace("/Users/robrussell/y4-mcq/", ""),
                    "lead_in": lead_in,
                    "stem": q.get("stem") or "",
                    "hidden_diagnoses": list(hidden_labels.keys()),
                    "options_all": [{"letter": o.get("letter"), "text": o.get("text"), "correct": bool(o.get("correct"))} for o in q.get("options", [])],
                    "leaked_options": leaked,
                    "summary": (q.get("explanation") or {}).get("summary", ""),
                })
    return results


if __name__ == "__main__":
    out = scan()
    print(json.dumps(out, indent=2, ensure_ascii=False))
    print(f"\n# Flagged: {len(out)}", file=sys.stderr)
