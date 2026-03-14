


# ARIA — Advisor Relationship Intelligence Assistant — Session Notes

> *"Know before they call. Relationships, backed by intelligence."*

## Current State
**Phase:** 1 — Demo Core ✅ COMPLETE
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
**FEAT-502** — What-if sliders UI (feeds off FEAT-501 which is done)
- Add a sliders panel to the Goals section in Client 360
- Three sliders: SIP delta (±₹50k), return rate (6–18%), years delta (-2 to +5)
- On slide → call `GET /clients/{id}/goal-projection` with current slider values
- Show projected probability next to the base probability (before/after)
- Feeds into FEAT-503 (live recalculation as sliders move — debounced)

## What Shipped Last Session
**ARIA Rebrand** ✅ — Full product rename
- Product named: **ARIA — Advisor Relationship Intelligence Assistant**
- Tagline: *"Know before they call. Relationships, backed by intelligence."*
- Updated: PRD.md, NOTES.md, UI headers (ClientList + Client360), browser title, GitHub repo renamed to `aria-advisor`, git remote updated
- Cross-project time tracking system set up in `~/.claude/CROSS_PROJECT_TIME_LOG.md`

## Open Flags
- **Deployment not live** — app runs locally only. Need to deploy before showing externally (see PRD Phase 2 — Deploy milestone)
