# Phase 0 — Re-baseline of the working tree

Captured: 2026-08-19 (UTC). Verdict unchanged: **AURA_NVIDIA_OPERATIONAL_NOT_READY**.
Evidence: `docs/remediation/nvidia-operational-readiness/evidence/phase0/`
No implementation was performed in this phase.

## Tree and toolchain
- commit `01c0ac5cc1f68029cc9499f19180902d4ee11f46`, branch `edit/edt-e4630185-66b1-4c1a-9ea2-663bf8f572c9`
- Dirty tree: 1 untracked path only — this remediation folder. No user-owned changes at risk.
- node v22.22.0, bun 1.3.3, npm 10.9.4, Supabase CLI via `npx supabase`
- Lockfiles present: `bun.lock`, `bun.lockb`, `package-lock.json` (three lockfiles; package manager in use is bun — ambiguity is a Phase 1 hygiene item)

## Static gates (reproduced, not carried forward)
| Gate | Result |
|---|---|
| Typecheck (`tsgo --noEmit`) | PASS, 0 errors |
| ESLint | 0 errors, **1169 warnings** (all `no-explicit-any` ratchet) |
| Vitest | **1 failed / 1902 passed / 81 skipped** across 195 files (1 failed, 186 passed, 8 skipped files) |
| Production build | PASS (46.4s), SEO gate PASS |

Failing test (reproduced): `src/config/__tests__/routeRegistry.test.ts > declares every path mounted in App.tsx` — `/auth/callback` and `/invite/accept` (x4) are mounted in `App.tsx` but absent from `PUBLIC_ROUTES`. Regression introduced by the SSO callback and invite-acceptance work.

Bundle (top chunks): `index` 1.8M, `vendor-3d` 877K, `Builder` 550K, `vendor-charts` 423K. Full list in `evidence/phase0/bundle-sizes.txt`.

## Runtime harnesses
| Harness | Result |
|---|---|
| `playwright.truth.config.ts` (full, 206 tests) | **NOT COMPLETED** — exceeded the 420s sandbox budget (exit 124). Needs a longer-budget CI run. |
| `tests/truth-in-ui/reference-facility-regression.spec.ts` | **PASS** (34.4s) — all five frozen baselines satisfied under the sandbox software renderer |
| `playwright.route-stress.config.ts` | **NOT COMPLETED** — exceeded 400s budget (exit 124) |
| `playwright.gpu.config.ts` | **BLOCKED** — requires a real GPU host (Brev); not runnable here |

Note: the reference-facility spec passing here does not by itself retire `AURA_NVIDIA_REFERENCE_UI` concerns — the spec writes no coverage artifact, so per-role mount lifecycle, network log and screenshot evidence required by Phase 2 do not exist. Phase 2 must add artifact emission before any closure claim.

## Backend inventory (live project)
- Tables 135 (0 without RLS), views 4, functions 173, triggers 58, RLS policies 308
- Migrations: 68, head `20260818224118_42854967-587c-4bd1-8baa-aaf00b1bc22f.sql`
- Edge functions: **170**; wildcard-CORS functions: **92**; functions constructing a service-role client: **50**
- Operational data: `connection_instances` 5, `twin_property_values` **0**, `simulation_runs` 5, `decision_records` **0**

## Assets
`assets/manifest.json`: 52 entries — approved 45, pending-source 3, pending-review 3, blocked-missing-payloads 1; runtimeEligible true 43 / false 9.
**No SimReady field exists anywhere in the manifest** (0 occurrences of `simReady`). SimReady numerator/denominator is therefore 0/52 by absence of a validation lane, matching Phase 3's premise.

## Capability registry (`src/capabilities/registry.ts`, evaluated at runtime)
```
totalCapabilities: 10  (Enabled 2, Not configured 4, Not connected 2, None validated 1, Not deployed 1)
nvidiaCodeOrServiceIntegrated: 0
openUsdStageMountedByNvidiaRuntime: 0
simReadyValidatedAssets: 0
liveTelemetrySources: 0
verticalSlice: BLOCKED_BY_INFRASTRUCTURE
pilotReadinessPercent: 81
productionVerdict: NO-GO
demoVerdict: CONTROLLED_DEMO_READY
```

## Blockers carried into Phase 1
1. Route registry test failure (`/auth/callback`, `/invite/accept` undeclared).
2. Renderer taxonomy contradiction between the hybrid ADR and `src/renderer/rendererModes.ts`.
3. Two overlapping simulation architectures; `nvidia-dsx-sim` execution class still advertised.
4. 92 wildcard-CORS edge functions unclassified.
5. Three lockfiles in-tree.
6. No CI-length budget in this sandbox for the full truth and route-stress suites — they must run in GitHub Actions.
7. `PHASE_3_NOT_CLOSED_EXTERNAL_VALIDATION_REQUIRED` unchanged; no external validation artifact exists.

## Rollback
Phase 0 added only documentation and evidence under `docs/remediation/nvidia-operational-readiness/`. Rollback = delete that directory.

## Verdict
**PHASE_0_BASELINE_CAPTURED** — AURA_NVIDIA_OPERATIONAL_NOT_READY stands. Awaiting review before Phase 1.
