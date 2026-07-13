import os
import asyncio
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
import models
import schemas
from database import get_db
from routes.auth import get_current_user

router = APIRouter(prefix="/assistant", tags=["assistant"])

SYSTEM_PROMPT = """You are the HelixOS Research Assistant — a scientific interpretation platform for genetic variant pathogenicity analysis.

CORE PRINCIPLE: Translate machine learning outputs into meaningful biological understanding. Users should understand WHAT changed biologically, not just WHICH features changed numerically.

RESPONSE RULES:
1. Keep responses to 250-400 words. Start with a 1-3 sentence summary, then key points, then detail.
2. NEVER say "HydrophobicityChange = -4.7". Instead say: "The mutation causes a substantial decrease in hydrophobicity, meaning the new amino acid is much more attracted to water than the original. This can disrupt hydrophobic core packing and destabilize protein folding."
3. NEVER say "ChargeChange = -1". Instead say: "The mutation removes a positive charge at this position (e.g., Arginine → Histidine). Charged residues participate in salt bridges — disrupting these can reduce protein stability or alter molecular recognition."
4. For SHAP values: explain which biological property drove the prediction, not just the numerical value.
5. Adapt complexity to the user's indicated reading level prefix in their message if present.
6. Always include a brief note reminding the user this is a research tool and clinical decisions require expert review.
7. Use bullet points or numbered lists for key findings. Avoid markdown headers — use bold text for emphasis instead.
8. When citing biochemical changes, always explain WHY it matters biologically (protein folding, stability, function, binding).

BIOLOGICAL TRANSLATION GUIDE:
- Hydrophobicity change → protein folding, hydrophobic core stability, membrane interactions
- Charge change → salt bridges, electrostatic interactions, DNA/ligand binding, protein stability
- Polarity change → hydrogen bonding, solubility, local protein environment
- Size change → steric clashes or void creation, packing efficiency, structural strain
- Conserved position → functional/structural importance validated across evolution
- High confidence → pattern strongly matches known pathogenic/benign variants in training data

You have access to the user's uploaded variant data and can reference specific predictions and biochemical feature values."""


def build_context(
    db: Session,
    user_id: int,
    report_id: int = None,
    variant_id: int = None,
) -> str:
    """Build context string from variant/report data."""
    context_parts = []

    if variant_id:
        variant = db.query(models.Variant).filter(models.Variant.id == variant_id).first()
        if variant:
            report = db.query(models.Report).filter(
                models.Report.id == variant.report_id,
                models.Report.user_id == user_id,
            ).first()
            if report:
                context_parts.append(f"""
VARIANT CONTEXT:
Gene: {variant.gene}
Mutation: {variant.original_aa}{variant.position}{variant.new_aa}
Prediction: {variant.prediction} (confidence: {round((variant.confidence or 0)*100, 1)}%)
Type: {variant.variant_type}
Origin: {variant.origin}
Clinical Significance: {variant.clinical_significance}
Explanation: {variant.explanation}
""")
                if variant.features:
                    feats = variant.features
                    context_parts.append(f"""
Biochemical Features:
- Hydrophobicity change: {feats.get('HydrophobicityChange', 'N/A')}
- Charge change: {feats.get('ChargeChange', 'N/A')}
- Polarity change: {feats.get('PolarityChange', 'N/A')}
- Size change: {feats.get('SizeChange', 'N/A')}
""")

    elif report_id:
        report = db.query(models.Report).filter(
            models.Report.id == report_id,
            models.Report.user_id == user_id,
        ).first()
        if report:
            context_parts.append(f"""
REPORT CONTEXT:
Filename: {report.filename}
Upload Date: {report.upload_date}
Total Variants: {report.total_variants}
Pathogenic: {report.pathogenic_count}
Benign: {report.benign_count}
Status: {report.status}
""")
            # Add top variants
            top_pathogenic = (
                db.query(models.Variant)
                .filter(
                    models.Variant.report_id == report_id,
                    models.Variant.prediction == "Pathogenic",
                )
                .order_by(models.Variant.confidence.desc())
                .limit(5)
                .all()
            )
            if top_pathogenic:
                context_parts.append("Top Pathogenic Variants:")
                for v in top_pathogenic:
                    context_parts.append(
                        f"  - {v.gene}: {v.original_aa}{v.position}{v.new_aa} "
                        f"(confidence: {round((v.confidence or 0)*100, 1)}%)"
                    )
    else:
        # General user stats
        reports = db.query(models.Report).filter(
            models.Report.user_id == user_id
        ).order_by(models.Report.upload_date.desc()).limit(3).all()

        if reports:
            context_parts.append("USER'S RECENT REPORTS:")
            for r in reports:
                context_parts.append(
                    f"  - {r.filename}: {r.total_variants} variants "
                    f"({r.pathogenic_count} pathogenic, {r.benign_count} benign)"
                )

    return "\n".join(context_parts) if context_parts else ""


@router.post("/chat", response_model=schemas.ChatResponse)
async def chat(
    message: schemas.ChatMessage,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    api_key = os.getenv("ANTHROPIC_API_KEY")
    if not api_key:
        return schemas.ChatResponse(
            response=(
                "The AI assistant is not configured. Please set the ANTHROPIC_API_KEY "
                "environment variable to enable this feature. In the meantime, I can tell you "
                "that your variants are processed using a Random Forest model that analyzes "
                "biochemical properties including hydrophobicity, charge, polarity, and size changes."
            ),
            context_used=False,
        )

    try:
        import anthropic
        client = anthropic.Anthropic(api_key=api_key)

        context = build_context(
            db, current_user.id,
            message.report_id,
            message.variant_id,
        )
        context_used = bool(context)

        user_content = message.message
        if context:
            user_content = f"{context}\n\nUser question: {message.message}"

        def call_claude():
            return client.messages.create(
                model="claude-haiku-4-5-20251001",
                max_tokens=512,
                system=SYSTEM_PROMPT,
                messages=[{"role": "user", "content": user_content}],
            )

        response = await asyncio.to_thread(call_claude)

        return schemas.ChatResponse(
            response=response.content[0].text,
            context_used=context_used,
        )

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Assistant error: {str(e)}")
