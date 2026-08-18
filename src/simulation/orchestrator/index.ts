/**
 * Phase 2 - canonical simulation entry point.
 *
 * Import `simulationOrchestrator` from here. Nothing in the application may
 * construct a simulation engine directly; the lint guard in `eslint.config.js`
 * and `src/simulation/orchestrator/__tests__/bypassGuard.test.ts` enforce that.
 */

import { createSimulationOrchestrator, type SimulationOrchestrator } from './orchestrator';
import { createAuraScenarioProvider } from './providers/auraScenarioProvider';
import { createPanelSummaryProvider } from './providers/panelSummaryProvider';
import {
  createExternalSolverProvider,
  createNvidiaSolverProvider,
} from './providers/failClosedProviders';
import {
  createBuilderEstimatorPreviewProvider,
  createBuilderFixturePreviewProvider,
} from './providers/builderPreviewProviders';

export function createDefaultSimulationOrchestrator(): SimulationOrchestrator {
  return createSimulationOrchestrator({
    providers: [
      createAuraScenarioProvider(),
      createPanelSummaryProvider(),
      createNvidiaSolverProvider(),
      createExternalSolverProvider(),
    ],
    previewProviders: [
      createBuilderFixturePreviewProvider(),
      createBuilderEstimatorPreviewProvider(),
    ],
  });
}

/** Process-wide orchestrator used by application code. */
export const simulationOrchestrator: SimulationOrchestrator =
  createDefaultSimulationOrchestrator();

export { createSimulationOrchestrator } from './orchestrator';
export type { SimulationOrchestrator, OrchestratorOptions } from './orchestrator';
export * from './types';
export * from './executionClass';
export { deriveSeed, mulberry32, PRNG_ALGORITHM, type SeededRandom } from './prng';
export { canonicalize, hashCanonical } from './canonical';
export { AURA_SCENARIO_PROVIDER_ID } from './providers/auraScenarioProvider';
export { PANEL_SUMMARY_PROVIDER_ID } from './providers/panelSummaryProvider';
export {
  EXTERNAL_SOLVER_PROVIDER_ID,
  NVIDIA_SOLVER_PROVIDER_ID,
} from './providers/failClosedProviders';
export {
  BUILDER_PREVIEW_ESTIMATOR_PROVIDER_ID,
  BUILDER_PREVIEW_FIXTURE_PROVIDER_ID,
  type BuilderPreviewSessionEngine,
  type BuilderPreviewSessionValue,
  type PreviewSpeedFactor,
} from './providers/builderPreviewProviders';