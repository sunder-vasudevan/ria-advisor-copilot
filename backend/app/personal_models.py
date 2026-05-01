from datetime import datetime
from sqlalchemy import Column, Integer, String, DateTime, ForeignKey
from sqlalchemy.orm import relationship

from .database import Base


class PersonalUser(Base):
    __tablename__ = "personal_users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    display_name = Column(String, nullable=False)
    risk_score = Column(Integer, nullable=True)    # 1–10, set during onboarding
    risk_category = Column(String, nullable=True)  # derived from risk_score
    created_at = Column(DateTime, default=datetime.utcnow)
    advisor_id = Column(Integer, ForeignKey("advisors.id"), nullable=True)

    copilot_logs = relationship("PersonalCopilotLog", back_populates="user", cascade="all, delete-orphan")


class PersonalCopilotLog(Base):
    __tablename__ = "personal_copilot_logs"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("personal_users.id"), nullable=False)
    query_snippet = Column(String, nullable=True)
    response_snippet = Column(String, nullable=True)
    timestamp = Column(DateTime, default=datetime.utcnow)

    user = relationship("PersonalUser", back_populates="copilot_logs")
