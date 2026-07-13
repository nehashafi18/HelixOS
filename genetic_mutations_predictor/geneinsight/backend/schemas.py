from pydantic import BaseModel, EmailStr
from typing import Optional, List, Dict, Any
from datetime import datetime
from enum import Enum


class UserRole(str, Enum):
    researcher = "researcher"
    admin = "admin"


class ReportStatus(str, Enum):
    processing = "processing"
    completed = "completed"
    failed = "failed"


class ReviewStatus(str, Enum):
    pending = "pending"
    reviewed = "reviewed"
    flagged = "flagged"


# Auth schemas
class UserCreate(BaseModel):
    email: str
    name: str
    password: str
    role: UserRole = UserRole.researcher


class UserLogin(BaseModel):
    email: str
    password: str


class UserOut(BaseModel):
    id: int
    email: str
    name: str
    role: UserRole
    created_at: datetime

    class Config:
        from_attributes = True


class Token(BaseModel):
    access_token: str
    token_type: str
    user: UserOut


# Variant schemas
class VariantOut(BaseModel):
    id: int
    report_id: int
    gene: Optional[str]
    name: Optional[str]
    original_aa: Optional[str]
    new_aa: Optional[str]
    position: Optional[int]
    variant_type: Optional[str]
    origin: Optional[str]
    prediction: Optional[str]
    confidence: Optional[float]
    shap_values: Optional[Dict[str, float]]
    features: Optional[Dict[str, Any]]
    clinical_significance: Optional[str]
    review_status: ReviewStatus
    explanation: Optional[str]

    class Config:
        from_attributes = True


class VariantListItem(BaseModel):
    id: int
    report_id: int
    gene: Optional[str]
    name: Optional[str]
    original_aa: Optional[str]
    new_aa: Optional[str]
    position: Optional[int]
    prediction: Optional[str]
    confidence: Optional[float]
    clinical_significance: Optional[str]
    review_status: ReviewStatus

    class Config:
        from_attributes = True


# Report schemas
class ReportOut(BaseModel):
    id: int
    user_id: int
    filename: str
    upload_date: datetime
    status: ReportStatus
    total_variants: int
    pathogenic_count: int
    benign_count: int

    class Config:
        from_attributes = True


class ReportWithVariants(ReportOut):
    variants: List[VariantListItem] = []


# Analytics schemas
class OverviewStats(BaseModel):
    total_reports: int
    total_variants: int
    pathogenic_count: int
    benign_count: int
    avg_confidence: float
    high_risk_count: int


class GeneStats(BaseModel):
    gene: str
    total: int
    pathogenic: int
    benign: int


class ConfidenceBucket(BaseModel):
    range: str
    count: int


class FeatureImportance(BaseModel):
    feature: str
    importance: float


# Assistant schemas
class ChatMessage(BaseModel):
    message: str
    report_id: Optional[int] = None
    variant_id: Optional[int] = None


class ChatResponse(BaseModel):
    response: str
    context_used: bool


# Paginated response
class PaginatedVariants(BaseModel):
    items: List[VariantListItem]
    total: int
    page: int
    page_size: int
    pages: int
