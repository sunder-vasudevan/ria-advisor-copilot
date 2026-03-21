# ARIA Test Plan

> Manual test checklist for A-RiA (Advisor Workbench) and ARIA Personal.
> Run before every production deploy. Mark each item ✅ pass / ❌ fail / ⚠️ partial.

---

## A-RiA Advisor Workbench

### AUTH
| # | Test | Expected | Result |
|---|------|----------|--------|
| A-01 | Login with `rm_demo` / `aria2026` | Redirects to client book | |
| A-02 | Login with `hamza` / `aria2026` | Redirects, shows Hamza · Lyari in top bar | |
| A-03 | Login with `sunny_hayes` / `aria2026` | Redirects, shows SUPER badge | |
| A-04 | Login with wrong password | Error message shown, no redirect | |
| A-05 | Refresh page while logged in | Session persists, stays on client book | |
| A-06 | Sign out | Redirects to /login, session cleared | |
| A-07 | Navigate to `/` without session | Redirects to /login | |
| A-08 | Backend unavailable — login with valid demo creds | Falls back to local map, still logs in | |
| A-09 | Login page shows both demo advisors | rm_demo (Rahul · Hyderabad) + hamza (Hamza · Lyari) | |

### ADVISOR PROFILE IN TOP BAR
| # | Test | Expected | Result |
|---|------|----------|--------|
| AP-01 | rm_demo login — top bar shows "Rahul" + "Hyderabad" | City visible below name on desktop | |
| AP-02 | hamza login — top bar shows "Hamza" + "Lyari" | City visible below name on desktop | |
| AP-03 | Mobile — city not shown (space constrained) | Only avatar visible on mobile | |

### ADVISOR DB (backend)
| # | Test | Expected | Result |
|---|------|----------|--------|
| DB-01 | `GET /advisor/profile/rm_demo` | Returns Rahul, Hyderabad, RAHUL01 | |
| DB-02 | `GET /advisor/profile/hamza` | Returns Hamza, Lyari, HAMZA01 | |
| DB-03 | `GET /advisor/all` | Returns all 3 active advisors | |
| DB-04 | `POST /advisor/login` correct creds | Returns advisor profile JSON | |
| DB-05 | `POST /advisor/login` wrong password | 401 response | |

### TOP BAR & NAVIGATION
| # | Test | Expected | Result |
|---|------|----------|--------|
| N-01 | Top bar visible on all viewport widths | Sticky, frosted glass, no sidebar | |
| N-02 | Scroll page down | Top bar stays fixed at top | |
| N-03 | "Clients" nav link active state | Blue bg + blue text on client book | |
| N-04 | Click "Help" | Navigates to /help | |
| N-05 | Logo visible | ARiA wordmark renders correctly | |
| N-06 | Display name shown | Session displayName shown in top bar | |
| N-07 | Sign out button in top bar | Clears session, redirects to /login | |

### GREETING HERO BENTO
| # | Test | Expected | Result |
|---|------|----------|--------|
| H-01 | Greeting shows advisor name | "Good morning, {displayName}" | |
| H-02 | Today's date shown | Correct formatted date | |
| H-03 | Attention badge shows when clients need attention | Red/amber badge with count | |
| H-04 | AUM card shows total | Sum of all client portfolio values in ₹ | |
| H-05 | AUM card shows client count | Correct count | |
| H-06 | Bento grid responsive | 3-col on desktop, stacks on mobile | |

### MORNING BRIEFING
| # | Test | Expected | Result |
|---|------|----------|--------|
| B-01 | Click "Morning Briefing" button | Loads briefing, shows in bento slot | |
| B-02 | Loading state | Spinner shows while loading | |
| B-03 | Briefing headline shows | AI-generated headline visible | |
| B-04 | Client attention rows clickable | Navigates to Client360 | |
| B-05 | "On Track" chips shown | Green chips for on-track clients | |
| B-06 | Collapse/expand briefing | Toggle works | |
| B-07 | API key missing | Alert shown with helpful message | |

### CLIENT BOOK
| # | Test | Expected | Result |
|---|------|----------|--------|
| C-01 | All clients load | 20 seeded clients visible | |
| C-02 | Search by name | Filters correctly | |
| C-03 | Search by segment (HNI/Retail) | Filters correctly | |
| C-04 | Clear search | All clients return | |
| C-05 | Grouped view | "Needs Attention" and "On Track" sections | |
| C-06 | List view | Table renders with all columns | |
| C-07 | Toggle between views | Switches correctly | |
| C-08 | Avatar initials shown | First 2 initials from client name | |
| C-09 | Urgency badge correct | High=red, medium=amber, none=green "On Track" | |
| C-10 | Segment badge (HNI/Retail) | Correct styling | |
| C-11 | Portfolio value shown | Formatted ₹ value | |
| C-12 | Hover prefetch | No errors in console | |
| C-13 | Click client row | Navigates to Client360 | |
| C-14 | Portal Active badge | Shows teal badge when `personal_user_id` set | |

### ADD CLIENT
| # | Test | Expected | Result |
|---|------|----------|--------|
| AC-01 | Desktop "Add Client" button | Filled blue, white text | |
| AC-02 | Click desktop button | Navigates to /clients/new | |
| AC-03 | Mobile FAB visible | Blue circle, bottom-right, above bottom nav | |
| AC-04 | Click FAB | Navigates to /clients/new | |
| AC-05 | Form Tab 1 — Identity fields | Name, DOB, age, contact, address | |
| AC-06 | Form Tab 2 — Risk questionnaire | 5 questions, calculates score | |
| AC-07 | Form Tab 3 — Portfolio | Total value, allocation % | |
| AC-08 | Form Tab 4 — Goals | Optional goals entry | |
| AC-09 | Save client | Creates record, redirects to Client360 | |
| AC-10 | Required field validation | Blocks submission with error | |

### CLIENT 360
| # | Test | Expected | Result |
|---|------|----------|--------|
| D-01 | Client name and segment shown | Correct data | |
| D-02 | Portfolio donut chart renders | Pie chart with allocations | |
| D-03 | Allocation bars shown | Equity/Debt/Cash vs targets | |
| D-04 | Goals panel loads | Goals with probability % | |
| D-05 | Goal probability pills correct color | Teal/amber/rose | |
| D-06 | Interactions panel loads | Interaction history shown | |
| D-07 | Add interaction | New entry appears | |
| D-08 | Situation summary generates | AI text rendered | |
| D-09 | Meeting prep generates | AI text rendered | |
| D-10 | Copilot chat sends message | Response received | |
| D-11 | Back navigation | Returns to client book | |

### MOBILE (Advisor)
| # | Test | Expected | Result |
|---|------|----------|--------|
| M-01 | Bottom nav visible (4 items) | Clients, New, Briefing, Help | |
| M-02 | Bottom nav frosted glass | bg-white/90 backdrop-blur visible | |
| M-03 | FAB above bottom nav | Not overlapping nav | |
| M-04 | Client cards (not table) on mobile | Card layout, not table | |
| M-05 | Top bar fits small screen | No overflow or wrapping | |
| M-06 | Briefing readable on mobile | No horizontal scroll | |
| M-07 | Add client form usable on mobile | Keyboard doesn't block inputs | |
| M-08 | Bottom nav spacer | Content not hidden behind nav | |

---

## ARIA Personal

### AUTH
| # | Test | Expected | Result |
|---|------|----------|--------|
| P-A-01 | Register with new email | Account created, redirected to dashboard | |
| P-A-02 | Register with existing email | Error: email already in use | |
| P-A-03 | Password under 8 chars | Validation error shown | |
| P-A-04 | Login with valid credentials | JWT stored, redirected to dashboard | |
| P-A-05 | Login with wrong password | Error message shown | |
| P-A-06 | Refresh page while logged in | Session persists | |
| P-A-07 | Logout | Token cleared, redirects to /login | |
| P-A-08 | Navigate to `/` without token | Redirects to /login | |

### TOP BAR & NAVIGATION (Personal)
| # | Test | Expected | Result |
|---|------|----------|--------|
| PN-01 | Frosted top bar visible all viewports | Sticky, no dark sidebar | |
| PN-02 | Desktop nav links (5 items) | Dashboard, Goals, Life Events, Ask ARIA, Help | |
| PN-03 | Active nav link highlighted | Blue text/bg on current page | |
| PN-04 | User display name shown | Name from `user.display_name` | |
| PN-05 | Logout button | Clears token, goes to /login | |
| PN-06 | Scroll down | Top bar stays fixed | |

### DASHBOARD
| # | Test | Expected | Result |
|---|------|----------|--------|
| PD-01 | Gradient hero shown | Blue gradient card, first name, date text | |
| PD-02 | Urgent goals attention badge | Shows count when goals < 70% | |
| PD-03 | Portfolio total displayed | ₹ value formatted correctly | |
| PD-04 | Donut chart renders | Holdings shown as pie | |
| PD-05 | Allocation bars (Equity/Debt/Cash) | Current vs target shown | |
| PD-06 | Holdings list | Fund name, house, value | |
| PD-07 | Urgent goals section | Amber card when goals < 70% | |
| PD-08 | Goals on track section | Green when all ≥ 70% | |
| PD-09 | No portfolio empty state | CTA to add portfolio | |
| PD-10 | Edit portfolio button | Opens PortfolioEditor | |

### GOALS
| # | Test | Expected | Result |
|---|------|----------|--------|
| PG-01 | Goals list loads | All goals shown | |
| PG-02 | Create new goal | Form submits, goal appears | |
| PG-03 | Probability pill correct color | Teal/amber/rose | |
| PG-04 | What-If Mode 1 — "Will I achieve it?" | Probability updates with inputs | |
| PG-05 | What-If Mode 2 — "What SIP do I need?" | SIP amount calculated | |
| PG-06 | Edit goal | Changes saved | |
| PG-07 | Delete goal | Removed from list | |

### LIFE EVENTS
| # | Test | Expected | Result |
|---|------|----------|--------|
| PL-01 | Life events load | All events shown | |
| PL-02 | Add event | Appears in list | |
| PL-03 | Edit event | Changes saved | |
| PL-04 | Delete event | Removed | |

### COPILOT
| # | Test | Expected | Result |
|---|------|----------|--------|
| PC-01 | Send message | Response received | |
| PC-02 | Conversation history maintained | Previous messages visible | |
| PC-03 | Loading state | Spinner or "thinking" shown | |
| PC-04 | Error when API down | Graceful error message | |

### MOBILE (Personal)
| # | Test | Expected | Result |
|---|------|----------|--------|
| PM-01 | Bottom nav visible (5 items) | Dashboard, Goals, Life, Ask ARIA, Help | |
| PM-02 | Frosted bottom nav | Glass effect visible | |
| PM-03 | Content not hidden behind nav | pb-20 spacer working | |
| PM-04 | Top bar minimal on mobile | Fits small screen, no overflow | |
| PM-05 | Goals page usable on mobile | Forms/inputs accessible | |
| PM-06 | Copilot chat scrollable | Input not blocked by keyboard | |

---

## Cross-App
| # | Test | Expected | Result |
|---|------|----------|--------|
| X-01 | Backend health check | `GET /health` returns `{"status":"ok"}` | |
| X-02 | ARIA Personal connects to same backend | API calls succeed | |
| X-03 | Safari — frosted glass renders | backdrop-filter works on Safari 14+ | |
| X-04 | Safari — date inputs (no type=date) | Month/year selects used, not native date | |

---

## Performance
| # | Test | Expected | Result |
|---|------|----------|--------|
| PERF-01 | Cold start latency | < 5s after keep-alive configured | |
| PERF-02 | Client book load | Clients visible within 2s on warm backend | |
| PERF-03 | Vite build completes | No errors, bundle < 2MB | |
| PERF-04 | Lighthouse — Advisor (mobile) | Performance > 70 | |
| PERF-05 | Lighthouse — Personal (mobile) | Performance > 70 | |

---

## Test Run Log

| Date | Tester | App | Result | Notes |
|------|--------|-----|--------|-------|
| | | | | |
