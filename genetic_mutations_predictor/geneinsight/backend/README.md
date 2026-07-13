# HelixOS — Genetic Variant Analysis Platform

AI-powered genomic variant interpretation platform that uses machine learning and conversational AI to help researchers analyze and understand genetic mutations.

> **Research use only.** Not a clinical diagnostic tool. All predictions should be reviewed by a qualified clinician.

---

## What it does

HelixOS analyzes genetic variants (amino acid substitutions) and predicts their pathogenicity using a Random Forest model trained on ClinVar data. It explains each prediction in plain language using biological context, SHAP feature attribution, and an AI research assistant powered by Claude.

### Key features

- **Variant analysis** — Upload CSV/Excel files with variant data, get pathogenicity predictions with confidence scores
- **Biological interpretation** — Each variant's biochemical property changes (hydrophobicity, charge, polarity, size) explained in plain language
- **SHAP analysis** — Feature contribution scores show which properties drove each prediction
- **Research Assistant** — Claude-powered chat for asking questions about variants, genes, and results
- **Accessible Summary** — Plain-language report view with read-aloud support (Web Speech API)
- **Analytics dashboard** — Charts for top genes, pathogenicity distribution, confidence scores, and feature importance
- **Demo Library** — 6 synthetic datasets (breast cancer panel, rare disease, cardiovascular, pharmacogenomics, research cohort, model evaluation) for exploration
- **PDF export** — Download full reports or individual variant reports as PDFs
- **Reading level selector** — AI explanations adapt from Simple to Technical based on user preference
- **Dark/light mode**, high contrast mode, large text mode

---

## Tech stack

| Layer | Technology |
|---|---|
| Frontend | React 18, TypeScript, Vite, Tailwind CSS, shadcn/ui |
| Charts | Recharts |
| PDF | jsPDF (core API, no autotable) |
| Backend | FastAPI, Python 3.11 |
| Database | SQLite via SQLAlchemy |
| Auth | JWT (python-jose) |
| ML model | scikit-learn Random Forest |
| AI assistant | Anthropic Claude API |
| Feature attribution | SHAP values |

---

## Project structure

```
geneinsight/
├── backend/
│   ├── main.py                  # FastAPI app entry point
│   ├── models.py                # SQLAlchemy models
│   ├── schemas.py               # Pydantic schemas
│   ├── database.py              # DB session setup
│   ├── routes/
│   │   ├── auth.py              # JWT auth endpoints
│   │   ├── reports.py           # Report upload & retrieval
│   │   ├── variants.py          # Variant detail endpoints
│   │   ├── analytics.py         # Aggregation/chart data
│   │   ├── assistant.py         # Claude AI chat proxy
│   │   ├── samples.py           # Sample file downloads
│   │   └── demo.py              # Demo dataset library
│   ├── services/
│   │   ├── ml_service.py        # Random Forest inference + SHAP
│   │   ├── parser.py            # CSV/Excel variant parser
│   │   └── auth_service.py      # Password hashing, JWT
│   ├── demo_data/               # 6 synthetic datasets (CSV/XLSX)
│   └── generate_demo_data.py    # Script to regenerate demo data
└── frontend/
    └── src/
        ├── pages/               # Route-level components
        ├── components/          # Shared UI components
        ├── hooks/               # useAuth, useTheme, useExplainMode
        └── lib/                 # api.ts, pdfExport.ts, bioInterpretation.ts
```

---

## Running locally

### Prerequisites
- Python 3.11+
- Node.js 18+
- Anthropic API key

### Backend
```bash
cd geneinsight/backend
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt

# Create .env file
echo "ANTHROPIC_API_KEY=your_key_here" > .env
echo "SECRET_KEY=any_random_string" >> .env

uvicorn main:app --reload --port 7001
```

### Frontend
```bash
cd geneinsight/frontend
npm install
npm run dev
# Opens at http://localhost:5173
```

Or use the convenience script from the repo root:
```bash
./geneinsight/start-dev.sh
```

---

## ML model

The Random Forest classifier is trained on ClinVar variant data. Features used:

| Feature | Description |
|---|---|
| HydrophobicityChange | Change in amino acid water-interaction score |
| ChargeChange | Change in amino acid electrical charge |
| PolarityChange | Change in amino acid polarity |
| SizeChange | Change in amino acid side-chain size |
| OriginalAA_* | One-hot encoded original amino acid |
| NewAA_* | One-hot encoded mutant amino acid |
| VariantType_* | Missense, nonsense, frameshift, etc. |
| Origin_* | Germline, somatic, etc. |

SHAP values are computed per-prediction to explain feature contributions.

The trained model (`model.pkl`) and encoders are not tracked in git due to file size (~500MB). They must be generated locally by running the training script or obtained separately.

---

## Notes

- The `.env` file is excluded from version control. Never commit API keys.
- `model.pkl` and `variant_summary.txt.gz` are excluded due to GitHub's 100MB file limit.
- The SQLite database (`geneinsight.db`) is excluded and created fresh on first run.
