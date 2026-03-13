from datetime import datetime
from sqlalchemy import Column, Integer, String, Float, Date, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship
from .database import Base


class Client(Base):
    __tablename__ = "clients"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    age = Column(Integer, nullable=False)
    segment = Column(String, nullable=False)  # "Retail" | "HNI"
    risk_score = Column(Integer, nullable=False)  # 1–10
    risk_category = Column(String, nullable=False)  # Conservative | Moderate | Aggressive

    portfolio = relationship("Portfolio", back_populates="client", uselist=False)
    goals = relationship("Goal", back_populates="client")
    life_events = relationship("LifeEvent", back_populates="client")
    audit_logs = relationship("AuditLog", back_populates="client")


class Portfolio(Base):
    __tablename__ = "portfolios"

    id = Column(Integer, primary_key=True, index=True)
    client_id = Column(Integer, ForeignKey("clients.id"), unique=True, nullable=False)
    total_value = Column(Float, nullable=False)  # in INR

    equity_pct = Column(Float, nullable=False)
    debt_pct = Column(Float, nullable=False)
    cash_pct = Column(Float, nullable=False)

    target_equity_pct = Column(Float, nullable=False)
    target_debt_pct = Column(Float, nullable=False)
    target_cash_pct = Column(Float, nullable=False)

    client = relationship("Client", back_populates="portfolio")
    holdings = relationship("Holding", back_populates="portfolio")


class Holding(Base):
    __tablename__ = "holdings"

    id = Column(Integer, primary_key=True, index=True)
    portfolio_id = Column(Integer, ForeignKey("portfolios.id"), nullable=False)
    fund_name = Column(String, nullable=False)
    fund_category = Column(String, nullable=False)  # Large Cap, Flexi Cap, etc.
    fund_house = Column(String, nullable=False)
    current_value = Column(Float, nullable=False)
    target_pct = Column(Float, nullable=False)
    current_pct = Column(Float, nullable=False)

    portfolio = relationship("Portfolio", back_populates="holdings")


class Goal(Base):
    __tablename__ = "goals"

    id = Column(Integer, primary_key=True, index=True)
    client_id = Column(Integer, ForeignKey("clients.id"), nullable=False)
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
    client_id = Column(Integer, ForeignKey("clients.id"), nullable=False)
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
