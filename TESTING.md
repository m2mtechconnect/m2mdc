# M2M Agentic Studio - Testing Documentation

Complete test harness for verifying all pages, features, and integrations in the M2M Agentic Studio.

## Overview

This project includes comprehensive testing coverage:

- **E2E Tests (Playwright)**: Browser-based tests covering all user flows
- **Unit Tests (Vitest)**: Isolated component and utility tests
- **Integration Tests**: API and database interaction tests
- **Visual Regression**: Screenshot comparison tests
- **Accessibility**: WCAG 2.1 AA compliance checks

## Prerequisites

```bash
# Install dependencies
npm install

# Seed test data (optional but recommended)
npm run db:seed:studio
```

## Environment Variables

Create a `.env.test` file for test-specific configuration:

```bash
# Supabase
VITE_SUPABASE_URL=http://localhost:54321
VITE_SUPABASE_PUBLISHABLE_KEY=your-test-key

# Mock LLM (recommended for faster tests)
USE_MOCK_LLM=true

# Real Zapier (optional, for integration testing)
USE_REAL_ZAPIER=false

# Test User Credentials
TEST_USER_EMAIL=test@m2m.studio
TEST_USER_PASSWORD=testpass123
```

## Running Tests

### All Tests

```bash
npm run test:all
```

### Unit Tests

```bash
npm run test:unit

# With coverage
npm run test:unit -- --coverage

# Watch mode
npm run test:unit -- --watch
```

### Integration Tests

```bash
npm run test:int
```

### E2E Tests

```bash
npm run test:e2e

# Run specific browser
npm run test:e2e -- --project=chromium
npm run test:e2e -- --project=firefox
npm run test:e2e -- --project=webkit
npm run test:e2e -- --project=mobile

# Run specific test file
npm run test:e2e tests/e2e/global-search.spec.ts

# Debug mode
npm run test:e2e -- --debug

# UI mode (interactive)
npm run test:e2e -- --ui
```

### Visual Regression

```bash
# Update baseline screenshots
npm run test:e2e:record

# Compare against baselines
npm run test:e2e
```

## Test Structure

```
tests/
├── e2e/                    # End-to-end tests
│   ├── global-search.spec.ts
│   ├── builder-five-steps.spec.ts
│   ├── integrations-hub.spec.ts
│   ├── analytics.spec.ts
│   ├── operations.spec.ts
│   ├── teams.spec.ts
│   ├── compliance.spec.ts
│   ├── systems-list.spec.ts
│   ├── mobile-responsive.spec.ts
│   └── theme-toggle.spec.ts
├── unit/                   # Unit tests
│   ├── urlCapture.test.ts
│   ├── roiCalculator.test.ts
│   └── permissions.test.ts
├── integration/            # Integration tests
│   └── (to be added)
├── mocks/                  # Mock adapters
│   ├── geminiAdapter.ts
│   ├── zapierAdapter.ts
│   └── websiteCaptureAdapter.ts
├── seeds/                  # Test data seeds
│   └── studioData.ts
└── setup.ts               # Test setup and global utilities
```

## Test Coverage

### Pages & Features Tested

- ✅ Dashboard & Global Search
  - URL/text search with grounding
  - CTAs prefill Builder
  - Error handling with retry
  
- ✅ AI System Builder (6 steps)
  - Define Goal
  - Choose Template / Marketplace
  - Connect Tools & Knowledge
  - Configure AI (models, grounding, test)
  - Build Workflow (visual editor)
  - Deploy with ROI
  
- ✅ Integrations Hub
  - OAuth/Zapier connect/disconnect
  - Status tracking
  - Error handling
  
- ✅ Analytics
  - ROI, Compliance, Run Insights
  - Date range filtering
  - CSV export
  
- ✅ Operations Monitor
  - Environment filtering
  - Realtime health updates
  - Event feed
  
- ✅ Teams
  - Invite members
  - Role-based permissions
  - Revoke invites
  
- ✅ Compliance & Audit
  - Decision replay
  - Citations with doc IDs
  - PDF export
  
- ✅ Your AI Systems
  - Search/filter/sort
  - Manage/delete systems
  - Cascade cleanup

### Responsive & Accessibility

- ✅ Mobile (375px width)
- ✅ Touch interactions
- ✅ Light/Dark theme toggle
- ✅ WCAG 2.1 AA contrast
- ✅ Keyboard navigation
- ✅ Screen reader support

## Mock Adapters

### Gemini/Vertex AI

```typescript
import { mockGeminiAdapter } from '../mocks/geminiAdapter';

const response = await mockGeminiAdapter.generateContent('test prompt', {
  grounding: true,
  temperature: 0.3
});
```

Returns deterministic answers with citations for consistent testing.

### Zapier

```typescript
import { mockZapierAdapter } from '../mocks/zapierAdapter';

const connection = await mockZapierAdapter.connect('jira');
const result = await mockZapierAdapter.executeAction({
  type: 'create_ticket',
  data: { title: 'Test', priority: 'high' }
});
```

### Website Capture

```typescript
import { mockWebsiteCaptureAdapter } from '../mocks/websiteCaptureAdapter';

const result = await mockWebsiteCaptureAdapter.capture(
  'https://example.com',
  { stealth: true }
);
```

Simulates success, errors, timeouts, and robots.txt blocks.

## Seeding Test Data

```typescript
import { seedStudioData } from './seeds/studioData';

// Seed all test data
const seeded = await seedStudioData({
  clear: true,  // Clear existing data first
  userId: 'optional-user-id'
});

// Returns:
// - environments (Production, Staging, Dev)
// - templates (Compliance, Predictive, Finance, etc.)
// - systems (3 sample AI systems)
// - integrations (Google Drive, Jira, Salesforce)
// - knowledge sources
// - run history and metrics
// - health data
```

Run before E2E tests for consistent state:

```bash
npm run db:seed:studio
npm run test:e2e
```

## CI/CD Integration

Tests run automatically on PRs via GitHub Actions:

```yaml
name: Tests
on: [pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm ci
      - run: npm run db:seed:studio
      - run: npm run test:all
      - uses: actions/upload-artifact@v3
        if: failure()
        with:
          name: test-results
          path: |
            playwright-report/
            test-results/
            coverage/
```

## Debugging Failed Tests

### E2E Tests

```bash
# Run with headed browser
npm run test:e2e -- --headed

# Generate trace
npm run test:e2e -- --trace on

# View trace
npx playwright show-trace trace.zip
```

### Unit Tests

```bash
# Verbose output
npm run test:unit -- --reporter=verbose

# Run single test
npm run test:unit -- -t "should calculate ROI"
```

## Performance & Accessibility Audits

### Lighthouse CI

Automatically checks:
- Performance ≥ 85
- Accessibility ≥ 90
- Best Practices ≥ 90

### Axe Accessibility

All E2E tests include automatic accessibility scanning:

```typescript
import AxeBuilder from '@axe-core/playwright';

const results = await new AxeBuilder({ page })
  .include('body')
  .analyze();

expect(results.violations).toHaveLength(0);
```

## Best Practices

1. **Use stable selectors**: Prefer `getByRole`, `getByText`, `getByLabel` over CSS selectors
2. **Mock external APIs**: Use mock adapters for LLM, Zapier, etc.
3. **Seed consistent data**: Run `db:seed:studio` before E2E tests
4. **Handle async properly**: Use `waitFor`, `waitForLoadState` appropriately
5. **Clean up after tests**: Seeds include cleanup for isolated test runs
6. **Visual regression threshold**: Keep ≤ 0.1 (10% pixel difference)

## Troubleshooting

### Tests timeout

- Increase timeout: `test.setTimeout(60000)`
- Check network mocks are responding
- Ensure dev server is running

### Visual regression fails

- Update baselines: `npm run test:e2e:record`
- Check for dynamic content (timestamps, random IDs)
- Consider using data-testid for stable screenshots

### Accessibility violations

- Run Axe in browser DevTools
- Check color contrast ratios
- Verify ARIA labels and roles
- Test keyboard navigation manually

## Reports

After running tests, reports are generated:

- **Playwright HTML**: `playwright-report/index.html`
- **Vitest Coverage**: `coverage/index.html`
- **Test Results JSON**: `test-results/results.json`

View reports:

```bash
npx playwright show-report
open coverage/index.html
```

## Contributing

When adding new features:

1. Add E2E test in `tests/e2e/`
2. Add unit tests for utilities
3. Update seeds if new data structures
4. Run full test suite before PR
5. Ensure no new accessibility violations
6. Update this doc if adding new test patterns

## Support

For test-related issues:
- Check GitHub Issues
- Review CI logs
- Consult Playwright docs: https://playwright.dev
- Consult Vitest docs: https://vitest.dev
