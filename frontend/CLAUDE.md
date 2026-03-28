# ARIA Frontend Standards (React + TypeScript + Vercel)

**Directory:** `/frontend/`
**Tech Stack:** React 18, TypeScript, Tailwind CSS, Vercel (deployment)

---

## Universal Requirements

### Mobile-First Design

- **Tested minimum:** 375px width (iPhone SE)
- **All UI features** must be mobile-responsive from day one
- **Never design desktop-only** — advisors and clients access ARIA on phones
- **Before marking any UI feature done:** Test at 375px in Chrome DevTools

### Browser Compatibility

- **Date inputs:** Never use `<input type="date">` — use `<select>` dropdowns for month/year instead
  - **Why:** Safari's WebKit doesn't fire `onChange` reliably on native date pickers
  - **Test:** Always verify on Safari 14+ before shipping
- **Interactive elements:** Test on both Safari + Chrome before marking done

---

## Design System & Styling

### Base Requirements

- **Framework:** Tailwind CSS (configured in `tailwind.config.js`)
- **Color tokens:** Light mode by default (never dark unless explicitly asked)
- **Shared components:** Nav, header, cards, color palette — shared with ARIA Personal
- **Consistency:** Always check with Sunny Hayes before applying design changes to the sibling app

### ARIA Personal Design Sync

- **Fact:** ARIA Personal (consumer app) shares the same design system (nav, header, cards, colours)
- **Rule:** Before applying any UI/design change to either app, ask Sunny Hayes if it applies to both
- **Scope:** Layout changes, new components, color updates, navigation restructures
- **Why:** The apps share design DNA but may diverge intentionally

### Chart.js Integration

When using Chart.js (dashboards, performance charts):

```html
<!-- WRONG — CDN script doesn't work reliably -->
<script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js"></script>
<script>
  function buildCharts() { ... }
</script>

<!-- RIGHT — inline the library -->
<script>
  // [minified Chart.js code here]
  function buildCharts() { ... }
  buildCharts();
</script>
```

**Why:** CDN scripts may not execute before inline scripts run. Headless browsers don't drain `setTimeout` queues during network idle.

**Pattern:** Bundle Chart.js inline (copy minified source directly). Call `buildCharts()` directly at end of script block. No listeners, no timers.

**Bonus guard in `showTab()`:**
```javascript
if (id === 'command' && !window._chartsBuilt && typeof Chart !== 'undefined') {
  buildCharts();
}
```

---

## Component Structure

### File Organization

```
frontend/
├── src/
│   ├── components/
│   │   ├── layout/
│   │   │   ├── Header.tsx
│   │   │   ├── Nav.tsx
│   │   │   └── Footer.tsx
│   │   ├── features/
│   │   │   ├── ClientList.tsx
│   │   │   ├── GoalForm.tsx
│   │   │   └── ... (feature components)
│   │   └── shared/
│   │       ├── Card.tsx
│   │       ├── Button.tsx
│   │       └── ... (reusable components)
│   ├── pages/
│   │   ├── Dashboard.tsx
│   │   ├── ClientDetail.tsx
│   │   └── ... (route pages)
│   ├── hooks/
│   │   ├── useAuth.ts
│   │   ├── useClient.ts
│   │   └── ... (custom hooks)
│   ├── types/
│   │   └── index.ts          # TypeScript type definitions
│   ├── utils/
│   │   ├── api.ts            # API client
│   │   ├── formatters.ts     # Date, number formatting
│   │   └── validators.ts     # Form validation
│   ├── styles/
│   │   └── globals.css       # Global Tailwind imports
│   ├── App.tsx
│   └── main.tsx
├── tailwind.config.js
├── tsconfig.json
├── vite.config.ts           # Vite build config
└── package.json
```

### Component Naming

- **Files:** kebab-case (`client-list.tsx`, `goal-form.tsx`)
- **Exports:** PascalCase (`export const ClientList = () => {}`)
- **Props interfaces:** `ComponentNameProps` suffix (`ClientListProps`)
- **Hooks:** camelCase with `use` prefix (`useAuth`, `useClient`)

---

## Code Quality & Testing

### TypeScript

- **Strict mode:** Enabled in `tsconfig.json`
- **No `any` types:** Always define explicit types or interfaces
- **Component props:** Always define `interface ComponentNameProps`

### Testing

- **Framework:** Playwright for E2E tests
- **Scope:** Critical user flows (login, create client, submit form)
- **Mobile testing:** E2E tests must verify mobile-responsive behavior

### Linting & Formatting

- **Formatter:** Prettier (100-character line limit, 2-space indent)
- **Linter:** ESLint with Airbnb config
- **Before committing:** Run `npm run lint` + `npm run format`

---

## Environment Variables

### Required `.env.example`

```
VITE_BACKEND_URL=http://localhost:8000
VITE_API_VERSION=v1
```

### Vercel Deployment

- **Env vars:** Use `printf 'value' | vercel env add KEY production` (NOT `echo`)
  - **Why:** `echo` appends `\n` which Vercel stores verbatim, breaking URL validation
- **After `vercel --prod` on command-centre:** Re-alias `claude-command-centre.vercel.app`

### SSO Protection Gotcha

- **Issue:** Vercel SSO protection causes silent 401 on `.vercel.app` URLs
- **Fix:** If needed, disable via Vercel PATCH API
- **When:** Only if auth is failing silently despite valid tokens

---

## API Integration

### API Client Pattern

```typescript
// utils/api.ts
const API_BASE = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8000';

export async function getClients(advisorId: number) {
  const response = await fetch(`${API_BASE}/clients`, {
    headers: {
      'Authorization': `Bearer ${localStorage.getItem('token')}`,
      'X-Advisor-Id': advisorId.toString(),
      'X-Advisor-Role': 'advisor',
    },
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }

  return response.json();
}
```

### Success Response Handling

```typescript
interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
  };
  timestamp: string;
}

// Use:
const response = await fetch(...);
const { success, data, error } = await response.json() as ApiResponse<Client[]>;

if (success) {
  // Use data
} else {
  // Handle error.code + error.message
}
```

### Error Handling

- **Network errors:** Show "Network error — try again"
- **401 responses:** Redirect to login
- **400 responses:** Display `error.message` to user (from backend)
- **500 responses:** Log to console, show "Server error — try again"

---

## Form Handling

### Date Inputs (Critical)

```typescript
// WRONG — doesn't work on Safari
<input type="date" onChange={handleChange} />

// RIGHT — month + year selects
<select value={selectedMonth} onChange={(e) => setMonth(parseInt(e.target.value))}>
  <option value="1">January</option>
  <option value="2">February</option>
  // ... rest of months
</select>

<select value={selectedYear} onChange={(e) => setYear(parseInt(e.target.value))}>
  {[2020, 2021, ..., 2030].map(year => (
    <option key={year} value={year}>{year}</option>
  ))}
</select>
```

**Why:** Safari's WebKit doesn't fire `onChange` on native date pickers reliably.

### Form Validation

- **Client-side:** Use a validation library (e.g., Zod) to validate before sending
- **Server-side:** Always validate again — never trust the frontend
- **Error display:** Show inline errors next to fields, not a summary at the top

---

## Performance & Optimization

### Code Splitting

- **Route-based splitting:** Use React lazy for page components
- **Component lazy loading:** For large components that aren't immediately visible

```typescript
const Dashboard = lazy(() => import('./pages/Dashboard'));

<Suspense fallback={<LoadingSpinner />}>
  <Dashboard />
</Suspense>
```

### Data Fetching

- **Pattern:** React Query or SWR for caching + revalidation
- **Goal:** Avoid redundant API calls, cache client list for 1 hour
- **Manual fetch:** Only when data must be fresh (post-mutation)

### Bundle Size

- **Target:** < 100KB gzipped (3-person startup baseline)
- **Monitor:** Use `npm run build --report` to check bundle size
- **Heavy libraries:** Defer or use lightweight alternatives

---

## State Management

### Simple State

Use `useState` for component-level state. Example:

```typescript
const [clients, setClients] = useState<Client[]>([]);
const [loading, setLoading] = useState(false);

useEffect(() => {
  fetchClients().then(setClients).finally(() => setLoading(false));
}, []);
```

### Shared State (Across Components)

- **Auth state:** Context + localStorage (simple projects)
- **Client data:** Context or React Query for caching
- **Avoid:** Redux for small apps — context is sufficient

### Lazy Client Initialization

For external APIs (Supabase, Firebase), use lazy singleton pattern:

```typescript
// hooks/useSupabase.ts
let supabaseClient: SupabaseClient | null = null;

export function useSupabase() {
  if (!supabaseClient && typeof window !== 'undefined') {
    supabaseClient = createClient(url, key);
  }
  return supabaseClient;
}
```

---

## Accessibility

### WCAG AA Minimum

- **Color contrast:** Text must have 4.5:1 contrast ratio against background
- **Focus management:** Keyboard navigation (Tab) must work for all interactive elements
- **ARIA labels:** Form inputs must have labels; buttons must have descriptive text
- **Testing:** Use axe DevTools browser extension before shipping

### Form Accessibility

```typescript
<label htmlFor="email">Email</label>
<input
  id="email"
  type="email"
  aria-label="Email address"
  aria-required="true"
  required
/>
```

---

## Debugging Tips

### API Integration Issues

1. **Check Network tab:** Is the request being sent?
2. **Check headers:** Are `Authorization` + `X-Advisor-Id` included?
3. **Check response:** What HTTP status? What body?
4. **CORS error in browser?** Likely a 500 from backend (500s don't have CORS headers)

### Mobile Issues

1. **Test at 375px:** Use Chrome DevTools mobile emulation
2. **Check layout:** Is content being cut off or wrapping incorrectly?
3. **Check touch targets:** Buttons must be ≥48px wide (for fat fingers)

### Form Issues

1. **Date input not working?** You're probably using `<input type="date">` — switch to selects
2. **Form not submitting?** Check browser console for validation errors

---

## Deployment Checklist

Before running `vercel --prod`:

- [ ] All tests passing (`npm run test`)
- [ ] No ESLint errors (`npm run lint`)
- [ ] Build succeeds locally (`npm run build`)
- [ ] Tested on mobile (375px+)
- [ ] Tested on Safari + Chrome
- [ ] No hardcoded localhost URLs
- [ ] All env vars set on Vercel
- [ ] API calls use correct endpoint (`VITE_BACKEND_URL`)

---

## Summary

**Golden Rules:**
1. Mobile-first — test at 375px minimum
2. Never `<input type="date">` — use selects
3. Inline Chart.js, never CDN
4. Test on Safari + Chrome before shipping
5. Client-side validation only; server validates everything
6. Use `printf` not `echo` for Vercel env vars
