"""
Auto-generated situation summary card for Client 360 view.
Not a chat — just a snapshot when the RM opens the client page.
"""
import os
from datetime import date
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
import anthropic

from ..database import get_db
from ..models import Client, AuditLog
from ..routers.copilot import build_client_context
from ..urgency import compute_urgency

router = APIRouter(prefix="/clients", tags=["situation"])


class SituationSummaryResponse(BaseModel):
    summary: str
    urgency_level: str  # "high" | "medium" | "low"


@router.get("/{client_id}/situation", response_model=SituationSummaryResponse)
def get_situation_summary(client_id: int, db: Session = Depends(get_db)):
    client = db.query(Client).filter(Client.id == client_id).first()
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")

    api_key = os.getenv("ANTHROPIC_API_KEY")
    if not api_key:
        raise HTTPException(status_code=500, detail="ANTHROPIC_API_KEY not configured")

    flags = compute_urgency(client, client.portfolio, client.goals, client.life_events)
    context = build_client_context(client)

    high_flags = [f for f in flags if f.severity == "high"]
    urgency_level = "high" if high_flags else ("medium" if flags else "low")

    prompt = f"""You are a senior financial advisor. Given this client context, write a 2-sentence situation summary card for the RM opening this client's file. Be specific, use numbers, and flag the most critical issue first.

{context}

Write ONLY the 2-sentence summary. No headers. No bullet points. Plain text."""

    ai_client = anthropic.Anthropic(api_key=api_key)
    response = ai_client.messages.create(
        model="claude-sonnet-4-6",
        max_tokens=200,
        messages=[{"role": "user", "content": prompt}],
    )

    summary_text = response.content[0].text.strip()

    db.add(AuditLog(
        client_id=client_id,
        action_type="situation_summary",
        ai_rationale=summary_text,
    ))
    db.commit()

    return SituationSummaryResponse(summary=summary_text, urgency_level=urgency_level)
