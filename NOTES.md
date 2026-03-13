


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
- Deployed config: Railway (backend) + Vercel (frontend)
- PRD.md written — full feature registry with FEAT IDs

## Next Feature ← START HERE NEXT SESSION
**FEAT-501** — Monte Carlo simulation backend (goal probability engine)
- Add `GET /clients/{id}/goal-projection?sip_delta=0&return_rate=0.12&years_delta=0` endpoint
- Returns probability recalculated with what-if parameters
- Feeds into FEAT-502 (what-if sliders UI)

## Open Flags
- None — Phase 1 clean and committed
