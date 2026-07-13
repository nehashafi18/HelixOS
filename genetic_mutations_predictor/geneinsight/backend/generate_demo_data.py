"""Generate all synthetic demo datasets for HelixOS Demo Library."""
import json
import os
import random
from datetime import datetime, timedelta

import numpy as np
import pandas as pd

random.seed(42)
np.random.seed(42)

OUT = os.path.join(os.path.dirname(__file__), "demo_data")
os.makedirs(OUT, exist_ok=True)

# ── Amino acid tables ─────────────────────────────────────────────────────────
AA = list("ACDEFGHIKLMNPQRSTVWY")
AA3 = {
    "A": "Ala", "C": "Cys", "D": "Asp", "E": "Glu", "F": "Phe",
    "G": "Gly", "H": "His", "I": "Ile", "K": "Lys", "L": "Leu",
    "M": "Met", "N": "Asn", "P": "Pro", "Q": "Gln", "R": "Arg",
    "S": "Ser", "T": "Thr", "V": "Val", "W": "Trp", "Y": "Tyr",
}
STOP = "Ter"

# Biochemical property tables
HYDRO = {"A": 1.8,"C": 2.5,"D":-3.5,"E":-3.5,"F": 2.8,"G":-0.4,"H":-3.2,
          "I": 4.5,"K":-3.9,"L": 3.8,"M": 1.9,"N":-3.5,"P":-1.6,"Q":-3.5,
          "R":-4.5,"S":-0.8,"T":-0.7,"V": 4.2,"W":-0.9,"Y":-1.3}
CHARGE= {"A":0,"C":0,"D":-1,"E":-1,"F":0,"G":0,"H":0.1,"I":0,"K":1,"L":0,
          "M":0,"N":0,"P":0,"Q":0,"R":1,"S":0,"T":0,"V":0,"W":0,"Y":0}
POLAR = {"A":0,"C":0,"D":1,"E":1,"F":0,"G":0,"H":1,"I":0,"K":1,"L":0,
         "M":0,"N":1,"P":0,"Q":1,"R":1,"S":1,"T":1,"V":0,"W":0,"Y":1}
SIZE  = {"A":89,"C":121,"D":133,"E":147,"F":165,"G":75,"H":155,"I":131,
         "K":146,"L":131,"M":149,"N":132,"P":115,"Q":146,"R":174,"S":105,
         "T":119,"V":117,"W":204,"Y":181}

def bio_features(orig, new):
    return {
        "HydrophobicityChange": round(HYDRO[new] - HYDRO[orig], 2),
        "ChargeChange": round(CHARGE[new] - CHARGE[orig], 2),
        "PolarityChange": int(POLAR[new]) - int(POLAR[orig]),
        "SizeChange": SIZE[new] - SIZE[orig],
        "OriginalHydrophobicity": HYDRO[orig],
        "NewHydrophobicity": HYDRO[new],
    }

def protein_change(orig, pos, new, is_stop=False):
    n = STOP if is_stop else AA3.get(new, new)
    return f"p.{AA3[orig]}{pos}{n}"

REFS = list("ACGT")
ALTS = list("ACGT")

def rand_allele():
    return random.choice(REFS)

def rand_alt(ref):
    return random.choice([a for a in ALTS if a != ref])

REVIEW_STATUSES = [
    "criteria provided, single submitter",
    "criteria provided, multiple submitters, no conflicts",
    "reviewed by expert panel",
    "no assertion criteria provided",
    "criteria provided, conflicting interpretations",
]

def rand_date(start="2023-01-01", end="2025-12-31"):
    s = datetime.strptime(start, "%Y-%m-%d")
    e = datetime.strptime(end, "%Y-%m-%d")
    return (s + timedelta(days=random.randint(0, (e - s).days))).strftime("%Y-%m-%d")

# ── 1. Breast Cancer Panel ─────────────────────────────────────────────────────
def breast_cancer_panel():
    genes = {
        "BRCA1": {"chr": "17", "pos_start": 43044295, "pathogenic_freq": 0.35},
        "BRCA2": {"chr": "13", "pos_start": 32315508, "pathogenic_freq": 0.30},
        "TP53":  {"chr": "17", "pos_start": 7661779,  "pathogenic_freq": 0.40},
        "PALB2": {"chr": "16", "pos_start": 23603160, "pathogenic_freq": 0.20},
        "ATM":   {"chr": "11", "pos_start": 108222832,"pathogenic_freq": 0.15},
        "CHEK2": {"chr": "22", "pos_start": 28687738, "pathogenic_freq": 0.15},
    }

    # Notable known-style variants (fictional but realistic)
    notable = [
        ("BRCA1","17",43094692,"C","T","R","1751","H","missense variant","Likely pathogenic",0.94),
        ("BRCA1","17",43063929,"G","A","W","1837","*","nonsense variant","Pathogenic",0.97),
        ("BRCA2","13",32379749,"A","G","N","372","D","missense variant","Likely pathogenic",0.88),
        ("TP53", "17",7674220, "C","T","R","248","W","missense variant","Pathogenic",0.96),
        ("BRCA2","13",32340301,"T","A","D","2723","V","missense variant","Uncertain significance",0.61),
        ("CHEK2","22",28722206,"C","T","I","157","T","missense variant","Likely benign",0.21),
        ("ATM",  "11",108141519,"G","A","R","337","*","nonsense variant","Pathogenic",0.95),
        ("PALB2","16",23641508,"C","T","L","831","P","missense variant","Likely pathogenic",0.82),
    ]

    rows = []
    patient_counter = 1

    for note in notable:
        gene, chrom, pos, ref, alt, orig, aa_pos, new, vtype, sig, conf = note
        is_stop = (new == "*")
        rows.append({
            "Patient_ID": f"BC{patient_counter:03d}",
            "Sample_ID": f"S{patient_counter:04d}",
            "GeneSymbol": gene,
            "Chromosome": chrom,
            "Variant_Position": pos,
            "Reference_Allele": ref,
            "Alternate_Allele": alt,
            "Protein_Change": f"p.{AA3[orig]}{aa_pos}{'Ter' if is_stop else AA3.get(new,new)}",
            "Original_AA": orig,
            "Position": aa_pos,
            "New_AA": "*" if is_stop else new,
            "Variant_Type": vtype,
            "Clinical_Significance": sig,
            "Review_Status": random.choice(REVIEW_STATUSES[:3]),
            "Population_Frequency": round(random.uniform(0.0001, 0.002), 5) if "pathogenic" in sig.lower() else round(random.uniform(0.001, 0.05), 4),
            "Confidence_Score": conf,
        })
        patient_counter += 1

    gene_list = list(genes.keys())
    sig_weights = {
        "Pathogenic":            0.12,
        "Likely pathogenic":     0.18,
        "Uncertain significance":0.30,
        "Likely benign":         0.20,
        "Benign":                0.20,
    }
    sigs = list(sig_weights.keys())
    weights = list(sig_weights.values())

    while len(rows) < 75:
        gene = random.choice(gene_list)
        g = genes[gene]
        orig = random.choice(AA)
        new  = random.choice([a for a in AA if a != orig])
        pos  = random.randint(1, 1800)
        sig  = random.choices(sigs, weights=weights)[0]
        is_path = "pathogenic" in sig.lower()
        conf = round(random.uniform(0.75, 0.97) if is_path else random.uniform(0.05, 0.40), 3)
        ref_allele = rand_allele()
        alt_allele = rand_alt(ref_allele)
        rows.append({
            "Patient_ID": f"BC{patient_counter:03d}",
            "Sample_ID": f"S{patient_counter:04d}",
            "GeneSymbol": gene,
            "Chromosome": g["chr"],
            "Variant_Position": g["pos_start"] + random.randint(0, 50000),
            "Reference_Allele": ref_allele,
            "Alternate_Allele": alt_allele,
            "Protein_Change": protein_change(orig, pos, new),
            "Original_AA": orig,
            "Position": pos,
            "New_AA": new,
            "Variant_Type": random.choices(
                ["missense variant","nonsense variant","synonymous variant","splice variant"],
                weights=[0.65, 0.15, 0.10, 0.10]
            )[0],
            "Clinical_Significance": sig,
            "Review_Status": random.choice(REVIEW_STATUSES),
            "Population_Frequency": round(random.uniform(0.0001, 0.0010), 5) if is_path else round(random.uniform(0.001, 0.08), 4),
            "Confidence_Score": conf,
        })
        patient_counter += 1

    df = pd.DataFrame(rows)
    path = os.path.join(OUT, "breast_cancer_panel_demo.xlsx")
    with pd.ExcelWriter(path, engine="openpyxl") as writer:
        df.to_excel(writer, sheet_name="Variants", index=False)
        meta = pd.DataFrame([{
            "Field": "Dataset", "Value": "Breast Cancer Variant Analysis — DEMO ONLY"
        }, {
            "Field": "Variants", "Value": len(df)
        }, {
            "Field": "Genes", "Value": ", ".join(gene_list)
        }, {
            "Field": "Purpose", "Value": "Demonstration of hereditary cancer genetics analysis"
        }, {
            "Field": "Data Type", "Value": "Entirely synthetic / fictional — NOT real patient data"
        }])
        meta.to_excel(writer, sheet_name="Metadata", index=False)
    print(f"  breast_cancer_panel_demo.xlsx — {len(df)} variants")

    return {
        "id": "breast_cancer",
        "name": "Breast Cancer Panel",
        "description": "Synthetic hereditary cancer genetics panel for demonstration",
        "file": "breast_cancer_panel_demo.xlsx",
        "format": "xlsx",
        "variants": len(df),
        "genes": gene_list,
        "categories": ["Oncology", "Hereditary Cancer"],
        "created_for": "HelixOS Demo",
        "synthetic": True,
        "icon": "dna",
        "color": "rose",
    }


# ── 2. Rare Disease Panel ──────────────────────────────────────────────────────
def rare_disease_panel():
    genes = {
        "CFTR":   {"chr": "7",  "pos": 117120148},
        "DMD":    {"chr": "X",  "pos": 31119219},
        "SCN1A":  {"chr": "2",  "pos": 166845670},
        "MECP2":  {"chr": "X",  "pos": 154021573},
        "FBN1":   {"chr": "15", "pos": 48700598},
        "COL1A1": {"chr": "17", "pos": 50184047},
        "KCNQ1":  {"chr": "11", "pos": 2465912},
    }
    vtypes = {
        "missense variant": 0.45,
        "nonsense variant": 0.15,
        "frameshift variant": 0.20,
        "splice site variant": 0.10,
        "synonymous variant": 0.10,
    }
    sigs = {
        "Pathogenic": 0.25,
        "Likely pathogenic": 0.20,
        "Uncertain significance": 0.30,
        "Likely benign": 0.15,
        "Benign": 0.10,
    }

    rows = []
    for i in range(100):
        gene = random.choice(list(genes.keys()))
        g = genes[gene]
        orig = random.choice(AA)
        new  = random.choice([a for a in AA if a != orig])
        pos  = random.randint(1, 2500)
        sig  = random.choices(list(sigs.keys()), weights=list(sigs.values()))[0]
        vtype = random.choices(list(vtypes.keys()), weights=list(vtypes.values()))[0]
        is_path = "pathogenic" in sig.lower()
        is_frame = "frameshift" in vtype
        is_stop = "nonsense" in vtype

        if is_frame:
            pchange = f"p.{AA3[orig]}{pos}fs*{random.randint(1,20)}"
        elif is_stop:
            pchange = f"p.{AA3[orig]}{pos}Ter"
            new = "*"
        elif "splice" in vtype:
            pchange = f"c.{pos+random.randint(200,2000)}{random.choice(['+','-'])}1G>A"
        else:
            pchange = protein_change(orig, pos, new)

        conf = round(random.uniform(0.72, 0.98) if is_path else random.uniform(0.03, 0.38), 3)
        ref_allele = rand_allele()
        rows.append({
            "Sample_ID": f"RD{i+1:04d}",
            "GeneSymbol": gene,
            "Chromosome": g["chr"],
            "Variant_Position": g["pos"] + random.randint(0, 80000),
            "Reference_Allele": ref_allele,
            "Alternate_Allele": rand_alt(ref_allele),
            "Protein_Change": pchange,
            "Original_AA": orig,
            "Position": pos,
            "New_AA": new,
            "Variant_Type": vtype,
            "Clinical_Significance": sig,
            "Review_Status": random.choice(REVIEW_STATUSES),
            "Population_Frequency": round(random.uniform(1e-6, 0.001), 6) if is_path else round(random.uniform(0.0001, 0.02), 5),
            "Inheritance": random.choice(["Autosomal Dominant","Autosomal Recessive","X-linked"]),
            "Confidence_Score": conf,
        })

    df = pd.DataFrame(rows)
    path = os.path.join(OUT, "rare_disease_demo.csv")
    df.to_csv(path, index=False)
    print(f"  rare_disease_demo.csv — {len(df)} variants")

    return {
        "id": "rare_disease",
        "name": "Rare Disease Panel",
        "description": "Synthetic pediatric and rare disease genetics panel",
        "file": "rare_disease_demo.csv",
        "format": "csv",
        "variants": len(df),
        "genes": list(genes.keys()),
        "categories": ["Rare Disease", "Pediatric Genetics"],
        "created_for": "HelixOS Demo",
        "synthetic": True,
        "icon": "flask",
        "color": "violet",
    }


# ── 3. Cardiovascular Genetics Panel ──────────────────────────────────────────
def cardiovascular_panel():
    genes = {
        "MYH7":  {"chr": "14", "pos": 23857476},
        "MYBPC3":{"chr": "11", "pos": 47332601},
        "LMNA":  {"chr": "1",  "pos": 156134870},
        "TTN":   {"chr": "2",  "pos": 178525989},
        "KCNH2": {"chr": "7",  "pos": 150946626},
        "RYR2":  {"chr": "1",  "pos": 237042074},
    }
    inheritance = {
        "MYH7": "Autosomal Dominant",
        "MYBPC3": "Autosomal Dominant",
        "LMNA": "Autosomal Dominant",
        "TTN": "Autosomal Dominant / Recessive",
        "KCNH2": "Autosomal Dominant",
        "RYR2": "Autosomal Dominant",
    }
    conditions = {
        "MYH7": "Hypertrophic Cardiomyopathy",
        "MYBPC3": "Hypertrophic Cardiomyopathy",
        "LMNA": "Dilated Cardiomyopathy / EDMD",
        "TTN": "Dilated Cardiomyopathy",
        "KCNH2": "Long QT Syndrome type 2",
        "RYR2": "Catecholaminergic Polymorphic VT",
    }
    sigs = {
        "Pathogenic": 0.22,
        "Likely pathogenic": 0.18,
        "Uncertain significance": 0.30,
        "Likely benign": 0.18,
        "Benign": 0.12,
    }

    rows = []
    for i in range(80):
        gene = random.choice(list(genes.keys()))
        g = genes[gene]
        orig = random.choice(AA)
        new  = random.choice([a for a in AA if a != orig])
        pos  = random.randint(1, 3000)
        sig  = random.choices(list(sigs.keys()), weights=list(sigs.values()))[0]
        is_path = "pathogenic" in sig.lower()
        vtype = random.choices(
            ["missense variant","nonsense variant","frameshift variant","splice site variant"],
            weights=[0.60, 0.15, 0.15, 0.10]
        )[0]
        if "frameshift" in vtype:
            pchange = f"p.{AA3[orig]}{pos}fs*{random.randint(1,30)}"
        elif "nonsense" in vtype:
            pchange = f"p.{AA3[orig]}{pos}Ter"
        else:
            pchange = protein_change(orig, pos, new)

        conf = round(random.uniform(0.75, 0.97) if is_path else random.uniform(0.04, 0.38), 3)
        ref_allele = rand_allele()
        rows.append({
            "Sample_ID": f"CV{i+1:04d}",
            "GeneSymbol": gene,
            "Chromosome": g["chr"],
            "Variant_Position": g["pos"] + random.randint(0, 90000),
            "Reference_Allele": ref_allele,
            "Alternate_Allele": rand_alt(ref_allele),
            "Protein_Change": pchange,
            "Original_AA": orig,
            "Position": pos,
            "New_AA": new,
            "Variant_Type": vtype,
            "Clinical_Significance": sig,
            "Review_Status": random.choice(REVIEW_STATUSES),
            "Associated_Condition": conditions[gene],
            "Inheritance_Pattern": inheritance[gene],
            "Population_Frequency": round(random.uniform(1e-5, 0.002), 6) if is_path else round(random.uniform(0.001, 0.05), 4),
            "Confidence_Score": conf,
        })

    df = pd.DataFrame(rows)
    path = os.path.join(OUT, "cardiovascular_demo.xlsx")
    with pd.ExcelWriter(path, engine="openpyxl") as writer:
        df.to_excel(writer, sheet_name="Variants", index=False)
        meta = pd.DataFrame([
            {"Field": "Dataset", "Value": "Cardiovascular Genetics Panel — DEMO ONLY"},
            {"Field": "Variants", "Value": len(df)},
            {"Field": "Genes", "Value": ", ".join(genes.keys())},
            {"Field": "Data Type", "Value": "Entirely synthetic / fictional"},
        ])
        meta.to_excel(writer, sheet_name="Metadata", index=False)
    print(f"  cardiovascular_demo.xlsx — {len(df)} variants")

    return {
        "id": "cardiovascular",
        "name": "Cardiovascular Genetics",
        "description": "Synthetic cardiomyopathy and arrhythmia variant panel",
        "file": "cardiovascular_demo.xlsx",
        "format": "xlsx",
        "variants": len(df),
        "genes": list(genes.keys()),
        "categories": ["Cardiology", "Inherited Heart Disease"],
        "created_for": "HelixOS Demo",
        "synthetic": True,
        "icon": "heart",
        "color": "red",
    }


# ── 4. Pharmacogenomics Dataset ────────────────────────────────────────────────
def pharmacogenomics():
    entries = [
        # CYP2C19
        ("CYP2C19","*2 (c.681G>A)","R","227","*","Clopidogrel","Reduced antiplatelet effect — poor metabolizer","Poor Metabolizer"),
        ("CYP2C19","*3 (c.636G>A)","W","212","*","Proton Pump Inhibitors","Increased drug exposure","Poor Metabolizer"),
        ("CYP2C19","*17 (c.-806C>T)","","","","Sertraline","Reduced exposure, may need dose increase","Ultrarapid Metabolizer"),
        ("CYP2C19","*1/*2","R","227","*","Voriconazole","Intermediate metabolizer — standard dose caution","Intermediate Metabolizer"),
        ("CYP2C19","*4 (c.1A>G)","M","1","V","Escitalopram","Reduced clearance","Poor Metabolizer"),
        # CYP2D6
        ("CYP2D6","*4 (c.1846G>A)","R","296","H","Codeine","No morphine conversion — avoid codeine","Poor Metabolizer"),
        ("CYP2D6","*10 (c.100C>T)","P","34","S","Tamoxifen","Reduced conversion to endoxifen","Intermediate Metabolizer"),
        ("CYP2D6","*17 (c.1023C>T)","T","341","I","Paroxetine","Reduced clearance in African ancestry","Poor Metabolizer"),
        ("CYP2D6","*2xN (gene duplication)","","","","Tramadol","Ultrarapid conversion — toxicity risk","Ultrarapid Metabolizer"),
        ("CYP2D6","*5 (gene deletion)","","","","Nortriptyline","No enzyme — significantly increased exposure","Poor Metabolizer"),
        # CYP3A5
        ("CYP3A5","*3 (c.6986A>G)","N","131","S","Tacrolimus","Reduced clearance — requires lower dose","Non-Expresser"),
        ("CYP3A5","*1/*3","","","","Cyclosporine","Intermediate expresser","Intermediate Expresser"),
        # DPYD
        ("DPYD","*2A (c.1905+1G>A)","","","","5-Fluorouracil","Severe toxicity risk — contraindicated","No Function"),
        ("DPYD","c.2846A>T (p.D949V)","D","949","V","Capecitabine","Significantly reduced metabolism","Reduced Function"),
        ("DPYD","c.1679T>G (p.I560S)","I","560","S","Fluoropyrimidines","Partial enzyme deficiency","Reduced Function"),
        # TPMT
        ("TPMT","*3A (c.460G>A + c.719A>G)","A","154","T","Azathioprine","High risk for myelotoxicity","Poor Metabolizer"),
        ("TPMT","*3C (c.719A>G)","Y","240","C","Mercaptopurine","Increased toxicity risk","Poor Metabolizer"),
        ("TPMT","*2 (c.238G>C)","A","80","P","Thioguanine","Enzyme deficiency","Poor Metabolizer"),
        # Extra benign/normal
        ("CYP2C19","*1/*1","","","","Multiple","Normal metabolism","Normal Metabolizer"),
        ("CYP2D6","*1/*1","","","","Multiple","Normal metabolism","Normal Metabolizer"),
        ("CYP3A5","*1/*1","","","","Tacrolimus","Normal expresser — standard dosing","Normal Expresser"),
        ("TPMT","*1/*1","","","","Multiple","Normal enzyme activity","Normal Metabolizer"),
        ("DPYD","*1/*1","","","","Fluoropyrimidines","Normal DPD activity","Normal Function"),
        ("CYP2C19","*1/*17","","","","Clopidogrel","Slightly increased activation","Rapid Metabolizer"),
        ("CYP2D6","*1/*2","","","","Tricyclics","Normal to rapid metabolism","Normal Metabolizer"),
        ("TPMT","*1/*3A","A","154","T","Azathioprine","Intermediate activity — reduce dose","Intermediate Metabolizer"),
        ("DPYD","c.85T>C (p.C29R)","C","29","R","Fluoropyrimidines","Uncertain functional impact","Uncertain Function"),
        ("CYP2C19","*2/*2","R","227","*","All CYP2C19 drugs","Complete poor metabolizer","Poor Metabolizer"),
        ("CYP2D6","*4/*5","R","296","H","Opioids","Poor metabolizer — gene deletion compound","Poor Metabolizer"),
        ("CYP3A5","*3/*3","N","131","S","Immunosuppressants","Non-expresser — reduce dose by ~50%","Non-Expresser"),
    ]

    rows = []
    for i, e in enumerate(entries):
        gene, variant, orig, pos, new, drug, effect, metab = e
        pchange = ""
        if orig and pos and new and new != "*":
            pchange = f"p.{AA3.get(orig,orig)}{pos}{AA3.get(new,new)}" if orig in AA3 and new in AA3 else ""
        elif new == "*" and orig and pos:
            pchange = f"p.{AA3.get(orig,orig)}{pos}Ter"
        rows.append({
            "Sample_ID": f"PGx{i+1:03d}",
            "Gene": gene,
            "Variant": variant,
            "Protein_Change": pchange or "—",
            "Original_AA": orig or "—",
            "Position": pos or "—",
            "New_AA": new or "—",
            "Drug_Association": drug,
            "Predicted_Effect": effect,
            "Metabolism_Category": metab,
            "Clinical_Action": random.choice([
                "Standard dose","Reduce dose 25-50%","Reduce dose >50%",
                "Alternative drug recommended","Contraindicated","Increase dose",
                "Monitor closely","No action required",
            ]),
            "Evidence_Level": random.choice(["1A","1B","2A","2B","3"]),
        })

    df = pd.DataFrame(rows)
    path = os.path.join(OUT, "pharmacogenomics_demo.csv")
    df.to_csv(path, index=False)
    print(f"  pharmacogenomics_demo.csv — {len(df)} entries")

    return {
        "id": "pharmacogenomics",
        "name": "Pharmacogenomics Panel",
        "description": "Synthetic drug-response and metabolism variant library",
        "file": "pharmacogenomics_demo.csv",
        "format": "csv",
        "variants": len(df),
        "genes": ["CYP2C19","CYP2D6","CYP3A5","DPYD","TPMT"],
        "categories": ["Pharmacogenomics", "Drug Response"],
        "created_for": "HelixOS Demo",
        "synthetic": True,
        "icon": "pill",
        "color": "amber",
    }


# ── 5. Research Cohort ─────────────────────────────────────────────────────────
def research_cohort():
    all_genes = [
        "BRCA1","BRCA2","TP53","ATM","PALB2","CHEK2",
        "MLH1","MSH2","MSH6","PMS2","EPCAM",
        "APC","MUTYH","PTEN","STK11","SMAD4","BMPR1A",
        "CDH1","RAD51C","RAD51D","BARD1","NBN",
        "MYH7","MYBPC3","SCN5A","LMNA","RYR2","KCNQ1",
        "CFTR","HEXA","GBA","SMPD1","ARSA",
    ]
    projects = [
        "PROJ-2024-BRCA","PROJ-2024-CARD","PROJ-2024-RARE",
        "PROJ-2025-ONCO","PROJ-2025-META",
    ]
    sigs = ["Pathogenic","Likely pathogenic","Uncertain significance","Likely benign","Benign"]
    predictions = ["Pathogenic","Benign"]

    rows = []
    for i in range(600):
        gene = random.choice(all_genes)
        orig = random.choice(AA)
        new  = random.choice([a for a in AA if a != orig])
        pos  = random.randint(1, 3000)
        sig  = random.choice(sigs)
        pred = "Pathogenic" if "pathogenic" in sig.lower() else "Benign"
        conf = round(random.uniform(0.78,0.98) if pred=="Pathogenic" else random.uniform(0.04,0.35), 3)

        rows.append({
            "Study_ID": random.choice(projects),
            "Sample_ID": f"SMPL{i+1:05d}",
            "Gene": gene,
            "Variant": f"c.{pos*3-random.randint(0,2)}{'ACGT'[random.randint(0,3)]}>{'ACGT'[random.randint(0,3)]}",
            "Protein_Change": protein_change(orig, pos, new),
            "Original_AA": orig,
            "New_AA": new,
            "Position": pos,
            "Classification": sig,
            "Prediction": pred,
            "Confidence": conf,
            "Variant_Type": random.choices(
                ["missense variant","nonsense variant","frameshift variant","splice site variant","synonymous variant"],
                weights=[0.55,0.12,0.15,0.08,0.10]
            )[0],
            "Date_Analyzed": rand_date(),
            "Analyst": f"User{random.randint(1,5):02d}",
            **bio_features(orig, new),
        })

    df = pd.DataFrame(rows)
    path = os.path.join(OUT, "research_cohort_demo.csv")
    df.to_csv(path, index=False)
    print(f"  research_cohort_demo.csv — {len(df)} variants")

    return {
        "id": "research_cohort",
        "name": "Research Cohort",
        "description": "Synthetic multi-project researcher workflow dataset (600 variants)",
        "file": "research_cohort_demo.csv",
        "format": "csv",
        "variants": len(df),
        "genes": all_genes[:12],
        "categories": ["Research", "Multi-Gene Panel"],
        "created_for": "HelixOS Demo",
        "synthetic": True,
        "icon": "microscope",
        "color": "green",
    }


# ── 6. Model Evaluation Dataset ───────────────────────────────────────────────
def model_evaluation():
    all_genes = [
        "BRCA1","BRCA2","TP53","ATM","PALB2","CHEK2","MLH1","MSH2",
        "PTEN","CDH1","MYH7","MYBPC3","LMNA","KCNQ1","SCN1A","CFTR",
        "DMD","FBN1","COL1A1","RYR2","KCNH2","TTN","MECP2","NBN",
    ]
    origins = ["germline","somatic"]
    vtypes  = ["missense variant","nonsense variant","frameshift variant","splice site variant","synonymous variant"]

    rows = []
    for i in range(1000):
        gene = random.choice(all_genes)
        orig = random.choice(AA)
        new  = random.choice([a for a in AA if a != orig])
        pos  = random.randint(1, 3500)
        is_path = i < 500  # first 500 pathogenic, last 500 benign (then shuffle)
        sig = random.choices(
            ["Pathogenic","Likely pathogenic"] if is_path else ["Benign","Likely benign"],
            weights=[0.6,0.4]
        )[0]
        pred = "Pathogenic" if is_path else "Benign"
        conf = round(random.uniform(0.70,0.99) if is_path else random.uniform(0.01,0.35), 3)
        feats = bio_features(orig, new)

        rows.append({
            "Sample_ID": f"EVAL{i+1:05d}",
            "Gene": gene,
            "Original_AA": orig,
            "New_AA": new,
            "Position": pos,
            "Protein_Change": protein_change(orig, pos, new),
            "Variant_Type": random.choices(vtypes, weights=[0.55,0.12,0.15,0.08,0.10])[0],
            "Origin": random.choice(origins),
            "Clinical_Significance": sig,
            "True_Label": pred,
            "Model_Prediction": pred if random.random() > 0.08 else ("Benign" if is_path else "Pathogenic"),
            "Confidence_Score": conf,
            "Challenge_Level": random.choices(["easy","medium","hard","ambiguous"], weights=[0.3,0.35,0.25,0.10])[0],
            **feats,
        })

    random.shuffle(rows)
    df = pd.DataFrame(rows)
    path = os.path.join(OUT, "model_evaluation_dataset.csv")
    df.to_csv(path, index=False)
    print(f"  model_evaluation_dataset.csv — {len(df)} variants (balanced)")

    return {
        "id": "model_evaluation",
        "name": "Model Evaluation Set",
        "description": "Balanced 1,000-variant dataset for ML model benchmarking (50% pathogenic / 50% benign)",
        "file": "model_evaluation_dataset.csv",
        "format": "csv",
        "variants": len(df),
        "genes": all_genes,
        "categories": ["ML Evaluation", "Benchmarking"],
        "created_for": "HelixOS Demo",
        "synthetic": True,
        "icon": "cpu",
        "color": "blue",
    }


# ── Demo Cases ─────────────────────────────────────────────────────────────────
DEMO_CASES = [
    {
        "id": "case_brca1_pathogenic",
        "title": "High-Confidence Pathogenic — BRCA1",
        "variant": "BRCA1 p.Arg1751His",
        "gene": "BRCA1",
        "protein_change": "p.Arg1751His",
        "original_aa": "R",
        "new_aa": "H",
        "position": 1751,
        "prediction": "Pathogenic",
        "confidence": 0.94,
        "clinical_significance": "Likely pathogenic",
        "variant_type": "missense variant",
        "features": {
            "HydrophobicityChange": -3.2,
            "ChargeChange": -1.0,
            "PolarityChange": 1,
            "SizeChange": -19,
        },
        "reasoning": [
            "Large charge change from positive (Arg) to neutral (His) at a critical domain",
            "Located in a highly conserved BRCA1 BRCT domain region",
            "Significant hydrophobicity shift likely affecting protein folding",
            "Pattern matches known pathogenic BRCA1 variants in training data",
        ],
        "summary": "A missense variant replacing Arginine with Histidine at position 1751 in BRCA1. The loss of positive charge at this conserved BRCT domain position is a strong predictor of pathogenicity.",
    },
    {
        "id": "case_brca2_vus",
        "title": "Variant of Uncertain Significance — BRCA2",
        "variant": "BRCA2 p.Asn372Asp",
        "gene": "BRCA2",
        "protein_change": "p.Asn372Asp",
        "original_aa": "N",
        "new_aa": "D",
        "position": 372,
        "prediction": "Uncertain",
        "confidence": 0.61,
        "clinical_significance": "Uncertain significance",
        "variant_type": "missense variant",
        "features": {
            "HydrophobicityChange": 0.0,
            "ChargeChange": -1.0,
            "PolarityChange": 0,
            "SizeChange": 1,
        },
        "reasoning": [
            "Moderate charge change (neutral → negative) without strong contextual evidence",
            "Position 372 is not within a known functional domain",
            "Similar substitutions in training data show mixed pathogenicity",
            "Insufficient population frequency data to support classification",
        ],
        "summary": "A missense variant at a non-critical region of BRCA2. The model has moderate confidence (61%) and cannot clearly classify this variant without additional evidence.",
    },
    {
        "id": "case_chek2_benign",
        "title": "Likely Benign — CHEK2",
        "variant": "CHEK2 p.Ile157Thr",
        "gene": "CHEK2",
        "protein_change": "p.Ile157Thr",
        "original_aa": "I",
        "new_aa": "T",
        "position": 157,
        "prediction": "Benign",
        "confidence": 0.21,
        "clinical_significance": "Likely benign",
        "variant_type": "missense variant",
        "features": {
            "HydrophobicityChange": -5.2,
            "ChargeChange": 0.0,
            "PolarityChange": 1,
            "SizeChange": -12,
        },
        "reasoning": [
            "Common population frequency (~1.4% in general population)",
            "No charge change — preserves local electrostatic environment",
            "Pattern consistent with benign missense variants in training data",
            "Well-documented in ClinVar with multiple submitters classifying as Likely Benign",
        ],
        "summary": "A missense variant at a well-studied CHEK2 position. Despite hydrophobicity change, the population frequency and preserved charge make this variant likely benign.",
    },
]


# ── README generator ───────────────────────────────────────────────────────────
def write_readme(meta, filename):
    text = f"""# {meta['name']} — HelixOS Demo Dataset

> ⚠️  SYNTHETIC DATA — All data in this file is entirely fictional and generated for demonstration purposes only.
> This dataset does NOT contain real patient data, real clinical results, or real research findings.

## Overview

| Field | Value |
|-------|-------|
| Dataset Name | {meta['name']} |
| Variants | {meta['variants']} |
| Format | {meta['format'].upper()} |
| Categories | {', '.join(meta['categories'])} |
| Genes | {', '.join(meta['genes'][:8])}{'...' if len(meta['genes'])>8 else ''} |

## Purpose

{meta['description']}

## Intended Users

This dataset is intended for:
- Developers testing the HelixOS platform
- Researchers evaluating variant analysis workflows
- Students learning genomic data analysis

## Column Descriptions

### Common Columns
- **Sample_ID / Patient_ID**: Fictional identifier — not linked to any real individual
- **GeneSymbol / Gene**: HGNC gene symbol
- **Protein_Change**: Variant notation (e.g., p.Arg1751His)
- **Original_AA**: Single-letter code of the original amino acid
- **New_AA**: Single-letter code of the mutated amino acid
- **Position**: Amino acid position within the protein
- **Variant_Type**: Molecular consequence (missense, nonsense, frameshift, splice, synonymous)
- **Clinical_Significance**: ClinVar-style classification (Pathogenic, Likely pathogenic, VUS, Likely benign, Benign)
- **Confidence_Score**: Model prediction confidence (0.0–1.0)

## Example Workflow

1. Download this dataset from the HelixOS Demo Library
2. Upload via **Analysis → Upload Variants**
3. View predictions in the Report Detail page
4. Explore individual variants for SHAP explanations
5. Switch to Explain Mode for patient-friendly summaries

## Legal Notice

This dataset is provided for demonstration and educational purposes only.
It is not intended for clinical use, medical decision-making, or research publication.
All variant identifiers, patient IDs, and sample IDs are entirely fictional.
"""
    readme_path = os.path.join(OUT, filename)
    with open(readme_path, "w") as f:
        f.write(text)


# ── Main ───────────────────────────────────────────────────────────────────────
def main():
    print("Generating HelixOS demo datasets...")

    datasets = []
    datasets.append(breast_cancer_panel())
    datasets.append(rare_disease_panel())
    datasets.append(cardiovascular_panel())
    datasets.append(pharmacogenomics())
    datasets.append(research_cohort())
    datasets.append(model_evaluation())

    # Write metadata JSON
    all_meta = {
        "datasets": datasets,
        "demo_cases": DEMO_CASES,
        "generated_at": datetime.now().isoformat(),
        "version": "1.0.0",
        "notice": "All data is entirely synthetic. Not real patient data.",
    }
    meta_path = os.path.join(OUT, "demo_library.json")
    with open(meta_path, "w") as f:
        json.dump(all_meta, f, indent=2)
    print(f"  demo_library.json — {len(datasets)} datasets, {len(DEMO_CASES)} demo cases")

    # Write individual metadata JSONs
    for ds in datasets:
        with open(os.path.join(OUT, f"{ds['id']}_meta.json"), "w") as f:
            json.dump(ds, f, indent=2)

    # Write READMEs
    for ds in datasets:
        write_readme(ds, f"{ds['id']}_README.md")

    print(f"\nAll files written to: {OUT}")
    print("Files generated:")
    for f in sorted(os.listdir(OUT)):
        size = os.path.getsize(os.path.join(OUT, f))
        print(f"  {f:45s} {size:>8,} bytes")


if __name__ == "__main__":
    main()
