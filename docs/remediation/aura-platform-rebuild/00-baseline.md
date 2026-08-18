# Phase 0 - Reproducible truth baseline

Commit SHA of the scanned tree: `66d2c2aa6bdfc50ea5acba5621d23ed5e7047c92` (the SHA recorded
by the inventory generator). The platform commits on every turn, so `git rev-parse HEAD`
reports a later SHA than the scan; all counts below belong to the scanned tree.
Branch: working branch of the Lovable project (no separate git branch can be created from this environment - git state is managed by the platform). **Blocker B-1.**

## 1. Toolchain and package identity

| Item | Finding | Action taken |
|---|---|---|
| Node | v22.22.0 in the build sandbox | `engines.node: >=20.11.0` added |
| Package identity | was `vite_react_shadcn_ts@0.0.0` | renamed to `aura-dc-digital-twin@0.1.0` with a description |
| Lockfiles | THREE present: `bun.lock`, `bun.lockb`, `package-lock.json` | **not deleted** - see B-2 |
| `packageManager` field | absent | **not set** - see B-2 |

**B-2 (lockfile / package-manager conflict).** Every GitHub workflow installs with `npm ci`
(`test.yml`, `qa-suite.yml`, `visual-regression.yml`, `yvr-regression.yml`,
`dsx-evidence-scoped.yml`, `twin-canvas-gpu-matrix.yml`), while the hosting platform
installs with bun. Declaring `packageManager: npm@...` would break the hosted install, and
deleting `package-lock.json` would break CI. This requires an owner decision, so per rule 8
no lockfile was removed and no clean-room reinstall was performed. `bun.lockb` is the legacy
binary form of `bun.lock` and is the safest single deletion once the decision is made.

## 2. Commands executed and exit codes

| Command | Exit | Result |
|---|---|---|
| `npx tsc --noEmit -p tsconfig.app.json` (before) | 2 | 2 errors |
| `npx tsc --noEmit -p tsconfig.app.json` (after fix) | 0 | clean |
| `npx vitest run` | 0 | **1728 passed, 91 skipped, 1819 total** across 174 files (165 passed, 9 skipped) |
| `npx eslint .` | 1 | **1441 problems - 1288 errors, 153 warnings** |
| `SKIP_SEO_GATE=1 npx vite build` | 0 | build succeeds |
| clean reproducible install | not run | blocked by B-2 |
| Playwright E2E / a11y | not run | no browser-capable CI lane in this sandbox for the 8 Playwright configs. **Blocker B-3** |

### Typecheck breaks found and fixed (only code change of Phase 0)
1. `src/routing/AdminRouteGuard.tsx` imported `AppRole` from `@/auth/permissions`, which does
   not export it (the canonical export there is `AnyRole`; `AppRole` is re-exported from
   `@/contexts/RBACContext`). Import corrected. This is the same file that carries the
   Phase-1 authorization mismatch (see 4.6).
2. `src/test/whiteLabelSurfaces.test.ts` narrowed a `RegExpMatchArray | null` fallback to
   `never[]`. Explicit `string[]` annotation added.

### Test-count reconciliation
The previously checked-in log of **1,715** tests does not match the current run of **1,728**.
The difference is +13 and is accounted for by tests added after that log was captured
(9 webhook-signature negative tests plus 4 admin-guard/loader tests in the Phase 11 work).
The current raw log is the only figure that may be cited: **1728 passed / 91 skipped**.

### The 91 skipped tests - fully explained
All 91 come from two mechanisms; none is an unexplained skip:

| File | Skipped | Reason |
|---|---|---|
| tests/performance/api-load.test.ts | 15 | performance lane, requires a live backend |
| tests/integration/builder-with-seeds.test.ts | 13 | `describeWithBackend` |
| tests/integration/builder-flow.test.tsx | 10 | `describeWithBackend` |
| tests/integration/operations.test.ts | 10 | `describeWithBackend` |
| tests/integration/template-validation.test.ts | 10 | `describeWithBackend` |
| tests/integration/analytics-with-seeds.test.ts | 9 | `describeWithBackend` |
| tests/integration/analytics.test.ts | 9 | `describeWithBackend` |
| tests/integration/integrations.test.ts | 9 | `describeWithBackend` |
| tests/integration/builder.test.ts | 6 | `describeWithBackend` |

`tests/_setup/backendSuite.ts` + `tests/_setup/liveBackendGuard.ts` fail closed unless the
disposable test project is proven, so these are **formally quarantined**, not silently
skipped. Enabling them requires the disposable Supabase project credentials. **Blocker B-4.**

### Lint baseline
`1288 errors, 153 warnings` - matches the previously recorded snapshot (1288/152, +1 warning).
Recorded as the Phase 0 baseline; the acceptance gate (zero errors) is not met and is not
addressed in Phase 0.

### Production build budget
| Chunk | Raw | gzip |
|---|---|---|
| vendor-3d | 898.0 kB | 247.8 kB |
| Builder | 561.2 kB | 151.4 kB |
| vendor-charts | 433.1 kB | 114.3 kB |
| AuthenticatedShell | 385.5 kB | 94.0 kB |
| index.css | 200.8 kB | 31.7 kB |

No documented chunk budget exists yet; `Builder` (561 kB) is the largest first-party chunk
and is a Phase 2 split candidate.

## 3. `.env` status

`git ls-files` shows **`.env` IS tracked** alongside `.env.example` and `.env.test.example`.
Its values were not read or printed. On this hosting platform `.env` is a generated file
holding only the public project URL, publishable (anon) key and project ref - values designed
to ship in the browser bundle and protected by RLS - and the platform regenerates it, so it
cannot simply be deleted from the working tree. Required actions, both needing human control:
- **B-5:** remove `.env` from *source distributions/archives* (it is already covered by the
  `.gitignore` rule added in Phase 11 for future adds; the existing tracked entry needs an
  owner-run `git rm --cached`).
- **B-6:** confirm no non-public value has ever been committed to it and rotate if so.

## 4. Inventories (recalculated on this commit)

### 4.1 Routes
**101** `path=` declarations: `src/App.tsx` 25, `src/AuthenticatedShell.tsx` 76.
8 path literals are declared more than once: `/sign-out` (x6 - 5 in `App.tsx`, 1 in the
shell), `*`/`/*` (x6 across both files), and `/twin-preview`, `/pilot/*`, `/onboarding`,
`/login`, `/dev-overlays`, `/data-centre-twin` (x2 each).
Full merge map: `03-route-and-component-merge-map.md`.

### 4.2 Viewport implementations - 5 distinct
`src/components/twin-visualization/DataCenter3DScene.tsx`,
`src/workspace/FacilityCanvas.tsx`, `src/workspace/dashboard/FacilityCanvas.tsx`,
`src/components/data-centre-twin/overview/MiniTwinPreview.tsx`, `src/pages/TwinPreview.tsx`.

### 4.3 Simulation engines and measured randomness
| Module | `Math.random()` | wall-clock reads | LOC | Non-test consumers |
|---|---|---|---|---|
| src/simulation/SimulationEngine.ts | 0 | 9 | 596 | 17 |
| src/simulation/generateSimulationResult.ts | **4** | 0 | 302 | 5 |
| src/workspace/scenarioEngine.ts | 0 | 0 | 277 | 13 |
| src/twins/sovereignDataCenter/enhancedSimulationEngine.ts | **1** | 3 | 787 | 6 |
| src/components/builder/step5/BuilderPreviewEngine.ts | **8** | 3 | 287 | 5 |
| src/components/builder/step5/fixtures/builderMock.ts | **2** | 2 | 290 | - |
| src/simulation/engineRegistry.ts | 0 | 0 | 185 | - |
| src/simulation/api.ts | 0 | 1 | 227 | 5 |

Providers: `compatibilityProvider`, `omniverseProvider` (stub, always disabled),
`scenarioLibraryProvider`, `registry`, `types`.
Compat bridges: `dataCenterEngine`, `facadeBridge`, `previewSessionBridge`,
`sovereignDataCenterEngine`.
**Finding confirmed:** engines classified `aura-deterministic` in the registry contain
unseeded `Math.random()` and wall-clock reads. Corrected in Phase 1/3.

### 4.4 Edge functions
**167** directories. Static scan of each `index.ts` (`04-edge-function-inventory.json`):
- 1 directory with **no `index.ts`** at all.
- 76 with no first-party caller reference in `src/` or `services/` - review candidates only.
- 92 not using `_shared/handler`.
- 89 with a wildcard CORS origin in their own `index.ts`.
- 44 referencing the service role in their own `index.ts`.

(An earlier repo-wide `grep -rl` produced 91/91/47; those figures counted `_shared/*` files
too. The per-function figures above are the ones that may be cited.)
Gateway-log, webhook-registration and cron-caller evidence is not obtainable from this
sandbox, so no function may be deleted on this data. **Blocker B-7.**

### 4.5 Database
**132** unique tables across **57** migrations - confirmed against the live schema
(`information_schema.tables`, `public`, base tables = 132). Family map and migration plan:
`05-table-migration-map.md`.

### 4.6 Authorization mismatch (confirmed, deferred to Phase 1)
`src/auth/permissions.ts` grants `platform.view_admin_console` through the canonical
resolver (including tenant `owner`), while `AdminRouteGuard` hardcodes
`['admin','security_admin']` and individual admin pages carry their own role lists.
Three sources of truth for one decision.

## 5. Rollback

Phase 0 changed three files: `src/routing/AdminRouteGuard.tsx` (import path),
`src/test/whiteLabelSurfaces.test.ts` (type annotation) and `package.json`
(name/version/description/engines). Reverting those three files restores the prior state
exactly; no schema, route, dependency or runtime behaviour changed.

## 6. Claims status after Phase 0

Permitted: none newly permitted.
Withdrawn: the claim that the suite total is 1,715 (superseded by 1,728 raw); the implicit
claim that the repository typechecked cleanly before this phase (it did not).
