import os
from datetime import datetime, timedelta
from typing import Optional
from jose import JWTError, jwt
from passlib.context import CryptContext
from sqlalchemy.orm import Session
import models
import schemas

SECRET_KEY = os.getenv("SECRET_KEY", "supersecretkey-changeme-in-production")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24 * 7  # 7 days

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def hash_password(password: str) -> str:
    return pwd_context.hash(password)


def verify_password(plain: str, hashed: str) -> bool:
    return pwd_context.verify(plain, hashed)


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    to_encode = data.copy()
    expire = datetime.utcnow() + (expires_delta or timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES))
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)


def decode_token(token: str) -> Optional[dict]:
    try:
        return jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
    except JWTError:
        return None


def get_user_by_email(db: Session, email: str) -> Optional[models.User]:
    return db.query(models.User).filter(models.User.email == email).first()


def get_user_by_id(db: Session, user_id: int) -> Optional[models.User]:
    return db.query(models.User).filter(models.User.id == user_id).first()


def create_user(db: Session, user_in: schemas.UserCreate) -> models.User:
    user = models.User(
        email=user_in.email,
        name=user_in.name,
        role=user_in.role,
        hashed_password=hash_password(user_in.password),
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


def authenticate_user(db: Session, email: str, password: str) -> Optional[models.User]:
    user = get_user_by_email(db, email)
    if not user:
        return None
    if not verify_password(password, user.hashed_password):
        return None
    return user


def seed_demo_users(db: Session):
    """Create demo accounts if they don't exist."""
    demo_accounts = [
        schemas.UserCreate(
            email="researcher@demo.com",
            name="Demo Researcher",
            password="demo123",
            role=schemas.UserRole.researcher,
        ),
        schemas.UserCreate(
            email="admin@demo.com",
            name="Demo Admin",
            password="admin123",
            role=schemas.UserRole.admin,
        ),
    ]
    for account in demo_accounts:
        if not get_user_by_email(db, account.email):
            create_user(db, account)
