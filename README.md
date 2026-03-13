# RIA Advisor Copilot

AI-powered advisor workbench for Relationship Managers in Indian banking.

## What It Does

- **Client Book** — 20 Indian clients ranked by urgency, auto-flagged for equity drift, missed SIPs, underfunded goals, and life events
- **Client 360** — Portfolio donut chart, holdings table, goals tracker, life events
- **AI Situation Summary** — Auto-generated snapshot card when RM opens a client file
- **Copilot Chat** — Multi-turn conversation with full client context injected into Claude
- **Morning Briefing** — AI-ranked list of clients who need attention, with specific action summaries

## Quick Start (Local)

### Backend

```bash
cd backend
cp .env.example .env          # add your ANTHROPIC_API_KEY
pip install -r requirements.txt
python -m app.seed             # seed 20 Indian clients
uvicorn app.main:app --reload  # http://localhost:8000
```

### Frontend

```bash
cd frontend
npm install
npm run dev                    # http://localhost:5173
```

Open `http://localhost:5173` — no auth required.

## Demo Scenario (The 5-Minute Pitch)

1. Open app → see **Priya Sharma** at the top (equity drift +8%, home purchase goal at 62%)
2. Click Priya → Client 360 loads, AI Situation Summary auto-generates
3. In the Copilot chat, type: **"She just told me she needs the money in 6 months, what changes?"**
4. Copilot responds with specific, cautious talking points and rebalancing suggestions
5. Switch to Morning Briefing — see all flagged clients ranked and summarised

## Project Structure

```
ria-advisor/
├── backend/
│   ├── app/
│   │   ├── main.py          FastAPI + CORS + table creation
│   │   ├── database.py      SQLAlchemy (SQLite local / PG prod)
│   │   ├── models.py        Client, Portfolio, Holding, Goal, LifeEvent, AuditLog
│   │   ├── schemas.py       Pydantic response schemas
│   │   ├── urgency.py       Flag scoring logic
│   │   ├── seed.py          20-client seed data
│   │   └── routers/
│   │       ├── clients.py   CRUD endpoints
│   │       ├── copilot.py   AI chat (POST /clients/{id}/copilot)
│   │       ├── briefing.py  Morning briefing (GET /briefing/{rm_id})
│   │       └── situation.py Situation summary (GET /clients/{id}/situation)
│   ├── requirements.txt
│   └── railway.toml         Railway deploy config
└── frontend/
    ├── src/
    │   ├── pages/
    │   │   ├── ClientList.jsx
    │   │   └── Client360.jsx
    │   ├── components/
    │   │   ├── PortfolioChart.jsx
    │   │   ├── HoldingsTable.jsx
    │   │   ├── GoalsPanel.jsx
    │   │   ├── SituationSummary.jsx
    │   │   └── CopilotChat.jsx
    │   └── api/client.js    API + INR formatter
    └── vercel.json          Vercel deploy config
```

## API Reference

| Method | Path | Description |
|--------|------|-------------|
| GET | `/clients` | All clients, sorted by urgency score |
| GET | `/clients/{id}` | Full client 360 data |
| GET | `/clients/{id}/holdings` | Holdings list |
| GET | `/clients/{id}/goals` | Goals with SIP status |
| GET | `/clients/{id}/situation` | AI situation summary |
| POST | `/clients/{id}/copilot` | Copilot chat message |
| GET | `/briefing/{rm_id}` | Morning briefing |
| GET | `/health` | Health check |

## Deploy

### Backend → Railway

1. Create new Railway project → connect this repo → set root to `backend/`
2. Add env vars: `ANTHROPIC_API_KEY`, `DATABASE_URL` (Railway PostgreSQL), `FRONTEND_URL`
3. Railway auto-detects `railway.toml` and runs Nixpacks
4. After first deploy, run seed: Railway CLI → `railway run python -m app.seed`

### Frontend → Vercel

1. Import repo to Vercel → set root to `frontend/`
2. Add env var: `VITE_API_URL=https://your-backend.railway.app`
3. Update `frontend/vercel.json` with your actual Railway URL
4. Deploy

## Urgency Flag Logic

| Condition | Severity |
|-----------|----------|
| Equity drift > 5% | HIGH (3pts) |
| Equity drift > 2% | MEDIUM (1pt) |
| Missed SIP > 35 days | HIGH (3pts) |
| Goal probability < 50% | HIGH (3pts) |
| Goal probability 50–70% | MEDIUM (1pt) |
| Life event < 45 days | MEDIUM (1pt) |

## AI Copilot Rules

- Always specific to the client — never generic
- Responds in sections: SITUATION SUMMARY / KEY RISKS / TALKING POINTS / QUESTIONS TO ASK
- Never promises specific returns
- Always adds "subject to suitability review"
- Flags drift > 5%, missed SIPs, underfunded goals unprompted
- Suggests talking points for RM — not direct client instructions

## Tech Stack

- **Backend**: Python 3.11 · FastAPI · SQLAlchemy · SQLite (local) / PostgreSQL (prod)
- **Frontend**: React 18 · Vite · Tailwind CSS v3 · Recharts · React Router
- **AI**: Anthropic Claude API (`claude-sonnet-4-6`)
- **Deploy**: Railway (backend) · Vercel (frontend)
