from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, JSON, Text, Enum as SAEnum
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import enum
from database import Base


class UserRole(str, enum.Enum):
    researcher = "researcher"
    admin = "admin"


class ReportStatus(str, enum.Enum):
    processing = "processing"
    completed = "completed"
    failed = "failed"


class ReviewStatus(str, enum.Enum):
    pending = "pending"
    reviewed = "reviewed"
    flagged = "flagged"


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    name = Column(String, nullable=False)
    role = Column(SAEnum(UserRole), default=UserRole.researcher)
    hashed_password = Column(String, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    reports = relationship("Report", back_populates="user")


class Report(Base):
    __tablename__ = "reports"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    filename = Column(String, nullable=False)
    upload_date = Column(DateTime(timezone=True), server_default=func.now())
    status = Column(SAEnum(ReportStatus), default=ReportStatus.processing)
    total_variants = Column(Integer, default=0)
    pathogenic_count = Column(Integer, default=0)
    benign_count = Column(Integer, default=0)

    user = relationship("User", back_populates="reports")
    variants = relationship("Variant", back_populates="report")


class Variant(Base):
    __tablename__ = "variants"

    id = Column(Integer, primary_key=True, index=True)
    report_id = Column(Integer, ForeignKey("reports.id"), nullable=False)
    gene = Column(String, index=True)
    name = Column(String)
    original_aa = Column(String)
    new_aa = Column(String)
    position = Column(Integer)
    variant_type = Column(String)
    origin = Column(String)
    prediction = Column(String)  # "Pathogenic" or "Benign"
    confidence = Column(Float)
    shap_values = Column(JSON)
    features = Column(JSON)
    clinical_significance = Column(String)
    review_status = Column(SAEnum(ReviewStatus), default=ReviewStatus.pending)
    explanation = Column(Text)

    report = relationship("Report", back_populates="variants")
