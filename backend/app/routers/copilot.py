import os
from datetime import date
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
import anthropic

from ..database import get_db
from ..models import Client, AuditLog
from ..schemas import CopilotRequest, CopilotResponse
from ..urgency import compute_urgency

router = APIRouter(prefix="/clients", tags=["copilot"])

SYSTEM_PROMPT = """You are a cautious senior financial advisor assistant supporting a Relationship Manager (RM) at an Indian bank. You have full access to the client's portfolio, goals, holdings, life events, and risk profile.

Your role is to help the RM prepare for client conversations with specific, actionable, and cautious advice.

RESPONSE FORMAT — always respond in exactly these four sections:

**SITUATION SUMMARY**
A 2–3 sentence overview of the client's current financial situation and what is most pressing.

**KEY RISKS**
Bullet list of the most important risks or issues for this client right now. Flag equity drift >5%, missed SIPs, underfunded goals, or recent life events unprompted if present.

**TALKING POINTS**
Bullet list of specific, client-appropriate talking points the RM should raise. Frame these as things the RM will say to the client — not instructions to the client directly.

**QUESTIONS TO ASK**
Bullet list of 2–4 questions the RM should ask the client to deepen understanding.

RULES:
- Never promise specific returns or performance
- Never recommend specific funds without adding "subject to suitability review"
- Always add "subject to suitability review" when making any product suggestions
- Flag any drift >5%, missed SIPs, or underfunded goals unprompted
- Be specific to this client — never give generic advice
- All monetary values in INR (use ₹ symbol and L/Cr notation: ₹25L, ₹1.2Cr)
- Keep responses professional but readable — this is a banking tool
- Talking points are for the RM to say — not direct instructions to the client
"""


def build_client_context(client) -> str:
    p = client.portfolio
    today = date.today()

    lines = [
        f"CLIENT PROFILE",
        f"Name: {client.name}",
        f"Age: {client.age}",
        f"Segment: {client.segment}",
        f"Risk Score: {client.risk_score}/10 ({client.risk_category})",
        "",
        "PORTFOLIO",
        f"Total Value: ₹{p.total_value / 100000:.1f}L" if p and p.total_value < 10000000
        else f"Total Value: ₹{p.total_value / 10000000:.2f}Cr" if p else "No portfolio",
    ]

    if p:
        equity_drift = p.equity_pct - p.target_equity_pct
        lines += [
            f"Equity: {p.equity_pct:.0f}% (target {p.target_equity_pct:.0f}%, drift {equity_drift:+.0f}%)",
            f"Debt: {p.debt_pct:.0f}% (target {p.target_debt_pct:.0f}%)",
            f"Cash: {p.cash_pct:.0f}% (target {p.target_cash_pct:.0f}%)",
            "",
            "HOLDINGS",
        ]
        for h in p.holdings:
            lines.append(
                f"  • {h.fund_name} ({h.fund_house}) — {h.fund_category} — "
                f"₹{h.current_value / 100000:.1f}L — {h.current_pct:.0f}% of portfolio (target {h.target_pct:.0f}%)"
            )

    lines += ["", "GOALS"]
    for g in client.goals:
        days_since_sip = (today - g.last_sip_date).days if g.last_sip_date else None
        sip_status = f"Last SIP: {g.last_sip_date} ({days_since_sip}d ago)" if days_since_sip else "No SIP recorded"
        target_str = (f"₹{g.target_amount / 100000:.1f}L" if g.target_amount < 10000000
                      else f"₹{g.target_amount / 10000000:.2f}Cr")
        lines.append(
            f"  • {g.goal_name}: Target {target_str} by {g.target_date} — "
            f"Probability: {g.probability_pct:.0f}% — Monthly SIP: ₹{g.monthly_sip:,.0f} — {sip_status}"
        )

    lines += ["", "LIFE EVENTS"]
    if client.life_events:
        for e in client.life_events:
            days_ago = (today - e.event_date).days
            lines.append(f"  • {e.event_type.replace('_', ' ').title()}: {e.event_date} ({days_ago}d ago) — {e.notes or ''}")
    else:
        lines.append("  None recorded")

    return "\n".join(lines)


@router.post("/{client_id}/copilot", response_model=CopilotResponse)
def copilot_chat(
    client_id: int,
    request: CopilotRequest,
    db: Session = Depends(get_db),
):
    client = db.query(Client).filter(Client.id == client_id).first()
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")

    api_key = os.getenv("ANTHROPIC_API_KEY")
    if not api_key:
        raise HTTPException(status_code=500, detail="ANTHROPIC_API_KEY not configured")

    context = build_client_context(client)
    system = f"{SYSTEM_PROMPT}\n\n---\n\nCURRENT CLIENT CONTEXT:\n{context}"

    # Build message history
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

    # Audit log
    log = AuditLog(
        client_id=client_id,
        action_type="copilot_query",
        ai_rationale=f"Q: {request.message[:200]} | A: {ai_text[:200]}",
    )
    db.add(log)
    db.commit()

    return CopilotResponse(response=ai_text)
