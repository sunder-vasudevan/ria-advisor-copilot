from datetime import date
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from typing import Optional, List
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import Goal, Portfolio
from ..personal_models import PersonalUser
from ..auth import get_current_personal_user
from ..simulation import monte_carlo_goal_probability, find_required_sip
from ..schemas import derive_risk_category

router = APIRouter(prefix="/personal/goals", tags=["personal-goals"])


class GoalIn(BaseModel):
    goal_name: str
    target_amount: float
    target_date: date
    monthly_sip: float = 0


class GoalUpdate(BaseModel):
    goal_name: Optional[str] = None
    target_amount: Optional[float] = None
    target_date: Optional[date] = None
    monthly_sip: Optional[float] = None


def _portfolio_value(user_id: int, db: Session) -> float:
    p = db.query(Portfolio).filter(Portfolio.personal_user_id == user_id).first()
    return p.total_value if p else 0


def _goal_out(g: Goal) -> dict:
    return {
        "id": g.id,
        "goal_name": g.goal_name,
        "target_amount": g.target_amount,
        "target_date": g.target_date,
        "monthly_sip": g.monthly_sip,
        "last_sip_date": g.last_sip_date,
        "probability_pct": g.probability_pct,
    }


@router.get("")
def get_goals(
    current_user: PersonalUser = Depends(get_current_personal_user),
    db: Session = Depends(get_db),
):
    goals = db.query(Goal).filter(Goal.personal_user_id == current_user.id).all()
    return [_goal_out(g) for g in goals]


@router.post("", status_code=201)
def create_goal(
    payload: GoalIn,
    current_user: PersonalUser = Depends(get_current_personal_user),
    db: Session = Depends(get_db),
):
    portfolio_value = _portfolio_value(current_user.id, db)
    sim = monte_carlo_goal_probability(
        current_value=portfolio_value,
        monthly_sip=payload.monthly_sip,
        target_amount=payload.target_amount,
        target_date=payload.target_date,
    )
    goal = Goal(
        personal_user_id=current_user.id,
        goal_name=payload.goal_name,
        target_amount=payload.target_amount,
        target_date=payload.target_date,
        monthly_sip=payload.monthly_sip,
        probability_pct=sim["probability_pct"],
    )
    db.add(goal)
    db.commit()
    db.refresh(goal)
    return _goal_out(goal)


@router.put("/{goal_id}")
def update_goal(
    goal_id: int,
    payload: GoalUpdate,
    current_user: PersonalUser = Depends(get_current_personal_user),
    db: Session = Depends(get_db),
):
    goal = db.query(Goal).filter(Goal.id == goal_id, Goal.personal_user_id == current_user.id).first()
    if not goal:
        raise HTTPException(status_code=404, detail="Goal not found")

    for field, value in payload.model_dump(exclude_none=True).items():
        setattr(goal, field, value)

    portfolio_value = _portfolio_value(current_user.id, db)
    goal.probability_pct = monte_carlo_goal_probability(
        current_value=portfolio_value,
        monthly_sip=goal.monthly_sip,
        target_amount=goal.target_amount,
        target_date=goal.target_date,
    )["probability_pct"]

    db.commit()
    db.refresh(goal)
    return _goal_out(goal)


class SimulateIn(BaseModel):
    target_amount: float
    target_date: date
    monthly_sip: float = 0
    return_rate: float = 0.12
    inflation_rate: float = 0.06


@router.post("/simulate")
def simulate_goal(
    payload: SimulateIn,
    current_user: PersonalUser = Depends(get_current_personal_user),
    db: Session = Depends(get_db),
):
    portfolio_value = _portfolio_value(current_user.id, db)
    sim = monte_carlo_goal_probability(
        current_value=portfolio_value,
        monthly_sip=payload.monthly_sip,
        target_amount=payload.target_amount,
        target_date=payload.target_date,
        annual_return_rate=payload.return_rate,
        inflation_rate=payload.inflation_rate,
    )
    req_sip = find_required_sip(
        current_value=portfolio_value,
        target_amount=payload.target_amount,
        target_date=payload.target_date,
        annual_return_rate=payload.return_rate,
        inflation_rate=payload.inflation_rate,
    )
    return {
        "probability_pct": sim["probability_pct"],
        "real_target": sim["real_target"],
        "median_corpus": sim["median_corpus"],
        "median_corpus_real": sim["median_corpus_real"],
        "required_sip": req_sip,
    }


@router.delete("/{goal_id}", status_code=204)
def delete_goal(
    goal_id: int,
    current_user: PersonalUser = Depends(get_current_personal_user),
    db: Session = Depends(get_db),
):
    goal = db.query(Goal).filter(Goal.id == goal_id, Goal.personal_user_id == current_user.id).first()
    if not goal:
        raise HTTPException(status_code=404, detail="Goal not found")
    db.delete(goal)
    db.commit()


@router.get("/projection")
def get_goal_projection(
    sip_delta: float = Query(default=0),
    return_rate: float = Query(default=0.12),
    years_delta: float = Query(default=0),
    inflation_rate: float = Query(default=0.06),
    current_user: PersonalUser = Depends(get_current_personal_user),
    db: Session = Depends(get_db),
):
    goals = db.query(Goal).filter(Goal.personal_user_id == current_user.id).all()
    if not goals:
        return []

    portfolio_value = _portfolio_value(current_user.id, db)
    results = []

    for goal in goals:
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

        results.append({
            "goal_id": goal.id,
            "goal_name": goal.goal_name,
            "target_amount": goal.target_amount,
            "real_target": sim["real_target"],
            "target_date": adjusted_date,
            "base_probability_pct": goal.probability_pct,
            "projected_probability_pct": sim["probability_pct"],
            "monthly_sip": max(adjusted_sip, 0),
            "assumed_return_rate": return_rate,
            "inflation_rate": inflation_rate,
            "years_to_goal": round(max(years_remaining, 0), 1),
            "median_corpus": sim["median_corpus"],
            "median_corpus_real": sim["median_corpus_real"],
            "required_sip": req_sip,
        })

    return results
