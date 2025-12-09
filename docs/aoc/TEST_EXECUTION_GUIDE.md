# AOC Test Execution Guide

## Overview

This guide covers running the comprehensive E2E test suite for the Agent Operations Center.

## Prerequisites

1. **Environment Setup**
   ```bash
   npm install
   ```

2. **Playwright Installation**
   ```bash
   npx playwright install
   ```

3. **Test Database**
   - Ensure Supabase project is running
   - Test data should include at least one agent with `test-agent-id`
   - RBAC policies should be active (see `docs/aoc/RBAC_SETUP.md`)

## Running Tests

### Full Test Suite
```bash
npm run test:e2e
```

### Specific Test File
```bash
npx playwright test tests/e2e/aoc.spec.ts
```

### Single Test
```bash
npx playwright test tests/e2e/aoc.spec.ts -g "should display AOC header"
```

### With UI Mode (Recommended for debugging)
```bash
npx playwright test --ui
```

### Headed Mode (See browser)
```bash
npx playwright test --headed
```

### Debug Mode
```bash
npx playwright test --debug
```

## Test Coverage

### Core Functionality (11 tests)

#### 1. Header and Controls
- ✅ AOC header displays correctly
- ✅ Runtime control buttons (Run, Pause, Stop, Restart) visible
- ✅ Quick stats panel renders (Status, Success Rate, Avg Duration, Total Runs)

#### 2. Command Palette
- ✅ Opens with Cmd+K (or Ctrl+K)
- ✅ Keyboard shortcuts dialog (? key)
- ✅ Command input field appears

#### 3. Activity Stream
- ✅ Live Activity Stream title visible
- ✅ Live badge displays when streaming
- ✅ Toggle live mode (Pause/Resume buttons)
- ✅ Search and filter logs by keyword

#### 4. Navigation
- ✅ Tab switching (Team, Tools, Audit)
- ✅ Team tab shows active users
- ✅ Tools tab displays alerts
- ✅ Audit tab shows audit trail
- ✅ Version history in Team > Versions

#### 5. Runtime Control
- ✅ Run action triggers API call
- ✅ Success toast appears on successful action
- ✅ Error handling with 500 response
- ✅ Error toast displays on failure

## Test Data Setup

### Create Test Agent

```sql
-- Insert test agent
INSERT INTO public.agents (
  id,
  name,
  status,
  owner_id,
  version
) VALUES (
  'test-agent-id',
  'Test Agent for AOC E2E',
  'running',
  auth.uid(),
  'v1'
);
```

### Create Sample Logs

```sql
-- Insert sample action logs
INSERT INTO public.agent_action_logs (
  system_id,
  action_key,
  status,
  created_at
) VALUES 
  ('test-agent-id', 'workflow_start', 'success', NOW()),
  ('test-agent-id', 'data_fetch', 'success', NOW() - INTERVAL '1 minute'),
  ('test-agent-id', 'model_inference', 'success', NOW() - INTERVAL '2 minutes');
```

## Expected Results

### All Tests Passing
```
✓ should display AOC header and controls (2s)
✓ should display quick stats (1s)
✓ should open command palette with keyboard shortcut (1s)
✓ should display activity stream (1s)
✓ should toggle live mode in activity stream (2s)
✓ should navigate between tabs (3s)
✓ should handle runtime control actions (2s)
✓ should search and filter logs (2s)
✓ should show keyboard shortcuts dialog (1s)
✓ should display version history (2s)
✓ should handle errors gracefully (2s)

11 passed (19s)
```

## Troubleshooting

### Test Fails: "Cannot find agent"
**Solution**: Ensure test agent exists in database with ID `test-agent-id`

### Test Fails: "Authentication error"
**Solution**: Run tests with authenticated session:
```bash
SUPABASE_AUTH_TOKEN=<token> npx playwright test
```

### Test Fails: "Timeout waiting for element"
**Solution**: 
1. Check if element selectors match current UI
2. Increase timeout in `playwright.config.ts`
3. Run in headed mode to see what's happening

### Tests Are Flaky
**Solution**:
1. Add explicit waits for API responses
2. Use `page.waitForLoadState('networkidle')`
3. Mock API responses for consistent behavior

## CI/CD Integration

### GitHub Actions Workflow

```yaml
name: AOC E2E Tests

on:
  pull_request:
    paths:
      - 'src/components/aoc/**'
      - 'src/pages/AOC.tsx'
      - 'supabase/functions/aoc-*/**'
      - 'tests/e2e/aoc.spec.ts'

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: 18
      - name: Install dependencies
        run: npm ci
      - name: Install Playwright
        run: npx playwright install --with-deps
      - name: Run AOC E2E tests
        run: npx playwright test tests/e2e/aoc.spec.ts
        env:
          VITE_SUPABASE_URL: ${{ secrets.VITE_SUPABASE_URL }}
          VITE_SUPABASE_ANON_KEY: ${{ secrets.VITE_SUPABASE_ANON_KEY }}
      - name: Upload test results
        if: always()
        uses: actions/upload-artifact@v3
        with:
          name: playwright-report
          path: playwright-report/
```

## Regression Testing Checklist

Before merging changes that affect AOC:

- [ ] All 11 E2E tests pass
- [ ] Manual smoke test on staging environment
- [ ] Runtime controls work (Run, Pause, Stop, Restart)
- [ ] Real-time log streaming functional
- [ ] Command palette opens (Cmd+K)
- [ ] Tab navigation works
- [ ] RBAC permissions enforced
- [ ] Error handling displays appropriate messages
- [ ] Mobile responsive layout verified
- [ ] Performance: Page loads < 2s
- [ ] Memory: No leaks after 5 minutes of streaming

## Performance Benchmarks

### Expected Metrics
- **Page Load Time**: < 2 seconds
- **Log Streaming Latency**: < 500ms
- **Runtime Control Response**: < 1 second
- **Tab Switch Time**: < 200ms
- **Command Palette Open**: < 100ms

### Measuring Performance

```javascript
// Add to test file
test('performance: page load time', async ({ page }) => {
  const start = Date.now();
  await page.goto('/app/agents/test-agent-id/operations');
  await page.waitForLoadState('networkidle');
  const duration = Date.now() - start;
  
  expect(duration).toBeLessThan(2000);
});
```

## Test Maintenance

### When to Update Tests

1. **UI Changes**: Update selectors if component structure changes
2. **New Features**: Add new test cases for new panels/features
3. **API Changes**: Update mocked responses if edge function contracts change
4. **RBAC Updates**: Add permission-specific test scenarios

### Test Organization

```
tests/e2e/
├── aoc.spec.ts              # Main AOC test suite
├── aoc-rbac.spec.ts         # RBAC-specific tests (future)
├── aoc-performance.spec.ts  # Performance benchmarks (future)
└── helpers/
    └── aoc-test-data.ts     # Test data generators
```

## Manual Testing Protocol

For features not covered by automated tests:

### 1. Real-time Streaming (5 min)
- [ ] Open AOC
- [ ] Trigger agent action from another tab
- [ ] Verify log appears in real-time without refresh
- [ ] Check Live badge is green and pulsing

### 2. Multi-user Collaboration (5 min)
- [ ] Open AOC in two browser sessions (different users)
- [ ] Verify both see active users in Team tab
- [ ] Trigger action in one session
- [ ] Verify audit log appears in both sessions

### 3. Mobile Responsiveness (3 min)
- [ ] Open AOC on mobile device or dev tools mobile view
- [ ] Verify all panels are scrollable
- [ ] Verify buttons are touch-friendly (44px min)
- [ ] Test tab navigation with touch

### 4. Error Scenarios (5 min)
- [ ] Disconnect internet
- [ ] Verify graceful error message
- [ ] Reconnect
- [ ] Verify automatic recovery
- [ ] Test with invalid agent ID
- [ ] Verify 404 or appropriate error page

## Success Criteria

### Definition of Done

All checks must pass before merging AOC-related changes:

✅ All 11 automated E2E tests pass  
✅ Manual testing protocol completed  
✅ Performance benchmarks met  
✅ No console errors in browser  
✅ No memory leaks detected  
✅ RBAC policies enforced correctly  
✅ Mobile responsive design verified  
✅ Documentation updated  
✅ Edge functions deployed successfully  
✅ Real-time features working on staging  

## Support

### Debugging Resources

- **Playwright Trace Viewer**: `npx playwright show-trace trace.zip`
- **Video Recordings**: `playwright-report/videos/`
- **Screenshots**: `playwright-report/screenshots/`
- **Console Logs**: Check browser console in headed mode

### Common Issues

| Issue | Solution |
|-------|----------|
| Tests timeout | Increase timeout in config or add explicit waits |
| Selectors not found | Verify element exists and selector is correct |
| API mocking fails | Check route pattern matches actual request URL |
| Flaky tests | Add `page.waitForLoadState()` before assertions |
| Auth errors | Ensure test user has required RBAC permissions |

---

**Last Updated**: 2025-12-01  
**Test Suite Version**: 1.0  
**Coverage**: 11 tests, 8 categories
