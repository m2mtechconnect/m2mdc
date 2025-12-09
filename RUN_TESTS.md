# Running Tests - Quick Guide

## Prerequisites
```bash
# Install Playwright browsers if needed
npx playwright install
```

## Run All E2E Tests
```bash
# Run all tests
npx playwright test

# Run in UI mode (interactive)
npx playwright test --ui

# Run specific test file
npx playwright test digital-twin-golden-path

# Run account management tests
npx playwright test account-profile account-settings account-teams-integration

# Run with specific browser
npx playwright test --project=chromium
npx playwright test --project=firefox
npx playwright test --project=webkit
```

## Run Unit Tests
```bash
# Run all unit tests
npm run test

# Run specific unit test file
npm run test tests/digitalTwinRuntime.test.ts

# Run in watch mode
npm run test -- --watch

# Run with coverage
npm run test -- --coverage
```

## Golden Path Test
```bash
# Run only the critical golden path test
npx playwright test digital-twin-golden-path.spec.ts

# Run with trace for debugging
npx playwright test digital-twin-golden-path.spec.ts --trace on
```

## Account Management Tests

### Profile Page Tests (E2E)
```bash
# Run Profile page tests
npx playwright test account-profile

# Run with debug mode
npx playwright test account-profile --debug
```

### Settings Page Tests (E2E)
```bash
# Run Settings page tests
npx playwright test account-settings

# Run with debug mode
npx playwright test account-settings --debug
```

### Profile & Teams Integration Tests (E2E)
```bash
# Run integration tests between Profile and Teams
npx playwright test account-teams-integration

# Test data consistency across modules
npx playwright test account-teams-integration -t "data consistency"
```

## Digital Twin Tests

### Data Layer Tests (E2E)
```bash
# Run only the digital twin data layer tests
npx playwright test digital-twin-data-layer

# Run with debug mode
npx playwright test digital-twin-data-layer --debug
```

### Runtime Tests (Unit)
```bash
# Run Digital Twin runtime engine tests
npm run test tests/digitalTwinRuntime.test.ts

# Test specific scenario
npm run test tests/digitalTwinRuntime.test.ts -t "should execute a simple twin workflow"
```

### REST API Tests (E2E)
```bash
# Run Digital Twin REST API tests
npx playwright test digital-twin-rest-api

# Test full workflow (create → trigger → list → get)
npx playwright test digital-twin-rest-api -t "should create a twin and trigger an event"
```

## View Test Reports
```bash
# Open HTML report
npx playwright show-report

# View trace for failed tests
npx playwright show-trace trace.zip
```

## Debug Tips

### 1. Run Tests in Debug Mode
```bash
# Opens debugger
npx playwright test --debug

# Debug specific test
npx playwright test digital-twin-golden-path.spec.ts --debug
```

### 2. Record New Tests
```bash
# Record user actions to generate test code
npx playwright codegen http://localhost:5173
```

### 3. Check Test Status
```bash
# List all tests without running
npx playwright test --list

# Run tests that match pattern
npx playwright test --grep "golden path"
```

## Common Issues

### Test Timeout
If tests timeout, increase timeout in `playwright.config.ts`:
```typescript
timeout: 60000, // 60 seconds
```

### Network Issues
Check if dev server is running:
```bash
npm run dev
```

### Visual Regression Failures
Update snapshots if UI changed intentionally:
```bash
npx playwright test --update-snapshots
```

## CI/CD Integration
Tests automatically run in CI with:
- 2 retries on failure
- 1 worker (sequential)
- Trace on first retry
- Screenshots on failure
- Video on failure

## Next Steps After Tests Pass
1. ✅ Run golden path test
2. ✅ Verify all tests pass
3. ✅ Check HTML report for details
4. 📋 Complete manual smoke test (see STABILIZATION_STATUS.md)
5. 🔍 Review edge function logs
6. 🚀 Deploy if all checks pass
