from datetime import datetime
from sqlalchemy import Column, Integer, String, Float, Date, DateTime, ForeignKey, Text, Boolean, desc, Enum
from sqlalchemy.orm import relationship
from .database import Base
import enum


class Advisor(Base):
    """Advisor / Relationship Manager accounts."""
    __tablename__ = "advisors"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, nullable=False, index=True)
    hashed_password = Column(String, nullable=False)
    display_name = Column(String, nullable=False)
    role = Column(String, nullable=False, default="advisor")  # "advisor" | "superadmin"
    city = Column(String, nullable=True)
    region = Column(String, nullable=True)
    referral_code = Column(String, unique=True, nullable=True, index=True)
    # V2: avg_rating + rating_count stubbed for advisor discovery + rate-my-advisor feature
    avg_rating = Column(Float, nullable=True, default=None)
    rating_count = Column(Integer, nullable=True, default=0)
    is_active = Column(Boolean, nullable=False, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    clients = relationship("Client", back_populates="advisor")
    trades = relationship("Trade", back_populates="advisor", foreign_keys="Trade.advisor_id")


class Client(Base):
    __tablename__ = "clients"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    age = Column(Integer, nullable=False)
    segment = Column(String, nullable=False)  # "Retail" | "HNI"
    risk_score = Column(Integer, nullable=False)  # 1–10
    risk_category = Column(String, nullable=False)  # Conservative | Moderate | Aggressive

    # Advisor mapping — nullable for backward compat with existing seeded data
    advisor_id = Column(Integer, ForeignKey("advisors.id"), nullable=True, index=True)
    advisor = relationship("Advisor", back_populates="clients")

    # Personal portal link — set when client registers on ARIA Personal
    personal_user_id = Column(Integer, nullable=True)
    # Source: "advisor" = added by advisor, "portal" = self-registered via ARIA Personal
    source = Column(String, nullable=True, default="advisor")

    # Contact & personal details (FEAT-101)
    phone = Column(String, nullable=True)
    email = Column(String, nullable=True)
    date_of_birth = Column(Date, nullable=True)
    address = Column(String, nullable=True)
    city = Column(String, nullable=True)
    pincode = Column(String, nullable=True)
    pan_number = Column(String, nullable=True)

    portfolio = relationship("Portfolio", back_populates="client", uselist=False, cascade="all, delete-orphan")
    goals = relationship("Goal", back_populates="client", cascade="all, delete-orphan")
    life_events = relationship("LifeEvent", back_populates="client", cascade="all, delete-orphan")
    audit_logs = relationship("AuditLog", back_populates="client", cascade="all, delete-orphan")
    interactions = relationship("ClientInteraction", back_populates="client", cascade="all, delete-orphan")
    trades = relationship("Trade", back_populates="client", foreign_keys="Trade.client_id", cascade="all, delete-orphan")


class Portfolio(Base):
    __tablename__ = "portfolios"

    id = Column(Integer, primary_key=True, index=True)
    client_id = Column(Integer, ForeignKey("clients.id"), unique=True, nullable=True)
    personal_user_id = Column(Integer, ForeignKey("personal_users.id"), nullable=True)
    total_value = Column(Float, nullable=False)  # in INR

    equity_pct = Column(Float, nullable=False)
    debt_pct = Column(Float, nullable=False)
    cash_pct = Column(Float, nullable=False)

    target_equity_pct = Column(Float, nullable=False)
    target_debt_pct = Column(Float, nullable=False)
    target_cash_pct = Column(Float, nullable=False)

    cash_balance = Column(Float, nullable=True, default=0.0)  # INR liquid cash for trade validation

    client = relationship("Client", back_populates="portfolio")
    holdings = relationship("Holding", back_populates="portfolio", cascade="all, delete-orphan")


class Holding(Base):
    __tablename__ = "holdings"

    id = Column(Integer, primary_key=True, index=True)
    portfolio_id = Column(Integer, ForeignKey("portfolios.id"), nullable=False)

    # Asset type — defaults to mutual_fund for backward compat
    asset_type = Column(String, nullable=True, default="mutual_fund")
    asset_code = Column(String, nullable=True)  # ISIN / ticker / symbol

    # Mutual fund fields (nullable for non-MF assets)
    fund_name = Column(String, nullable=True)
    fund_category = Column(String, nullable=True)
    fund_house = Column(String, nullable=True)

    current_value = Column(Float, nullable=False)
    target_pct = Column(Float, nullable=False)
    current_pct = Column(Float, nullable=False)
    units_held = Column(Float, nullable=True)
    nav_per_unit = Column(Float, nullable=True)   # MF: NAV; others: price_per_unit
    price_per_unit = Column(Float, nullable=True)  # generic alias for non-MF assets

    portfolio = relationship("Portfolio", back_populates="holdings")


class Goal(Base):
    __tablename__ = "goals"

    id = Column(Integer, primary_key=True, index=True)
    client_id = Column(Integer, ForeignKey("clients.id"), nullable=True)
    personal_user_id = Column(Integer, ForeignKey("personal_users.id"), nullable=True)
    goal_name = Column(String, nullable=False)
    target_amount = Column(Float, nullable=False)
    target_date = Column(Date, nullable=False)
    monthly_sip = Column(Float, nullable=False)
    last_sip_date = Column(Date, nullable=True)
    probability_pct = Column(Float, nullable=False)  # 0–100

    client = relationship("Client", back_populates="goals")


class LifeEvent(Base):
    __tablename__ = "life_events"

    id = Column(Integer, primary_key=True, index=True)
    client_id = Column(Integer, ForeignKey("clients.id"), nullable=True)
    personal_user_id = Column(Integer, ForeignKey("personal_users.id"), nullable=True)
    event_type = Column(String, nullable=False)  # job_change, new_child, marriage, etc.
    event_date = Column(Date, nullable=False)
    notes = Column(Text, nullable=True)

    client = relationship("Client", back_populates="life_events")


class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(Integer, primary_key=True, index=True)
    client_id = Column(Integer, ForeignKey("clients.id"), nullable=False)
    action_type = Column(String, nullable=False)  # copilot_query, briefing_view, etc.
    ai_rationale = Column(Text, nullable=True)
    timestamp = Column(DateTime, default=datetime.utcnow)

    client = relationship("Client", back_populates="audit_logs")


class ClientInteraction(Base):
    __tablename__ = "client_interactions"

    id = Column(Integer, primary_key=True, index=True)
    client_id = Column(Integer, ForeignKey("clients.id"), nullable=False)
    interaction_type = Column(String, nullable=False)  # "call" | "email" | "meeting" | "follow_up"
    interaction_date = Column(Date, nullable=False)
    duration_minutes = Column(Integer, nullable=True)   # calls/meetings only
    subject = Column(String, nullable=False)
    notes = Column(Text, nullable=True)
    outcome = Column(String, nullable=True)             # e.g. "Agreed to rebalance", "Sent proposal"
    next_action = Column(String, nullable=True)
    next_action_due = Column(Date, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    client = relationship("Client", back_populates="interactions")


# Trade Management Enums
class AssetTypeEnum(str, enum.Enum):
    mutual_fund = "mutual_fund"
    crypto = "crypto"
    stock = "stock"
    bond = "bond"
    commodity = "commodity"
    forex = "forex"


class ActionEnum(str, enum.Enum):
    buy = "buy"
    sell = "sell"


class TradeStatusEnum(str, enum.Enum):
    draft = "draft"
    pending_approval = "pending_approval"
    approved = "approved"
    settled = "settled"
    rejected = "rejected"
    cancelled = "cancelled"


class TradeAuditActionEnum(str, enum.Enum):
    created = "created"
    submitted = "submitted"
    approved = "approved"
    rejected = "rejected"
    executed = "executed"
    settled = "settled"
    cancelled = "cancelled"


class TradeActorEnum(str, enum.Enum):
    advisor = "advisor"
    client = "client"
    system = "system"


class Trade(Base):
    __tablename__ = "trades"

    id = Column(Integer, primary_key=True, index=True)
    client_id = Column(Integer, ForeignKey("clients.id"), nullable=False, index=True)
    advisor_id = Column(Integer, ForeignKey("advisors.id"), nullable=False, index=True)
    asset_type = Column(Enum(AssetTypeEnum), nullable=False)  # mutual_fund | crypto
    action = Column(Enum(ActionEnum), nullable=False)  # buy | sell
    asset_code = Column(String, nullable=False)  # ISIN for MF, ticker for crypto
    quantity = Column(Float, nullable=False)
    estimated_value = Column(Float, nullable=False)  # Snapshot at creation in INR
    actual_value = Column(Float, nullable=True)  # Set at execution
    status = Column(Enum(TradeStatusEnum), nullable=False, default=TradeStatusEnum.draft)
    created_at = Column(DateTime, default=datetime.utcnow, index=True)
    submitted_at = Column(DateTime, nullable=True)
    approved_at = Column(DateTime, nullable=True)
    executed_at = Column(DateTime, nullable=True)
    settled_at = Column(DateTime, nullable=True)
    client_comment = Column(Text, nullable=True)  # Client approval comment
    advisor_note = Column(Text, nullable=True)
    tx_hash = Column(String, nullable=True)  # For crypto trades: transaction hash

    client = relationship("Client", foreign_keys=[client_id])
    advisor = relationship("Advisor", foreign_keys=[advisor_id])
    audit_logs = relationship("TradeAuditLog", back_populates="trade", cascade="all, delete-orphan")


class TradeAuditLog(Base):
    __tablename__ = "trade_audit_logs"

    id = Column(Integer, primary_key=True, index=True)
    trade_id = Column(Integer, ForeignKey("trades.id"), nullable=False, index=True)
    action = Column(Enum(TradeAuditActionEnum), nullable=False)
    actor = Column(Enum(TradeActorEnum), nullable=False)  # advisor | client | system
    timestamp = Column(DateTime, default=datetime.utcnow, index=True)
    note = Column(Text, nullable=True)

    trade = relationship("Trade", back_populates="audit_logs")


# Notification System (FEAT-1004)
class NotificationTypeEnum(str, enum.Enum):
    trade_submitted = "trade_submitted"          # Advisor submitted trade → Client notified
    trade_approved = "trade_approved"            # Client approved trade → Advisor notified
    trade_rejected = "trade_rejected"            # Client rejected trade → Advisor notified
    trade_client_submitted = "trade_client_submitted"  # Client initiated trade → Advisor notified


class Notification(Base):
    __tablename__ = "notifications"

    id = Column(Integer, primary_key=True, index=True)
    # Recipient: either advisor_id or personal_user_id (mutually exclusive)
    advisor_id = Column(Integer, ForeignKey("advisors.id"), nullable=True, index=True)
    personal_user_id = Column(Integer, nullable=True, index=True)  # Links to personal_users.id
    # Notification content
    notification_type = Column(Enum(NotificationTypeEnum), nullable=False)
    trade_id = Column(Integer, ForeignKey("trades.id"), nullable=True)
    message = Column(Text, nullable=False)
    # Status
    read = Column(Boolean, default=False, index=True)
    created_at = Column(DateTime, default=datetime.utcnow, index=True)

    trade = relationship("Trade", foreign_keys=[trade_id])

    @property
    def client_id(self):
        """Resolve client_id from related trade."""
        return self.trade.client_id if self.trade else None


# Asset Account — linked provider account per client or personal user
class AssetAccount(Base):
    __tablename__ = "asset_accounts"

    id = Column(Integer, primary_key=True, index=True)
    # Owner: either client_id (Advisor side) or personal_user_id (Personal side)
    client_id = Column(Integer, ForeignKey("clients.id"), nullable=True, index=True)
    personal_user_id = Column(Integer, nullable=True, index=True)  # personal_users.id
    provider = Column(String, nullable=False, default="mock_provider")
    account_ref = Column(String, nullable=False)  # provider-side account identifier
    asset_type = Column(String, nullable=False)   # AssetTypeEnum value
    label = Column(String, nullable=True)
    connected_at = Column(DateTime, default=datetime.utcnow)
    disconnected_at = Column(DateTime, nullable=True)
