from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import List, Optional
from sqlalchemy.orm import Session
from datetime import date

from ..database import get_db
from ..models import Portfolio, Holding, Trade, Client, Household, HouseholdMember
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
        current_price = h.nav_per_unit or h.price_per_unit
        avg = h.avg_purchase_price
        units = h.units_held or 0.0
        unrealised_pnl = round((current_price - avg) * units, 2) if (avg and avg > 0 and current_price and units > 0) else None
        unrealised_pnl_pct = round(((current_price - avg) / avg) * 100, 2) if (avg and avg > 0 and current_price) else None
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
            "avg_purchase_price": h.avg_purchase_price,
            "unrealised_pnl": unrealised_pnl,
            "unrealised_pnl_pct": unrealised_pnl_pct,
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


@router.get("/history")
def get_personal_portfolio_history(
    current_user: PersonalUser = Depends(get_current_personal_user),
    db: Session = Depends(get_db),
):
    """Portfolio value over time derived from personal user's settled trades."""
    from sqlalchemy import text as sa_text
    p = db.query(Portfolio).filter(Portfolio.personal_user_id == current_user.id).first()
    current_total = p.total_value if p else 0.0

    # Resolve client_id linked to this personal user
    row = db.execute(
        sa_text("SELECT client_id FROM portfolios WHERE personal_user_id = :uid LIMIT 1"),
        {"uid": current_user.id},
    ).fetchone()
    client_id = row[0] if row else None

    settled_trades = []
    if client_id:
        settled_trades = (
            db.query(Trade)
            .filter(
                Trade.client_id == client_id,
                Trade.status == "settled",
                Trade.settled_at.isnot(None),
            )
            .order_by(Trade.settled_at)
            .all()
        )

    if not settled_trades:
        return [{"date": date.today().isoformat(), "value": current_total}]

    running = current_total
    points = []
    for t in reversed(settled_trades):
        delta = (t.actual_value or t.estimated_value) * (1 if t.action == "buy" else -1)
        running -= delta
        points.append({"date": t.settled_at.date().isoformat(), "value": round(max(running, 0), 2)})
    points.reverse()
    points.append({"date": date.today().isoformat(), "value": round(current_total, 2)})

    seen = {}
    for point in points:
        seen[point["date"]] = point["value"]
    return [{"date": d, "value": v} for d, v in sorted(seen.items())]


@router.get("/household")
def get_personal_household(
    current_user: PersonalUser = Depends(get_current_personal_user),
    db: Session = Depends(get_db),
):
    """Return household summary for the personal user's linked client (if any)."""
    client = db.query(Client).filter(
        Client.personal_user_id == current_user.id,
        Client.is_archived.is_(False),
    ).first()

    if not client or not client.household_id:
        return {"household": None}

    household = db.query(Household).filter(Household.id == client.household_id).first()
    if not household:
        return {"household": None}

    members_out = []
    total_aum = 0.0
    for m in household.members:
        v = (m.client.portfolio.total_value or 0.0) if m.client.portfolio else 0.0
        total_aum += v
        members_out.append({
            "client_id": m.client.id,
            "name": m.client.name,
            "is_me": m.client.id == client.id,
            "portfolio_value": v if m.show_individual_values else None,
            "show_individual_values": m.show_individual_values,
        })

    return {
        "household": {
            "id": household.id,
            "name": household.name,
            "total_aum": total_aum,
            "members": members_out,
        }
    }


@router.patch("/household/privacy")
def toggle_own_privacy(
    body: dict,
    current_user: PersonalUser = Depends(get_current_personal_user),
    db: Session = Depends(get_db),
):
    """Let a personal user toggle their own value visibility within the household."""
    client = db.query(Client).filter(
        Client.personal_user_id == current_user.id,
        Client.is_archived.is_(False),
    ).first()
    if not client or not client.household_id:
        raise HTTPException(status_code=404, detail="Not in a household")

    member = db.query(HouseholdMember).filter(
        HouseholdMember.client_id == client.id,
    ).first()
    if not member:
        raise HTTPException(status_code=404, detail="Household member record not found")

    show = body.get("show_individual_values")
    if show is None:
        raise HTTPException(status_code=400, detail="show_individual_values required")

    member.show_individual_values = bool(show)
    db.commit()
    return {"ok": True, "show_individual_values": member.show_individual_values}
