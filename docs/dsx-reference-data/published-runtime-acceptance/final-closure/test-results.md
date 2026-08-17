# Test results

- Command: `npx vitest run` - 151 files, 1,625 collected, 1,534 passed,
  0 failed, 91 skipped (backend-gated, BLOCKED_UNVERIFIED), 0 todo.
- Dataset scope after the rollback fix: `npx vitest run src/data/dataset` -
  4 files, 58 passed.
- Typecheck: clean (`tsgo --noEmit -p tsconfig.app.json`).
- Playwright suites (928 cases across tests/e2e, truth-in-ui, visual, settings,
  audit) are excluded from vitest by configuration and were not run in this
  phase: BLOCKED_UNVERIFIED, not passing.
