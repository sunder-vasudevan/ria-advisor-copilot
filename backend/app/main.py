import os
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
from sqlalchemy import text

from .database import engine, Base
from .routers import clients, copilot, briefing, situation, meeting_prep, interactions

load_dotenv()


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
    Base.metadata.create_all(bind=engine)  # creates new tables (client_interactions) automatically
    _run_migrations()
    yield


app = FastAPI(
    title="RIA Advisor Copilot API",
    version="1.0.0",
    lifespan=lifespan,
)

# CORS
frontend_url = os.getenv("FRONTEND_URL", "http://localhost:5173")
app.add_middleware(
    CORSMiddleware,
    allow_origins=[frontend_url, "http://localhost:5173", "http://localhost:3000"],
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


@app.get("/health")
def health():
    return {"status": "ok", "service": "ria-advisor-api"}
