import io
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Query
from sqlalchemy.orm import Session
from typing import Optional
import models
import schemas
from database import get_db
from routes.auth import get_current_user
from services import parser, ml_service

router = APIRouter(prefix="/reports", tags=["reports"])


@router.post("/upload", response_model=schemas.ReportOut)
async def upload_report(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    allowed_extensions = {"csv", "tsv", "xlsx", "xls"}
    ext = file.filename.rsplit(".", 1)[-1].lower() if "." in file.filename else ""
    if ext not in allowed_extensions:
        raise HTTPException(status_code=400, detail=f"File type '{ext}' not supported. Use CSV, TSV, or XLSX.")

    # Create report record
    report = models.Report(
        user_id=current_user.id,
        filename=file.filename,
        status=models.ReportStatus.processing,
    )
    db.add(report)
    db.commit()
    db.refresh(report)

    try:
        content = await file.read()
        df = parser.parse_file(content, file.filename)

        if df.empty:
            report.status = models.ReportStatus.failed
            db.commit()
            raise HTTPException(status_code=422, detail="No valid variants could be parsed from the file.")

        results = ml_service.process_dataframe(df)

        pathogenic_count = 0
        benign_count = 0

        for r in results:
            variant = models.Variant(
                report_id=report.id,
                gene=r["gene"],
                name=r["name"],
                original_aa=r["original_aa"],
                new_aa=r["new_aa"],
                position=r["position"],
                variant_type=r["variant_type"],
                origin=r["origin"],
                prediction=r["prediction"],
                confidence=r["confidence"],
                shap_values=r["shap_values"],
                features=r["features"],
                clinical_significance=r["clinical_significance"],
                explanation=r["explanation"],
            )
            db.add(variant)
            if r["prediction"] == "Pathogenic":
                pathogenic_count += 1
            else:
                benign_count += 1

        report.total_variants = len(results)
        report.pathogenic_count = pathogenic_count
        report.benign_count = benign_count
        report.status = models.ReportStatus.completed
        db.commit()
        db.refresh(report)

    except HTTPException:
        raise
    except Exception as e:
        report.status = models.ReportStatus.failed
        db.commit()
        raise HTTPException(status_code=500, detail=f"Processing error: {str(e)}")

    return report


@router.get("", response_model=list[schemas.ReportOut])
def list_reports(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    reports = (
        db.query(models.Report)
        .filter(models.Report.user_id == current_user.id)
        .order_by(models.Report.upload_date.desc())
        .all()
    )
    return reports


@router.get("/{report_id}", response_model=schemas.ReportOut)
def get_report(
    report_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    report = db.query(models.Report).filter(
        models.Report.id == report_id,
        models.Report.user_id == current_user.id,
    ).first()
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")
    return report


@router.get("/{report_id}/variants", response_model=schemas.PaginatedVariants)
def get_report_variants(
    report_id: int,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    search: Optional[str] = Query(None),
    prediction: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    report = db.query(models.Report).filter(
        models.Report.id == report_id,
        models.Report.user_id == current_user.id,
    ).first()
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")

    query = db.query(models.Variant).filter(models.Variant.report_id == report_id)

    if search:
        search_term = f"%{search}%"
        query = query.filter(
            models.Variant.gene.ilike(search_term) |
            models.Variant.name.ilike(search_term)
        )
    if prediction:
        query = query.filter(models.Variant.prediction == prediction)

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
