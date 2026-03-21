from fastapi import APIRouter, Depends, HTTPException, status
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


def _link_client_by_name(display_name: str, advisor_id: int, personal_user_id: int, db: Session) -> bool:
    """Find a client by name under this advisor and set personal_user_id. Returns True if matched."""
    try:
        row = db.execute(
            text("SELECT id FROM clients WHERE advisor_id = :aid AND personal_user_id IS NULL AND LOWER(name) = LOWER(:name) LIMIT 1"),
            {"aid": advisor_id, "name": display_name.strip()},
        ).fetchone()
        if row:
            db.execute(
                text("UPDATE clients SET personal_user_id = :puid WHERE id = :cid"),
                {"puid": personal_user_id, "cid": row[0]},
            )
            db.commit()
            return True
    except Exception:
        pass
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

    # Link advisor via referral code (raw SQL — advisor_id not in ORM model)
    advisor_id = None
    if payload.referral_code:
        advisor_id = _resolve_advisor_id(payload.referral_code, db)
        if advisor_id:
            _set_advisor_id(user.id, advisor_id, db)
            _link_client_by_name(payload.display_name, advisor_id, user.id, db)

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
    return {
        "id": current_user.id,
        "email": current_user.email,
        "display_name": current_user.display_name,
        "risk_score": current_user.risk_score,
        "risk_category": current_user.risk_category,
        "advisor_id": advisor_id,
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
