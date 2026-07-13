from dotenv import load_dotenv
load_dotenv()

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from database import engine, SessionLocal
import models
from routes import auth, reports, variants, analytics, assistant, samples, demo
from services.auth_service import seed_demo_users


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    models.Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        seed_demo_users(db)
    finally:
        db.close()
    yield
    # Shutdown


app = FastAPI(
    title="GeneInsight AI API",
    description="Genetic variant pathogenicity prediction API",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(reports.router)
app.include_router(variants.router)
app.include_router(analytics.router)
app.include_router(assistant.router)
app.include_router(samples.router)
app.include_router(demo.router)


@app.get("/health")
def health():
    return {"status": "ok", "service": "GeneInsight AI"}


@app.get("/")
def root():
    return {"message": "GeneInsight AI API v1.0.0", "docs": "/docs"}
