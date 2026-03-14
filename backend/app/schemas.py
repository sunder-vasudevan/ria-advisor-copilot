from datetime import date, datetime
from typing import List, Optional
from pydantic import BaseModel


# ─── Holding ────────────────────────────────────────────────────────────────

class HoldingOut(BaseModel):
    id: int
    fund_name: str
    fund_category: str
    fund_house: str
    current_value: float
    target_pct: float
    current_pct: float

    class Config:
        from_attributes = True


# ─── Portfolio ───────────────────────────────────────────────────────────────

class PortfolioOut(BaseModel):
    id: int
    total_value: float
    equity_pct: float
    debt_pct: float
    cash_pct: float
    target_equity_pct: float
    target_debt_pct: float
    target_cash_pct: float
    holdings: List[HoldingOut] = []

    class Config:
        from_attributes = True


# ─── Goal ────────────────────────────────────────────────────────────────────

class GoalOut(BaseModel):
    id: int
    goal_name: str
    target_amount: float
    target_date: date
    monthly_sip: float
    last_sip_date: Optional[date]
    probability_pct: float

    class Config:
        from_attributes = True


# ─── Life Event ──────────────────────────────────────────────────────────────

class LifeEventOut(BaseModel):
    id: int
    event_type: str
    event_date: date
    notes: Optional[str]

    class Config:
        from_attributes = True


# ─── Urgency Flag ────────────────────────────────────────────────────────────

class UrgencyFlag(BaseModel):
    label: str        # e.g. "Equity Drift +8%"
    severity: str     # "high" | "medium" | "low"


# ─── Client (list view) ──────────────────────────────────────────────────────

class ClientListItem(BaseModel):
    id: int
    name: str
    age: int
    segment: str
    risk_category: str
    total_value: float
    urgency_flags: List[UrgencyFlag]
    urgency_score: int  # for sorting

    class Config:
        from_attributes = True


# ─── Client 360 ──────────────────────────────────────────────────────────────

class Client360(BaseModel):
    id: int
    name: str
    age: int
    segment: str
    risk_score: int
    risk_category: str
    portfolio: Optional[PortfolioOut]
    goals: List[GoalOut] = []
    life_events: List[LifeEventOut] = []
    urgency_flags: List[UrgencyFlag]

    class Config:
        from_attributes = True


# ─── Copilot ─────────────────────────────────────────────────────────────────

class CopilotRequest(BaseModel):
    message: str
    conversation_history: Optional[List[dict]] = []


class CopilotResponse(BaseModel):
    response: str
    action_type: str = "copilot_query"


# ─── Goal Projection ─────────────────────────────────────────────────────────

class GoalProjection(BaseModel):
    goal_id: int
    goal_name: str
    target_amount: float
    target_date: date
    base_probability_pct: float     # original stored probability
    projected_probability_pct: float  # recalculated with what-if params
    monthly_sip: float              # adjusted SIP used in simulation
    assumed_return_rate: float      # annual return rate used
    years_to_goal: float            # adjusted timeline


# ─── Briefing ────────────────────────────────────────────────────────────────

class BriefingClientSummary(BaseModel):
    client_id: int
    name: str
    segment: str
    total_value: float
    urgency_flags: List[UrgencyFlag]
    summary: str  # AI-generated one-liner


class BriefingResponse(BaseModel):
    rm_id: str
    date: str
    headline: str  # e.g. "5 clients need attention today"
    clients: List[BriefingClientSummary]
    overall_narrative: str  # AI-generated morning brief
