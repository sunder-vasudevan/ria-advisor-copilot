from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from typing import Optional
from sqlalchemy.orm import Session

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


@router.post("/register", response_model=TokenResponse, status_code=201)
def register(payload: RegisterRequest, db: Session = Depends(get_db)):
    if len(payload.password) < 8:
        raise HTTPException(status_code=400, detail="Password must be at least 8 characters")
    existing = db.query(PersonalUser).filter(PersonalUser.email == payload.email.lower()).first()
    if existing:
        raise HTTPException(status_code=409, detail="Email already registered")

    from ..models import Advisor, Client  # lazy import to avoid circular mapper init

    # Resolve referral code → advisor
    advisor_id = None
    if payload.referral_code:
        advisor = db.query(Advisor).filter(
            Advisor.referral_code == payload.referral_code.upper(),
            Advisor.is_active == True,
        ).first()
        if advisor:
            advisor_id = advisor.id

    user = PersonalUser(
        email=payload.email.lower(),
        hashed_password=get_password_hash(payload.password),
        display_name=payload.display_name.strip(),
        advisor_id=advisor_id,
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    # If linked to an advisor, find a matching client record (by name match) and link it
    if advisor_id:
        name_lower = payload.display_name.strip().lower()
        clients = db.query(Client).filter(
            Client.advisor_id == advisor_id,
            Client.personal_user_id == None,
        ).all()
        matched = next((c for c in clients if c.name.lower() == name_lower), None)
        if matched:
            matched.personal_user_id = user.id
            db.commit()

    token = create_access_token({"sub": user.email, "user_id": user.id})
    linked = advisor_id is not None
    return TokenResponse(
        access_token=token,
        user={
            "id": user.id,
            "email": user.email,
            "display_name": user.display_name,
            "advisor_id": user.advisor_id,
            "advisor_linked": linked,
        },
    )


@router.post("/login", response_model=TokenResponse)
def login(payload: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(PersonalUser).filter(PersonalUser.email == payload.email.lower()).first()
    if not user or not verify_password(payload.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Invalid email or password")

    token = create_access_token({"sub": user.email, "user_id": user.id})
    return TokenResponse(
        access_token=token,
        user={"id": user.id, "email": user.email, "display_name": user.display_name},
    )


@router.get("/me")
def get_me(current_user: PersonalUser = Depends(get_current_personal_user)):
    return {
        "id": current_user.id,
        "email": current_user.email,
        "display_name": current_user.display_name,
        "risk_score": current_user.risk_score,
        "risk_category": current_user.risk_category,
        "advisor_id": current_user.advisor_id,
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
    from ..models import Advisor, Client  # lazy import to avoid circular mapper init

    if current_user.advisor_id:
        raise HTTPException(status_code=400, detail="Already linked to an advisor")

    advisor = db.query(Advisor).filter(
        Advisor.referral_code == payload.referral_code.upper(),
        Advisor.is_active == True,
    ).first()
    if not advisor:
        raise HTTPException(status_code=404, detail="Invalid advisor code")

    current_user.advisor_id = advisor.id
    db.commit()

    # Also link matching client record by name
    name_lower = current_user.display_name.lower()
    clients = db.query(Client).filter(
        Client.advisor_id == advisor.id,
        Client.personal_user_id == None,
    ).all()
    matched = next((c for c in clients if c.name.lower() == name_lower), None)
    if matched:
        matched.personal_user_id = current_user.id
        db.commit()

    return {
        "advisor_id": advisor.id,
        "advisor_name": advisor.display_name,
        "advisor_city": advisor.city,
        "client_linked": matched is not None,
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
