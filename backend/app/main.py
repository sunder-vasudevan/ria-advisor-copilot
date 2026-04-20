import os
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
from sqlalchemy import text

from .database import engine, Base, SessionLocal
from .routers import clients, copilot, briefing, situation, meeting_prep, interactions, trades, notifications
from .routers import personal_auth, personal_portfolio, personal_goals, personal_life_events, personal_copilot
from .routers import advisor_auth, asset_sync, billing, prospects, tasks, prices, kyc
from . import models          # ensure advisors table registered before personal_models
from . import personal_models  # personal_users.advisor_id FK references advisors.id
from .seed_holdings import build_default_holdings, DEFAULT_CASH_BALANCE

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
    """Upsert demo advisors on every deploy — ensures password hashes stay in sync."""
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
            else:
                existing.hashed_password = data["hashed_password"]
        db.commit()
    finally:
        db.close()


def _seed_personal_users_to_advisor():
    """Seed test personal users (Ruben, Kate) and link to Rahul (idempotent)."""
    from .auth import get_password_hash
    with engine.connect() as conn:
        try:
            # Get Rahul's ID
            rahul = conn.execute(text("SELECT id FROM advisors WHERE referral_code = 'RAHUL01' LIMIT 1")).fetchone()
            if not rahul:
                return
            rahul_id = rahul[0]

            # Hash password for both users
            pwd_hash = get_password_hash("demo1234")

            # Upsert Ruben
            conn.execute(text("""
                INSERT INTO personal_users (email, hashed_password, display_name, advisor_id, risk_score, risk_category, created_at)
                VALUES (:email, :pwd, :name, :aid, 5, 'Moderate', CURRENT_TIMESTAMP)
                ON CONFLICT(email) DO UPDATE SET advisor_id = EXCLUDED.advisor_id
            """), {"email": "ruben@aria.demo", "pwd": pwd_hash, "name": "Ruben", "aid": rahul_id})

            # Upsert Kate
            conn.execute(text("""
                INSERT INTO personal_users (email, hashed_password, display_name, advisor_id, risk_score, risk_category, created_at)
                VALUES (:email, :pwd, :name, :aid, 5, 'Moderate', CURRENT_TIMESTAMP)
                ON CONFLICT(email) DO UPDATE SET advisor_id = EXCLUDED.advisor_id
            """), {"email": "kate@aria.demo", "pwd": pwd_hash, "name": "Kate", "aid": rahul_id})

            conn.commit()

            # Now ensure client + portfolio rows exist for both
            for name, email in [("Ruben", "ruben@aria.demo"), ("Kate", "kate@aria.demo")]:
                user_id = conn.execute(
                    text("SELECT id FROM personal_users WHERE email = :email LIMIT 1"),
                    {"email": email}
                ).fetchone()[0]

                # Check if client exists
                client = conn.execute(
                    text("SELECT id FROM clients WHERE personal_user_id = :puid LIMIT 1"),
                    {"puid": user_id}
                ).fetchone()

                if not client:
                    # Create client under Rahul
                    conn.execute(
                        text("""
                            INSERT INTO clients (name, age, segment, risk_score, risk_category, advisor_id, personal_user_id, source)
                            VALUES (:name, 0, 'Retail', 5, 'Moderate', :aid, :puid, 'portal')
                        """),
                        {"name": name, "aid": rahul_id, "puid": user_id}
                    )

                # Check if portfolio exists
                portfolio = conn.execute(
                    text("SELECT id FROM portfolios WHERE personal_user_id = :puid LIMIT 1"),
                    {"puid": user_id}
                ).fetchone()

                if not portfolio:
                    # Get the client ID
                    client_id = conn.execute(
                        text("SELECT id FROM clients WHERE personal_user_id = :puid LIMIT 1"),
                        {"puid": user_id}
                    ).fetchone()[0]

                    # Create portfolio
                    conn.execute(
                        text("""
                            INSERT INTO portfolios (client_id, personal_user_id, total_value, equity_pct, debt_pct, cash_pct, target_equity_pct, target_debt_pct, target_cash_pct)
                            VALUES (:cid, :puid, 0, 0, 0, 100, 60, 30, 10)
                        """),
                        {"cid": client_id, "puid": user_id}
                    )

            conn.commit()
        except Exception as e:
            pass  # Silently fail if migration syntax not supported


def _seed_client_advisor_assignments():
    """Assign all unassigned seeded clients to Rahul (idempotent)."""
    with engine.connect() as conn:
        try:
            conn.execute(text("""
                UPDATE clients
                SET advisor_id = (SELECT id FROM advisors WHERE referral_code = 'RAHUL01' LIMIT 1)
                WHERE advisor_id IS NULL
            """))
            conn.commit()
        except Exception:
            pass


def _migrate_personal_user_scaffolds():
    """One-time migration: for personal users with advisor_id set, create client+portfolio under that advisor."""
    with engine.connect() as conn:
        try:
            # Find personal users with advisor_id but no client row
            users = conn.execute(text("""
                SELECT pu.id, pu.display_name, pu.advisor_id
                FROM personal_users pu
                WHERE pu.advisor_id IS NOT NULL
                AND pu.id NOT IN (SELECT DISTINCT personal_user_id FROM clients WHERE personal_user_id IS NOT NULL)
            """)).fetchall()

            for user_id, display_name, advisor_id in users:
                # Try to match with existing unlinked client under this advisor
                match = conn.execute(
                    text("SELECT id FROM clients WHERE advisor_id = :aid AND personal_user_id IS NULL AND LOWER(name) = LOWER(:name) LIMIT 1"),
                    {"aid": advisor_id, "name": display_name.strip()}
                ).fetchone()

                client_id = None
                if match:
                    client_id = match[0]
                    conn.execute(
                        text("UPDATE clients SET personal_user_id = :puid WHERE id = :cid"),
                        {"puid": user_id, "cid": client_id}
                    )
                else:
                    # Create new client under the advisor
                    conn.execute(
                        text("""
                            INSERT INTO clients (name, age, segment, risk_score, risk_category, advisor_id, personal_user_id, source)
                            VALUES (:name, 0, 'Retail', 5, 'Moderate', :aid, :puid, 'portal')
                        """),
                        {"name": display_name.strip(), "aid": advisor_id, "puid": user_id}
                    )
                    result = conn.execute(
                        text("SELECT id FROM clients WHERE advisor_id = :aid AND personal_user_id = :puid ORDER BY id DESC LIMIT 1"),
                        {"aid": advisor_id, "puid": user_id}
                    ).fetchone()
                    client_id = result[0] if result else None

                # Create portfolio
                if client_id:
                    existing_portfolio = conn.execute(
                        text("SELECT id FROM portfolios WHERE personal_user_id = :puid LIMIT 1"),
                        {"puid": user_id}
                    ).fetchone()
                    if not existing_portfolio:
                        conn.execute(
                            text("""
                                INSERT INTO portfolios (client_id, personal_user_id, total_value, equity_pct, debt_pct, cash_pct, target_equity_pct, target_debt_pct, target_cash_pct)
                                VALUES (:cid, :puid, 0, 0, 0, 100, 60, 30, 10)
                            """),
                            {"cid": client_id, "puid": user_id}
                        )
            conn.commit()
        except Exception:
            pass


def _seed_personal_user_assignments():
    """Ensure all personal users have client + portfolio rows (idempotent, no forced advisor assignment)."""
    with engine.connect() as conn:
        try:
            # Get all personal users without a proper client+portfolio scaffold
            users = conn.execute(text("""
                SELECT pu.id, pu.display_name
                FROM personal_users pu
                WHERE pu.id NOT IN (
                    SELECT DISTINCT personal_user_id FROM portfolios WHERE personal_user_id IS NOT NULL
                )
            """)).fetchall()

            for user_id, display_name in users:
                # Check if client row exists for this personal user
                client_row = conn.execute(
                    text("SELECT id FROM clients WHERE personal_user_id = :puid LIMIT 1"),
                    {"puid": user_id}
                ).fetchone()

                client_id = None
                if client_row:
                    client_id = client_row[0]
                else:
                    # Create standalone client (no advisor forced)
                    conn.execute(
                        text("""
                            INSERT INTO clients (name, age, segment, risk_score, risk_category, advisor_id, personal_user_id, source)
                            VALUES (:name, 0, 'Retail', 5, 'Moderate', NULL, :puid, 'portal')
                        """),
                        {"name": display_name.strip(), "puid": user_id}
                    )

                    # Get the inserted client_id
                    client_id_row = conn.execute(
                        text("SELECT id FROM clients WHERE personal_user_id = :puid ORDER BY id DESC LIMIT 1"),
                        {"puid": user_id}
                    ).fetchone()
                    client_id = client_id_row[0] if client_id_row else None

                # Create portfolio (only if client exists and portfolio doesn't)
                if client_id:
                    existing_portfolio = conn.execute(
                        text("SELECT id FROM portfolios WHERE personal_user_id = :puid LIMIT 1"),
                        {"puid": user_id}
                    ).fetchone()
                    if not existing_portfolio:
                        conn.execute(
                            text("""
                                INSERT INTO portfolios (client_id, personal_user_id, total_value, equity_pct, debt_pct, cash_pct, target_equity_pct, target_debt_pct, target_cash_pct)
                                VALUES (:cid, :puid, 0, 0, 0, 100, 60, 30, 10)
                            """),
                            {"cid": client_id, "puid": user_id}
                        )
            conn.commit()
        except Exception:
            pass


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

    # FEAT-SOURCE: client source tracking
    with engine.connect() as conn:
        try:
            conn.execute(text("ALTER TABLE clients ADD COLUMN source VARCHAR DEFAULT 'advisor'"))
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

    # FEAT-TRADES: tx_hash field for crypto trades
    with engine.connect() as conn:
        try:
            conn.execute(text("ALTER TABLE trades ADD COLUMN tx_hash VARCHAR"))
            conn.commit()
        except Exception:
            pass  # Column already exists or table being created

    # FEAT-ASSET-SDK: extend holdings + new asset_accounts table
    asset_holding_columns = [
        ("asset_type", "VARCHAR DEFAULT 'mutual_fund'"),
        ("asset_code", "VARCHAR"),
        ("price_per_unit", "FLOAT"),
    ]
    with engine.connect() as conn:
        for col, col_type in asset_holding_columns:
            try:
                conn.execute(text(f"ALTER TABLE holdings ADD COLUMN {col} {col_type}"))
                conn.commit()
            except Exception:
                pass  # Already exists

    # make fund_name / fund_category / fund_house nullable (Postgres only — safe to ignore on SQLite)
    with engine.connect() as conn:
        for col in ("fund_name", "fund_category", "fund_house"):
            try:
                conn.execute(text(f"ALTER TABLE holdings ALTER COLUMN {col} DROP NOT NULL"))
                conn.commit()
            except Exception:
                pass

    # FEAT-ARCHIVE: is_archived on clients
    with engine.connect() as conn:
        try:
            conn.execute(text("ALTER TABLE clients ADD COLUMN is_archived BOOLEAN DEFAULT FALSE"))
            conn.commit()
        except Exception:
            pass

    # FEAT-CLIENT-TRADE: cash_balance on portfolios
    with engine.connect() as conn:
        try:
            conn.execute(text("ALTER TABLE portfolios ADD COLUMN cash_balance FLOAT DEFAULT 0.0"))
            conn.commit()
        except Exception:
            pass

    # FEAT-2004: lifecycle_stage on clients
    with engine.connect() as conn:
        try:
            conn.execute(text("ALTER TABLE clients ADD COLUMN lifecycle_stage VARCHAR DEFAULT 'lead'"))
            conn.commit()
        except Exception:
            pass

    # FEAT-2007: cost basis + execution price
    with engine.connect() as conn:
        try:
            conn.execute(text("ALTER TABLE holdings ADD COLUMN IF NOT EXISTS avg_purchase_price FLOAT"))
            conn.execute(text("ALTER TABLE trades ADD COLUMN IF NOT EXISTS execution_price FLOAT"))
            conn.commit()
        except Exception:
            pass


def _run_kyc_migrations():
    """FEAT-KYC: Add KYC fields to clients + create client_documents table (idempotent)."""
    kyc_client_cols = [
        ("kyc_status",        "VARCHAR DEFAULT 'not_started'"),
        ("nominee_name",      "VARCHAR"),
        ("nominee_relation",  "VARCHAR"),
        ("nominee_dob",       "DATE"),
        ("nominee_phone",     "VARCHAR"),
        ("fatca_declaration", "BOOLEAN DEFAULT FALSE"),
        ("fatca_declared_at", "TIMESTAMP"),
    ]
    with engine.connect() as conn:
        for col, col_type in kyc_client_cols:
            try:
                conn.execute(text(f"ALTER TABLE clients ADD COLUMN {col} {col_type}"))
                conn.commit()
            except Exception:
                pass

    with engine.connect() as conn:
        try:
            conn.execute(text("""
                CREATE TABLE IF NOT EXISTS client_documents (
                    id          SERIAL PRIMARY KEY,
                    client_id   INTEGER NOT NULL REFERENCES clients(id),
                    advisor_id  INTEGER NOT NULL REFERENCES advisors(id),
                    doc_type    VARCHAR NOT NULL,
                    file_url    TEXT NOT NULL,
                    file_name   VARCHAR NOT NULL,
                    uploaded_at TIMESTAMP DEFAULT NOW()
                )
            """))
            conn.commit()
        except Exception:
            conn.rollback()


def _run_prospect_task_migrations():
    """Add prospects + advisor_tasks tables and columns (idempotent)."""
    with engine.connect() as conn:
        # prospects table
        try:
            conn.execute(text("""
                CREATE TABLE IF NOT EXISTS prospects (
                    id SERIAL PRIMARY KEY,
                    advisor_id INTEGER NOT NULL REFERENCES advisors(id),
                    name VARCHAR NOT NULL,
                    estimated_aum FLOAT,
                    source VARCHAR,
                    stage VARCHAR NOT NULL DEFAULT 'prospect',
                    notes TEXT,
                    created_at TIMESTAMP DEFAULT NOW(),
                    updated_at TIMESTAMP DEFAULT NOW(),
                    converted_client_id INTEGER REFERENCES clients(id)
                )
            """))
            conn.commit()
        except Exception:
            conn.rollback()

        # advisor_tasks table
        try:
            conn.execute(text("""
                CREATE TABLE IF NOT EXISTS advisor_tasks (
                    id SERIAL PRIMARY KEY,
                    advisor_id INTEGER NOT NULL REFERENCES advisors(id),
                    client_id INTEGER REFERENCES clients(id),
                    prospect_id INTEGER REFERENCES prospects(id),
                    title VARCHAR NOT NULL,
                    due_date DATE,
                    status VARCHAR NOT NULL DEFAULT 'pending',
                    linked_workflow VARCHAR,
                    created_at TIMESTAMP DEFAULT NOW()
                )
            """))
            conn.commit()
        except Exception:
            conn.rollback()


def _backfill_default_holdings():
    """Idempotent: for any portfolio with fewer than 21 holdings, wipe and re-seed with the full default set."""
    with engine.connect() as conn:
        try:
            # Find portfolios that don't have the full 21-instrument set (10 stocks + 10 MFs + BTC)
            portfolios = conn.execute(text("""
                SELECT p.id, p.client_id
                FROM portfolios p
                WHERE (SELECT COUNT(*) FROM holdings h WHERE h.portfolio_id = p.id) < 22
            """)).fetchall()

            for portfolio_id, client_id in portfolios:
                # Clear existing incomplete/stale holdings
                conn.execute(text("DELETE FROM holdings WHERE portfolio_id = :pid"), {"pid": portfolio_id})

                # Seed full default set
                holdings_data = build_default_holdings(portfolio_id)
                for h in holdings_data:
                    conn.execute(
                        text("""
                            INSERT INTO holdings (portfolio_id, asset_code, asset_type, fund_name, fund_category, fund_house,
                                units_held, nav_per_unit, price_per_unit, current_value, target_pct, current_pct)
                            VALUES (:portfolio_id, :asset_code, :asset_type, :fund_name, :fund_category, :fund_house,
                                :units_held, :nav_per_unit, :price_per_unit, :current_value, :target_pct, :current_pct)
                        """),
                        h
                    )

                # Update portfolio cash_balance and total_value
                total_value = sum(h["current_value"] for h in holdings_data)
                conn.execute(
                    text("UPDATE portfolios SET cash_balance = :cb, total_value = :tv WHERE id = :pid"),
                    {"cb": DEFAULT_CASH_BALANCE, "tv": total_value, "pid": portfolio_id}
                )

            conn.commit()
        except Exception as e:
            conn.rollback()
            print(f"_backfill_default_holdings error: {e}")


def _patch_db_enums():
    """Idempotent: add any missing enum values to Postgres enum types."""
    patches = [
        ("assettypeenum", ["stock", "bond", "commodity", "forex"]),
        ("tradestatusenum", ["settled"]),
        ("notificationtypeenum", ["trade_client_submitted"]),
    ]
    with engine.connect() as conn:
        for enum_name, values in patches:
            for val in values:
                try:
                    conn.execute(text(f"ALTER TYPE {enum_name} ADD VALUE IF NOT EXISTS '{val}'"))
                    conn.commit()
                except Exception as e:
                    print(f"[ENUM PATCH] {enum_name}.{val}: {e}")


@asynccontextmanager
async def lifespan(app: FastAPI):
    Base.metadata.create_all(bind=engine)  # creates all new tables automatically
    _patch_db_enums()
    _run_migrations()
    _run_prospect_task_migrations()
    _run_personal_migrations()
    _run_advisor_migrations()
    _seed_advisors()
    _seed_personal_users_to_advisor()      # link test personal users (Ruben, Kate) to Rahul
    _seed_client_advisor_assignments()
    _migrate_personal_user_scaffolds()  # one-time: link existing personal users to advisors
    _seed_personal_user_assignments()   # ongoing: ensure all personal users have basic scaffold
    _backfill_default_holdings()        # backfill any portfolio missing the full 21-instrument set
    _run_kyc_migrations()               # FEAT-KYC: add KYC fields + client_documents table
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
    allow_origins=[frontend_url, personal_frontend_url, "https://a-ria.vercel.app", "https://aria-advisor.vercel.app", "https://aria-personal.vercel.app", "http://localhost:5173", "http://localhost:5174", "http://localhost:3000"],
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
app.include_router(trades.router)
app.include_router(notifications.router)
app.include_router(personal_auth.router)
app.include_router(personal_portfolio.router)
app.include_router(personal_goals.router)
app.include_router(personal_life_events.router)
app.include_router(personal_copilot.router)
app.include_router(advisor_auth.router)
app.include_router(asset_sync.router)
app.include_router(billing.router)
app.include_router(prospects.router)
app.include_router(tasks.router)
app.include_router(prices.router)
app.include_router(kyc.router)


@app.api_route("/health", methods=["GET", "HEAD"])
def health():
    return {"status": "ok", "service": "ria-advisor-api"}
