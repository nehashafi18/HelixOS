# Cardiovascular Genetics — HelixOS Demo Dataset

> ⚠️  SYNTHETIC DATA — All data in this file is entirely fictional and generated for demonstration purposes only.
> This dataset does NOT contain real patient data, real clinical results, or real research findings.

## Overview

| Field | Value |
|-------|-------|
| Dataset Name | Cardiovascular Genetics |
| Variants | 80 |
| Format | XLSX |
| Categories | Cardiology, Inherited Heart Disease |
| Genes | MYH7, MYBPC3, LMNA, TTN, KCNH2, RYR2 |

## Purpose

Synthetic cardiomyopathy and arrhythmia variant panel

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
