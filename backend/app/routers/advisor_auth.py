"""
Advisor authentication router.
V1: validates against the seeded advisors table (bcrypt password check).
Returns advisor profile including location, role, referral_code.
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional

from ..database import get_db
from ..models import Advisor
from ..auth import verify_password

router = APIRouter(prefix="/advisor", tags=["advisor-auth"])


class AdvisorLoginRequest(BaseModel):
    username: str
    password: str


class AdvisorProfile(BaseModel):
    id: int
    username: str
    display_name: str
    role: str
    city: Optional[str]
    region: Optional[str]
    referral_code: Optional[str]
    avg_rating: Optional[float]
    rating_count: Optional[int]

    class Config:
        from_attributes = True


@router.post("/login", response_model=AdvisorProfile)
def advisor_login(payload: AdvisorLoginRequest, db: Session = Depends(get_db)):
    advisor = db.query(Advisor).filter(
        Advisor.username == payload.username,
        Advisor.is_active.is_(True),
    ).first()
    if not advisor or not verify_password(payload.password, advisor.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid username or password",
        )
    return advisor


@router.get("/profile/{username}", response_model=AdvisorProfile)
def get_advisor_profile(username: str, db: Session = Depends(get_db)):
    advisor = db.query(Advisor).filter(Advisor.username == username).first()
    if not advisor:
        raise HTTPException(status_code=404, detail="Advisor not found")
    return advisor


@router.get("/all", response_model=list[AdvisorProfile])
def list_advisors(db: Session = Depends(get_db)):
    """List all active advisors — used for advisor discovery (V2)."""
    return db.query(Advisor).filter(Advisor.is_active.is_(True)).all()
