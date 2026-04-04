from fastapi import APIRouter, Depends, HTTPException, Query, Header, Response
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import date, timedelta

from ..database import get_db
from ..models import Client, Portfolio, Holding, Goal, LifeEvent, AuditLog, ClientInteraction, Trade
from ..schemas import ClientListItem, Client360, HoldingOut, GoalOut, UrgencyFlag, GoalProjection, ClientCreate, ClientUpdate, PortfolioCreate, GoalCreate, GoalUpdate, LifeEventOut, LifeEventCreate, LifeEventUpdate, derive_risk_category
from ..urgency import compute_urgency, urgency_score
from ..simulation import monte_carlo_goal_probability, find_required_sip
from ..seed_holdings import build_default_holdings, DEFAULT_CASH_BALANCE

router = APIRouter(prefix="/clients", tags=["clients"])


@router.get("", response_model=List[ClientListItem])
def list_clients(
    db: Session = Depends(get_db),
    x_advisor_id: Optional[int] = Header(default=None),
    x_advisor_role: Optional[str] = Header(default=None),
):
    # Superadmin sees all clients; advisor sees only their own; no header = all (fallback)
    # Archived clients are always excluded from the list view
    if x_advisor_id and x_advisor_role != "superadmin":
        clients = db.query(Client).filter(Client.advisor_id == x_advisor_id, Client.is_archived.is_(False)).all()
    else:
        clients = db.query(Client).filter(Client.is_archived.is_(False)).all()
    result = []
    for c in clients:
        portfolio = c.portfolio
        goals = c.goals
        life_events = c.life_events
        flags = compute_urgency(c, portfolio, goals, life_events, c.interactions)
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
            portal_active=c.personal_user_id is not None,
            direct_signup=c.source == "portal",
            needs_advisor=c.advisor_id is None,
        ))
    result.sort(key=lambda x: x.urgency_score, reverse=True)
    return result


@router.get("/{client_id}", response_model=Client360)
def get_client(client_id: int, db: Session = Depends(get_db)):
    client = db.query(Client).filter(Client.id == client_id).first()
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")

    flags = compute_urgency(client, client.portfolio, client.goals, client.life_events, client.interactions)
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


@router.post("", response_model=Client360, status_code=201)
def create_client(
    payload: ClientCreate,
    db: Session = Depends(get_db),
    x_advisor_id: Optional[int] = Header(default=None),
):
    client = Client(
        name=payload.name,
        age=payload.age,
        segment=payload.segment,
        risk_score=payload.risk_score,
        risk_category=derive_risk_category(payload.risk_score),
        phone=payload.phone,
        email=payload.email,
        date_of_birth=payload.date_of_birth,
        address=payload.address,
        city=payload.city,
        pincode=payload.pincode,
        pan_number=payload.pan_number,
        advisor_id=x_advisor_id,  # auto-assign to creating advisor
    )
    db.add(client)
    db.commit()
    db.refresh(client)

    # Auto-seed a starter portfolio with default holdings (10 stocks + 10 MFs + BTC)
    total_seed = sum(h["current_value"] for h in build_default_holdings(0))
    portfolio = Portfolio(client_id=client.id, total_value=total_seed, cash_balance=DEFAULT_CASH_BALANCE)
    db.add(portfolio)
    db.flush()
    holdings_data = build_default_holdings(portfolio.id)
    db.add_all([Holding(**h) for h in holdings_data])
    db.commit()
    db.refresh(client)

    return Client360(
        id=client.id,
        name=client.name,
        age=client.age,
        segment=client.segment,
        risk_score=client.risk_score,
        risk_category=client.risk_category,
        phone=client.phone,
        email=client.email,
        date_of_birth=client.date_of_birth,
        address=client.address,
        city=client.city,
        pincode=client.pincode,
        pan_number=client.pan_number,
        portfolio=None,
        goals=[],
        life_events=[],
        urgency_flags=[],
    )


@router.put("/{client_id}", response_model=Client360)
def update_client(client_id: int, payload: ClientUpdate, db: Session = Depends(get_db)):
    client = db.query(Client).filter(Client.id == client_id).first()
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")

    update_data = payload.model_dump(exclude_unset=True)
    if "risk_score" in update_data:
        update_data["risk_category"] = derive_risk_category(update_data["risk_score"])

    for field, value in update_data.items():
        setattr(client, field, value)

    db.commit()
    db.refresh(client)

    flags = compute_urgency(client, client.portfolio, client.goals, client.life_events, client.interactions)
    return Client360(
        id=client.id,
        name=client.name,
        age=client.age,
        segment=client.segment,
        risk_score=client.risk_score,
        risk_category=client.risk_category,
        phone=client.phone,
        email=client.email,
        date_of_birth=client.date_of_birth,
        address=client.address,
        city=client.city,
        pincode=client.pincode,
        pan_number=client.pan_number,
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


@router.post("/{client_id}/portfolio", response_model=Client360, status_code=201)
def create_portfolio(client_id: int, payload: PortfolioCreate, db: Session = Depends(get_db)):
    client = db.query(Client).filter(Client.id == client_id).first()
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")

    # Remove existing portfolio if present (full replace)
    if client.portfolio:
        db.delete(client.portfolio)
        db.commit()

    total_value = sum(h.current_value for h in payload.holdings)

    portfolio = Portfolio(
        client_id=client_id,
        total_value=total_value,
        equity_pct=payload.equity_pct,
        debt_pct=payload.debt_pct,
        cash_pct=payload.cash_pct,
        target_equity_pct=payload.target_equity_pct,
        target_debt_pct=payload.target_debt_pct,
        target_cash_pct=payload.target_cash_pct,
    )
    db.add(portfolio)
    db.flush()

    for h in payload.holdings:
        current_pct = round((h.current_value / total_value) * 100, 2) if total_value > 0 else 0
        holding = Holding(
            portfolio_id=portfolio.id,
            fund_name=h.fund_name,
            fund_category=h.fund_category,
            fund_house=h.fund_house,
            current_value=h.current_value,
            target_pct=h.target_pct,
            current_pct=current_pct,
        )
        db.add(holding)

    db.commit()
    db.refresh(client)

    flags = compute_urgency(client, client.portfolio, client.goals, client.life_events, client.interactions)
    return Client360(
        id=client.id,
        name=client.name,
        age=client.age,
        segment=client.segment,
        risk_score=client.risk_score,
        risk_category=client.risk_category,
        phone=client.phone,
        email=client.email,
        date_of_birth=client.date_of_birth,
        address=client.address,
        city=client.city,
        pincode=client.pincode,
        pan_number=client.pan_number,
        portfolio=client.portfolio,
        goals=client.goals,
        life_events=client.life_events,
        urgency_flags=flags,
    )


@router.post("/{client_id}/goals", response_model=GoalOut, status_code=201)
def create_goal(client_id: int, payload: GoalCreate, db: Session = Depends(get_db)):
    client = db.query(Client).filter(Client.id == client_id).first()
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")

    portfolio_value = client.portfolio.total_value if client.portfolio else 0
    sim = monte_carlo_goal_probability(
        current_value=portfolio_value,
        monthly_sip=payload.monthly_sip,
        target_amount=payload.target_amount,
        target_date=payload.target_date,
    )

    goal = Goal(
        client_id=client_id,
        goal_name=payload.goal_name,
        target_amount=payload.target_amount,
        target_date=payload.target_date,
        monthly_sip=payload.monthly_sip,
        probability_pct=sim["probability_pct"],
    )
    db.add(goal)
    db.commit()
    db.refresh(goal)
    return goal


@router.put("/{client_id}/goals/{goal_id}", response_model=GoalOut)
def update_goal(client_id: int, goal_id: int, payload: GoalUpdate, db: Session = Depends(get_db)):
    goal = db.query(Goal).filter(Goal.id == goal_id, Goal.client_id == client_id).first()
    if not goal:
        raise HTTPException(status_code=404, detail="Goal not found")
    for field, value in payload.dict(exclude_unset=True).items():
        setattr(goal, field, value)
    client = db.query(Client).filter(Client.id == client_id).first()
    portfolio_value = client.portfolio.total_value if client and client.portfolio else 0
    goal.probability_pct = monte_carlo_goal_probability(
        current_value=portfolio_value,
        monthly_sip=goal.monthly_sip,
        target_amount=goal.target_amount,
        target_date=goal.target_date,
    )["probability_pct"]
    db.commit()
    db.refresh(goal)
    return goal


@router.delete("/{client_id}/goals/{goal_id}")
def delete_goal(client_id: int, goal_id: int, db: Session = Depends(get_db)):
    goal = db.query(Goal).filter(Goal.id == goal_id, Goal.client_id == client_id).first()
    if not goal:
        raise HTTPException(status_code=404, detail="Goal not found")
    db.delete(goal)
    db.commit()
    from fastapi.responses import Response
    return Response(status_code=204)


@router.get("/{client_id}/life-events", response_model=List[LifeEventOut])
def get_life_events(client_id: int, db: Session = Depends(get_db)):
    return db.query(LifeEvent).filter(LifeEvent.client_id == client_id).order_by(LifeEvent.event_date.desc()).all()


@router.post("/{client_id}/life-events", response_model=LifeEventOut, status_code=201)
def create_life_event(client_id: int, payload: LifeEventCreate, db: Session = Depends(get_db)):
    event = LifeEvent(client_id=client_id, **payload.dict())
    db.add(event)
    db.commit()
    db.refresh(event)
    return event


@router.put("/{client_id}/life-events/{event_id}", response_model=LifeEventOut)
def update_life_event(client_id: int, event_id: int, payload: LifeEventUpdate, db: Session = Depends(get_db)):
    event = db.query(LifeEvent).filter(LifeEvent.id == event_id, LifeEvent.client_id == client_id).first()
    if not event:
        raise HTTPException(status_code=404, detail="Life event not found")
    for field, value in payload.dict(exclude_unset=True).items():
        setattr(event, field, value)
    db.commit()
    db.refresh(event)
    return event


@router.delete("/{client_id}/life-events/{event_id}")
def delete_life_event(client_id: int, event_id: int, db: Session = Depends(get_db)):
    event = db.query(LifeEvent).filter(LifeEvent.id == event_id, LifeEvent.client_id == client_id).first()
    if not event:
        raise HTTPException(status_code=404, detail="Life event not found")
    db.delete(event)
    db.commit()
    from fastapi.responses import Response
    return Response(status_code=204)


@router.get("/{client_id}/goal-projection", response_model=List[GoalProjection])
def get_goal_projection(
    client_id: int,
    sip_delta: float = Query(default=0, description="Monthly SIP adjustment in INR (e.g. 10000 = +₹10k/month)"),
    return_rate: float = Query(default=0.12, description="Assumed annual return rate (e.g. 0.12 = 12%)"),
    years_delta: float = Query(default=0, description="Shift in goal timeline in years (e.g. 1 = one year later)"),
    inflation_rate: float = Query(default=0.06, description="Annual inflation rate (e.g. 0.06 = 6%)"),
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

        sim = monte_carlo_goal_probability(
            current_value=portfolio_value,
            monthly_sip=max(adjusted_sip, 0),
            target_amount=goal.target_amount,
            target_date=adjusted_date,
            annual_return_rate=return_rate,
            inflation_rate=inflation_rate,
        )

        req_sip = find_required_sip(
            current_value=portfolio_value,
            target_amount=goal.target_amount,
            target_date=adjusted_date,
            annual_return_rate=return_rate,
            inflation_rate=inflation_rate,
        )

        results.append(GoalProjection(
            goal_id=goal.id,
            goal_name=goal.goal_name,
            target_amount=goal.target_amount,
            real_target=sim["real_target"],
            target_date=adjusted_date,
            base_probability_pct=goal.probability_pct,
            projected_probability_pct=sim["probability_pct"],
            monthly_sip=max(adjusted_sip, 0),
            assumed_return_rate=return_rate,
            inflation_rate=inflation_rate,
            years_to_goal=round(max(years_remaining, 0), 1),
            median_corpus=sim["median_corpus"],
            median_corpus_real=sim["median_corpus_real"],
            required_sip=req_sip,
        ))

    return results


@router.patch("/{client_id}/archive")
def archive_client(
    client_id: int,
    db: Session = Depends(get_db),
):
    """Soft-archive a client. No hard deletes are permitted."""
    client = db.query(Client).filter(Client.id == client_id).first()
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")
    client.is_archived = True
    db.commit()
    return {"archived": True, "client_id": client_id}


@router.patch("/{client_id}/unarchive")
def unarchive_client(
    client_id: int,
    db: Session = Depends(get_db),
):
    """Restore an archived client."""
    client = db.query(Client).filter(Client.id == client_id).first()
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")
    client.is_archived = False
    db.commit()
    return {"archived": False, "client_id": client_id}


@router.patch("/{client_id}/delink")
def delink_client(
    client_id: int,
    db: Session = Depends(get_db),
    x_advisor_id: Optional[int] = Header(default=None),
    x_advisor_role: Optional[str] = Header(default=None),
):
    """Remove advisor assignment from a client. Client remains in system as unassigned."""
    client = db.query(Client).filter(Client.id == client_id).first()
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")
    if x_advisor_role != "superadmin" and client.advisor_id != x_advisor_id:
        raise HTTPException(status_code=403, detail="Not authorised to delink this client")
    client.advisor_id = None
    db.commit()
    return {"id": client_id, "needs_advisor": True}
