


# ARIA — Advisor Relationship Intelligence Assistant — Session Notes

> *"Know before they call. Relationships, backed by intelligence."*

## Current State
**Phase:** 2 — USP Depth 🔶 IN PROGRESS
**Repo:** https://github.com/sunder-vasudevan/aria-advisor
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
**FEAT-503** — Live goal probability recalculation
- Trigger projection calls automatically as sliders move (debounced, no manual button)
- Keep request load controlled (debounce + last-request-wins handling)
- Update each goal card instantly with scenario probability and delta
- Preserve current “Run scenario” behavior as fallback only if needed
- This closes the core what-if interaction loop for demos

## What Shipped This Session
**Phase 2 status sync + wrap updates** ✅
- Confirmed FEAT-501 is implemented (`GET /clients/{id}/goal-projection` with Monte Carlo simulation)
- Confirmed FEAT-502 is implemented (What-if sliders UI in Goals panel)
- Updated PRD status + API registry to reflect live scope accurately
- Performed session close-out updates for NOTES/PRD/SESSION_LOG

## Open Flags
- **Deployment not live** — app runs locally only. Need to deploy before showing externally (see PRD Phase 2 — Deploy milestone)
- **Startup stability check needed** — observed backend runtime error during `riastart` (`unexpected keyword argument 'proxies'`) that needs dependency/version triage next session
