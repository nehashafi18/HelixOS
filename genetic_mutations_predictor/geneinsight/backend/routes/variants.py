from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import Optional
import models
import schemas
from database import get_db
from routes.auth import get_current_user

router = APIRouter(prefix="/variants", tags=["variants"])


@router.get("/search", response_model=schemas.PaginatedVariants)
def search_variants(
    q: Optional[str] = Query(None),
    prediction: Optional[str] = Query(None),
    gene: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    # Get report IDs for this user
    user_report_ids = [
        r.id for r in db.query(models.Report.id)
        .filter(models.Report.user_id == current_user.id)
        .all()
    ]

    query = db.query(models.Variant).filter(
        models.Variant.report_id.in_(user_report_ids)
    )

    if q:
        term = f"%{q}%"
        query = query.filter(
            models.Variant.gene.ilike(term) |
            models.Variant.name.ilike(term)
        )
    if prediction:
        query = query.filter(models.Variant.prediction == prediction)
    if gene:
        query = query.filter(models.Variant.gene.ilike(f"%{gene}%"))

    total = query.count()
    items = query.offset((page - 1) * page_size).limit(page_size).all()
    pages = (total + page_size - 1) // page_size

    return schemas.PaginatedVariants(
        items=[schemas.VariantListItem.model_validate(v) for v in items],
        total=total,
        page=page,
        page_size=page_size,
        pages=pages,
    )


@router.get("/{variant_id}", response_model=schemas.VariantOut)
def get_variant(
    variant_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    variant = db.query(models.Variant).filter(models.Variant.id == variant_id).first()
    if not variant:
        raise HTTPException(status_code=404, detail="Variant not found")

    # Ensure user owns the report
    report = db.query(models.Report).filter(
        models.Report.id == variant.report_id,
        models.Report.user_id == current_user.id,
    ).first()
    if not report:
        raise HTTPException(status_code=403, detail="Access denied")

    return variant
