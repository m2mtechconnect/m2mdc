# ADR-0001: Simulation code layout — target one public API, many providers

Status: Proposed (Phase 1A). Consolidation deferred to Phase 1B.

## Context

Phase 0.5 catalogued seven concurrent simulation implementations (3,969 LOC):

| # | File | Role today | Importers |
|---|---|---|---|
| 1 | `src/simulation/SimulationEngine.ts` | Class `SimulationEngine`; canonical candidate | `hooks/useSimulationVisualization`, `simulation/{useSimulation,useSimulationGuards,integrationTests,index}`, `twins/sovereignDataCenter/hooks/useEnhancedSimulation`, `twins/sovereignDataCenter/components/SovereignDCSimulationDashboard`, `components/builder/step5/SimulationDashboard` |
| 2 | `src/simulation/generateSimulationResult.ts` | Result synthesizer | `components/simulation/DCSimulationPanel` |
| 3 | `src/twins/dataCenter/simulationEngine.ts` | DC-twin engine | `twins/dataCenter/index`, `twins/sovereignDataCenter/index`, `twins/sovereignDataCenter/hooks/useSovereignDCTwin`, `twins/sovereignDataCenter/__tests__/simulationEngine.test.ts` |
| 4 | `src/twins/sovereignDataCenter/simulationEngine.ts` | Duplicate of #3 | Same set as #3 |
| 5 | `src/twins/sovereignDataCenter/enhancedSimulationEngine.ts` | Parallel enhanced engine | `SovereignDCSimulationDashboard`, `useEnhancedSimulation`, `MultiRunComparison`, `AIRecommendationsPanel` |
| 6 | `src/components/builder/step5/SimulationEngine.ts` | Builder-scope engine (name clash with #1) | `EventLogPanel` |
| 7 | `src/components/builder/step5/MockSimulationEngine.ts` | Builder demo mock | `SimulationDashboard` (builder step 5) |

No single file is authoritative; every consumer imports a different combination.

## Classification (Phase 1A)

| File | Class |
|---|---|
| `src/simulation/SimulationEngine.ts` | **Public orchestration API** (candidate) |
| `src/simulation/generateSimulationResult.ts` | **Result generator** |
| `src/simulation/scenarioRegistry.ts` | **Provider** (scenario catalog) |
| `src/simulation/customScenarioBuilder.ts` | **Provider** (user-defined scenarios) |
| `src/simulation/blueprintScenarioAdapter.ts` | **Provider** (blueprint → scenario) |
| `src/simulation/generateSimulationResult.ts` | **Result generator** |
| `src/simulation/useSimulation.ts` | **UI-specific controller** (hook) |
| `src/simulation/useSimulationGuards.ts` | **UI-specific controller** (hook) |
| `src/simulation/integrationTests.ts` | **Test implementation** |
| `src/twins/dataCenter/simulationEngine.ts` | **Duplicate** of #4 — merge target |
| `src/twins/sovereignDataCenter/simulationEngine.ts` | **Duplicate** of #3 — merge target |
| `src/twins/sovereignDataCenter/enhancedSimulationEngine.ts` | **Parallel provider** — merge into scenario library |
| `src/components/builder/step5/SimulationEngine.ts` | **UI-specific controller** (builder wizard) — likely dead-code candidate |
| `src/components/builder/step5/MockSimulationEngine.ts` | **Demo fixture** |

## Decision

The target architecture is:

```text
src/simulation/
├── api.ts                     # ONE public interface: `runScenario`, `subscribeSimulation`, `stopSimulation`.
├── providers/
│   ├── rulesEngine.ts         # Current SimulationEngine.ts logic, extracted to a pure provider.
│   ├── scenarioLibrary.ts     # Union of scenarioRegistry + enhancedSimulationEngine scenarios.
│   └── blueprintProvider.ts   # blueprintScenarioAdapter.ts, unchanged.
├── result/
│   └── generate.ts            # Current generateSimulationResult.ts.
├── react/
│   ├── useSimulation.ts       # Kept.
│   └── useSimulationGuards.ts # Kept.
└── fixtures/
    └── builderMock.ts         # MockSimulationEngine.ts renamed.
```

All consumers depend on `src/simulation/api.ts`. Duplicate engines in `twins/**` and `components/builder/step5/` are deleted after characterization tests pass. The name clash between the two `SimulationEngine` classes is resolved by removing the class from `components/builder/step5/`.

## Migration order (Phase 1B — not this phase)

1. Add characterization tests to `SimulationEngine.ts` (source of truth) — covers scenario dispatch, event stream, snapshot restoration.
2. Add characterization tests to `enhancedSimulationEngine.ts` for behaviours not present in #1.
3. Introduce `src/simulation/api.ts` as a thin facade re-exporting current `SimulationEngine`; migrate all callers to it (codemod).
4. Fold scenario definitions from `enhancedSimulationEngine.ts` into `scenarioLibrary.ts`.
5. Delete `twins/dataCenter/simulationEngine.ts` and `twins/sovereignDataCenter/simulationEngine.ts`.
6. Delete `components/builder/step5/SimulationEngine.ts` after builder migrates to the api.
7. Rename `MockSimulationEngine.ts` to `fixtures/builderMock.ts`.

## Consequences

No file is deleted in Phase 1A. Deletion prerequisites: per-file characterization tests, importer inventory, replacement module identified, and green test suite after each cut.

## References

- Phase 0.5 inventory: `docs/remediation/baseline.md` §3, `capability-traceability.md` DC twin section.