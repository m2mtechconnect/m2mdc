/**
 * AURA_ARCHITECTURE_CONSOLIDATION_AND_NVIDIA_ALIGNMENT - Phase 3.
 *
 * The single, declared inventory of simulation execution paths in AURA.
 *
 * Rules:
 *   - `src/simulation/api.ts` (the facade) is the ONLY sanctioned entry point
 *     for new consumers. Everything below is either the canonical engine it
 *     delegates to, or a frozen compatibility path kept for an existing
 *     consumer.
 *   - Adding a new engine module is a design change: it must be added here
 *     with a status and an owner, or `engineConsolidation.test.ts` fails.
 *   - `frozen` paths accept bug fixes only. New behaviour goes behind the
 *     facade.
 *   - No engine here executes NVIDIA code or an NVIDIA service. Every one of
 *     them is AURA-deterministic, so results are simulated, never measured.
 */

import type { SimulationExecutionClass } from './providers/types';

export type EngineStatus = 'canonical' | 'frozen';

export interface SimulationEngineRecord {
  /** Module path relative to the repository root. */
  module: string;
  status: EngineStatus;
  executionClass: SimulationExecutionClass;
  /** What this path exists to do. */
  purpose: string;
  /** Surfaces that still call it directly. */
  consumers: string[];
  /** Where this path is heading. Empty for canonical paths. */
  migrationTarget: string | null;
}

export const SIMULATION_ENGINES: SimulationEngineRecord[] = [
  {
    module: 'src/simulation/api.ts',
    status: 'canonical',
    executionClass: 'aura-deterministic',
    purpose:
      'Simulation facade. Selects a provider, enforces outcome integrity and never throws into UI code.',
    consumers: ['src/simulation/providers/*'],
    migrationTarget: null,
  },
  {
    module: 'src/simulation/SimulationEngine.ts',
    status: 'canonical',
    executionClass: 'aura-deterministic',
    purpose: 'Tick-based scenario engine used by the builder and twin surfaces.',
    consumers: [
      'src/simulation/useSimulation.ts',
      'src/hooks/useSimulationVisualization.ts',
      'src/twins/sovereignDataCenter/hooks/useEnhancedSimulation.ts',
    ],
    migrationTarget: null,
  },
  {
    module: 'src/simulation/generateSimulationResult.ts',
    status: 'canonical',
    executionClass: 'aura-deterministic',
    purpose: 'Summarises a completed run into a result envelope for panels and evidence.',
    consumers: ['src/simulation/api.ts'],
    migrationTarget: null,
  },
  {
    module: 'src/workspace/scenarioEngine.ts',
    status: 'canonical',
    executionClass: 'aura-deterministic',
    purpose:
      'Deterministic workspace scenario engine backing durable run records, evidence and exports.',
    consumers: [
      'src/workspace/workspaceStore.ts',
      'src/workspace/runPersistence.ts',
      'src/workspace/panels/*',
    ],
    migrationTarget: null,
  },
  {
    module: 'src/simulation/compat/dataCenterEngine.ts',
    status: 'frozen',
    executionClass: 'aura-deterministic',
    purpose: 'Legacy data-centre twin engine retained for the original twin surfaces.',
    consumers: ['src/twins/dataCenter/*'],
    migrationTarget: 'src/simulation/api.ts',
  },
  {
    module: 'src/simulation/compat/sovereignDataCenterEngine.ts',
    status: 'frozen',
    executionClass: 'aura-deterministic',
    purpose: 'Legacy sovereign data-centre pure-function engine.',
    consumers: ['src/twins/sovereignDataCenter/*'],
    migrationTarget: 'src/simulation/api.ts',
  },
];

export function canonicalEngines(): SimulationEngineRecord[] {
  return SIMULATION_ENGINES.filter((e) => e.status === 'canonical');
}

export function frozenEngines(): SimulationEngineRecord[] {
  return SIMULATION_ENGINES.filter((e) => e.status === 'frozen');
}