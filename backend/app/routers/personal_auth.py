import logging
from fastapi import APIRouter, Depends, HTTPException, status

logger = logging.getLogger(__name__)
from pydantic import BaseModel
from typing import Optional
from sqlalchemy.orm import Session
from sqlalchemy import text

from ..database import get_db
from ..personal_models import PersonalUser
from ..auth import get_password_hash, verify_password, create_access_token, get_current_personal_user
from ..schemas import derive_risk_category

router = APIRouter(prefix="/personal/auth", tags=["personal-auth"])


class RegisterRequest(BaseModel):
    email: str
    password: str
    display_name: str
    referral_code: Optional[str] = None


class LoginRequest(BaseModel):
    email: str
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: dict


def _resolve_advisor_id(referral_code: str, db: Session) -> Optional[int]:
    """Look up advisor_id by referral code via raw SQL (avoids circular ORM import)."""
    if not referral_code:
        return None
    row = db.execute(
        text("SELECT id FROM advisors WHERE referral_code = :code AND is_active = TRUE LIMIT 1"),
        {"code": referral_code.upper()},
    ).fetchone()
    return row[0] if row else None


def _get_advisor_id_for_user(user_id: int, db: Session) -> Optional[int]:
    """Read advisor_id for a personal user via raw SQL."""
    try:
        row = db.execute(
            text("SELECT advisor_id FROM personal_users WHERE id = :uid LIMIT 1"),
            {"uid": user_id},
        ).fetchone()
        return row[0] if row else None
    except Exception:
        return None


def _set_advisor_id(user_id: int, advisor_id: int, db: Session):
    """Set advisor_id on personal_users via raw SQL."""
    db.execute(
        text("UPDATE personal_users SET advisor_id = :aid WHERE id = :uid"),
        {"aid": advisor_id, "uid": user_id},
    )
    db.commit()


def _create_personal_client_and_portfolio(display_name: str, personal_user_id: int, advisor_id: Optional[int], db: Session) -> bool:
    """Create client and portfolio rows for a personal user (idempotent). Advisor link is optional."""
    try:
        # Check if client already exists for this personal user
        existing = db.execute(
            text("SELECT id FROM clients WHERE personal_user_id = :puid LIMIT 1"),
            {"puid": personal_user_id}
        ).fetchone()

        client_id = None
        if existing:
            client_id = existing[0]
        else:
            # Create client row
            if advisor_id:
                # Try to match with existing unlinked client under advisor
                match = db.execute(
                    text("SELECT id FROM clients WHERE advisor_id = :aid AND personal_user_id IS NULL AND LOWER(name) = LOWER(:name) LIMIT 1"),
                    {"aid": advisor_id, "name": display_name.strip()}
                ).fetchone()
                if match:
                    # Link existing client
                    client_id = match[0]
                    db.execute(
                        text("UPDATE clients SET personal_user_id = :puid, source = 'portal' WHERE id = :cid"),
                        {"puid": personal_user_id, "cid": client_id}
                    )
                else:
                    # Create new client under advisor
                    db.execute(
                        text("""
                            INSERT INTO clients (name, age, segment, risk_score, risk_category, advisor_id, personal_user_id, source)
                            VALUES (:name, 0, 'Retail', 5, 'Moderate', :aid, :puid, 'portal')
                        """),
                        {"name": display_name.strip(), "aid": advisor_id, "puid": personal_user_id}
                    )
                    db.flush()  # Ensure INSERT is flushed before SELECT
                    result = db.execute(
                        text("SELECT id FROM clients WHERE advisor_id = :aid AND personal_user_id = :puid ORDER BY id DESC LIMIT 1"),
                        {"aid": advisor_id, "puid": personal_user_id}
                    ).fetchone()
                    client_id = result[0] if result else None
            else:
                # Create standalone client (no advisor)
                db.execute(
                    text("""
                        INSERT INTO clients (name, age, segment, risk_score, risk_category, advisor_id, personal_user_id, source)
                        VALUES (:name, 0, 'Retail', 5, 'Moderate', NULL, :puid, 'portal')
                    """),
                    {"name": display_name.strip(), "puid": personal_user_id}
                )
                db.flush()  # Ensure INSERT is flushed before SELECT
                result = db.execute(
                    text("SELECT id FROM clients WHERE personal_user_id = :puid ORDER BY id DESC LIMIT 1"),
                    {"puid": personal_user_id}
                ).fetchone()
                client_id = result[0] if result else None

        # Ensure portfolio exists
        if client_id:
            existing_portfolio = db.execute(
                text("SELECT id FROM portfolios WHERE personal_user_id = :puid LIMIT 1"),
                {"puid": personal_user_id}
            ).fetchone()
            if not existing_portfolio:
                db.execute(
                    text("""
                        INSERT INTO portfolios (client_id, personal_user_id, total_value, equity_pct, debt_pct, cash_pct, target_equity_pct, target_debt_pct, target_cash_pct)
                        VALUES (:cid, :puid, 0, 0, 0, 100, 60, 30, 10)
                    """),
                    {"cid": client_id, "puid": personal_user_id}
                )
        db.commit()
        return True
    except Exception as e:
        logger.error("_create_personal_client_and_portfolio failed: %s", e)
    return False


def _link_client_by_name(display_name: str, advisor_id: int, personal_user_id: int, db: Session) -> bool:
    """Find existing client by name under advisor and link, or create a new portal client."""
    try:
        row = db.execute(
            text("SELECT id FROM clients WHERE advisor_id = :aid AND personal_user_id IS NULL AND LOWER(name) = LOWER(:name) LIMIT 1"),
            {"aid": advisor_id, "name": display_name.strip()},
        ).fetchone()
        if row:
            # Existing advisor-added client — link and mark portal active
            db.execute(
                text("UPDATE clients SET personal_user_id = :puid WHERE id = :cid"),
                {"puid": personal_user_id, "cid": row[0]},
            )
            # Best-effort: set source if column exists
            try:
                db.execute(text("UPDATE clients SET source = 'portal' WHERE id = :cid"), {"cid": row[0]})
            except Exception:
                pass
        else:
            # No existing record — create a new client row sourced from portal
            db.execute(
                text("""
                    INSERT INTO clients (name, age, segment, risk_score, risk_category, advisor_id, personal_user_id)
                    VALUES (:name, 0, 'Retail', 5, 'Moderate', :aid, :puid)
                """),
                {"name": display_name.strip(), "aid": advisor_id, "puid": personal_user_id},
            )
            # Best-effort: set source if column exists
            try:
                db.execute(
                    text("UPDATE clients SET source = 'portal' WHERE advisor_id = :aid AND personal_user_id = :puid"),
                    {"aid": advisor_id, "puid": personal_user_id},
                )
            except Exception:
                pass
        db.commit()
        return True
    except Exception as e:
        logger.error("_link_client_by_name failed: %s", e)
    return False


@router.post("/register", response_model=TokenResponse, status_code=201)
def register(payload: RegisterRequest, db: Session = Depends(get_db)):
    if len(payload.password) < 8:
        raise HTTPException(status_code=400, detail="Password must be at least 8 characters")
    existing = db.query(PersonalUser).filter(PersonalUser.email == payload.email.lower()).first()
    if existing:
        raise HTTPException(status_code=409, detail="Email already registered")

    user = PersonalUser(
        email=payload.email.lower(),
        hashed_password=get_password_hash(payload.password),
        display_name=payload.display_name.strip(),
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    # Resolve advisor if referral code provided
    advisor_id = None
    if payload.referral_code:
        advisor_id = _resolve_advisor_id(payload.referral_code, db)
        if advisor_id:
            _set_advisor_id(user.id, advisor_id, db)

    # Create client and portfolio rows (advisor linkage is optional)
    _create_personal_client_and_portfolio(payload.display_name, user.id, advisor_id, db)

    token = create_access_token({"sub": user.email, "user_id": user.id})
    return TokenResponse(
        access_token=token,
        user={
            "id": user.id,
            "email": user.email,
            "display_name": user.display_name,
            "advisor_id": advisor_id,
            "advisor_linked": advisor_id is not None,
        },
    )


@router.post("/login", response_model=TokenResponse)
def login(payload: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(PersonalUser).filter(PersonalUser.email == payload.email.lower()).first()
    if not user or not verify_password(payload.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Invalid email or password")

    advisor_id = _get_advisor_id_for_user(user.id, db)
    token = create_access_token({"sub": user.email, "user_id": user.id})
    return TokenResponse(
        access_token=token,
        user={"id": user.id, "email": user.email, "display_name": user.display_name, "advisor_id": advisor_id},
    )


@router.get("/me")
def get_me(current_user: PersonalUser = Depends(get_current_personal_user), db: Session = Depends(get_db)):
    advisor_id = _get_advisor_id_for_user(current_user.id, db)
    advisor_info = None
    if advisor_id:
        row = db.execute(
            text("SELECT id, display_name, city, region, referral_code, avg_rating, rating_count FROM advisors WHERE id = :id LIMIT 1"),
            {"id": advisor_id},
        ).fetchone()
        if row:
            advisor_info = {
                "id": row[0],
                "display_name": row[1],
                "city": row[2],
                "region": row[3],
                "referral_code": row[4],
                "avg_rating": row[5],
                "rating_count": row[6],
            }
    return {
        "id": current_user.id,
        "email": current_user.email,
        "display_name": current_user.display_name,
        "risk_score": current_user.risk_score,
        "risk_category": current_user.risk_category,
        "advisor_id": advisor_id,
        "advisor": advisor_info,
        "created_at": current_user.created_at,
    }


class LinkAdvisorRequest(BaseModel):
    referral_code: str


@router.post("/link-advisor")
def link_advisor(
    payload: LinkAdvisorRequest,
    current_user: PersonalUser = Depends(get_current_personal_user),
    db: Session = Depends(get_db),
):
    """Allow an existing personal user to link themselves to an advisor via referral code."""
    existing_advisor_id = _get_advisor_id_for_user(current_user.id, db)
    if existing_advisor_id:
        raise HTTPException(status_code=400, detail="Already linked to an advisor")

    advisor_id = _resolve_advisor_id(payload.referral_code, db)
    if not advisor_id:
        raise HTTPException(status_code=404, detail="Invalid advisor code")

    _set_advisor_id(current_user.id, advisor_id, db)
    client_linked = _link_client_by_name(current_user.display_name, advisor_id, current_user.id, db)

    # Get advisor info for response
    row = db.execute(
        text("SELECT display_name, city FROM advisors WHERE id = :id LIMIT 1"),
        {"id": advisor_id},
    ).fetchone()

    return {
        "advisor_id": advisor_id,
        "advisor_name": row[0] if row else None,
        "advisor_city": row[1] if row else None,
        "client_linked": client_linked,
    }


@router.put("/profile")
def update_profile(
    payload: dict,
    current_user: PersonalUser = Depends(get_current_personal_user),
    db: Session = Depends(get_db),
):
    if "display_name" in payload:
        current_user.display_name = payload["display_name"].strip()
    if "risk_score" in payload:
        score = int(payload["risk_score"])
        current_user.risk_score = score
        current_user.risk_category = derive_risk_category(score)
    db.commit()
    db.refresh(current_user)
    return {"id": current_user.id, "display_name": current_user.display_name,
            "risk_score": current_user.risk_score, "risk_category": current_user.risk_category}


@router.delete("/test-cleanup")
def cleanup_test_users(db: Session = Depends(get_db)):
    """
    Delete all [TEST] accounts and associated data. Used by E2E teardown after every run.
    Matches: display_name LIKE '[TEST]%' OR email LIKE '%@aria-test.com'
    Also deletes [TEST] clients and all their cascaded data.
    """
    # Resolve IDs
    test_personal_ids = [r[0] for r in db.execute(
        text("SELECT id FROM personal_users WHERE display_name LIKE '[TEST]%' OR email LIKE '%@aria-test.com'")
    ).fetchall()]

    test_client_ids = [r[0] for r in db.execute(
        text("SELECT id FROM clients WHERE name LIKE '[TEST]%'")
    ).fetchall()]

    deleted_trades = 0
    deleted_users = 0
    deleted_clients = 0

    if test_client_ids:
        db.execute(text("DELETE FROM notifications WHERE trade_id IN (SELECT id FROM trades WHERE client_id = ANY(:ids))"), {"ids": test_client_ids})
        db.execute(text("DELETE FROM trade_audit_logs WHERE trade_id IN (SELECT id FROM trades WHERE client_id = ANY(:ids))"), {"ids": test_client_ids})
        deleted_trades += db.execute(text("DELETE FROM trades WHERE client_id = ANY(:ids)"), {"ids": test_client_ids}).rowcount
        db.execute(text("DELETE FROM client_interactions WHERE client_id = ANY(:ids)"), {"ids": test_client_ids})
        db.execute(text("DELETE FROM life_events WHERE client_id = ANY(:ids)"), {"ids": test_client_ids})
        db.execute(text("DELETE FROM goals WHERE client_id = ANY(:ids)"), {"ids": test_client_ids})
        db.execute(text("DELETE FROM holdings WHERE portfolio_id IN (SELECT id FROM portfolios WHERE client_id = ANY(:ids))"), {"ids": test_client_ids})
        db.execute(text("DELETE FROM portfolios WHERE client_id = ANY(:ids)"), {"ids": test_client_ids})
        db.execute(text("DELETE FROM audit_logs WHERE client_id = ANY(:ids)"), {"ids": test_client_ids})
        deleted_clients = db.execute(text("DELETE FROM clients WHERE id = ANY(:ids)"), {"ids": test_client_ids}).rowcount

    if test_personal_ids:
        db.execute(text("DELETE FROM notifications WHERE personal_user_id = ANY(:ids)"), {"ids": test_personal_ids})
        db.execute(text("DELETE FROM life_events WHERE personal_user_id = ANY(:ids)"), {"ids": test_personal_ids})
        db.execute(text("DELETE FROM goals WHERE personal_user_id = ANY(:ids)"), {"ids": test_personal_ids})
        db.execute(text("DELETE FROM holdings WHERE portfolio_id IN (SELECT id FROM portfolios WHERE personal_user_id = ANY(:ids))"), {"ids": test_personal_ids})
        db.execute(text("DELETE FROM portfolios WHERE personal_user_id = ANY(:ids)"), {"ids": test_personal_ids})
        deleted_users = db.execute(text("DELETE FROM personal_users WHERE id = ANY(:ids)"), {"ids": test_personal_ids}).rowcount

    db.commit()
    return {"deleted_clients": deleted_clients, "deleted_users": deleted_users, "deleted_trades": deleted_trades}
