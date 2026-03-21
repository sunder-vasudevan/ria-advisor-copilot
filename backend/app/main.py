import os
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
from sqlalchemy import text

from .database import engine, Base, SessionLocal
from .routers import clients, copilot, briefing, situation, meeting_prep, interactions
from .routers import personal_auth, personal_portfolio, personal_goals, personal_life_events, personal_copilot
from .routers import advisor_auth
from . import personal_models  # ensure personal tables registered with Base

load_dotenv()



def _run_personal_migrations():
    """Add personal_user_id FK columns to existing tables (nullable, idempotent)."""
    personal_columns = [
        ("portfolios", "personal_user_id", "INTEGER"),
        ("goals", "personal_user_id", "INTEGER"),
        ("life_events", "personal_user_id", "INTEGER"),
        ("personal_users", "advisor_id", "INTEGER"),
    ]
    with engine.connect() as conn:
        for table, col, col_type in personal_columns:
            try:
                conn.execute(text(f"ALTER TABLE {table} ADD COLUMN {col} {col_type}"))
                conn.commit()
            except Exception:
                pass  # Column already exists
        # Make client_id nullable on all tables (was NOT NULL in original schema)
        for table in ("portfolios", "goals", "life_events"):
            try:
                conn.execute(text(f"ALTER TABLE {table} ALTER COLUMN client_id DROP NOT NULL"))
                conn.commit()
            except Exception:
                pass  # Already nullable or column doesn't exist


def _run_advisor_migrations():
    """Add advisor_id to clients table and create advisors table columns (idempotent)."""
    with engine.connect() as conn:
        # advisor_id FK on clients
        try:
            conn.execute(text("ALTER TABLE clients ADD COLUMN advisor_id INTEGER REFERENCES advisors(id)"))
            conn.commit()
        except Exception:
            pass


def _seed_advisors():
    """Seed advisors if not already present. Idempotent."""
    from .models import Advisor
    from .auth import get_password_hash
    db = SessionLocal()
    try:
        advisors_data = [
            {
                "username": "rm_demo",
                "display_name": "Rahul",
                "role": "advisor",
                "city": "Hyderabad",
                "region": "Telangana",
                "referral_code": "RAHUL01",
                "hashed_password": get_password_hash("aria2026"),
            },
            {
                "username": "hamza",
                "display_name": "Hamza",
                "role": "advisor",
                "city": "Lyari",
                "region": "Karachi",
                "referral_code": "HAMZA01",
                "hashed_password": get_password_hash("aria2026"),
            },
            {
                "username": "sunny_hayes",
                "display_name": "Sunny Hayes",
                "role": "superadmin",
                "city": "Hyderabad",
                "region": "Telangana",
                "referral_code": "SUNNY01",
                "hashed_password": get_password_hash("aria2026"),
            },
        ]
        for data in advisors_data:
            existing = db.query(Advisor).filter(Advisor.username == data["username"]).first()
            if not existing:
                db.add(Advisor(**data))
        db.commit()
    finally:
        db.close()


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
    _run_advisor_migrations()
    _seed_advisors()
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
app.include_router(advisor_auth.router)


@app.get("/health")
def health():
    return {"status": "ok", "service": "ria-advisor-api"}
