# ARIA Backend Standards (FastAPI + SQLAlchemy + Render)

**Directory:** `/backend/`
**Tech Stack:** Python 3.11, FastAPI, SQLAlchemy, Render (deployment), Supabase (database)

---

## Critical Rules (Non-Negotiable)

### 1. Boolean Filters — Always Use `.is_(True)`

```python
# WRONG — breaks on Python 3.14+
db.query(Advisor).filter(Advisor.is_active == True)

# RIGHT
db.query(Advisor).filter(Advisor.is_active.is_(True))
```

**Why:** Python 3.14 changed SQLAlchemy Boolean column `==` evaluation — query returns 0 rows silently, causing auth failures.

**Scope:** Every boolean filter in every query. No exceptions.

### 2. Relationship `order_by` — Never Use Strings

```python
# WRONG — string eval broken on Python 3.14
interactions = relationship("ClientInteraction", order_by="ClientInteraction.interaction_date.desc()")

# RIGHT — omit order_by and sort at query layer
interactions = relationship("ClientInteraction")
```

**Why:** String expressions in `order_by` are eval'd at mapper init. Breaks on Python 3.14 → 500 response → suppresses CORS headers → browser shows misleading CORS error.

**Scope:** Every relationship definition.

### 3. New DB Columns MUST Be Declared in ORM

When a migration adds a column, the ORM model must be updated in the same commit:

```python
# Migration:
conn.execute("ALTER TABLE clients ADD COLUMN IF NOT EXISTS personal_user_id INTEGER")

# ORM model (same commit):
class Client(Base):
    personal_user_id = Column(Integer, nullable=True)  # ← REQUIRED
```

**Why:** Python 3.11 was lenient. Python 3.14 raises `AttributeError` on unmapped columns.

**Scope:** Every schema change.

### 4. CORS Origins — Always Hardcode Prod URLs

```python
# WRONG — relies on missing env var
allow_origins=[os.getenv("FRONTEND_URL", "http://localhost:5173")]

# RIGHT — prod hardcoded, env var additive
allow_origins=[
    "https://aria-advisor.vercel.app",
    "https://aria-personal.vercel.app",
    os.getenv("FRONTEND_URL", ""),
    "http://localhost:5173",
]
```

**Why:** CORS env vars are often missing in production. Omitted = silent CORS failures.

**Scope:** Every FastAPI CORS config.

### 5. Pin Python Runtime on Render

Create `backend/runtime.txt`:
```
python-3.11.9
```

**Why:** Render silently upgrades Python versions without notification. Pinning prevents surprise breaks.

**Scope:** Before first Render deployment.

---

## Database Operations

### Connection Pooling

- **Limit:** Supabase free tier = 20 max connections
- **Pooling:** SQLAlchemy pool settings configured in `engine = create_engine(DATABASE_URL, pool_size=5, max_overflow=10)`
- **When queries queue:** Direct psql access is faster than endpoint redeploy (see below)

### Migrations

- **Pattern:** Alembic with `ADD COLUMN IF NOT EXISTS` for idempotency
- **Never silence errors** — let migration failures surface immediately
- **Always test locally** before Render deploy

### Direct DB Access (Preferred for Infrastructure Tasks)

When you need immediate results (delete clients, fix data), use psql directly:

```bash
PGPASSWORD="<password>" psql \
  -h db.ubihndrihvcwuyaodark.supabase.co \
  -U postgres \
  -d postgres \
  -p 5432 \
  -c "DELETE FROM clients WHERE id IN (22,23,24);"
```

**Why:** Direct access is instant. Endpoint redeploys take 2–5 minutes (or fail).

### Cascading Deletes (Manual Until FK Cascades Are Deployed)

When deleting a client, the ORM cascade isn't yet implemented. Delete in this order:

1. notifications
2. trade_audit_logs
3. trades
4. client_interactions
5. life_events
6. goals
7. holdings (via portfolios FK)
8. portfolios
9. audit_logs
10. clients

**Why:** Supabase enforces FK constraints. Wrong order = delete fails.

---

## API Response Format

### Success Response

```json
{
  "success": true,
  "data": {
    "id": 1,
    "name": "John Advisor",
    "clients": [...]
  },
  "timestamp": "2026-03-28T17:24:33Z",
  "version": "1.0"
}
```

### Error Response

```json
{
  "success": false,
  "error": {
    "code": "INVALID_REQUEST",
    "message": "Client not found",
    "details": {
      "client_id": 999,
      "searched_in": "all_advisors"
    }
  },
  "timestamp": "2026-03-28T17:24:33Z"
}
```

### Authentication & Authorization

- **Every endpoint** requires auth (except login + health checks)
- **Token format:** JWT in `Authorization: Bearer <token>` header
- **Token expiration:** 24 hours with refresh mechanism
- **Scope:** Validate that advisor/client has permission for requested resource

---

## Deployment & Testing

### Pre-Deploy Verification

Run after every `git push` to Render:

```bash
# Test login endpoint
curl -X POST https://aria-backend.onrender.com/advisor/login \
  -H "Content-Type: application/json" \
  -H "Origin: https://aria-advisor.vercel.app" \
  -d '{"username":"rm_demo","password":"aria2026"}' \
  -v

# Check response: must have access-control-allow-origin header
# Response: { "success": true, "data": { "token": "..." } }

# Test protected endpoint
curl -H "Origin: https://aria-advisor.vercel.app" \
  -H "Authorization: Bearer <token>" \
  -H "X-Advisor-Id: 1" \
  https://aria-backend.onrender.com/clients \
  -v

# Check response: must have access-control-allow-origin header
# Response: { "success": true, "data": [...] }
```

**Troubleshooting:**
- **CORS error in browser?** Check HTTP status. 500 responses suppress CORS headers (looks like CORS failure but isn't).
- **401 response?** Check in this order:
  1. Does the query find the row without the boolean filter?
  2. Is `.is_(True)` used on all boolean columns?
  3. Is the request body received correctly?
  4. Is bcrypt working? (last, not first)

### Render Deployment Notes

- **Build time:** 2–5 minutes
- **Common failures:** Missing dependencies (check `requirements.txt`), syntax errors (linter will catch)
- **Endpoint health:** Check `/health` endpoint after deploy

---

## Code Quality

### Python Style

- **Formatter:** `black` (line length 100)
- **Linter:** `ruff` with strict defaults
- **Coverage:** 80% minimum on critical paths (auth, client operations, data integrity)

### Testing

- **Framework:** `pytest`
- **Scope:** Unit tests for business logic, integration tests for API endpoints
- **Database tests:** Always hit real DB, never mock (reasons: last session's experience with mocked migrations)

### Naming

- **Files:** kebab-case (`personal_auth.py`, `client_router.py`)
- **Classes:** PascalCase (`ClientInteraction`, `AdvisorPortfolio`)
- **Functions:** camelCase (`get_client_list()`, `is_advisor()`)
- **Constants:** UPPER_SNAKE_CASE (`MAX_CONNECTIONS`, `DEFAULT_TIMEOUT`)
- **Database:** snake_case (`client_interactions`, `audit_logs`)

---

## Debugging Tips

### CORS Failures

A browser CORS error almost always means the server returned 500. A 500 response has no CORS headers, which browsers report as "CORS error."

**Check first:** `curl -v` to see raw HTTP status. If 500: fix server error. Likely causes in ARIA:
1. Boolean filter not using `.is_(True)`
2. String `order_by` in relationship
3. Accessing unmapped ORM column

### Auth Failures (401)

Check in this order:
1. Query result: Does it find the row *without* the boolean filter?
2. Boolean filters: All using `.is_(True)`?
3. Request body: Is it received?
4. Token validation: Is JWT parsing working?
5. Bcrypt: Last resort — it's rarely the problem

### Silent Failures

If something "just works" locally but fails on Render, suspect version mismatches:
- Python version mismatch (see `runtime.txt`)
- Dependency version mismatch (check `requirements.txt`)
- Environment variable missing (check logs at `onrender.com`)

---

## File Structure

```
backend/
├── app/
│   ├── models.py              # ORM definitions
│   ├── personal_models.py     # Personal finance models (separate file)
│   ├── routers/
│   │   ├── advisor_auth.py    # Login, token generation
│   │   ├── personal_auth.py   # Personal user auth
│   │   ├── clients.py         # Client CRUD + relationships
│   │   └── ... (other routers)
│   ├── dependencies.py        # Shared deps, auth, validation
│   └── main.py                # FastAPI app init
├── migrations/                # Alembic migration scripts
├── tests/
│   ├── test_auth.py
│   ├── test_clients.py
│   └── ... (one per router)
├── requirements.txt           # Pinned dependencies
├── runtime.txt                # Python version
└── .env.example               # Env var template
```

---

## Cross-Model Rules (ARIA-Specific)

- **No ORM FK relationships between `models.py` and `personal_models.py`**
  - Reason: Cross-file ORM relationships are fragile in SQLAlchemy
  - Instead: Use query joins or manual ID references
  - Pattern: `client.personal_user_id` (FK at DB level) + manual query join (at ORM level)

---

## Summary

**Golden Rules:**
1. `.is_(True)` on all boolean filters
2. Never string `order_by` in relationships
3. Map every DB column in ORM
4. Hardcode CORS prod origins
5. Pin Python version
6. Test with curl after every Render deploy

**When in doubt:** Check the RCA document at `~/Daytona/aria-advisor/docs/RCA-2026-03-21-deep-dive.md`.
