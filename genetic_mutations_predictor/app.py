import re
import io
import numpy as np
import pandas as pd
import joblib
import shap
from fastapi import FastAPI, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import HTMLResponse, JSONResponse

app = FastAPI()

app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])

model = joblib.load("model.pkl")
gene_encoder = joblib.load("gene_encoder.pkl")
type_encoder = joblib.load("type_encoder.pkl")
origin_encoder = joblib.load("origin_encoder.pkl")
explainer = shap.TreeExplainer(model)

amino_acids = {
    "Ala": {"charge": 0, "polarity": 0, "size": 0, "hydrophobicity": 1.8},
    "Arg": {"charge": 1, "polarity": 1, "size": 2, "hydrophobicity": -4.5},
    "Asn": {"charge": 0, "polarity": 1, "size": 1, "hydrophobicity": -3.5},
    "Asp": {"charge": -1, "polarity": 1, "size": 1, "hydrophobicity": -3.5},
    "Cys": {"charge": 0, "polarity": 1, "size": 0, "hydrophobicity": 2.5},
    "Gln": {"charge": 0, "polarity": 1, "size": 2, "hydrophobicity": -3.5},
    "Glu": {"charge": -1, "polarity": 1, "size": 2, "hydrophobicity": -3.5},
    "Gly": {"charge": 0, "polarity": 0, "size": 0, "hydrophobicity": -0.4},
    "His": {"charge": 1, "polarity": 1, "size": 1, "hydrophobicity": -3.2},
    "Ile": {"charge": 0, "polarity": 0, "size": 2, "hydrophobicity": 4.5},
    "Leu": {"charge": 0, "polarity": 0, "size": 2, "hydrophobicity": 3.8},
    "Lys": {"charge": 1, "polarity": 1, "size": 2, "hydrophobicity": -3.9},
    "Met": {"charge": 0, "polarity": 0, "size": 2, "hydrophobicity": 1.9},
    "Phe": {"charge": 0, "polarity": 0, "size": 2, "hydrophobicity": 2.8},
    "Pro": {"charge": 0, "polarity": 0, "size": 1, "hydrophobicity": -1.6},
    "Ser": {"charge": 0, "polarity": 1, "size": 0, "hydrophobicity": -0.8},
    "Thr": {"charge": 0, "polarity": 1, "size": 1, "hydrophobicity": -0.7},
    "Trp": {"charge": 0, "polarity": 0, "size": 3, "hydrophobicity": -0.9},
    "Tyr": {"charge": 0, "polarity": 1, "size": 3, "hydrophobicity": -1.3},
    "Val": {"charge": 0, "polarity": 0, "size": 1, "hydrophobicity": 4.2},
}

FEATURE_COLS = [
    "OriginalHydrophobicity", "NewHydrophobicity", "HydrophobicityChange",
    "Type", "Origin", "Gene", "Position",
    "OriginalCharge", "NewCharge", "ChargeChange",
    "OriginalPolarity", "NewPolarity", "PolarityChange",
    "OriginalSize", "NewSize", "SizeChange",
]

FEATURE_LABELS = {
    "OriginalHydrophobicity": "Original Hydrophobicity",
    "NewHydrophobicity": "New Hydrophobicity",
    "HydrophobicityChange": "Hydrophobicity Change",
    "Type": "Variant Type",
    "Origin": "Origin",
    "Gene": "Gene",
    "Position": "Position",
    "OriginalCharge": "Original Charge",
    "NewCharge": "New Charge",
    "ChargeChange": "Charge Change",
    "OriginalPolarity": "Original Polarity",
    "NewPolarity": "New Polarity",
    "PolarityChange": "Polarity Change",
    "OriginalSize": "Original Size",
    "NewSize": "New Size",
    "SizeChange": "Size Change",
}


def safe_encode(encoder, value):
    try:
        return int(encoder.transform([value])[0])
    except ValueError:
        return 0


def parse_hgvs(name):
    orig = re.search(r'\(p\.([A-Za-z]{3})', str(name))
    pos = re.search(r'\(p\.[A-Za-z]{3}(\d+)', str(name))
    new = re.search(r'\(p\.[A-Za-z]{3}\d+([A-Za-z]{3})\)', str(name))
    if orig and pos and new:
        return orig.group(1), int(pos.group(1)), new.group(1)
    return None, None, None


def build_features(orig_aa, new_aa, position, gene, variant_type, origin):
    orig = amino_acids.get(orig_aa)
    new = amino_acids.get(new_aa)
    if not orig or not new:
        return None
    return {
        "OriginalHydrophobicity": orig["hydrophobicity"],
        "NewHydrophobicity": new["hydrophobicity"],
        "HydrophobicityChange": new["hydrophobicity"] - orig["hydrophobicity"],
        "Type": safe_encode(type_encoder, variant_type),
        "Origin": safe_encode(origin_encoder, origin),
        "Gene": safe_encode(gene_encoder, gene),
        "Position": position,
        "OriginalCharge": orig["charge"],
        "NewCharge": new["charge"],
        "ChargeChange": new["charge"] - orig["charge"],
        "OriginalPolarity": orig["polarity"],
        "NewPolarity": new["polarity"],
        "PolarityChange": new["polarity"] - orig["polarity"],
        "OriginalSize": orig["size"],
        "NewSize": new["size"],
        "SizeChange": new["size"] - orig["size"],
    }


def parse_vcf(contents):
    rows = []
    for line in contents.decode("utf-8").splitlines():
        if line.startswith("#") or not line.strip():
            continue
        parts = line.split("\t")
        if len(parts) < 8:
            continue
        info = parts[7]
        p_match = re.search(r'p\.([A-Za-z]{3})(\d+)([A-Za-z]{3})', info)
        gene_match = re.search(r'GENEINFO=([^;|]+)', info)
        if p_match:
            orig, pos, new = p_match.group(1), p_match.group(2), p_match.group(3)
            rows.append({
                "Name": f"(p.{orig}{pos}{new})",
                "Gene": gene_match.group(1) if gene_match else "Unknown",
                "Type": "single nucleotide variant",
                "Origin": "germline",
            })
    return pd.DataFrame(rows) if rows else pd.DataFrame()


def parse_tabular(contents, sep):
    df = pd.read_csv(io.BytesIO(contents), sep=sep, low_memory=False)
    return df.rename(columns={"GeneSymbol": "Gene", "OriginSimple": "Origin"})


@app.get("/")
async def root():
    with open("index.html") as f:
        return HTMLResponse(f.read())


@app.post("/upload")
async def upload(file: UploadFile = File(...)):
    contents = await file.read()
    name = file.filename.lower()

    if name.endswith(".vcf"):
        df = parse_vcf(contents)
    elif name.endswith(".tsv") or name.endswith(".txt") or name.endswith(".gz"):
        df = parse_tabular(contents, "\t")
    else:
        df = parse_tabular(contents, ",")

    if df.empty:
        return JSONResponse({"error": "No variants found in file."}, status_code=400)

    feature_rows = []
    metadata = []

    for _, row in df.iterrows():
        orig_aa, position, new_aa = parse_hgvs(row.get("Name", ""))
        if not orig_aa:
            continue
        gene = str(row.get("Gene", "Unknown"))
        variant_type = str(row.get("Type", "single nucleotide variant"))
        origin = str(row.get("Origin", "germline"))
        features = build_features(orig_aa, new_aa, position, gene, variant_type, origin)
        if features is None:
            continue
        feature_rows.append([features[c] for c in FEATURE_COLS])
        metadata.append({"name": str(row.get("Name", "")), "gene": gene, "original_aa": orig_aa, "position": position, "new_aa": new_aa})

    if not feature_rows:
        return JSONResponse({"error": "No valid missense variants could be parsed."}, status_code=400)

    X = pd.DataFrame(feature_rows, columns=FEATURE_COLS)
    predictions = model.predict(X)
    probabilities = model.predict_proba(X)[:, 1]
    shap_values = explainer.shap_values(X)[1]

    results = []
    for i, meta in enumerate(metadata):
        shap_row = {FEATURE_LABELS[col]: round(float(shap_values[i][j]), 4) for j, col in enumerate(FEATURE_COLS)}
        top_factors = sorted(shap_row.items(), key=lambda x: abs(x[1]), reverse=True)[:5]
        results.append({
            **meta,
            "prediction": "Pathogenic" if predictions[i] == 1 else "Benign",
            "confidence": round(float(probabilities[i]) * 100, 1),
            "shap": shap_row,
            "top_factors": top_factors,
        })

    return {"variants": results}
