import os
import json
import re
from datetime import date
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
import anthropic

from ..database import get_db
from ..models import Client, AuditLog
from ..schemas import MeetingPrepCard, UrgencyFlag
from ..urgency import compute_urgency
from .copilot import build_client_context

router = APIRouter(prefix="/clients", tags=["meeting-prep"])


def _fmt_aum(v: float) -> str:
    if v >= 10_000_000:
        return f"₹{v / 10_000_000:.2f}Cr"
    return f"₹{v / 100_000:.1f}L"


@router.get("/{client_id}/meeting-prep", response_model=MeetingPrepCard)
def get_meeting_prep(client_id: int, db: Session = Depends(get_db)):
    client = db.query(Client).filter(Client.id == client_id).first()
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")

    api_key = os.getenv("ANTHROPIC_API_KEY")
    if not api_key:
        raise HTTPException(status_code=500, detail="ANTHROPIC_API_KEY not configured")

    context = build_client_context(client)
    flags = compute_urgency(client, client.portfolio, client.goals, client.life_events)
    top_flags = flags[:3]

    prompt = f"""You are briefing a Relationship Manager before a client call.

{context}

Generate a meeting prep card as valid JSON in this exact format:
{{
  "goal_status_summary": "2-3 sentence paragraph with specific numbers and probability %",
  "talking_points": ["point 1", "point 2", "point 3"],
  "suggested_questions": ["question 1", "question 2", "question 3"],
  "life_events_to_reference": ["event note 1"]
}}

Rules:
- goal_status_summary: 2–3 sentences, mention specific goal names, amounts, and probability %
- talking_points: 3–5 items, framed as things the RM will say to the client
- suggested_questions: exactly 3 open-ended discovery questions
- life_events_to_reference: reference life events from the last 90 days only; empty list [] if none
- Use ₹ and L/Cr notation throughout
- Be specific to this client — no generic advice
- Talking points are for the RM to say, not direct instructions to the client
"""

    try:
        ai_client = anthropic.Anthropic(api_key=api_key)
        response = ai_client.messages.create(
            model="claude-sonnet-4-6",
            max_tokens=1200,
            messages=[{"role": "user", "content": prompt}],
        )
        ai_text = response.content[0].text.strip()
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Claude API error: {str(e)}")

    json_match = re.search(r'\{.*\}', ai_text, re.DOTALL)
    if json_match:
        try:
            parsed = json.loads(json_match.group())
        except Exception:
            parsed = {}
    else:
        parsed = {}

    p = client.portfolio
    aum = _fmt_aum(p.total_value) if p else "N/A"

    card = MeetingPrepCard(
        client_name=client.name,
        segment=client.segment,
        aum=aum,
        risk_profile=f"{client.risk_score}/10 — {client.risk_category}",
        urgency_flags=[UrgencyFlag(label=f.label, severity=f.severity) for f in top_flags],
        goal_status_summary=parsed.get("goal_status_summary", "Please review client goals manually."),
        talking_points=parsed.get("talking_points", []),
        suggested_questions=parsed.get("suggested_questions", []),
        life_events_to_reference=parsed.get("life_events_to_reference", []),
        generated_at=str(date.today()),
    )

    db.add(AuditLog(
        client_id=client_id,
        action_type="meeting_prep",
        ai_rationale=f"Meeting prep generated for {client.name}",
    ))
    db.commit()

    return card
