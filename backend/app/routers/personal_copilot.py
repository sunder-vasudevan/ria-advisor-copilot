import os
from datetime import date
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import List, Optional
from sqlalchemy.orm import Session
import anthropic

from ..database import get_db
from ..models import Portfolio
from ..personal_models import PersonalUser, PersonalCopilotLog
from ..auth import get_current_personal_user

router = APIRouter(prefix="/personal/copilot", tags=["personal-copilot"])

SYSTEM_PROMPT = """You are ARIA, a personal finance assistant. You are helping a self-directed individual manage their own investments, goals, and financial life.

Speak directly and personally: use "your portfolio", "you hold", "your goal", "you". Never say "the client" or use third-person framing.

Tone: friendly, clear, encouraging — explain things plainly without jargon. You are a knowledgeable friend, not a formal advisor.

Be specific to the user's actual portfolio and goals — never give generic advice. All monetary values in INR (use ₹ symbol and L/Cr notation: ₹25L, ₹1.2Cr).

Never promise specific returns. When discussing probabilities, explain that they are estimates based on historical patterns, not guarantees.
"""


def build_personal_context(user: PersonalUser, db: Session) -> str:
    today = date.today()
    p = db.query(Portfolio).filter(Portfolio.personal_user_id == user.id).first()

    lines = [
        "YOUR PROFILE",
        f"Name: {user.display_name}",
        f"Risk Score: {user.risk_score}/10 ({user.risk_category})" if user.risk_score else "Risk profile: not set",
        "",
    ]

    if p:
        equity_drift = p.equity_pct - p.target_equity_pct
        total = p.total_value
        total_str = f"₹{total/100000:.1f}L" if total < 10000000 else f"₹{total/10000000:.2f}Cr"
        lines += [
            "YOUR PORTFOLIO",
            f"Total Value: {total_str}",
            f"Equity: {p.equity_pct:.0f}% (target {p.target_equity_pct:.0f}%, drift {equity_drift:+.0f}%)",
            f"Debt: {p.debt_pct:.0f}% (target {p.target_debt_pct:.0f}%)",
            f"Cash: {p.cash_pct:.0f}% (target {p.target_cash_pct:.0f}%)",
            "",
            "YOUR HOLDINGS",
        ]
        for h in p.holdings:
            lines.append(
                f"  • {h.fund_name} ({h.fund_house}) — {h.fund_category} — "
                f"₹{h.current_value/100000:.1f}L — {h.current_pct:.0f}% (target {h.target_pct:.0f}%)"
            )
    else:
        lines += ["YOUR PORTFOLIO", "No portfolio added yet.", ""]

    from ..models import Goal, LifeEvent
    goals = db.query(Goal).filter(Goal.personal_user_id == user.id).all()
    lines += ["", "YOUR GOALS"]
    if goals:
        for g in goals:
            target_str = (f"₹{g.target_amount/100000:.1f}L" if g.target_amount < 10000000
                          else f"₹{g.target_amount/10000000:.2f}Cr")
            lines.append(
                f"  • {g.goal_name}: Target {target_str} by {g.target_date} — "
                f"Probability: {g.probability_pct:.0f}% — Monthly SIP: ₹{g.monthly_sip:,.0f}"
            )
    else:
        lines.append("  No goals added yet.")

    events = db.query(LifeEvent).filter(LifeEvent.personal_user_id == user.id).order_by(LifeEvent.event_date.desc()).all()
    lines += ["", "YOUR LIFE EVENTS"]
    if events:
        for e in events:
            days_ago = (today - e.event_date).days
            lines.append(f"  • {e.event_type.replace('_', ' ').title()}: {e.event_date} ({days_ago}d ago) — {e.notes or ''}")
    else:
        lines.append("  None recorded.")

    return "\n".join(lines)


class CopilotRequest(BaseModel):
    message: str
    conversation_history: Optional[List[dict]] = []


@router.post("")
def personal_copilot(
    request: CopilotRequest,
    current_user: PersonalUser = Depends(get_current_personal_user),
    db: Session = Depends(get_db),
):
    api_key = os.getenv("ANTHROPIC_API_KEY")
    if not api_key:
        raise HTTPException(status_code=500, detail="ANTHROPIC_API_KEY not configured")

    context = build_personal_context(current_user, db)
    system = f"{SYSTEM_PROMPT}\n\n---\n\nCURRENT CONTEXT:\n{context}"

    messages = []
    for msg in (request.conversation_history or []):
        if msg.get("role") in ("user", "assistant"):
            messages.append({"role": msg["role"], "content": msg["content"]})
    messages.append({"role": "user", "content": request.message})

    ai_client = anthropic.Anthropic(api_key=api_key)
    response = ai_client.messages.create(
        model="claude-sonnet-4-6",
        max_tokens=1500,
        system=system,
        messages=messages,
    )

    ai_text = response.content[0].text

    log = PersonalCopilotLog(
        user_id=current_user.id,
        query_snippet=request.message[:200],
        response_snippet=ai_text[:200],
    )
    db.add(log)
    db.commit()

    return {"response": ai_text}
