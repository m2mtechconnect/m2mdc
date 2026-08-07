# Hermetic Gate Results - 2026-08-07

All gates below require **zero database traffic**. Vitest runs under `tests/_setup/liveBackendGuard.ts`, which
intercepts `globalThis.fetch` and throws `LiveBackendBlockedError` for any `*.supabase.co|in` host unless the
disposable environment is proven. No production values were substituted anywhere; inert configuration was used
where compilation required environment variables.

## Completed

| # | Gate | Result | Evidence |
|---|---|---|---|
| 1 | Production build (`npm run build`) | **PASS** exit 0, built in 24.08s; SEO validation PASS (0 errors, 0 warnings) | build log |
| 2 | Type-check (`tsgo --noEmit`) | **PASS** exit 0, 0 errors | typecheck log |
| 3 | Lint inventory (`eslint`) | **FAIL (inventory recorded)** 1,329 errors / 137 warnings across 1,471 files | `eslint.json` |
| 4 | Source credential scan | **PASS** no live credential. 2 non-secret matches: a fixed password literal in `scripts/dsx-disposable-verify.mjs` (disposable-only) and a fake `sk_live_ABCDEFGHIJKLMNOP1234` fixture in `scripts/__tests__/dsxAuditLog.test.ts`. Both should be replaced with env-injected values. | ripgrep |
| 5 | Generated-bundle credential scan | **PASS** `dist/assets` contains the publishable anon JWT only (`role":"anon"`). Zero occurrences of `service_role` in any emitted asset. | ripgrep over `dist/` |
| 6 | Edge Function static security scan | **FAIL** 156 functions scanned: 80 wildcard CORS, 79 with no authorization check, 33 using the service-role key, 10 with possible credential logging, 2 with `verify_jwt = false`. New finding F-13. | `28-edge-function-static-security-scan.csv` |
| 7 | Bundle-size analysis | **FAIL (budget)** `dist/assets` 6.2 MB. `AuthenticatedShell` 2,143 kB (553 kB gzip) and `index` 1,283 kB (342 kB gzip) both exceed the 1,000 kB warning threshold. | build output |
| 8 | Dead-code analysis | **FAIL (inventory)** 287 of 1,051 non-test source modules are unreachable from `src/main.tsx`. | `29-dead-code-analysis.txt` |
| 9 | Migration static analysis | **FAIL** 35 migrations: 106 `CREATE TABLE` statements with no `GRANT` in the same migration, 5 `USING (true)` policies, 1 `SECURITY DEFINER` block without `search_path` in-file. (Live catalog state is correct - all 33 SECDEF functions pin `search_path` - so these are authoring-hygiene defects, not current runtime defects.) | `27-migration-static-analysis.csv` |
| 10 | Test-collection reconciliation | **COMPLETE** 1,451 collected across 117 files; 3 files collect zero tests (30 declared cases uncollected). Full identity list preserved. | `30-`, `33-` |
| 11 | Hermetic unit tests | **FAIL (known debt)** 1,451 collected / 1,114 passed / 228 failed / 109 skipped. | `18-test-results.json`, `19-failing-test-identities.txt` |
| 12 | Test-egress denial tests | **PASS** all 6 `tests/unit/live-backend-guard.test.ts` cases pass; production ref and ambient environments blocked; guard fails closed. Zero outbound requests to any `*.supabase.co` host during the suite. | `18-test-results.json` |

## Could not run (environment, not blocked on the disposable project)

| Gate | Reason |
|---|---|
| Dependency and lockfile vulnerability scan | Both `npm audit` and `bun audit` fail against the sandbox registry mirror (`404 - operation is not supported` / `status 404`). No offline advisory database is available. Must run in CI against a registry that serves the advisory endpoint. Static lockfile observation stands: **three competing lockfiles** are committed (`bun.lock`, `bun.lockb`, `package-lock.json`), so dependency resolution is not deterministic across environments. |

## Still blocked by the missing `aura-dc-security-test` project

1. Migration replay
2. Authenticated RLS tests (including the F-02 UPDATE-escape probes)
3. Cross-tenant probes
4. Auth lifecycle tests
5. Database-backed Edge Function probes
6. B-04 / B-06 runtime verification

No disposable-project variables are requested here; all unblocked static and hermetic work is exhausted.