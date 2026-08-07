# Normalized Hermetic Gate Results - Stage 2A (2026-08-07)

Every gate below is reported as **measured value vs acceptance threshold**. No gate sent traffic to production.

## 1. Production build
- Measured: exit 0, built in 30.99 s, SEO validation PASS (0 errors, 0 warnings).
- Threshold: exit 0.
- Result: **PASS**.

## 2. Type-check (`tsgo --noEmit`)
- Measured: 0 errors.
- Threshold: 0 errors.
- Result: **PASS**.

## 3. Lint
- Measured: **1,329 errors, 137 warnings across 424 files** (1,471 files linted).
- Threshold: 0 errors (CI gate `npm run lint`).
- Result: **FAIL**.
- Top rules:

| Rule | Count |
|---|---|
| `@typescript-eslint/no-explicit-any` | 1,242 |
| `react-hooks/exhaustive-deps` | 71 |
| `react-refresh/only-export-components` | 64 |
| `prefer-const` | 30 |
| `no-case-declarations` | 17 |
| `no-empty` | 7 |
| `no-useless-escape` | 7 |
| `@typescript-eslint/no-unsafe-function-type` | 6 |
| `react-hooks/rules-of-hooks` | 4 |
| parse errors (no rule id) | 4 |

- **Security-critical code:** 324 of the 1,466 findings fall in `supabase/functions/**`, `src/auth/**`, `src/contexts/RBACContext.tsx`, `ProtectedRoute` or `src/integrations/**`. 292 of those 324 are `no-explicit-any`. **None** is a correctness or injection rule; `react-hooks/rules-of-hooks` (4) does not occur in a security path. Interpretation: the lint failure is a **type-strictness debt**, not evidence of a security defect. 93.4% of all errors are a single rule.

## 4. Bundle size
- Threshold: Vite `chunkSizeWarningLimit` = **1,000 kB raw** per chunk.
- Measured (`dist/assets`, JS only, 14 files, 5,316.7 kB raw total; whole `dist/` including media = 41.7 MB):

| Chunk | Raw | gzip | Brotli (q11) | Over threshold |
|---|---|---|---|---|
| `AuthenticatedShell` | 2,093.6 kB | 537.2 kB | 417 kB | **YES (2.09x)** |
| `index` | 1,254.6 kB | 332.4 kB | 260 kB | **YES (1.25x)** |
| `vendor-3d` | 867.3 kB | 238.3 kB | 197 kB | no |
| `vendor-charts` | 423.0 kB | 111.3 kB | 91 kB | no |
| `vendor-react` | 161.2 kB | 52.5 kB | 45 kB | no |
| `vendor-supabase` | 155.3 kB | 39.7 kB | 34 kB | no |
| `vendor-ui` | 152.5 kB | 48.1 kB | 41 kB | no |
| `vendor-motion` | 115.9 kB | 38.2 kB | 34 kB | no |
| `vendor-query` | 38.3 kB | 11.4 kB | - | no |
| `index` (secondary) | 27.0 kB | 8.4 kB | - | no |
| `EvidenceBetaShell` | 24.5 kB | 6.3 kB | - | no |
| `authBootstrap` | 1.6 kB | 0.8 kB | - | no |

- Code-splitting evidence: vendor splitting is configured and effective (8 vendor chunks). Route-level splitting is **minimal** - only 6 `React.lazy()` call sites exist (2 in `src/App.tsx`, 3 in `src/AuthenticatedShell.tsx`, 1 in `src/pages/DataCentreTwin.tsx`), which is why `AuthenticatedShell` absorbs essentially the whole authenticated route tree into one chunk.
- Result: **FAIL (budget)**. This is a performance defect, not a security or correctness defect.

## 5. Dead code
- Tool: custom static reachability walk (module-graph traversal of static `import`/`export ... from` specifiers) from the single entry point `src/main.tsx`. Assumption limits: the walk did **not** resolve dynamic `import()`, barrel re-export chains, Vite `?url`/glob imports, test entry points, or Playwright/tooling entries.
- Measured candidates: **287 of 1,051 non-test source modules**.
- Threshold: informational inventory; no configured budget.
- Reclassified (`36-dead-code-classification.csv`):

| Class | Count |
|---|---|
| `false_positive` (a static import from reachable `src/` exists; the Stage 1 walk missed the edge) | 113 |
| `likely_unreachable` (no code referrer; referenced only in documentation) | 77 |
| `proven_unreachable` (no referrer of any kind anywhere in the repository) | 56 |
| `dynamic_or_external_entry` (reached through `import()`) | 25 |
| `test_or_tooling_only` | 16 |
| `unknown` | 0 |

- Result: **FAIL (inventory)**, but the defensible figure is **56 proven-unreachable modules**, not 287. The Stage 1 "287 dead modules" claim is withdrawn.

## 6. Unit tests
- Measured: 1,451 collected / 1,114 passed / **228 failed** / 109 skipped, across 117 files; 3 files collect zero tests (F-14).
- Threshold: 0 failures.
- Result: **FAIL (known debt)**.
- Immediate-baseline attribution, preserved exactly and not re-derived:

| Item | Count |
|---|---|
| Confirmed new tests | 6 |
| Additional net-collected tests not individually attributable | 7 |
| New failing identities | 2 |
| Removed failing identities | 1 |
| Unchanged failing identities | 226 |
| Net failures | +1 |

  The 7 additional net-collected tests are **not** claimed to be new. They are a collection-count delta that has not been attributed to specific identities. All 1,451 collected identities are preserved in `33-collected-test-identities.txt`; all 228 failing identities are preserved in `19-failing-test-identities.txt`.

## 7. Test-egress denial
- Measured: 6/6 cases in `tests/unit/live-backend-guard.test.ts` pass; zero outbound requests to any `*.supabase.co` host during the suite; guard fails closed.
- Result: **PASS**.

## 8. Source and bundle credential scan
- Measured: no live credential in source. `dist/assets` contains the publishable anon JWT only; zero `service_role` occurrences in any emitted asset.
- Result: **PASS**.

## 9. Dependency vulnerability scan
- Measured: `npm audit` and `bun audit` both return HTTP 404 from the sandbox registry mirror; no offline advisory database available.
- Result: **BLOCKED** - explicitly *not* PASS and *not* FAIL. Vulnerability status for this build is **unknown**.
- Compensating artifact: `41-dependency-inventory-sbom.json` records 901 resolved packages with exact versions, resolved registry host and integrity-hash presence, plus lockfile provenance. It makes **no vulnerability claim**.

### Why three lockfiles exist and which one builds
| Lockfile | Role |
|---|---|
| `package-lock.json` (471 kB) | **Authoritative for CI.** Every GitHub Actions job installs with `npm ci`, which fails outright if this file is missing or out of sync with `package.json`. |
| `bun.lock` (256 kB) | **Authoritative for the hosting build**, which installs with bun. Current text-format Bun lockfile. |
| `bun.lockb` (201 kB) | **Stale.** Legacy binary Bun lockfile superseded by `bun.lock`; never deleted. |

Origin: the project started on bun (`bun.lockb`), migrated to bun's text lockfile (`bun.lock`), then gained npm-based CI workflows that required `package-lock.json`. Nothing was removed. Consequence: CI and the deployed build resolve dependencies through two independent solvers, so an advisory remediated in one lockfile can persist in the other. This is a real reproducibility defect independent of the blocked scan.
