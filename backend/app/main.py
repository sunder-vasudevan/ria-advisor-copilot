import os
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

from .database import engine, Base
from .routers import clients, copilot, briefing, situation

load_dotenv()


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Create all tables on startup (SQLite local dev + first-run PostgreSQL)
    Base.metadata.create_all(bind=engine)
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


@app.get("/health")
def health():
    return {"status": "ok", "service": "ria-advisor-api"}
