# Test results

| Gate | Command | Result |
| --- | --- | --- |
| TypeScript | `tsc -p tsconfig.app.json --noEmit` | PASS, 0 errors |
| Unit + integration | `vitest run` | **PASS - 1635 passed / 0 failed / 91 skipped (161 files)** (previously 1 failed) |
| Surface coverage | `vitest run surfaceCoverage` | PASS 4/4 |
| Dataset suites | `datasetCanary`, `canaryEndToEnd`, `pageIdentity`, `referenceAdapter` | PASS |
| Connections suites | `mappingValidation`, `wizardModel`, `managedConnectors`, `managedVerification`, `runtimeDiagnostics` | PASS |
| Navigation | `appNavigation`, `shellOwnership`, `whiteLabelSurfaces` | PASS |
| Production build | `vite build` | PASS |
| SEO gate | build-time validator | PASS, 0 errors / 0 warnings |
| Supabase linter | `linter` | 0 errors; pre-existing warnings only (leaked-password protection, Postgres patch version) |
| Security scanner | `run_security_scan` | 0 critical; the five findings remediated here no longer appear |
| Playwright route acceptance | targeted sweep, see `runtime-route-results.md` | PASS, 0 console errors |

No test was deleted, weakened or skipped to obtain this result. The 91 skipped tests are
the pre-existing backend-gated set, unchanged in count from the previous audit.
