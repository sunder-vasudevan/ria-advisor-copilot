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
        Advisor.is_active == True,
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
    return db.query(Advisor).filter(Advisor.is_active == True).all()


@router.get("/debug")
def debug_auth(db: Session = Depends(get_db)):
    """Temporary: diagnose bcrypt verify on Render. Remove after fix confirmed."""
    import bcrypt as _bcrypt
    import sys
    test_pw = "aria2026"
    h = _bcrypt.hashpw(test_pw.encode(), _bcrypt.gensalt())
    h_str = h.decode()
    fresh_verify = _bcrypt.checkpw(test_pw.encode(), h_str.encode())
    advisor = db.query(Advisor).filter(Advisor.username == "rm_demo").first()
    db_hash = advisor.hashed_password if advisor else None
    db_verify = _bcrypt.checkpw(test_pw.encode(), db_hash.encode()) if db_hash else None
    return {
        "bcrypt_version": _bcrypt.__version__,
        "python_version": sys.version,
        "fresh_hash_verify": fresh_verify,
        "db_hash": db_hash,
        "db_hash_verify": db_verify,
    }
