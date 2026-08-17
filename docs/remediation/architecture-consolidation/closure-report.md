# AURA_ARCHITECTURE_CONSOLIDATION_AND_NVIDIA_ALIGNMENT - closure report

Status: **closed**. Phases 0-8 complete. Typecheck clean (the Phase 0
pre-existing `whiteLabelSurfaces.test.ts` inference error is resolved).

## What each phase left behind

| Phase | Outcome | Canonical file | Guard test |
| --- | --- | --- | --- |
| 0 | Baseline inventory of duplicated truth sources | `phase-0-baseline-inventory.md` | - |
| 1 | One capability / claim source of truth | `src/config/dsxCapabilityRegistry.ts` | `src/config/__tests__/dsxClaimsPolicy.test.ts` |
| 2 | Route, nav and page deduplication | `src/config/appNavigation.ts`, `src/config/routeAliases.ts` | `src/test/informationArchitecture.test.ts` |
| 3 | Simulation provider taxonomy + engine inventory | `src/simulation/engineRegistry.ts` | `src/simulation/__tests__/engineConsolidation.test.ts` |
| 4 | Legacy engines wrapped behind typed bridges | `src/simulation/compat/facadeBridge.ts` | `src/simulation/compat/__tests__/previewSessionBridge.test.ts` |
| 5 | Renderer interface modes, `/omniverse-scene` -> `/twin-preview` | `src/config/routeAliases.ts` | `src/test/informationArchitecture.test.ts` |
| 6 | AURA Message Bridge vs NVIDIA DSX Exchange boundary | `src/dsx/exchange/exchangeBoundary.ts` | `src/dsx/exchange/__tests__/exchangeBoundary.test.ts` |
| 7 | Agents declared advisory, human-approved, no NIM/NeMo | `src/agents/agentPositioning.ts` | `src/agents/__tests__/agentPositioning.test.ts` |
| 8 | Fail-closed provenance / data-mode contract | `src/data/dataModeContract.ts` | `src/data/__tests__/dataModeContract.test.ts` |

## Standing integration position

NVIDIA-integrated capabilities: 0. SimReady-validated assets: 0.
NVIDIA-runtime-mounted OpenUSD stages: 0. Live telemetry sources: 0.
AURA is a DSX-*aligned* deterministic simulation and evidence platform with
AURA-authored OpenUSD masters; it is not DSX-integrated. Any change to that
statement must go through an evidence-gated record in the capability registry.

## Verification at closure

- `bunx tsgo --noEmit`: no diagnostics.
- Consolidation guard suites: 6 files, 44 tests, all passing.
- Full suite last run at Phase 8: 1690 tests passing.

## Remaining external blockers

Tracked in `docs/remediation/external-blockers.md`: NVIDIA runtime licensing,
SimReady certification, and customer live-telemetry endpoints. None are
resolvable inside this repository.

## Phase 9 - platform compliance claim boundary (added after closure)

Separates AURA *product* compliance claims from compliance frameworks
*modelled inside a facility twin*. `src/config/complianceClaims.ts` is the
single record of platform claims; each carries a status and evidence, and only
`certified` / `implemented-uncertified` records with a public statement may be
rendered.

- Removed "SOC 2 Compliant" and "PIPEDA Ready" from the auth security badge -
  no audit evidence exists for either. The badge now renders only the
  implemented controls: encrypted in transit, encrypted at rest, RBAC.
- "Secured by M2M Sovereign Cloud" -> "Secured by M2M AURA".
- Auth layout: "Carbon Neutral" -> "Carbon Modelling", "Sovereign Cloud" ->
  "Data Residency Controls".
- Guard: `src/config/__tests__/complianceClaims.test.ts` fails the build if
  certification phrasing returns to platform chrome.
- Facility-level framework data (blueprints, KPI catalogues, industry
  profiles) is untouched - those are modelled attributes, not AURA assertions.

Certification itself stays an external blocker (external-blockers.md section 5).
