import re
import io
import pandas as pd
from typing import Optional


# Map from common ClinVar / file column names to internal names
COLUMN_ALIASES = {
    "genesymbol": "gene",
    "gene": "gene",
    "gene_symbol": "gene",
    "name": "name",
    "hgvs": "name",
    "protein_change": "name",
    "variantname": "name",
    "type": "variant_type",
    "varianttype": "variant_type",
    "variant_type": "variant_type",
    "originsimple": "origin",
    "origin": "origin",
    "clinicalsignificance": "clinical_significance",
    "clinical_significance": "clinical_significance",
    "clinsig": "clinical_significance",
    "reviewstatus": "review_status",
    "review_status": "review_status",
    "position": "position",
    "chromosomeposition": "position",
    "pos": "position",
    "original_aa": "original_aa",
    "ref_aa": "original_aa",
    "original": "original_aa",
    "new_aa": "new_aa",
    "alt_aa": "new_aa",
    "alternate": "new_aa",
    "confidence": "confidence",
}

# Amino acid 3-letter to 1-letter map and vice versa
AA_3_TO_1 = {
    "Ala": "A", "Arg": "R", "Asn": "N", "Asp": "D", "Cys": "C",
    "Gln": "Q", "Glu": "E", "Gly": "G", "His": "H", "Ile": "I",
    "Leu": "L", "Lys": "K", "Met": "M", "Phe": "F", "Pro": "P",
    "Ser": "S", "Thr": "T", "Trp": "W", "Tyr": "Y", "Val": "V",
}
AA_1_TO_3 = {v: k for k, v in AA_3_TO_1.items()}

VALID_AAS = set(AA_3_TO_1.keys())


def normalize_aa(aa_str: str) -> Optional[str]:
    """Convert AA code to 3-letter form used in our model."""
    if not aa_str:
        return None
    aa_str = aa_str.strip()

    # Already 3-letter
    if aa_str in VALID_AAS:
        return aa_str

    # 1-letter code
    if len(aa_str) == 1 and aa_str.upper() in AA_1_TO_3:
        return AA_1_TO_3[aa_str.upper()]

    # Try title-case
    aa_title = aa_str[:3].capitalize() if len(aa_str) >= 3 else aa_str.capitalize()
    if aa_title in VALID_AAS:
        return aa_title

    return None


def parse_hgvs_protein(name: str):
    """
    Try to extract original AA, position, new AA from HGVS protein notation.
    E.g.: p.Ala123Arg, p.A123R, NM_xxxx:p.Ala123Arg
    Returns (orig_aa, position, new_aa) or (None, None, None)
    """
    if not name or not isinstance(name, str):
        return None, None, None

    # Remove transcript prefix
    if ":" in name:
        name = name.split(":")[-1]

    # Remove p. prefix
    name = re.sub(r"^p\.", "", name, flags=re.IGNORECASE)

    # Pattern: 3-letter AA + digits + 3-letter AA
    m = re.match(r"([A-Za-z]{3})(\d+)([A-Za-z]{3})", name)
    if m:
        orig = normalize_aa(m.group(1))
        pos = int(m.group(2))
        new = normalize_aa(m.group(3))
        if orig and new:
            return orig, pos, new

    # Pattern: 1-letter AA + digits + 1-letter AA
    m = re.match(r"([A-Z])(\d+)([A-Z])", name)
    if m:
        orig = normalize_aa(m.group(1))
        pos = int(m.group(2))
        new = normalize_aa(m.group(3))
        if orig and new:
            return orig, pos, new

    return None, None, None


def parse_file(file_bytes: bytes, filename: str) -> pd.DataFrame:
    """Parse uploaded CSV, TSV, or Excel file into a normalized DataFrame."""
    ext = filename.rsplit(".", 1)[-1].lower()

    if ext in ("xlsx", "xls"):
        df = pd.read_excel(io.BytesIO(file_bytes))
    elif ext == "tsv":
        df = pd.read_csv(io.BytesIO(file_bytes), sep="\t", low_memory=False)
    else:
        # Try comma, then tab
        try:
            df = pd.read_csv(io.BytesIO(file_bytes), sep=",", low_memory=False)
        except Exception:
            df = pd.read_csv(io.BytesIO(file_bytes), sep="\t", low_memory=False)

    # Normalize column names
    df.columns = [c.strip() for c in df.columns]
    col_map = {}
    for col in df.columns:
        normalized = col.lower().replace(" ", "_").replace("-", "_")
        if normalized in COLUMN_ALIASES:
            col_map[col] = COLUMN_ALIASES[normalized]

    df = df.rename(columns=col_map)

    # Extract orig/new AA and position from 'name' if not already present
    if "name" in df.columns:
        def extract_row(row):
            orig_aa = row.get("original_aa")
            new_aa = row.get("new_aa")
            pos = row.get("position")

            if not orig_aa or not new_aa or pd.isna(orig_aa) or pd.isna(new_aa):
                parsed_orig, parsed_pos, parsed_new = parse_hgvs_protein(str(row.get("name", "")))
                if parsed_orig:
                    orig_aa = parsed_orig
                if parsed_new:
                    new_aa = parsed_new
                if parsed_pos and (not pos or pd.isna(pos)):
                    pos = parsed_pos

            return pd.Series({
                "original_aa": orig_aa,
                "new_aa": new_aa,
                "position": pos,
            })

        extracted = df.apply(extract_row, axis=1)
        df["original_aa"] = extracted["original_aa"]
        df["new_aa"] = extracted["new_aa"]
        df["position"] = extracted["position"]

    # Fill defaults
    if "gene" not in df.columns:
        df["gene"] = "UNKNOWN"
    if "variant_type" not in df.columns:
        df["variant_type"] = "missense_variant"
    if "origin" not in df.columns:
        df["origin"] = "germline"
    if "clinical_significance" not in df.columns:
        df["clinical_significance"] = ""
    if "name" not in df.columns:
        df["name"] = ""
    if "position" not in df.columns:
        df["position"] = 0

    # Drop rows missing critical fields
    df["original_aa"] = df["original_aa"].apply(
        lambda x: normalize_aa(str(x)) if pd.notna(x) else None
    )
    df["new_aa"] = df["new_aa"].apply(
        lambda x: normalize_aa(str(x)) if pd.notna(x) else None
    )
    df = df.dropna(subset=["original_aa", "new_aa"])
    df["position"] = pd.to_numeric(df["position"], errors="coerce").fillna(0).astype(int)

    return df
