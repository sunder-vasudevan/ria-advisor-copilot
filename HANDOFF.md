# RIA Advisor Copilot — Handoff / Status

## If You're Resuming This Build

Read `PROJECT_BRIEF.md` first (or the brief that Scott shared in the IDE selection).
Then check which items below are checked off — pick up from the first unchecked item.

---

## Build Status

### Phase 1 — Backend
- [x] Project scaffold (`/backend`, `/frontend` directories)
- [x] `backend/requirements.txt`
- [x] `backend/.env.example`
- [x] `backend/app/database.py` — SQLAlchemy, SQLite default, PostgreSQL via env
- [x] `backend/app/models.py` — Client, Portfolio, Holding, Goal, LifeEvent, AuditLog
- [x] `backend/app/schemas.py` — all Pydantic schemas
- [x] `backend/app/urgency.py` — urgency flag logic (drift, SIP, goals, life events)
- [x] `backend/app/main.py` — FastAPI app with CORS, table auto-create on startup
- [x] `backend/app/seed.py` — 20 Indian clients (run: `python -m app.seed`)
- [x] `backend/app/routers/clients.py` — GET /clients, GET /clients/{id}, holdings, goals
- [x] `backend/app/routers/copilot.py` — POST /clients/{id}/copilot (Claude API)
- [x] `backend/app/routers/briefing.py` — GET /briefing/{rm_id} (Claude API)
- [x] `backend/app/routers/situation.py` — GET /clients/{id}/situation (Claude API)

### Phase 1 — Frontend
- [ ] `frontend/package.json` + Vite config + Tailwind config
- [ ] `frontend/src/main.jsx` + `App.jsx` + routing
- [ ] `frontend/src/api/client.js` — API helper
- [ ] `frontend/src/pages/ClientList.jsx`
- [ ] `frontend/src/pages/Client360.jsx`
- [ ] `frontend/src/components/PortfolioChart.jsx` — Recharts donut
- [ ] `frontend/src/components/HoldingsTable.jsx`
- [ ] `frontend/src/components/GoalsPanel.jsx`
- [ ] `frontend/src/components/CopilotChat.jsx`
- [ ] `frontend/src/components/SituationSummary.jsx`

### Phase 2 — AI Integration
- [x] All Claude API calls are ALREADY inside the routers (copilot, briefing, situation)
- [ ] Deploy config — `railway.toml`, `vercel.json`, env var docs

### Infra / Docs
- [ ] `README.md` with setup + run instructions
- [ ] `railway.toml` for backend deploy
- [ ] `vercel.json` for frontend deploy
- [ ] Git init + commits

---

## Architecture Summary

```
/ria-advisor
  /backend
    app/
      main.py         FastAPI entrypoint, CORS, table creation
      database.py     SQLAlchemy engine (SQLite local / PG prod)
      models.py       DB models
      schemas.py      Pydantic response schemas
      urgency.py      Flag logic (shared)
      seed.py         20-client seed (run once)
      routers/
        clients.py    Client CRUD endpoints
        copilot.py    AI chat — injects full client context into Claude
        briefing.py   Morning briefing — scores all clients, sends to Claude
        situation.py  Auto situation summary card per client
  /frontend
    src/
      pages/          ClientList, Client360
      components/     Chart, Holdings, Goals, Chat, SituationSummary
      api/client.js   Axios/fetch wrapper for all API calls
```

## Demo Client
Client ID 1 — **Priya Sharma**
- HNI, ₹85L portfolio
- Equity drift +8% (target 65%, actual 73%)
- Home Purchase goal: ₹1.2Cr by Sept 2027, probability 62% (underfunded)
- The demo scenario: RM asks "She just told me she needs the money in 6 months, what changes?"

## Key Decisions Made
- SQLite for local dev (no PostgreSQL needed to run locally)
- `create_all()` on startup — no need to run Alembic manually for local dev
- Alembic included for production migrations
- Claude model: `claude-sonnet-4-6`
- All monetary values in INR, using ₹ + L/Cr notation
- Conversation history passed as array from frontend for multi-turn chat

## How to Run Locally (once frontend is built)
```bash
# Backend
cd backend
cp .env.example .env          # add your ANTHROPIC_API_KEY
pip install -r requirements.txt
python -m app.seed             # seed DB
uvicorn app.main:app --reload  # starts on :8000

# Frontend
cd frontend
npm install
npm run dev                    # starts on :5173
```
