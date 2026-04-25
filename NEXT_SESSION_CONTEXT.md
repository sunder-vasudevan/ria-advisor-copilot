# ARiA Advisor — Next Session Context
_Generated: 4 April 2026_

---

## What Was Built This Session

Three new **preview-only pages** were added (all new files — no existing pages modified):

| Route | File | Purpose |
|---|---|---|
| `/client360-v2-preview` | `frontend/src/pages/Client360V2Preview.jsx` | Redesigned client 360 |
| `/advisor-collab-preview` | `frontend/src/pages/AdvisorCollabPortalPreview.jsx` | Collab portal mock |
| `/advisor-workspace-preview` | `frontend/src/pages/AdvisorWorkspacePreview.jsx` | Advisor Command Centre using real backend data |

Routes were added to `frontend/src/App.jsx` — **only** 3 new lazy imports + 3 new `<Route>` entries. No existing routes or logic changed.

---

## Existing Code — No Changes Confirmed

- `ClientList.jsx`, `Client360.jsx`, `ClientForm.jsx`, `ClientPortal.jsx` — **untouched**
- `AdvisorLogin.jsx`, `auth.js`, `RequireAdvisorAuth.jsx` — **untouched**
- All backend files — **untouched**

---

## Current State: `AdvisorWorkspacePreview`

### What the page does
- Calls real backend endpoints: `GET /clients`, `GET /briefing/...`, `GET /notifications/advisor/me`
- Fetches per-client data when a client is selected: goals, trades, interactions, meeting prep
- Renders: KPI cards, workflow pipeline, priority queue, **full All Clients table**, endpoint coverage panel
- Uses `Promise.allSettled` so clients always render even if briefing/AI endpoints fail

### Issue: Clients list still not visible in browser
**Root cause identified**: `/briefing` endpoint returns 502 (AI key missing or ANTHROPIC_API_KEY not configured for local run). Before the `allSettled` fix the page was silently failing.

**Fix applied**: `Promise.allSettled` — clients load independently of briefing.

**Why user still can't see it**: Frontend is running on **port 5174** (5173 was occupied). Backend is up on **8000**.

### To verify in next session, open:
```
http://127.0.0.1:5174/advisor-workspace-preview
```
Login with: `rm_demo` / `aria2026`

If still blank:
1. Open DevTools → Network tab → check `/api/clients` response
2. Check if Vite proxy is forwarding `/api/*` → `localhost:8000` (confirmed in `vite.config.js`)
3. Check if `getClients()` in `src/api/client.js` uses `/api/clients` or direct URL

---

## Local Dev Stack

| Service | URL | Start command |
|---|---|---|
| Backend (FastAPI) | http://127.0.0.1:8000 | `cd backend && ./venv/bin/uvicorn app.main:app --reload --port 8000` |
| Frontend (Vite) | http://127.0.0.1:5174 | `cd frontend && npm run dev` |
| Full stack | both | `./start.sh` from project root |

Backend confirmed returning **59 clients** from `GET /clients`.

---

## Next Steps (Priority)

1. **Verify clients list renders** at `/advisor-workspace-preview` with backend running
2. **Debug `getClients()` in `src/api/client.js`** — confirm it hits `/api/clients` (proxied) not direct port
3. **Briefing 502** — set `ANTHROPIC_API_KEY` in `backend/.env` to enable AI endpoints
4. Optionally: wire the `AdvisorCollabPortalPreview` and `Client360V2Preview` pages to real data (currently mock/static)

---

## Key Files

```
aria-advisor/
├── backend/
│   ├── app/main.py              FastAPI app
│   ├── app/routers/clients.py   GET /clients, GET /clients/:id
│   ├── app/routers/briefing.py  GET /briefing/:rm_id  ← 502 locally (needs AI key)
│   └── .env                     ANTHROPIC_API_KEY goes here
└── frontend/
    ├── vite.config.js            Proxy /api → localhost:8000
    ├── src/auth.js               Session: localStorage key "aria_advisor_session"
    ├── src/api/client.js         All API calls — check getClients() URL
    └── src/pages/
        ├── AdvisorWorkspacePreview.jsx  ← main focus next session
        ├── AdvisorCollabPortalPreview.jsx
        └── Client360V2Preview.jsx
```
