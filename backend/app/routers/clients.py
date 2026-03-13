from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List

from ..database import get_db
from ..models import Client, Portfolio, Holding, Goal, LifeEvent
from ..schemas import ClientListItem, Client360, HoldingOut, GoalOut, UrgencyFlag
from ..urgency import compute_urgency, urgency_score

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
