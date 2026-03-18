from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, EmailStr
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

    user = PersonalUser(
        email=payload.email.lower(),
        hashed_password=get_password_hash(payload.password),
        display_name=payload.display_name.strip(),
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    token = create_access_token({"sub": user.email, "user_id": user.id})
    return TokenResponse(
        access_token=token,
        user={"id": user.id, "email": user.email, "display_name": user.display_name},
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
        "created_at": current_user.created_at,
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
