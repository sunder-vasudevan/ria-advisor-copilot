from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from ..database import get_db
from ..auth import get_current_advisor_user
from ..models import Household, HouseholdMember, Client, Portfolio

router = APIRouter(prefix="/households", tags=["households"])


# ─── Pydantic schemas ────────────────────────────────────────────────────────

class HouseholdCreate(BaseModel):
    name: str
    client_ids: List[int] = []


class HouseholdRename(BaseModel):
    name: str


class AddMemberRequest(BaseModel):
    client_id: int


class PrivacyToggleRequest(BaseModel):
    show_individual_values: bool


class MemberOut(BaseModel):
    client_id: int
    name: str
    segment: str
    kyc_status: str
    portfolio_value: float
    show_individual_values: bool


class HouseholdSummary(BaseModel):
    id: int
    name: str
    member_count: int
    total_aum: float


class HouseholdDetail(BaseModel):
    id: int
    name: str
    members: List[MemberOut]
    aggregated: dict


# ─── Helpers ─────────────────────────────────────────────────────────────────

def _get_household_or_404(household_id: int, advisor_id: int, db: Session) -> Household:
    h = db.query(Household).filter(
        Household.id == household_id,
        Household.advisor_id == advisor_id,
    ).first()
    if not h:
        raise HTTPException(status_code=404, detail="Household not found")
    return h


def _member_out(member: HouseholdMember) -> dict:
    client = member.client
    portfolio_value = 0.0
    if client.portfolio:
        portfolio_value = client.portfolio.total_value or 0.0
    return {
        "client_id": client.id,
        "name": client.name,
        "segment": client.segment,
        "kyc_status": client.kyc_status,
        "portfolio_value": portfolio_value,
        "show_individual_values": member.show_individual_values,
    }


def _aggregate(members: List[HouseholdMember]) -> dict:
    total_aum = 0.0
    holdings_by_category: dict = {}
    equity_sum = debt_sum = cash_sum = 0.0

    for m in members:
        p: Optional[Portfolio] = m.client.portfolio
        if not p:
            continue
        v = p.total_value or 0.0
        total_aum += v
        equity_sum += v * (p.equity_pct or 0) / 100
        debt_sum += v * (p.debt_pct or 0) / 100
        cash_sum += v * (p.cash_pct or 0) / 100
        for h in p.holdings:
            cat = h.fund_category or h.asset_type or "Other"
            holdings_by_category[cat] = holdings_by_category.get(cat, 0.0) + (h.current_value or 0.0)

    equity_pct = round(equity_sum / total_aum * 100, 1) if total_aum else 0
    debt_pct = round(debt_sum / total_aum * 100, 1) if total_aum else 0
    cash_pct = round(cash_sum / total_aum * 100, 1) if total_aum else 0

    return {
        "total_aum": total_aum,
        "equity_pct": equity_pct,
        "debt_pct": debt_pct,
        "cash_pct": cash_pct,
        "holdings_by_category": holdings_by_category,
    }


# ─── Endpoints ───────────────────────────────────────────────────────────────

@router.get("", response_model=List[HouseholdSummary])
def list_households(
    current_advisor=Depends(get_current_advisor_user),
    db: Session = Depends(get_db),
):
    households = db.query(Household).filter(Household.advisor_id == current_advisor.id).all()
    result = []
    for h in households:
        total_aum = sum(
            (m.client.portfolio.total_value or 0.0)
            for m in h.members if m.client.portfolio
        )
        result.append({
            "id": h.id,
            "name": h.name,
            "member_count": len(h.members),
            "total_aum": total_aum,
        })
    return result


@router.post("", status_code=201)
def create_household(
    body: HouseholdCreate,
    current_advisor=Depends(get_current_advisor_user),
    db: Session = Depends(get_db),
):
    if not body.name.strip():
        raise HTTPException(status_code=400, detail="name is required")

    h = Household(advisor_id=current_advisor.id, name=body.name.strip())
    db.add(h)
    db.flush()

    for client_id in body.client_ids:
        client = db.query(Client).filter(
            Client.id == client_id,
            Client.advisor_id == current_advisor.id,
            Client.is_archived.is_(False),
        ).first()
        if not client:
            continue
        existing = db.query(HouseholdMember).filter(
            HouseholdMember.client_id == client_id
        ).first()
        if existing:
            continue
        db.add(HouseholdMember(household_id=h.id, client_id=client_id))
        client.household_id = h.id

    db.commit()
    db.refresh(h)
    return {"id": h.id, "name": h.name}


@router.get("/{household_id}")
def get_household(
    household_id: int,
    current_advisor=Depends(get_current_advisor_user),
    db: Session = Depends(get_db),
):
    h = _get_household_or_404(household_id, current_advisor.id, db)
    members_out = [_member_out(m) for m in h.members]
    aggregated = _aggregate(h.members)

    goals = []
    for m in h.members:
        for g in m.client.goals:
            goals.append({
                "client_id": m.client.id,
                "client_name": m.client.name,
                "goal_name": g.goal_name,
                "target_amount": g.target_amount,
                "probability_pct": g.probability_pct,
            })

    return {
        "id": h.id,
        "name": h.name,
        "members": members_out,
        "aggregated": aggregated,
        "goals": goals,
    }


@router.put("/{household_id}")
def rename_household(
    household_id: int,
    body: HouseholdRename,
    current_advisor=Depends(get_current_advisor_user),
    db: Session = Depends(get_db),
):
    h = _get_household_or_404(household_id, current_advisor.id, db)
    if not body.name.strip():
        raise HTTPException(status_code=400, detail="name is required")
    h.name = body.name.strip()
    db.commit()
    return {"id": h.id, "name": h.name}


@router.delete("/{household_id}", status_code=204)
def delete_household(
    household_id: int,
    current_advisor=Depends(get_current_advisor_user),
    db: Session = Depends(get_db),
):
    h = _get_household_or_404(household_id, current_advisor.id, db)
    # Unlink all clients before deleting
    for m in h.members:
        m.client.household_id = None
    db.delete(h)
    db.commit()


@router.post("/{household_id}/members", status_code=201)
def add_member(
    household_id: int,
    body: AddMemberRequest,
    current_advisor=Depends(get_current_advisor_user),
    db: Session = Depends(get_db),
):
    h = _get_household_or_404(household_id, current_advisor.id, db)

    client = db.query(Client).filter(
        Client.id == body.client_id,
        Client.advisor_id == current_advisor.id,
        Client.is_archived.is_(False),
    ).first()
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")

    existing = db.query(HouseholdMember).filter(
        HouseholdMember.client_id == body.client_id
    ).first()
    if existing:
        raise HTTPException(status_code=409, detail="Client already belongs to a household")

    db.add(HouseholdMember(household_id=h.id, client_id=body.client_id))
    client.household_id = h.id
    db.commit()
    return {"ok": True}


@router.delete("/{household_id}/members/{client_id}", status_code=204)
def remove_member(
    household_id: int,
    client_id: int,
    current_advisor=Depends(get_current_advisor_user),
    db: Session = Depends(get_db),
):
    h = _get_household_or_404(household_id, current_advisor.id, db)
    member = db.query(HouseholdMember).filter(
        HouseholdMember.household_id == h.id,
        HouseholdMember.client_id == client_id,
    ).first()
    if not member:
        raise HTTPException(status_code=404, detail="Member not found")
    member.client.household_id = None
    db.delete(member)
    db.commit()


@router.patch("/{household_id}/members/{client_id}/privacy")
def toggle_privacy(
    household_id: int,
    client_id: int,
    body: PrivacyToggleRequest,
    current_advisor=Depends(get_current_advisor_user),
    db: Session = Depends(get_db),
):
    h = _get_household_or_404(household_id, current_advisor.id, db)
    member = db.query(HouseholdMember).filter(
        HouseholdMember.household_id == h.id,
        HouseholdMember.client_id == client_id,
    ).first()
    if not member:
        raise HTTPException(status_code=404, detail="Member not found")
    member.show_individual_values = body.show_individual_values
    db.commit()
    return {"ok": True, "show_individual_values": member.show_individual_values}
