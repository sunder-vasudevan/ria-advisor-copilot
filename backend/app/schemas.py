from datetime import date, datetime
from typing import List, Optional
from pydantic import BaseModel


def derive_risk_category(risk_score: int) -> str:
    if risk_score <= 3:
        return "Conservative"
    elif risk_score <= 6:
        return "Moderate"
    return "Aggressive"


# ─── Holding ────────────────────────────────────────────────────────────────

class HoldingOut(BaseModel):
    id: int
    fund_name: str
    fund_category: str
    fund_house: str
    current_value: float
    target_pct: float
    current_pct: float
    units_held: Optional[float] = None
    nav_per_unit: Optional[float] = None

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
    portal_active: bool = False
    direct_signup: bool = False  # True = self-registered via Personal portal
    needs_advisor: bool = False  # True if advisor_id is NULL

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
    phone: Optional[str] = None
    email: Optional[str] = None
    date_of_birth: Optional[date] = None
    address: Optional[str] = None
    city: Optional[str] = None
    pincode: Optional[str] = None
    pan_number: Optional[str] = None
    portfolio: Optional[PortfolioOut]
    goals: List[GoalOut] = []
    life_events: List[LifeEventOut] = []
    urgency_flags: List[UrgencyFlag]

    class Config:
        from_attributes = True


# ─── Portfolio Create ─────────────────────────────────────────────────────────

class HoldingCreate(BaseModel):
    fund_name: str
    fund_category: str
    fund_house: str
    current_value: float
    target_pct: float
    units_held: Optional[float] = None
    nav_per_unit: Optional[float] = None


class PortfolioCreate(BaseModel):
    holdings: List[HoldingCreate]
    equity_pct: float
    debt_pct: float
    cash_pct: float
    target_equity_pct: float
    target_debt_pct: float
    target_cash_pct: float


# ─── Goal Create / Update ─────────────────────────────────────────────────────

class GoalCreate(BaseModel):
    goal_name: str
    target_amount: float
    target_date: date
    monthly_sip: float


class GoalUpdate(BaseModel):
    goal_name: Optional[str] = None
    target_amount: Optional[float] = None
    target_date: Optional[date] = None
    monthly_sip: Optional[float] = None


# ─── Life Event Create / Update ───────────────────────────────────────────────

class LifeEventCreate(BaseModel):
    event_type: str
    event_date: date
    notes: Optional[str] = None


class LifeEventUpdate(BaseModel):
    event_type: Optional[str] = None
    event_date: Optional[date] = None
    notes: Optional[str] = None


# ─── Client Create / Update ───────────────────────────────────────────────────

class ClientCreate(BaseModel):
    name: str
    age: int
    segment: str  # "Retail" | "HNI"
    risk_score: int  # 1–10
    phone: Optional[str] = None
    email: Optional[str] = None
    date_of_birth: Optional[date] = None
    address: Optional[str] = None
    city: Optional[str] = None
    pincode: Optional[str] = None
    pan_number: Optional[str] = None


class ClientUpdate(BaseModel):
    name: Optional[str] = None
    age: Optional[int] = None
    segment: Optional[str] = None
    risk_score: Optional[int] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    date_of_birth: Optional[date] = None
    address: Optional[str] = None
    city: Optional[str] = None
    pincode: Optional[str] = None
    pan_number: Optional[str] = None


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
    target_amount: float            # original target in today's ₹
    real_target: float              # inflation-adjusted future value
    target_date: date
    base_probability_pct: float     # original stored probability
    projected_probability_pct: float  # recalculated with what-if params
    monthly_sip: float              # adjusted SIP used in simulation
    assumed_return_rate: float      # annual return rate used
    inflation_rate: float           # inflation rate used
    years_to_goal: float            # adjusted timeline
    median_corpus: float            # median projected corpus (future ₹)
    median_corpus_real: float       # median corpus in today's ₹
    required_sip: Optional[float] = None  # SIP needed for 80% probability


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


# ─── Client Interaction ──────────────────────────────────────────────────────

class InteractionCreate(BaseModel):
    interaction_type: str              # "call" | "email" | "meeting" | "follow_up"
    interaction_date: date
    duration_minutes: Optional[int] = None
    subject: str
    notes: Optional[str] = None
    outcome: Optional[str] = None
    next_action: Optional[str] = None
    next_action_due: Optional[date] = None


class InteractionOut(BaseModel):
    id: int
    interaction_type: str
    interaction_date: date
    duration_minutes: Optional[int]
    subject: str
    notes: Optional[str]
    outcome: Optional[str]
    next_action: Optional[str]
    next_action_due: Optional[date]
    created_at: datetime

    class Config:
        from_attributes = True


# ─── Meeting Prep Card ────────────────────────────────────────────────────────

class MeetingPrepCard(BaseModel):
    client_name: str
    segment: str
    aum: str
    risk_profile: str
    urgency_flags: List[UrgencyFlag]
    goal_status_summary: str
    talking_points: List[str]
    suggested_questions: List[str]
    life_events_to_reference: List[str]
    generated_at: str


# ─── Trade Management ─────────────────────────────────────────────────────

class TradeCreate(BaseModel):
    """Advisor initiates a trade (creates as draft)."""
    asset_type: str  # "mutual_fund" | "crypto"
    action: str  # "buy" | "sell"
    asset_code: str  # ISIN for MF, ticker for crypto
    quantity: float
    estimated_value: float
    advisor_note: Optional[str] = None


class TradeSubmit(BaseModel):
    """Advisor submits trade for approval (draft → pending_approval)."""
    advisor_note: Optional[str] = None


class TradeApprove(BaseModel):
    """Client approves trade (pending_approval → approved → settled)."""
    client_comment: Optional[str] = None


class TradeReject(BaseModel):
    """Client rejects trade (pending_approval → rejected)."""
    client_comment: Optional[str] = None


class TradeUpdateTxHash(BaseModel):
    """Client provides crypto transaction hash after approval."""
    tx_hash: str


class TradeAuditLogOut(BaseModel):
    id: int
    trade_id: int
    action: str
    actor: str  # advisor | client | system
    timestamp: datetime
    note: Optional[str]

    class Config:
        from_attributes = True


class TradeOut(BaseModel):
    id: int
    client_id: int
    advisor_id: int
    asset_type: str
    action: str
    asset_code: str
    quantity: float
    estimated_value: float
    actual_value: Optional[float]
    status: str  # draft | pending_approval | approved | settled | rejected | cancelled
    created_at: datetime
    submitted_at: Optional[datetime]
    approved_at: Optional[datetime]
    executed_at: Optional[datetime]
    settled_at: Optional[datetime]
    client_comment: Optional[str]
    advisor_note: Optional[str]
    tx_hash: Optional[str]
    audit_logs: List[TradeAuditLogOut] = []

    class Config:
        from_attributes = True


# ─── Notifications ────────────────────────────────────────────────────────────

class NotificationOut(BaseModel):
    id: int
    advisor_id: Optional[int]
    personal_user_id: Optional[int]
    notification_type: str  # trade_submitted | trade_approved | trade_rejected
    trade_id: Optional[int]
    client_id: Optional[int]
    message: str
    read: bool
    created_at: datetime

    class Config:
        from_attributes = True


class NotificationListOut(BaseModel):
    notifications: List[NotificationOut]
    unread_count: int
