from fastapi import APIRouter, Depends, HTTPException, Query, Header, Response
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import date, timedelta, datetime

from ..database import get_db
from ..models import Client, Portfolio, Holding, Goal, LifeEvent, AuditLog, ClientInteraction, Trade, Household
from ..schemas import ClientListItem, Client360, HoldingOut, GoalOut, UrgencyFlag, GoalProjection, ClientCreate, ClientUpdate, PortfolioCreate, GoalCreate, GoalUpdate, LifeEventOut, LifeEventCreate, LifeEventUpdate, derive_risk_category
from ..urgency import compute_urgency, urgency_score
from ..simulation import monte_carlo_goal_probability, find_required_sip
from ..seed_holdings import build_default_holdings, DEFAULT_CASH_BALANCE
from ..auth import get_current_advisor_user

router = APIRouter(prefix="/clients", tags=["clients"])


def _check_client_access(client, advisor_id: int, role: Optional[str] = None):
    """Raise 403 if advisor does not own this client. Superadmin bypasses."""
    if role == "superadmin":
        return
    if client.advisor_id != advisor_id:
        raise HTTPException(status_code=403, detail="Access denied")


def _kyc_fields(client) -> dict:
    return {
        "kyc_status": client.kyc_status or "not_started",
        "nominee_name": client.nominee_name,
        "nominee_relation": client.nominee_relation,
        "nominee_dob": client.nominee_dob,
        "nominee_phone": client.nominee_phone,
        "fatca_declaration": client.fatca_declaration or False,
        "fatca_declared_at": client.fatca_declared_at,
    }


@router.get("", response_model=List[ClientListItem])
def list_clients(
    db: Session = Depends(get_db),
    current_advisor=Depends(get_current_advisor_user),
):
    # Superadmin sees all clients; advisor sees only their own
    # Archived clients are always excluded from the list view
    if current_advisor.role != "superadmin":
        clients = db.query(Client).filter(Client.advisor_id == current_advisor.id, Client.is_archived.is_(False)).all()
    else:
        clients = db.query(Client).filter(Client.is_archived.is_(False)).all()
    household_map = {}
    if clients:
        hh_ids = list({c.household_id for c in clients if c.household_id})
        if hh_ids:
            hhs = db.query(Household).filter(Household.id.in_(hh_ids)).all()
            household_map = {h.id: h.name for h in hhs}

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
            lifecycle_stage=c.lifecycle_stage or "lead",
            kyc_status=c.kyc_status or "not_started",
            household_id=c.household_id,
            household_name=household_map.get(c.household_id) if c.household_id else None,
        ))
    result.sort(key=lambda x: x.urgency_score, reverse=True)
    return result


@router.get("/{client_id}", response_model=Client360)
def get_client(
    client_id: int,
    db: Session = Depends(get_db),
    current_advisor=Depends(get_current_advisor_user),
):
    client = db.query(Client).filter(Client.id == client_id).first()
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")
    _check_client_access(client, current_advisor.id, current_advisor.role)

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
        lifecycle_stage=client.lifecycle_stage or "lead",
        **_kyc_fields(client),
    )


@router.post("", response_model=Client360, status_code=201)
def create_client(
    payload: ClientCreate,
    db: Session = Depends(get_db),
    current_advisor=Depends(get_current_advisor_user),
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
        advisor_id=current_advisor.id,  # auto-assign to creating advisor
        lifecycle_stage=payload.lifecycle_stage or "lead",
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
        lifecycle_stage=client.lifecycle_stage or "lead",
        **_kyc_fields(client),
    )


@router.put("/{client_id}", response_model=Client360)
def update_client(
    client_id: int,
    payload: ClientUpdate,
    db: Session = Depends(get_db),
    current_advisor=Depends(get_current_advisor_user),
):
    client = db.query(Client).filter(Client.id == client_id).first()
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")
    _check_client_access(client, current_advisor.id, current_advisor.role)

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
        lifecycle_stage=client.lifecycle_stage or "lead",
        **_kyc_fields(client),
    )


def _enrich_holdings_pnl(holdings):
    """Inject computed unrealised_pnl + unrealised_pnl_pct into HoldingOut dicts."""
    result = []
    for h in holdings:
        d = schemas.HoldingOut.model_validate(h).model_dump()
        current_price = h.nav_per_unit or h.price_per_unit
        avg = h.avg_purchase_price
        units = h.units_held or 0.0
        if avg and avg > 0 and current_price and units > 0:
            d["unrealised_pnl"] = round((current_price - avg) * units, 2)
            d["unrealised_pnl_pct"] = round(((current_price - avg) / avg) * 100, 2)
        result.append(d)
    return result


@router.get("/{client_id}/holdings", response_model=List[HoldingOut])
def get_holdings(
    client_id: int,
    db: Session = Depends(get_db),
    current_advisor=Depends(get_current_advisor_user),
):
    client = db.query(Client).filter(Client.id == client_id).first()
    if not client or not client.portfolio:
        raise HTTPException(status_code=404, detail="Client or portfolio not found")
    _check_client_access(client, current_advisor.id, current_advisor.role)
    return _enrich_holdings_pnl(client.portfolio.holdings)


@router.get("/{client_id}/goals", response_model=List[GoalOut])
def get_goals(
    client_id: int,
    db: Session = Depends(get_db),
    current_advisor=Depends(get_current_advisor_user),
):
    client = db.query(Client).filter(Client.id == client_id).first()
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")
    _check_client_access(client, current_advisor.id, current_advisor.role)
    return client.goals


@router.post("/{client_id}/portfolio", response_model=Client360, status_code=201)
def create_portfolio(
    client_id: int,
    payload: PortfolioCreate,
    db: Session = Depends(get_db),
    current_advisor=Depends(get_current_advisor_user),
):
    client = db.query(Client).filter(Client.id == client_id).first()
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")
    _check_client_access(client, current_advisor.id, current_advisor.role)

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
        lifecycle_stage=client.lifecycle_stage or "lead",
        **_kyc_fields(client),
    )


@router.post("/{client_id}/goals", response_model=GoalOut, status_code=201)
def create_goal(
    client_id: int,
    payload: GoalCreate,
    db: Session = Depends(get_db),
    current_advisor=Depends(get_current_advisor_user),
):
    client = db.query(Client).filter(Client.id == client_id).first()
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")
    _check_client_access(client, current_advisor.id, current_advisor.role)

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
def update_goal(
    client_id: int,
    goal_id: int,
    payload: GoalUpdate,
    db: Session = Depends(get_db),
    current_advisor=Depends(get_current_advisor_user),
):
    client = db.query(Client).filter(Client.id == client_id).first()
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")
    _check_client_access(client, current_advisor.id, current_advisor.role)
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
def delete_goal(
    client_id: int,
    goal_id: int,
    db: Session = Depends(get_db),
    current_advisor=Depends(get_current_advisor_user),
):
    client = db.query(Client).filter(Client.id == client_id).first()
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")
    _check_client_access(client, current_advisor.id, current_advisor.role)
    goal = db.query(Goal).filter(Goal.id == goal_id, Goal.client_id == client_id).first()
    if not goal:
        raise HTTPException(status_code=404, detail="Goal not found")
    db.delete(goal)
    db.commit()
    from fastapi.responses import Response
    return Response(status_code=204)


@router.get("/{client_id}/life-events", response_model=List[LifeEventOut])
def get_life_events(
    client_id: int,
    db: Session = Depends(get_db),
    current_advisor=Depends(get_current_advisor_user),
):
    client = db.query(Client).filter(Client.id == client_id).first()
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")
    _check_client_access(client, current_advisor.id, current_advisor.role)
    return db.query(LifeEvent).filter(LifeEvent.client_id == client_id).order_by(LifeEvent.event_date.desc()).all()


@router.post("/{client_id}/life-events", response_model=LifeEventOut, status_code=201)
def create_life_event(
    client_id: int,
    payload: LifeEventCreate,
    db: Session = Depends(get_db),
    current_advisor=Depends(get_current_advisor_user),
):
    client = db.query(Client).filter(Client.id == client_id).first()
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")
    _check_client_access(client, current_advisor.id, current_advisor.role)
    event = LifeEvent(client_id=client_id, **payload.dict())
    db.add(event)
    db.commit()
    db.refresh(event)
    return event


@router.put("/{client_id}/life-events/{event_id}", response_model=LifeEventOut)
def update_life_event(
    client_id: int,
    event_id: int,
    payload: LifeEventUpdate,
    db: Session = Depends(get_db),
    current_advisor=Depends(get_current_advisor_user),
):
    client = db.query(Client).filter(Client.id == client_id).first()
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")
    _check_client_access(client, current_advisor.id, current_advisor.role)
    event = db.query(LifeEvent).filter(LifeEvent.id == event_id, LifeEvent.client_id == client_id).first()
    if not event:
        raise HTTPException(status_code=404, detail="Life event not found")
    for field, value in payload.dict(exclude_unset=True).items():
        setattr(event, field, value)
    db.commit()
    db.refresh(event)
    return event


@router.delete("/{client_id}/life-events/{event_id}")
def delete_life_event(
    client_id: int,
    event_id: int,
    db: Session = Depends(get_db),
    current_advisor=Depends(get_current_advisor_user),
):
    client = db.query(Client).filter(Client.id == client_id).first()
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")
    _check_client_access(client, current_advisor.id, current_advisor.role)
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
    current_advisor=Depends(get_current_advisor_user),
):
    client = db.query(Client).filter(Client.id == client_id).first()
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")
    _check_client_access(client, current_advisor.id, current_advisor.role)
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
    current_advisor=Depends(get_current_advisor_user),
):
    """Soft-archive a client. No hard deletes are permitted."""
    client = db.query(Client).filter(Client.id == client_id).first()
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")
    _check_client_access(client, current_advisor.id, current_advisor.role)
    client.is_archived = True
    db.commit()
    return {"archived": True, "client_id": client_id}


@router.patch("/{client_id}/unarchive")
def unarchive_client(
    client_id: int,
    db: Session = Depends(get_db),
    current_advisor=Depends(get_current_advisor_user),
):
    """Restore an archived client."""
    client = db.query(Client).filter(Client.id == client_id).first()
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")
    _check_client_access(client, current_advisor.id, current_advisor.role)
    client.is_archived = False
    db.commit()
    return {"archived": False, "client_id": client_id}


@router.patch("/{client_id}/delink")
def delink_client(
    client_id: int,
    db: Session = Depends(get_db),
    current_advisor=Depends(get_current_advisor_user),
):
    """Remove advisor assignment from a client. Client remains in system as unassigned."""
    client = db.query(Client).filter(Client.id == client_id).first()
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")
    if current_advisor.role != "superadmin" and client.advisor_id != current_advisor.id:
        raise HTTPException(status_code=403, detail="Not authorised to delink this client")
    client.advisor_id = None
    db.commit()
    return {"id": client_id, "needs_advisor": True}


VALID_LIFECYCLE_STAGES = {"lead", "onboarded", "active", "review_due", "churned"}


@router.patch("/{client_id}/lifecycle")
def update_lifecycle(
    client_id: int,
    payload: dict,
    db: Session = Depends(get_db),
):
    """Update a client's lifecycle stage (FEAT-2004)."""
    stage = payload.get("stage")
    if stage not in VALID_LIFECYCLE_STAGES:
        raise HTTPException(status_code=422, detail=f"Invalid stage. Must be one of: {sorted(VALID_LIFECYCLE_STAGES)}")
    client = db.query(Client).filter(Client.id == client_id).first()
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")
    if stage == "onboarded" and client.advisor_id and client.kyc_status != "verified":
        raise HTTPException(
            status_code=400,
            detail=f"Cannot onboard client until all KYC documents are verified. Current KYC status: {client.kyc_status}.",
        )
    client.lifecycle_stage = stage
    db.commit()
    return {"id": client_id, "lifecycle_stage": stage}


@router.get("/{client_id}/portfolio-history")
def get_portfolio_history(
    client_id: int,
    db: Session = Depends(get_db),
    current_advisor=Depends(get_current_advisor_user),
):
    """
    Returns portfolio value over time, derived from settled trades.
    Each data point is a date + cumulative portfolio_value change from settled trades.
    Falls back to a single data point (today's portfolio total_value) if no trade history.
    """
    client = db.query(Client).filter(Client.id == client_id).first()
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")
    _check_client_access(client, current_advisor.id, current_advisor.role)

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

    portfolio = db.query(Portfolio).filter(Portfolio.client_id == client_id).first()
    current_total = portfolio.total_value if portfolio else 0.0

    if not settled_trades:
        return [{"date": date.today().isoformat(), "value": current_total}]

    # Build running total from settled trade values
    running = current_total
    points = []
    # Work backwards: current value minus trades in reverse gives historical values
    for t in reversed(settled_trades):
        delta = (t.actual_value or t.estimated_value) * (1 if t.action == "buy" else -1)
        running -= delta
        points.append({
            "date": t.settled_at.date().isoformat(),
            "value": round(max(running, 0), 2),
        })
    points.reverse()
    points.append({"date": date.today().isoformat(), "value": round(current_total, 2)})

    # Deduplicate same-day points — keep last value per day
    seen = {}
    for p in points:
        seen[p["date"]] = p["value"]
    return [{"date": d, "value": v} for d, v in sorted(seen.items())]
