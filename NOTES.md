


# RIA Advisor Copilot — Session Notes

## Current State
**Phase:** 1 — Demo Core ✅ COMPLETE
**Repo:** https://github.com/sunder-vasudevan/ria-advisor-copilot
**Local:** `~/ria-advisor`

## What's Built
- Full FastAPI backend (models, routers, seed data, Claude API integration)
- React + Vite frontend (Client List, Client 360, all components)
- 20 Indian clients seeded, Priya Sharma is demo client (ID 1)
- AI Copilot chat, Morning Briefing, Situation Summary — all live
- Deployed config planned: Railway (backend) + Supabase (PostgreSQL) + Vercel (frontend)
- PRD.md written — full feature registry with FEAT IDs
- **Not yet live** — deployment is a Phase 2 milestone (needed before external demos)

## Next Feature ← START HERE NEXT SESSION
**FEAT-502** — What-if sliders UI (feeds off FEAT-501 which is done)
- Add a sliders panel to the Goals section in Client 360
- Three sliders: SIP delta (±₹50k), return rate (6–18%), years delta (-2 to +5)
- On slide → call `GET /clients/{id}/goal-projection` with current slider values
- Show projected probability next to the base probability (before/after)
- Feeds into FEAT-503 (live recalculation as sliders move — debounced)

## What Shipped Last Session
**FEAT-501** ✅ — Monte Carlo simulation backend
- `backend/app/simulation.py` — Monte Carlo engine (1000 simulations, ±5% vol)
- `GET /clients/{id}/goal-projection?sip_delta=0&return_rate=0.12&years_delta=0` — live and tested
- New `GoalProjection` schema in `schemas.py`
- Returns base vs projected probability for all client goals

## Open Flags
- **Deployment not live** — app runs locally only. Need to deploy before showing externally (see PRD Phase 2 — Deploy milestone)
