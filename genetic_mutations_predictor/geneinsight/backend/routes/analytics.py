from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func, case, Integer
from typing import List
import models
import schemas
from database import get_db
from routes.auth import get_current_user

router = APIRouter(prefix="/analytics", tags=["analytics"])


def get_user_variant_query(db: Session, user_id: int):
    user_report_ids = [
        r.id for r in db.query(models.Report.id)
        .filter(models.Report.user_id == user_id)
        .all()
    ]
    return db.query(models.Variant).filter(
        models.Variant.report_id.in_(user_report_ids)
    ), user_report_ids


@router.get("/overview", response_model=schemas.OverviewStats)
def get_overview(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    variant_query, report_ids = get_user_variant_query(db, current_user.id)

    total_reports = db.query(models.Report).filter(
        models.Report.user_id == current_user.id
    ).count()

    total_variants = variant_query.count()
    pathogenic_count = variant_query.filter(
        models.Variant.prediction == "Pathogenic"
    ).count()
    benign_count = variant_query.filter(
        models.Variant.prediction == "Benign"
    ).count()

    avg_conf_result = db.query(func.avg(models.Variant.confidence)).filter(
        models.Variant.report_id.in_(report_ids)
    ).scalar()
    avg_confidence = float(avg_conf_result or 0)

    high_risk_count = db.query(models.Variant).filter(
        models.Variant.report_id.in_(report_ids),
        models.Variant.prediction == "Pathogenic",
        models.Variant.confidence >= 0.85,
    ).count()

    return schemas.OverviewStats(
        total_reports=total_reports,
        total_variants=total_variants,
        pathogenic_count=pathogenic_count,
        benign_count=benign_count,
        avg_confidence=avg_confidence,
        high_risk_count=high_risk_count,
    )


@router.get("/genes", response_model=List[schemas.GeneStats])
def get_gene_stats(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
    limit: int = 10,
):
    _, report_ids = get_user_variant_query(db, current_user.id)
    if not report_ids:
        return []

    results = (
        db.query(
            models.Variant.gene,
            func.count(models.Variant.id).label("total"),
            func.sum(
                case((models.Variant.prediction == "Pathogenic", 1), else_=0)
            ).label("pathogenic"),
        )
        .filter(models.Variant.report_id.in_(report_ids))
        .group_by(models.Variant.gene)
        .order_by(func.count(models.Variant.id).desc())
        .limit(limit)
        .all()
    )

    return [
        schemas.GeneStats(
            gene=row.gene or "Unknown",
            total=row.total,
            pathogenic=int(row.pathogenic or 0),
            benign=row.total - int(row.pathogenic or 0),
        )
        for row in results
    ]


@router.get("/confidence", response_model=List[schemas.ConfidenceBucket])
def get_confidence_distribution(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    _, report_ids = get_user_variant_query(db, current_user.id)
    if not report_ids:
        return []

    variants = db.query(models.Variant.confidence).filter(
        models.Variant.report_id.in_(report_ids),
        models.Variant.confidence.isnot(None),
    ).all()

    buckets = {
        "50-60%": 0, "60-70%": 0, "70-80%": 0, "80-90%": 0, "90-100%": 0
    }
    for (conf,) in variants:
        if conf is not None:
            pct = conf * 100
            if 50 <= pct < 60:
                buckets["50-60%"] += 1
            elif 60 <= pct < 70:
                buckets["60-70%"] += 1
            elif 70 <= pct < 80:
                buckets["70-80%"] += 1
            elif 80 <= pct < 90:
                buckets["80-90%"] += 1
            elif pct >= 90:
                buckets["90-100%"] += 1

    return [schemas.ConfidenceBucket(range=k, count=v) for k, v in buckets.items()]


@router.get("/pathogenicity", response_model=List[schemas.GeneStats])
def get_pathogenicity_by_gene(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
    limit: int = 10,
):
    _, report_ids = get_user_variant_query(db, current_user.id)
    if not report_ids:
        return []

    results = (
        db.query(
            models.Variant.gene,
            func.count(models.Variant.id).label("total"),
            func.sum(
                case((models.Variant.prediction == "Pathogenic", 1), else_=0)
            ).label("pathogenic"),
        )
        .filter(models.Variant.report_id.in_(report_ids))
        .group_by(models.Variant.gene)
        .order_by(func.count(models.Variant.id).desc())
        .limit(limit)
        .all()
    )

    return [
        schemas.GeneStats(
            gene=row.gene or "Unknown",
            total=row.total,
            pathogenic=int(row.pathogenic or 0),
            benign=row.total - int(row.pathogenic or 0),
        )
        for row in results
    ]


@router.get("/features", response_model=List[schemas.FeatureImportance])
def get_feature_importance(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """Return average absolute SHAP values as feature importance.
    Falls back to absolute feature-value averages when SHAP values are absent or all zero."""
    _, report_ids = get_user_variant_query(db, current_user.id)
    if not report_ids:
        return []

    rows = db.query(models.Variant.shap_values, models.Variant.features).filter(
        models.Variant.report_id.in_(report_ids),
    ).limit(500).all()

    if not rows:
        return []

    # Try SHAP values first
    shap_sums: dict = {}
    shap_count = 0
    for (shap_vals, _) in rows:
        if shap_vals and isinstance(shap_vals, dict):
            for feat, val in shap_vals.items():
                shap_sums[feat] = shap_sums.get(feat, 0) + abs(float(val))
            shap_count += 1

    if shap_count > 0 and any(v > 0 for v in shap_sums.values()):
        result = [
            schemas.FeatureImportance(feature=k, importance=round(v / shap_count, 4))
            for k, v in shap_sums.items()
        ]
        result.sort(key=lambda x: x.importance, reverse=True)
        return result[:12]

    # Fallback: use absolute change features from the features JSON column
    CHANGE_FEATURES = [
        "HydrophobicityChange", "ChargeChange", "PolarityChange", "SizeChange",
    ]
    feat_sums: dict = {}
    feat_count = 0
    for (_, features) in rows:
        if features and isinstance(features, dict):
            for key in CHANGE_FEATURES:
                if key in features:
                    feat_sums[key] = feat_sums.get(key, 0) + abs(float(features[key]))
            feat_count += 1

    if feat_count == 0:
        return []

    result = [
        schemas.FeatureImportance(feature=k, importance=round(v / feat_count, 4))
        for k, v in feat_sums.items()
        if v > 0
    ]
    result.sort(key=lambda x: x.importance, reverse=True)
    return result
