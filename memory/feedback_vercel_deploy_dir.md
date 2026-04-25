---
name: Vercel deploy must run from frontend/ directory
description: npm run build and vercel --prod must be run from aria-advisor/frontend/, not aria-advisor/
type: feedback
---

Always `cd frontend/` before running `npm run build` or `vercel --prod` for the ARIA advisor app.

**Why:** Running from the project root (`aria-advisor/`) builds a stale/wrong bundle — Vite picks up a different working tree and the dist output doesn't reflect source changes. The bug is silent: build succeeds, hash looks the same, but new code is missing from the bundle.

**How to apply:** Every frontend build/deploy sequence:
```
cd /Users/sunnyhayes/Daytona/aria-advisor/frontend
npm run build
vercel --prod
vercel alias set <url> aria-advisor.vercel.app
```
Never run these from `aria-advisor/` root.
