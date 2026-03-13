---
name: /riastart session trigger — RIA Advisor Copilot
description: When Scott says "/riastart", read RIA project state and output a concise session briefing before doing anything else
type: feedback
---

When Scott says `/riastart`, perform a session briefing BEFORE doing any other work:

1. Read `~/ria-advisor/NOTES.md` — current phase, last shipped, next feature
2. Read the last session row in `~/ria-advisor/SESSION_LOG.md` — what happened last session
3. Read `~/ria-advisor/PRD.md` Section 6 (Build Phases) — check Phase 2 priority queue

Then output a **concise briefing** in this format:

---
**RIA Advisor Copilot — Session Briefing**

**Current phase:** Phase X — [name]

**Last session (date):** [1-2 sentences on what shipped or was decided]

**Next up:** FEAT-XXX — [name] ← ready to build

**Open flags:** [uncommitted changes, doc gaps, blocked items. If none, say "None."]

**Ready when you are.**

---

**Why:** RIA is a separate project from BzHub. Scott needs the same clean handoff without recapping context manually.

**How to apply:** Trigger word is `/riastart`. Always deliver the briefing first — do not start building until Scott confirms the direction. The RIA project lives at `~/ria-advisor`.

