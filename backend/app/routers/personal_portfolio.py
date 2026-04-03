from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import List, Optional
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import Portfolio, Holding
from ..personal_models import PersonalUser
from ..auth import get_current_personal_user

router = APIRouter(prefix="/personal/portfolio", tags=["personal-portfolio"])


class HoldingIn(BaseModel):
    fund_name: str
    fund_category: str
    fund_house: str
    current_value: float
    target_pct: float
    units_held: Optional[float] = None
    nav_per_unit: Optional[float] = None


class PortfolioIn(BaseModel):
    equity_pct: float
    debt_pct: float
    cash_pct: float
    target_equity_pct: float
    target_debt_pct: float
    target_cash_pct: float
    holdings: List[HoldingIn]


def _portfolio_out(p: Portfolio) -> dict:
    total = p.total_value or 0
    holdings = []
    for h in p.holdings:
        holdings.append({
            "id": h.id,
            "fund_name": h.fund_name,
            "fund_category": h.fund_category,
            "fund_house": h.fund_house,
            "current_value": h.current_value,
            "target_pct": h.target_pct,
            "current_pct": h.current_pct,
            "units_held": h.units_held,
            "nav_per_unit": h.nav_per_unit,
        })
    return {
        "id": p.id,
        "total_value": total,
        "cash_balance": p.cash_balance or 0.0,
        "equity_pct": p.equity_pct,
        "debt_pct": p.debt_pct,
        "cash_pct": p.cash_pct,
        "target_equity_pct": p.target_equity_pct,
        "target_debt_pct": p.target_debt_pct,
        "target_cash_pct": p.target_cash_pct,
        "holdings": holdings,
    }


@router.get("")
def get_portfolio(
    current_user: PersonalUser = Depends(get_current_personal_user),
    db: Session = Depends(get_db),
):
    p = db.query(Portfolio).filter(Portfolio.personal_user_id == current_user.id).first()
    if not p:
        return None
    return _portfolio_out(p)


@router.post("", status_code=201)
def save_portfolio(
    payload: PortfolioIn,
    current_user: PersonalUser = Depends(get_current_personal_user),
    db: Session = Depends(get_db),
):
    # Full replace — delete existing holdings, upsert portfolio
    p = db.query(Portfolio).filter(Portfolio.personal_user_id == current_user.id).first()

    total_value = sum(h.current_value for h in payload.holdings)

    if p:
        for holding in p.holdings:
            db.delete(holding)
        db.flush()
    else:
        p = Portfolio(personal_user_id=current_user.id)
        db.add(p)

    p.total_value = total_value
    p.equity_pct = payload.equity_pct
    p.debt_pct = payload.debt_pct
    p.cash_pct = payload.cash_pct
    p.target_equity_pct = payload.target_equity_pct
    p.target_debt_pct = payload.target_debt_pct
    p.target_cash_pct = payload.target_cash_pct
    db.flush()

    for h in payload.holdings:
        current_pct = round((h.current_value / total_value * 100), 1) if total_value else 0
        holding = Holding(
            portfolio_id=p.id,
            fund_name=h.fund_name,
            fund_category=h.fund_category,
            fund_house=h.fund_house,
            current_value=h.current_value,
            target_pct=h.target_pct,
            current_pct=current_pct,
            units_held=h.units_held,
            nav_per_unit=h.nav_per_unit,
        )
        db.add(holding)

    db.commit()
    db.refresh(p)
    return _portfolio_out(p)
