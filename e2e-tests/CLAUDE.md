# ARIA E2E Tests Standards (Playwright + Vercel Browser)

**Directory:** `/e2e-tests/`
**Tech Stack:** Playwright, Vercel Agent Browser (preferred), Node.js, npm

---

## Test Naming & Cleanup Convention

### Test File Naming

- **Pattern:** `NN-feature-name.spec.ts` (numeric prefix for execution order)
- **Examples:** `01-api-smoke.spec.ts`, `05-personal-full.spec.ts`, `10-trades-workflow.spec.ts`
- **Why:** Numeric order controls test execution sequence

### Test Case Naming

```typescript
// WRONG
test('user can log in', async () => { ... })

// RIGHT — include [TEST] prefix for grep-ability
test('[TEST] Advisor login with valid credentials', async () => { ... })
```

### Cleanup & Test Data

**Email Convention:** All test accounts must use `*-test.com` domain

```typescript
// Test account
const TEST_EMAIL = 'rm_demo-test.com';
const TEST_PASSWORD = 'aria2026';
```

**Cleanup Notes:** Add `[E2E]` prefix to cleanup comments in code

```typescript
// [E2E] Auto-cleanup: rm_demo-test.com accounts created via login
// [E2E] Auto-cleanup: Client IDs 22-30 created during trade tests
```

---

## Test Structure

### Global Setup & Teardown

**`global-setup.ts`** — Runs once before all tests:

```typescript
import { chromium, FullConfig } from '@playwright/test';

async function globalSetup(config: FullConfig) {
  // 1. Create browser context (with auth if needed)
  // 2. Initialize test database state
  // 3. Seed test data (advisors, clients)
  // 4. Log setup completion

  console.log('[E2E] Global setup: Test environment ready');
}

export default globalSetup;
```

**`global-teardown.ts`** — Runs once after all tests:

```typescript
import { chromium, FullConfig } from '@playwright/test';

async function globalTeardown(config: FullConfig) {
  // 1. Delete all test-created data (clients, trades, accounts)
  //    - Use API calls to delete in reverse FK order
  //    - Or direct DB access via psql for speed
  // 2. Verify no test artifacts remain
  // 3. Log cleanup completion

  console.log('[E2E] Global teardown: Test artifacts cleaned up');
}

export default globalTeardown;
```

### Test File Structure

```typescript
// 01-api-smoke.spec.ts
import { test, expect } from '@playwright/test';

test.describe('[TEST] API Smoke Tests', () => {
  test('[TEST] GET /health returns 200', async ({ request }) => {
    const response = await request.get('/health');
    expect(response.status()).toBe(200);
  });

  test('[TEST] POST /advisor/login validates credentials', async ({ request }) => {
    const response = await request.post('/advisor/login', {
      data: { username: 'rm_demo', password: 'wrong' },
    });
    expect(response.status()).toBe(401);
  });
});
```

---

## Playwright Configuration

### `playwright.config.ts`

```typescript
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  timeout: 30 * 1000,
  expect: { timeout: 5000 },
  globalSetup: require.resolve('./global-setup.ts'),
  globalTeardown: require.resolve('./global-teardown.ts'),

  fullyParallel: false, // Run tests sequentially (safer for DB state)

  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:5173',
    reuseExistingServer: !process.env.CI,
  },

  use: {
    baseURL: process.env.PLAYWRIGHT_TEST_BASE_URL || 'http://localhost:5173',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'webkit',
      use: { ...devices['Safari'] },
    },
  ],
});
```

### Package.json Scripts

```json
{
  "scripts": {
    "test": "playwright test",
    "test:ui": "playwright test --ui",
    "test:debug": "playwright test --debug",
    "test:headed": "playwright test --headed",
    "test:report": "playwright show-report"
  }
}
```

---

## Test Patterns

### API Testing (Request Fixtures)

```typescript
test('[TEST] GET /clients returns advisor\'s clients', async ({ request }) => {
  const response = await request.get('/clients', {
    headers: {
      'Authorization': `Bearer ${process.env.TEST_ADVISOR_TOKEN}`,
      'X-Advisor-Id': '1',
    },
  });

  expect(response.status()).toBe(200);
  const { success, data } = await response.json();
  expect(success).toBe(true);
  expect(data).toBeInstanceOf(Array);
});
```

### UI Testing (Browser Fixtures)

```typescript
test('[TEST] Login page displays form fields', async ({ page }) => {
  await page.goto('/login');

  const emailInput = page.locator('input[type="email"]');
  const passwordInput = page.locator('input[type="password"]');
  const submitButton = page.locator('button[type="submit"]');

  await expect(emailInput).toBeVisible();
  await expect(passwordInput).toBeVisible();
  await expect(submitButton).toBeEnabled();
});

test('[TEST] Advisor can log in', async ({ page, request }) => {
  await page.goto('/login');
  await page.fill('input[type="email"]', 'rm_demo');
  await page.fill('input[type="password"]', 'aria2026');
  await page.click('button[type="submit"]');

  // Verify redirect to dashboard
  await expect(page).toHaveURL('/dashboard');

  // Verify auth token in localStorage
  const token = await page.evaluate(() => localStorage.getItem('token'));
  expect(token).toBeTruthy();
});
```

### Mobile Testing

```typescript
test.describe('[TEST] Mobile Workflows', () => {
  test.use({
    viewport: { width: 375, height: 812 }, // iPhone SE
  });

  test('[TEST] Client list is responsive on mobile', async ({ page }) => {
    await page.goto('/clients');

    // Check that card layout stacks vertically
    const cards = page.locator('[data-testid="client-card"]');
    const count = await cards.count();
    expect(count).toBeGreaterThan(0);

    // Check that no horizontal scroll is needed
    const bodyWidth = await page.evaluate(() => document.body.offsetWidth);
    expect(bodyWidth).toBeLessThanOrEqual(375);
  });
});
```

---

## Test Data Management

### Seeding Test Data (In global-setup.ts)

```typescript
async function seedTestData() {
  // 1. Create test advisor account
  const advisorRes = await request.post(`${API_BASE}/advisor/register`, {
    data: {
      username: 'rm_demo-test.com',
      password: 'aria2026',
      name: 'Demo Advisor',
    },
  });
  const { token } = await advisorRes.json();

  // 2. Create test clients
  const clientRes = await request.post(`${API_BASE}/clients`, {
    headers: { 'Authorization': `Bearer ${token}` },
    data: { name: 'Test Client 1', email: 'client1-test.com' },
  });

  // Store for cleanup
  process.env.TEST_ADVISOR_TOKEN = token;
  process.env.TEST_CLIENT_IDS = clientRes.data.map(c => c.id).join(',');
}
```

### Cleaning Up Test Data (In global-teardown.ts)

```typescript
async function cleanupTestData() {
  const advisorToken = process.env.TEST_ADVISOR_TOKEN;
  const clientIds = process.env.TEST_CLIENT_IDS?.split(',') || [];

  // Delete via API (if cascades are implemented)
  for (const clientId of clientIds) {
    await request.delete(`${API_BASE}/clients/${clientId}`, {
      headers: { 'Authorization': `Bearer ${advisorToken}` },
    });
  }

  // Or use direct DB access (faster):
  // psql -c "DELETE FROM clients WHERE id IN (22,23,24,...);"
}
```

---

## Running Tests

### Local Development

```bash
# Run all tests
npm run test

# Run with UI (interactive mode)
npm run test:ui

# Run in debug mode (step through)
npm run test:debug

# Run specific test file
npx playwright test 05-personal-full.spec.ts

# Run tests matching pattern
npx playwright test -g "login"

# Run headed (see browser)
npm run test:headed
```

### CI/CD (GitHub Actions)

```yaml
# .github/workflows/e2e.yml
name: E2E Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'

      - run: npm ci
      - run: npx playwright install
      - run: npm run test

      - uses: actions/upload-artifact@v3
        if: always()
        with:
          name: playwright-report
          path: playwright-report/
```

---

## Debugging & Troubleshooting

### Flaky Tests

**Definition:** Tests that pass sometimes, fail others.

**Common causes:**
1. Timing issues — element not yet visible
2. Stale test data — previous test didn't clean up
3. Race conditions — async operations not awaited

**Solutions:**
1. Use explicit waits:
   ```typescript
   await page.waitForSelector('[data-testid="client-list"]');
   ```
2. Use fixtures for data isolation
3. Increase timeout for slow operations:
   ```typescript
   test.setTimeout(60 * 1000);
   ```

### Test Quarantine

If a test is flaky:

```typescript
test.skip('[TEST] Create trade workflow', async () => {
  // Temporarily skip while debugging
});
```

Or use `test.only()` to run single test:

```typescript
test.only('[TEST] Login flow', async () => {
  // Run only this test, skip others
});
```

### Debugging with Screenshots/Videos

```typescript
test('[TEST] Complex workflow', async ({ page }) => {
  // Take screenshot at key points
  await page.screenshot({ path: 'debug-1.png' });

  await page.click('button');
  await page.screenshot({ path: 'debug-2.png' });

  // Videos automatically captured on failure (see playwright.config.ts)
});
```

View reports:
```bash
npm run test:report
```

---

## Test Organization (By Feature Area)

| File | Tests | Scope |
|------|-------|-------|
| `01-api-smoke.spec.ts` | 10+ | API health, endpoints, error codes |
| `02-auth.spec.ts` | 8+ | Login, logout, token expiration |
| `03-client-mgmt.spec.ts` | 12+ | Create, read, update, delete clients |
| `04-trades.spec.ts` | 10+ | Trade creation, portfolio updates |
| `05-personal-full.spec.ts` | 15+ | End-to-end user workflows |

---

## Summary

**Golden Rules:**
1. **Test naming:** Use `[TEST]` prefix for grep-ability
2. **Test data:** Email domains `*-test.com` for easy cleanup
3. **Cleanup:** Add `[E2E]` notes in code for what was created
4. **Parallelization:** Run sequentially (`fullyParallel: false`) — safer for DB state
5. **Browsers:** Test on both Chromium + WebKit (Safari)
6. **Mobile:** Always include 375px viewport test for critical workflows
7. **Debugging:** Use screenshot + video artifacts on failure

---

## Resources

- [Playwright Docs](https://playwright.dev)
- [Best Practices](https://playwright.dev/docs/best-practices)
- [Locator Strategies](https://playwright.dev/docs/locators)
- [Test Fixtures](https://playwright.dev/docs/test-fixtures)
