# ARIA — Test Log

> Records test results per feature. No feature is marked done until tested and logged here.

---

## Format

```
### [TEST-XXX] — Feature Name (FEAT-ID)
**Date:** YYYY-MM-DD
**Phase:**
**Tested by:** Sunny Hayes
**Test type:** Manual / Automated / Both
**Environment:** Local / Render+Vercel (prod)

| Test Case | Expected | Result | Status |
|-----------|----------|--------|--------|
| | | | ✅ Pass / ❌ Fail / ⚠️ Partial |

**Known gaps:**
**Blocked on:**
```

---

### [TEST-001] — Client Book + Urgency Ranking
**Date:** 2026-03-16
**Phase:** 1
**Tested by:** Sunny Hayes
**Test type:** Manual
**Environment:** Local + Vercel (prod)

| Test Case | Expected | Result | Status |
|-----------|----------|--------|--------|
| Client list loads with 20 clients | All 20 seeded clients displayed | Loaded correctly | ✅ Pass |
| Urgency ranking orders correctly | High urgency clients at top | Ordered by urgency score | ✅ Pass |
| Search by name filters list | Matching clients shown | Working | ✅ Pass |
| Search by segment filters list | HNI / Retail filter works | Working | ✅ Pass |

**Known gaps:** Advanced filtering (FEAT-401) not yet built

---

### [TEST-002] — Client 360 View
**Date:** 2026-03-16
**Phase:** 1
**Tested by:** Sunny Hayes
**Test type:** Manual
**Environment:** Local + Vercel (prod)

| Test Case | Expected | Result | Status |
|-----------|----------|--------|--------|
| Client 360 loads for Priya Sharma (ID 1) | Full profile, portfolio, goals, life events | Loaded correctly | ✅ Pass |
| Holdings table displays allocations | Holdings with drift indicators | Displayed | ✅ Pass |
| Portfolio donut chart renders | Equity/debt/cash split | Rendered | ✅ Pass |
| Goals panel shows probability bars | Color-coded bars (green/amber/red) | Working | ✅ Pass |
| Life events display with timestamps | Events with days-ago | Working | ✅ Pass |

**Known gaps:** Data is static seed — no live NAV (FEAT-201)

---

### [TEST-003] — AI Situation Summary
**Date:** 2026-03-16
**Phase:** 1
**Tested by:** Sunny Hayes
**Test type:** Manual
**Environment:** Local + Vercel (prod)

| Test Case | Expected | Result | Status |
|-----------|----------|--------|--------|
| Summary auto-loads on Client 360 open | AI summary appears without prompt | Auto-loaded | ✅ Pass |
| Summary includes client context | Portfolio, goals, flags referenced | Contextually accurate | ✅ Pass |
| Suitability disclaimer present | "Subject to suitability review" | Present | ✅ Pass |

**Known gaps:** None

---

### [TEST-004] — AI Copilot Chat
**Date:** 2026-03-16
**Phase:** 1
**Tested by:** Sunny Hayes
**Test type:** Manual
**Environment:** Local + Vercel (prod)

| Test Case | Expected | Result | Status |
|-----------|----------|--------|--------|
| Suggested prompts shown on first load | 5 pre-built prompts visible | Showing | ✅ Pass |
| Demo question: "She needs money in 6 months, what changes?" | Structured 4-section response | Correct format | ✅ Pass |
| Multi-turn conversation maintains context | Follow-up questions reference prior context | Working | ✅ Pass |
| Audit log written per interaction | AuditLog record created | Verified in DB | ✅ Pass |

**Known gaps:** Book-level questions not yet built (FEAT-301)

---

### [TEST-005] — Morning Briefing
**Date:** 2026-03-16
**Phase:** 1
**Tested by:** Sunny Hayes
**Test type:** Manual
**Environment:** Local + Vercel (prod)

| Test Case | Expected | Result | Status |
|-----------|----------|--------|--------|
| Briefing loads for RM | Top 8 clients flagged with AI narration | Loaded | ✅ Pass |
| Urgency ranking matches client list | Same order as Client Book | Consistent | ✅ Pass |

**Known gaps:** None

---

### [TEST-006] — Monte Carlo + What-If Sliders (FEAT-501, FEAT-502)
**Date:** 2026-03-16
**Phase:** 2
**Tested by:** Sunny Hayes
**Test type:** Manual
**Environment:** Local + Vercel (prod)

| Test Case | Expected | Result | Status |
|-----------|----------|--------|--------|
| Goal projection endpoint returns data | Monte Carlo result with probability % | Returns correctly | ✅ Pass |
| What-if sliders render in Goals tab | SIP / return / timeline sliders visible | Rendered | ✅ Pass |
| Slider changes update projection | Probability recalculates | ⚠️ Manual trigger only — FEAT-503 pending | ⚠️ Partial |

**Known gaps:** Live debounced recalculation not yet built — FEAT-503 is next
**Blocked on:** FEAT-503

### [TEST-007] — Trade Notifications UI (FEAT-1004)
**Date:** 2026-03-27
**Phase:** 2
**Tested by:** Sunny Hayes
**Test type:** Manual + API verification
**Environment:** Render+Vercel (prod)

| Test Case | Expected | Result | Status |
|-----------|----------|--------|--------|
| NotificationBell component renders | Bell icon visible in header | Visible ✅ | ✅ Pass |
| Unread badge displays count | Red badge with number (max 9+) | Badge displays correctly | ✅ Pass |
| Dropdown panel opens on click | Panel expands from bell icon | Opens correctly | ✅ Pass |
| Click-outside dismisses panel | Panel closes when clicking outside | Dismisses correctly | ✅ Pass |
| Empty state displays | "You're all caught up" when no notifications | Displays correctly | ✅ Pass |
| Notification icons show | 🔔 submitted, ✅ approved, ❌ rejected | Icons render correctly | ✅ Pass |
| Border colors match status | Amber/green/red left borders | Colors correct | ✅ Pass |
| Auto-polling works | Fetches every 60s | Polls correctly | ✅ Pass |
| Mark-all-read on open | Opening panel marks unread as read | Works correctly | ✅ Pass |
| Click notification navigates | Clicking notification → client 360° | Navigation works | ✅ Pass |
| Mobile dropdown responsive | Full-width on small screens | Responsive ✅ | ✅ Pass |
| API returns client_id | NotificationOut schema has client_id | Returns correctly | ✅ Pass |

**Known gaps:** Notifications only appear when client has personal_user_id (requires Personal ARIA integration)
**Blocked on:** Personal ARIA user linking (not blocking feature — works once integrated)
