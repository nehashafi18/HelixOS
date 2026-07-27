import pandas as pd
from sklearn.model_selection import train_test_split
from sklearn.metrics import accuracy_score, classification_report
from sklearn.ensemble import RandomForestClassifier
from sklearn.preprocessing import LabelEncoder
import joblib
from sklearn.metrics import roc_auc_score
import shap

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
    "Val": {"charge": 0, "polarity": 0, "size": 1, "hydrophobicity": 4.2}
}

df = pd.read_csv("variant_summary.txt.gz", sep="\t", low_memory=False)

df = df[["GeneSymbol", "Name", "Type", "OriginSimple", "ClinicalSignificance", "ReviewStatus"]]
df = df[df["ClinicalSignificance"].isin(["Pathogenic", "Likely pathogenic", "Benign", "Likely benign"])]
df = df.replace({"Pathogenic": 1, "Likely pathogenic": 1, "Benign": 0, "Likely benign": 0})

df.drop(df[df["Name"].str.contains("p.", regex=False, na=False) == False].index, inplace=True)

df["Original_AA"] = df["Name"].str.extract(r"\(p\.([A-Za-z]{3})")
df["Position"] = df["Name"].str.extract(r"\(p\.[A-Za-z]{3}(\d+)")
df["New_AA"] = df["Name"].str.extract(r"\(p\.[A-Za-z]{3}\d+([A-Za-z]{3})\)")
df = df.rename(columns={"GeneSymbol": "Gene", "OriginSimple": "Origin", "ClinicalSignificance": "Pathogenicity", "ReviewStatus": "Review"})

df.drop(df[df["Original_AA"].isnull() | df["Position"].isnull() | df["New_AA"].isnull()].index, inplace=True)

df["OriginalCharge"] = df["Original_AA"].map({aa: c["charge"] for aa, c in amino_acids.items()})
df["NewCharge"] = df["New_AA"].map({aa: c["charge"] for aa, c in amino_acids.items()})
df["ChargeChange"] = df["NewCharge"] - df["OriginalCharge"]
df["OriginalPolarity"] = df["Original_AA"].map({aa: c["polarity"] for aa, c in amino_acids.items()})
df["NewPolarity"] = df["New_AA"].map({aa: c["polarity"] for aa, c in amino_acids.items()})
df["PolarityChange"] = df["NewPolarity"] - df["OriginalPolarity"]
df["OriginalSize"] = df["Original_AA"].map({aa: c["size"] for aa, c in amino_acids.items()})
df["NewSize"] = df["New_AA"].map({aa: c["size"] for aa, c in amino_acids.items()})
df["SizeChange"] = df["NewSize"] - df["OriginalSize"]
df["OriginalHydrophobicity"] = df["Original_AA"].map({aa: c["hydrophobicity"] for aa, c in amino_acids.items()})
df["NewHydrophobicity"] = df["New_AA"].map({aa: c["hydrophobicity"] for aa, c in amino_acids.items()})
df["HydrophobicityChange"] = df["OriginalHydrophobicity"] - df["NewHydrophobicity"]

df.drop(columns=["Original_AA", "New_AA", "Name"], inplace=True)
df["Position"] = pd.to_numeric(df["Position"])
df.dropna(inplace=True)

# Gene pathogenicity rate: fraction of each gene's variants that are pathogenic.
# Captures prior disease-gene knowledge (BRCA1 ~high, housekeeping genes ~low).
gene_path_rate = df.groupby("Gene")["Pathogenicity"].mean()
gene_pathogenicity_rates = gene_path_rate.to_dict()
joblib.dump(gene_pathogenicity_rates, "gene_pathogenicity_rates.pkl")
print(f"Gene pathogenicity rates computed for {len(gene_pathogenicity_rates)} genes")

# Global median used as fallback for unknown genes at inference time
GLOBAL_MEDIAN_RATE = float(df["Pathogenicity"].mean())
print(f"Global pathogenicity rate (fallback): {GLOBAL_MEDIAN_RATE:.3f}")

df["GenePathogenicityRate"] = df["Gene"].map(gene_pathogenicity_rates)

print(df.shape)

gene_encoder = LabelEncoder()
type_encoder = LabelEncoder()
origin_encoder = LabelEncoder()

df["Gene"] = gene_encoder.fit_transform(df["Gene"])
df["Type"] = type_encoder.fit_transform(df["Type"])
df["Origin"] = origin_encoder.fit_transform(df["Origin"])

joblib.dump(gene_encoder, "gene_encoder.pkl")
joblib.dump(type_encoder, "type_encoder.pkl")
joblib.dump(origin_encoder, "origin_encoder.pkl")

x_value_cols = [
    "OriginalHydrophobicity", "NewHydrophobicity", "HydrophobicityChange",
    "Type", "Origin", "Gene", "Position",
    "OriginalCharge", "NewCharge", "ChargeChange",
    "OriginalPolarity", "NewPolarity", "PolarityChange",
    "OriginalSize", "NewSize", "SizeChange",
    "GenePathogenicityRate",
]
X = df[x_value_cols]
Y = df["Pathogenicity"].astype(int)

for i in range(5):
    X_train, X_test, Y_train, Y_test = train_test_split(X, Y, test_size=0.2)
    rfc = RandomForestClassifier(n_estimators=100, class_weight="balanced", random_state=42)
    rfc.fit(X_train, Y_train)
    rfc_predict = rfc.predict(X_test)
    rfc_prob = rfc.predict_proba(X_test)[:, 1]
    auc = roc_auc_score(Y_test, rfc_prob)
    print("Random Forest:")
    print(f"Accuracy: {accuracy_score(Y_test, rfc_predict):.4f}")
    print(f"ROC-AUC: {auc:.4f}")
    print(classification_report(Y_test, rfc_predict))

importances = pd.Series(rfc.feature_importances_, index=x_value_cols).sort_values(ascending=False)
print("\nFeature importances:")
print(importances)

joblib.dump(rfc, "model.pkl")
print("Model saved.")
