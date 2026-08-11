# Stage 7H - Blueprint/Simulation ownership evidence

## Execution paths removed from Blueprint
| Path | Disposition |
| --- | --- |
| `DesignerModeHeader` "Run Simulation" button | Replaced with `Open in Simulation` (navigation only, permission-gated) |
| `BlueprintScenariosTab` (scenario catalogue + run controls) | Deleted; tab removed from `/blueprint/:id` |
| `WorkflowSimulationPreview` | Deleted; replaced by `WorkflowStructureValidation` (local structural checks, no run) |
| `ScenarioEnhancementsPanel` on the Overview tab | Removed |
| `BlueprintModelSection` "Run a scenario in Simulation" | Removed (duplicate entry point) |
| `WorkflowEnhancementsPanel` preview | Retained, relabelled "Preview workflow structure"; client-side step highlighting only |
| Assistant `runSimulation` / `pauseSimulation` / `resetSimulation` | Blocked on `/blueprint*` in `CoPilotCommandContext` |

## Canonical ownership
- Simulation route: `/simulation` (`AuraWorkspace`).
- Run records are created in exactly one place: `workspaceStore.runScenario`.
- `runScenario` returns `null` unless `assumptionsReviewed === true`; changing scenario, overrides or handoff resets that flag.

## Handoff contract
`buildSimulationHandoffUrl` -> `/simulation?blueprintId=…&versionId=…&state=draft&from=blueprint:<tab>`.
Arrival loads a draft configuration and selects the Simulate tool. No run is created or queued.

## Verification
- Unit: `src/simulation/__tests__/handoff.test.ts`, `src/lib/provenance/__tests__/twinFieldProvenance.test.ts`, `src/lib/location/__tests__/normalizeLocation.test.ts`, `src/workspace/__tests__/simulationOwnership.test.ts` - 28 passing.
- Static guard: no Blueprint file imports simulation execution APIs; exactly one "Open in Simulation" affordance exists.
- Browser: `/blueprint/default` exposes only `Open in Simulation`; click navigates to
  `/simulation?blueprintId=default&versionId=1&from=blueprint%3Amodel&state=draft` with run state
  "Not started", run button disabled, reason "Review the run inputs below to enable execution."
- Typecheck: `tsgo --noEmit -p tsconfig.app.json` clean.
