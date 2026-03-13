import os
from datetime import date
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
import anthropic

from ..database import get_db
from ..models import Client, AuditLog
from ..schemas import BriefingResponse, BriefingClientSummary
from ..urgency import compute_urgency, urgency_score

router = APIRouter(prefix="/briefing", tags=["briefing"])


def _fmt_value(v: float) -> str:
    if v >= 10_000_000:
        return f"₹{v / 10_000_000:.2f}Cr"
    return f"₹{v / 100_000:.1f}L"


@router.get("/{rm_id}", response_model=BriefingResponse)
def morning_briefing(rm_id: str, db: Session = Depends(get_db)):
    api_key = os.getenv("ANTHROPIC_API_KEY")
    if not api_key:
        raise HTTPException(status_code=500, detail="ANTHROPIC_API_KEY not configured")

    clients = db.query(Client).all()
    today = date.today()

    # Score all clients
    scored = []
    for c in clients:
        flags = compute_urgency(c, c.portfolio, c.goals, c.life_events)
        score = urgency_score(flags)
        if score > 0:
            scored.append((c, flags, score))

    scored.sort(key=lambda x: x[2], reverse=True)
    top_clients = scored[:8]  # brief covers top 8

    if not top_clients:
        return BriefingResponse(
            rm_id=rm_id,
            date=str(today),
            headline="All clients are on track today.",
            clients=[],
            overall_narrative="No urgent action items across your book today. Good time for proactive check-ins.",
        )

    # Build compact context for Claude
    context_lines = [f"DATE: {today}", "CLIENTS REQUIRING ATTENTION:\n"]
    for c, flags, score in top_clients:
        p = c.portfolio
        val = _fmt_value(p.total_value) if p else "N/A"
        flag_labels = ", ".join(f.label for f in flags)
        context_lines.append(
            f"- {c.name} ({c.segment}, {c.risk_category}, {val}): {flag_labels}"
        )

    context = "\n".join(context_lines)

    prompt = f"""You are briefing a Relationship Manager at an Indian bank for their morning.
Below is a list of clients that need attention today with their issues flagged.

{context}

Generate:
1. ONE overall_narrative paragraph (3–4 sentences) — a natural morning briefing summary covering the key themes across the book. Professional tone, mention specific client names.
2. A one-line summary for each client (max 15 words, specific and actionable).

Respond as valid JSON in this exact format:
{{
  "overall_narrative": "...",
  "client_summaries": {{
    "CLIENT_NAME": "one-line summary",
    ...
  }}
}}

Rules:
- Use ₹ and L/Cr notation
- Be specific — no generic phrases like "review portfolio"
- Summaries should tell the RM what action to take, not just describe the problem
"""

    ai_client = anthropic.Anthropic(api_key=api_key)
    response = ai_client.messages.create(
        model="claude-sonnet-4-6",
        max_tokens=800,
        messages=[{"role": "user", "content": prompt}],
    )

    ai_text = response.content[0].text.strip()

    # Parse JSON from response
    import json, re
    json_match = re.search(r'\{.*\}', ai_text, re.DOTALL)
    if json_match:
        try:
            parsed = json.loads(json_match.group())
            overall_narrative = parsed.get("overall_narrative", "")
            client_summaries = parsed.get("client_summaries", {})
        except Exception:
            overall_narrative = ai_text
            client_summaries = {}
    else:
        overall_narrative = ai_text
        client_summaries = {}

    # Build response
    briefing_clients = []
    for c, flags, score in top_clients:
        p = c.portfolio
        summary = client_summaries.get(c.name, f"{len(flags)} issue(s) flagged — review recommended")
        briefing_clients.append(BriefingClientSummary(
            client_id=c.id,
            name=c.name,
            segment=c.segment,
            total_value=p.total_value if p else 0,
            urgency_flags=flags,
            summary=summary,
        ))

        # Audit log
        db.add(AuditLog(
            client_id=c.id,
            action_type="briefing_view",
            ai_rationale=summary,
        ))

    db.commit()

    n_urgent = len([x for x in scored if x[2] >= 3])
    headline = (
        f"{n_urgent} client{'s' if n_urgent != 1 else ''} need urgent attention today"
        if n_urgent > 0
        else f"{len(scored)} client{'s' if len(scored) != 1 else ''} need your attention today"
    )

    return BriefingResponse(
        rm_id=rm_id,
        date=str(today),
        headline=headline,
        clients=briefing_clients,
        overall_narrative=overall_narrative,
    )
