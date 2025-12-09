# AURA End-to-End Regression Suite

Comprehensive test coverage for all critical AURA platform flows.

## Quick Start

```bash
# Run all AURA regression tests
npm run test:e2e:aura

# Run specific test suites
npm run test:e2e tests/e2e/aura-header-branding.spec.ts
npm run test:e2e tests/e2e/aura-dashboard-hero.spec.ts
npm run test:e2e tests/e2e/aura-copilot-command-bar.spec.ts

# Run full regression suite
npm run test:e2e tests/e2e/aura-regression-suite.spec.ts

# Run with UI mode for debugging
npm run test:e2e:ui tests/e2e/aura-regression-suite.spec.ts
```

## Test Coverage

### 1️⃣ Header & User Experience
**File**: `tests/e2e/aura-header-branding.spec.ts`

✅ AURA logo (no text branding)  
✅ Time-based greeting (Good morning/afternoon/evening, {firstName})  
✅ No role dropdown  
✅ No Co-Pilot button in header  
✅ Modern thin hamburger menu icon  
✅ Hairline divider below header  
✅ Floating Co-Pilot button (outside header)  
✅ No console errors  
✅ Responsive on mobile

### 2️⃣ Dashboard Hero Message
**File**: `tests/e2e/aura-dashboard-hero.spec.ts`

✅ "Welcome to AURA" heading  
✅ "Where ideas become intelligent twins." tagline  
✅ No old "Your Digital Twin Studio" messaging  
✅ Proper HTML hierarchy (h1, p tags)  
✅ Centered layout  
✅ Co-Pilot command bar below hero  
✅ Consistent spacing and typography

### 3️⃣ Co-Pilot Command Bar
**File**: `tests/e2e/aura-copilot-command-bar.spec.ts`

✅ Co-Pilot icon and placeholder text  
✅ Suggestion chips on focus  
✅ URL detection → triggers scanner  
✅ Natural language → opens Co-Pilot chat  
✅ "Ask Co-Pilot" button  
✅ Suggestion chip clicks  
✅ Loading states  
✅ Input validation  
✅ Enter key submission  
✅ Empty input handling

### 4️⃣ URL Scanner & Intake Flows
**Part of**: `tests/e2e/aura-regression-suite.spec.ts`

✅ URL scanning with valid URL  
✅ Generate top 3 recommendations  
✅ Clicking recommendation opens template preview  
✅ Invalid URL error handling  
✅ No page crashes

### 5️⃣ Template Library & YVR
**Part of**: `tests/e2e/aura-regression-suite.spec.ts`

✅ Template library modal opens  
✅ YVR card displays with correct metadata  
✅ YVR preview with all tabs (Overview, Blueprint, Preview, Day in the Life, Scenarios, Simulation, Deploy)  
✅ Tab switching without layout breaks  
✅ Close button functionality  
✅ Overview content validation  
✅ Blueprint agents and data sources  
✅ Scenarios separate from Simulation

### 6️⃣ Builder Flow (Use This Template)
**Part of**: `tests/e2e/aura-regression-suite.spec.ts`

✅ Start builder from YVR template  
✅ Navigate through Steps 1-5  
✅ Pre-filled data from template  
✅ No "Workflow actions are required" error  
✅ Step 4 workflows pre-populated  
✅ Deploy button visible on Step 5

### 7️⃣ Simulation Tab - Mock Data & Run
**Part of**: `tests/e2e/aura-regression-suite.spec.ts`

✅ Baseline metrics display (not 0.0)  
✅ Idle status initial state  
✅ Run button starts simulation  
✅ Status changes: Idle → Running → Completed  
✅ Event timeline shows events  
✅ Metrics update during simulation  
✅ Reset button restores baseline

### 8️⃣ Deploy Flow & Deployed Agents
**Part of**: `tests/e2e/aura-regression-suite.spec.ts`

✅ Deploy from builder Step 5  
✅ Deploy button loading state  
✅ Success toast/banner  
✅ Redirect to agents dashboard  
✅ Deployed twin appears in list  
✅ Status badge (Active)  
✅ Run and Manage buttons  
✅ Manage opens unified preview layout

### 9️⃣ KPI Tiles → Analytics Pages
**Part of**: `tests/e2e/aura-regression-suite.spec.ts`

✅ KPI tiles display on dashboard  
✅ Tiles show values (0 allowed)  
✅ Clicking tile navigates to analytics  
✅ No 404 errors  
✅ Filter context preserved

### 🔟 Visual/UX Checks
**Part of**: `tests/e2e/aura-regression-suite.spec.ts`

✅ Close buttons functional in modals  
✅ Consistent fonts and spacing  
✅ No overlapping elements  
✅ Responsive design

### 1️⃣1️⃣ Error Handling & Negative Tests
**Part of**: `tests/e2e/aura-regression-suite.spec.ts`

✅ Validation error for missing workflows  
✅ Deleted template graceful handling  
✅ Failed API retry options  
✅ No 4xx/5xx errors in core flows  
✅ Performance: Dashboard loads < 3s

---

## Test Infrastructure

### Authentication Helper
**File**: `tests/helpers/auth.ts`

```typescript
import { login, logout, getAuthToken } from '../helpers/auth';

// Login as test user
await login(page, 'test_exec@aura.dev', 'TestPassword123!');

// Logout
await logout(page);

// Get auth token
const token = await getAuthToken(page);
```

### Seed Data Helper
**File**: `tests/helpers/seedHelpers.ts`

```typescript
import { seedTestUser, seedMockDigitalTwin, cleanupTestData } from '../helpers/seedHelpers';

// Seed test user
const user = await seedTestUser(context);

// Seed mock digital twin
const twin = await seedMockDigitalTwin(context, {
  name: 'YVR Airport Operations',
  status: 'Active',
  template_id: 'YVR_AIRPORT_DIGITAL_TWIN'
});

// Cleanup after tests
await cleanupTestData();
```

---

## Running Tests

### All AURA Regression Tests
```bash
npm run test:e2e:aura
```

### Individual Test Suites
```bash
# Header & branding
npm run test:e2e tests/e2e/aura-header-branding.spec.ts

# Dashboard hero
npm run test:e2e tests/e2e/aura-dashboard-hero.spec.ts

# Co-Pilot command bar
npm run test:e2e tests/e2e/aura-copilot-command-bar.spec.ts

# Full regression suite
npm run test:e2e tests/e2e/aura-regression-suite.spec.ts
```

### Debugging Tests
```bash
# Run with Playwright UI
npm run test:e2e:ui tests/e2e/aura-regression-suite.spec.ts

# Run in headed mode (see browser)
npm run test:e2e tests/e2e/aura-regression-suite.spec.ts -- --headed

# Run specific test
npm run test:e2e tests/e2e/aura-regression-suite.spec.ts -g "should display AURA branding"
```

### CI/CD Integration
```bash
# Run in CI mode (parallel, retries, screenshots)
CI=true npm run test:e2e:aura
```

---

## Test Tags

Tests are tagged for selective execution:

- `@regression` - Core regression tests
- `@smoke` - Critical smoke tests
- `@slow` - Tests that take longer
- `@skip` - Temporarily skipped tests

Run by tag:
```bash
# Run only regression tests
npm run test:e2e -- --grep @regression

# Run only smoke tests
npm run test:e2e -- --grep @smoke
```

---

## Configuration

### Playwright Config
**File**: `playwright.config.ts`

```typescript
{
  testDir: './tests/e2e',
  timeout: 30000,
  retries: process.env.CI ? 2 : 1,
  use: {
    baseURL: 'http://localhost:5173',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  projects: [
    { name: 'chromium' },
    { name: 'firefox' },
    { name: 'webkit' },
    { name: 'mobile' }
  ]
}
```

### Environment Variables
```bash
# .env.test
VITE_SUPABASE_URL=http://localhost:54321
VITE_SUPABASE_PUBLISHABLE_KEY=test-key
USE_MOCK_LLM=true
```

---

## Debugging Failed Tests

### Check Console Logs
```typescript
const consoleErrors: string[] = [];
page.on('console', msg => {
  if (msg.type() === 'error') {
    consoleErrors.push(msg.text());
  }
});
```

### Check Network Requests
```typescript
page.on('response', response => {
  if (response.status() >= 400) {
    console.log(`Failed: ${response.status()} ${response.url()}`);
  }
});
```

### Take Screenshots
```bash
# Screenshots saved to: test-results/
npm run test:e2e tests/e2e/aura-regression-suite.spec.ts
```

### View Trace
```bash
# View trace for failed tests
npx playwright show-trace test-results/.../trace.zip
```

---

## Acceptance Criteria

This regression suite is complete when:

✅ All tests pass locally  
✅ All tests pass in CI  
✅ No console errors in tested flows  
✅ No 4xx/5xx from core APIs  
✅ Tests are stable (no flakiness) across 3+ runs  
✅ Dashboard loads < 3 seconds  
✅ YVR template acts as baseline  
✅ All critical user flows covered

---

## Maintenance

### Adding New Tests

1. Create test file in `tests/e2e/`:
   ```bash
   tests/e2e/aura-{feature}.spec.ts
   ```

2. Follow naming convention:
   ```typescript
   test.describe('AURA {Feature} @regression', () => {
     test('should {behavior}', async ({ page }) => {
       // Test implementation
     });
   });
   ```

3. Add tags: `@regression`, `@smoke`, etc.

4. Update this README

### Updating Tests After Changes

If you update AURA branding, header, or core flows:
1. Update relevant test assertions
2. Run full regression suite to verify
3. Update screenshots/baselines if needed
4. Update this README

---

## CI/CD Workflow

### GitHub Actions
**File**: `.github/workflows/aura-regression.yml`

```yaml
name: AURA E2E Regression

on:
  push:
    branches: [main, develop]
  pull_request:

jobs:
  aura-e2e:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm ci
      - run: npx playwright install --with-deps
      - run: npm run test:e2e:aura
      - uses: actions/upload-artifact@v3
        if: failure()
        with:
          name: playwright-report
          path: playwright-report/
```

---

## Success Metrics

✅ **100% pass rate** on critical flows  
✅ **< 5 minute** total execution time  
✅ **Zero flaky tests** (stable across runs)  
✅ **Full coverage** of AURA rebrand  
✅ **YVR template** as regression baseline  
✅ **< 3 second** dashboard load time  
✅ **No console errors** in production flows

---

## Contact & Support

If tests are failing:
1. Check CI workflow logs
2. Review debugging section above
3. Verify recent changes to AURA branding
4. Check Supabase backend connectivity
5. Run tests locally with `--headed` mode

---

**Last Updated**: 2025-12-01  
**Platform Version**: AURA 1.0  
**Test Suite Version**: 1.0  
**Playwright Version**: ^1.56.1
