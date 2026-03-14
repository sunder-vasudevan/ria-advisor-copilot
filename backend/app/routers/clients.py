from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List
from datetime import date, timedelta

from ..database import get_db
from ..models import Client, Portfolio, Holding, Goal, LifeEvent
from ..schemas import ClientListItem, Client360, HoldingOut, GoalOut, UrgencyFlag, GoalProjection
from ..urgency import compute_urgency, urgency_score
from ..simulation import monte_carlo_goal_probability

router = APIRouter(prefix="/clients", tags=["clients"])


@router.get("", response_model=List[ClientListItem])
def list_clients(db: Session = Depends(get_db)):
    clients = db.query(Client).all()
    result = []
    for c in clients:
        portfolio = c.portfolio
        goals = c.goals
        life_events = c.life_events
        flags = compute_urgency(c, portfolio, goals, life_events)
        score = urgency_score(flags)
        result.append(ClientListItem(
            id=c.id,
            name=c.name,
            age=c.age,
            segment=c.segment,
            risk_category=c.risk_category,
            total_value=portfolio.total_value if portfolio else 0,
            urgency_flags=flags,
            urgency_score=score,
        ))
    result.sort(key=lambda x: x.urgency_score, reverse=True)
    return result


@router.get("/{client_id}", response_model=Client360)
def get_client(client_id: int, db: Session = Depends(get_db)):
    client = db.query(Client).filter(Client.id == client_id).first()
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")

    flags = compute_urgency(client, client.portfolio, client.goals, client.life_events)
    return Client360(
        id=client.id,
        name=client.name,
        age=client.age,
        segment=client.segment,
        risk_score=client.risk_score,
        risk_category=client.risk_category,
        portfolio=client.portfolio,
        goals=client.goals,
        life_events=client.life_events,
        urgency_flags=flags,
    )


@router.get("/{client_id}/holdings", response_model=List[HoldingOut])
def get_holdings(client_id: int, db: Session = Depends(get_db)):
    client = db.query(Client).filter(Client.id == client_id).first()
    if not client or not client.portfolio:
        raise HTTPException(status_code=404, detail="Client or portfolio not found")
    return client.portfolio.holdings


@router.get("/{client_id}/goals", response_model=List[GoalOut])
def get_goals(client_id: int, db: Session = Depends(get_db)):
    client = db.query(Client).filter(Client.id == client_id).first()
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")
    return client.goals


@router.get("/{client_id}/goal-projection", response_model=List[GoalProjection])
def get_goal_projection(
    client_id: int,
    sip_delta: float = Query(default=0, description="Monthly SIP adjustment in INR (e.g. 10000 = +₹10k/month)"),
    return_rate: float = Query(default=0.12, description="Assumed annual return rate (e.g. 0.12 = 12%)"),
    years_delta: float = Query(default=0, description="Shift in goal timeline in years (e.g. 1 = one year later)"),
    db: Session = Depends(get_db),
):
    client = db.query(Client).filter(Client.id == client_id).first()
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")
    if not client.goals:
        return []

    portfolio_value = client.portfolio.total_value if client.portfolio else 0
    results = []

    for goal in client.goals:
        adjusted_sip = goal.monthly_sip + sip_delta
        adjusted_date = date(
            goal.target_date.year + int(years_delta),
            goal.target_date.month,
            goal.target_date.day,
        )
        today = date.today()
        years_remaining = (adjusted_date - today).days / 365.25

        projected_prob = monte_carlo_goal_probability(
            current_value=portfolio_value,
            monthly_sip=max(adjusted_sip, 0),
            target_amount=goal.target_amount,
            target_date=adjusted_date,
            annual_return_rate=return_rate,
        )

        results.append(GoalProjection(
            goal_id=goal.id,
            goal_name=goal.goal_name,
            target_amount=goal.target_amount,
            target_date=adjusted_date,
            base_probability_pct=goal.probability_pct,
            projected_probability_pct=projected_prob,
            monthly_sip=max(adjusted_sip, 0),
            assumed_return_rate=return_rate,
            years_to_goal=round(max(years_remaining, 0), 1),
        ))

    return results
