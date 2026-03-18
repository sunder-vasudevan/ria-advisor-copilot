import os
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
from sqlalchemy import text

from .database import engine, Base
from .routers import clients, copilot, briefing, situation, meeting_prep, interactions
from .routers import personal_auth, personal_portfolio, personal_goals, personal_life_events, personal_copilot
from . import personal_models  # ensure personal tables registered with Base

load_dotenv()


def _run_personal_migrations():
    """Add personal_user_id FK columns to existing tables (nullable, idempotent)."""
    personal_columns = [
        ("portfolios", "personal_user_id", "INTEGER"),
        ("goals", "personal_user_id", "INTEGER"),
        ("life_events", "personal_user_id", "INTEGER"),
    ]
    with engine.connect() as conn:
        for table, col, col_type in personal_columns:
            try:
                conn.execute(text(f"ALTER TABLE {table} ADD COLUMN {col} {col_type}"))
                conn.commit()
            except Exception:
                pass  # Column already exists


def _run_migrations():
    """Add new columns to existing tables without losing data."""
    new_columns = [
        ("phone", "VARCHAR"),
        ("email", "VARCHAR"),
        ("date_of_birth", "DATE"),
        ("address", "VARCHAR"),
        ("city", "VARCHAR"),
        ("pincode", "VARCHAR"),
        ("pan_number", "VARCHAR"),
    ]
    with engine.connect() as conn:
        for col, col_type in new_columns:
            try:
                conn.execute(text(f"ALTER TABLE clients ADD COLUMN {col} {col_type}"))
                conn.commit()
            except Exception:
                pass  # Column already exists

    # FEAT-E: NAV fields on holdings
    holding_columns = [
        ("units_held", "FLOAT"),
        ("nav_per_unit", "FLOAT"),
    ]
    with engine.connect() as conn:
        for col, col_type in holding_columns:
            try:
                conn.execute(text(f"ALTER TABLE holdings ADD COLUMN {col} {col_type}"))
                conn.commit()
            except Exception:
                pass  # Column already exists


@asynccontextmanager
async def lifespan(app: FastAPI):
    Base.metadata.create_all(bind=engine)  # creates all new tables automatically
    _run_migrations()
    _run_personal_migrations()
    yield


app = FastAPI(
    title="RIA Advisor Copilot API",
    version="1.0.0",
    lifespan=lifespan,
)

# CORS
frontend_url = os.getenv("FRONTEND_URL", "http://localhost:5173")
personal_frontend_url = os.getenv("PERSONAL_FRONTEND_URL", "http://localhost:5174")
app.add_middleware(
    CORSMiddleware,
    allow_origins=[frontend_url, personal_frontend_url, "http://localhost:5173", "http://localhost:5174", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(clients.router)
app.include_router(copilot.router)
app.include_router(briefing.router)
app.include_router(situation.router)
app.include_router(meeting_prep.router)
app.include_router(interactions.router)
app.include_router(personal_auth.router)
app.include_router(personal_portfolio.router)
app.include_router(personal_goals.router)
app.include_router(personal_life_events.router)
app.include_router(personal_copilot.router)


@app.get("/health")
def health():
    return {"status": "ok", "service": "ria-advisor-api"}
