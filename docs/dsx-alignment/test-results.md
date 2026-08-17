# Test results (pre-publication gate)

- Typecheck (`tsgo --noEmit -p tsconfig.app.json`): clean, 0 errors.
- DSX alignment scope (`src/config/__tests__`, `src/capabilities/__tests__`, `src/routing/__tests__`): 52 passed / 6 files.
- Remediation scope (`src/workspace/__tests__`): 30 passed / 5 files.
- Total scoped: 82 passed, 0 failed.
- Registry evidence validation (`validateRegistry()`): 0 violations.
