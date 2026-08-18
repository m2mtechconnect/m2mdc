# Phase 0 - Current repository baseline (re-measured)

All numbers below were measured on this working tree. Nothing is carried over from
an earlier report. Raw output lives in `./evidence/`.

## Environment

| Item | Value |
|---|---|
| Commit SHA | `94f0d73bb24345be45898a2d08ef486a67fe6d15` |
| Branch | `edit/edt-9e0b8913-6af5-4b07-8276-6599ce20dfa4` |
| Working tree | clean at capture time |
| Captured (UTC) | 2026-08-18T13:56Z |
| Node | v22.22.0 |
| Bun | 1.3.3 |
| Migration head | `supabase/migrations/20260818021654_c3403b0e-694d-4cea-9bd2-a2d5e58a7b99.sql` (61 migration files) |

## Verified counts

| Measure | Command | Result |
|---|---|---|
| Unit/integration tests | `bunx vitest run` | exit 0 - **1840 passed, 91 skipped**, 186 files (9 skipped) |
| Lint | `bunx eslint .` | **0 errors, 1347 warnings** |
| Edge Function directories | `ls supabase/functions` | **167** |
| Edge Functions with no first-party textual caller | grep of `src`,`services`,`scripts`,`tests` | **46** (see `evidence/phase0-edge-functions-no-caller.txt`) |
| Edge Functions with wildcard CORS | `rg 'Access-Control-Allow-Origin.*\*'` | **91** |
| Edge Functions constructing a service-role client | `rg 'createClient\(.*SERVICE_ROLE'` | **10** |
| Distinct `CREATE TABLE` names across migrations | `rg -o 'CREATE TABLE ...'` | **134** |
| Declared route paths (`routeRegistry.ts`) | `rg -o "path:"` | **93** |
| Distinct `path="..."` in the router tree | `rg -o 'path="..."'` | **90** |
| USD-family + GLB files in repo | `find` | **15** |
| `assets/manifest.json` entries | parsed | **52** (approved 45, pending-source 3, pending-review 3, blocked-missing-payloads 1; `runtimeEligible: true` on 43) |
| `Math.random()` in simulation/twin/builder/dsx/workspace code | `rg -c 'Math\.random'` | **96 lines across 17 files** |

The previously reported figure of 1,840 tests is therefore **reproduced** at this
commit (log: `evidence/phase0-vitest.log`). The figure of 1,728 is not reproduced
and should be treated as stale. 91 tests are skipped: they are backend-gated
(the live-backend guard blocks the production Supabase host) or GPU-gated. No
phase may be declared complete on the strength of those skips.

## Findings verified against the audit claims

| Audit claim | Verified? | Evidence |
|---|---|---|
| Truth-critical simulation code still calls `Math.random()` | **Yes** | `src/simulation/generateSimulationResult.ts` (4), `src/components/builder/step5/BuilderPreviewEngine.ts` (8), `src/simulation/compat/sovereignDataCenterEngine.ts` (2), `src/simulation/compat/dataCenterEngine.ts` (1), `src/twins/sovereignDataCenter/enhancedSimulationEngine.ts` (1), `src/simulation/providers/compatibilityProvider.ts` (1), `src/simulation/customScenarioBuilder.ts` (1) |
| Several engines labelled `aura-deterministic` | **Yes** | 26 literal occurrences of `'aura-deterministic'`, including `compat/facadeBridge.ts` which wraps engines that call `Math.random()` |
| `engineRegistry.ts` is an inventory, not a dispatcher | **Yes** | 185 lines, exports metadata and guard helpers only; runtime paths import engines directly |
| `omniverseProvider.ts` is not a functional provider | **Yes** | `isEnabled()` hardcoded `false`; every method returns `disabled`/`not-implemented`; capability `executionClass: 'nvidia-dsx-sim'` is not in the mandated taxonomy |
| Execution taxonomy not adopted | **Partially adopted** | Present: `aura-deterministic` (26), `fixture-preview` (6), `unavailable` (274). **Absent: `aura-stochastic-seeded`, `external-solver`, `nvidia-solver`, `measured-live`.** Non-taxonomy value `nvidia-dsx-sim` (8) still in use |
| Renderer modes not aligned to required names | **Yes** | `src/renderer/rendererModes.ts` uses `aura-web-runtime` / `aura-2d-fallback` / `nvidia-kit-stream`; the mandated names are `browser-preview` / `kit-stream-nvcf` / `kit-stream-self-managed` / `unavailable`. No NVCF vs self-managed distinction exists |
| ~166 Edge Functions, ~76 uncalled, 91 wildcard CORS, 44 service-role refs | **Partially** | 167 functions and 91 wildcard-CORS confirmed. Uncalled count measures **46**, not 76, by textual caller search. Service-role *client construction* measures 10 (broader textual `SERVICE_ROLE` references are higher) |
| ~134 table definitions | **Yes** | 134 distinct `CREATE TABLE` names |
| Zero verified SimReady / GPU-validation passes | **Yes** | manifest has no `simready` status vocabulary at all; statuses collapse catalog approval and runtime eligibility into `approvalStatus` + `runtimeEligible` |
| Missing USD payload | **Yes** | `assets/rack/generic_42u_rack/generic_42u_rack.usda` references `payloads/external.usdc` and `payloads/internal.usdc`, neither of which exists |
| Multiple lockfiles, `.env` present | **Yes** | `bun.lock`, `bun.lockb`, `package-lock.json` all present; `.env` tracked in the tree; `package.json` has **no** `packageManager` field |
| "Clean lint" claim | **Contradicted** | 0 errors but 1347 warnings |

## Deltas from prior reports

- `docs/remediation/aura-platform-rebuild/01-nvidia-stack-matrix.md` states 52 manifest
  entries and 0 SimReady/GPU passes - **confirmed**.
- That matrix states the vendored NVIDIA WebRTC UMD bundle was deleted - **confirmed**,
  `public/omniverse-webrtc-streaming-library.umd.js` is absent.
- Uncalled-Edge-Function count differs from the prior audit (46 vs 76). The prior
  number is not reproducible with a textual caller search at this commit and must be
  re-derived per function in Phase 6 before any deletion.

## Open blockers entering Phase 1

1. No GPU runtime, NVCF account, or Kit application is reachable from this environment;
   every NVIDIA runtime claim stays `unavailable`.
2. NVIDIA upstream repositories (DSX blueprint, dsx-exchange) are not vendored and no
   commit/tag is pinned. Licence records cannot be captured here.
3. Backend-gated tests (91) cannot run against the production project by design.
4. `assets/rack/generic_42u_rack` cannot be validated until an approved source asset exists.