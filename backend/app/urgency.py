"""
Urgency flag logic — shared between routers.
"""
from datetime import date, timedelta
from typing import List
from .schemas import UrgencyFlag


def compute_urgency(client, portfolio, goals, life_events) -> List[UrgencyFlag]:
    flags: List[UrgencyFlag] = []
    today = date.today()

    # ── Equity drift ──────────────────────────────────────────────────────────
    if portfolio:
        drift = portfolio.equity_pct - portfolio.target_equity_pct
        if drift > 5:
            flags.append(UrgencyFlag(
                label=f"Equity Drift +{drift:.0f}%",
                severity="high"
            ))
        elif drift > 2:
            flags.append(UrgencyFlag(
                label=f"Equity Drift +{drift:.0f}%",
                severity="medium"
            ))

    # ── Missed SIPs ───────────────────────────────────────────────────────────
    for goal in goals:
        if goal.last_sip_date:
            days_since = (today - goal.last_sip_date).days
            if days_since > 35:
                flags.append(UrgencyFlag(
                    label=f"Missed SIP — {goal.goal_name} ({days_since}d ago)",
                    severity="high"
                ))

    # ── Underfunded goals ─────────────────────────────────────────────────────
    for goal in goals:
        if goal.probability_pct < 50:
            flags.append(UrgencyFlag(
                label=f"Goal at Risk — {goal.goal_name} ({goal.probability_pct:.0f}%)",
                severity="high"
            ))
        elif goal.probability_pct < 70:
            flags.append(UrgencyFlag(
                label=f"Underfunded Goal — {goal.goal_name} ({goal.probability_pct:.0f}%)",
                severity="medium"
            ))

    # ── Recent life events ────────────────────────────────────────────────────
    for event in life_events:
        days_since = (today - event.event_date).days
        if days_since <= 45:
            label = event.event_type.replace("_", " ").title()
            flags.append(UrgencyFlag(
                label=f"Life Event — {label}",
                severity="medium"
            ))

    return flags


def urgency_score(flags: List[UrgencyFlag]) -> int:
    score = 0
    for f in flags:
        if f.severity == "high":
            score += 3
        elif f.severity == "medium":
            score += 1
    return score
