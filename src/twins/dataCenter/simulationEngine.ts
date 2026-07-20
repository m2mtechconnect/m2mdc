/**
 * Phase 1B.4 — compat re-export shim.
 *
 * The canonical implementation now lives at
 * `src/simulation/compat/dataCenterEngine.ts` behind the simulation
 * provider boundary (ADR-0007). This shim preserves the historical
 * import path (`@/twins/dataCenter/simulationEngine` and the
 * `src/twins/dataCenter` barrel) so no consumer moves in this slice.
 *
 * Do NOT add new imports of this path. New callers must depend on the
 * simulation facade (`src/simulation/api.ts`) or, transitionally, on
 * `src/simulation/compat/dataCenterEngine.ts` directly.
 */
export * from '@/simulation/compat/dataCenterEngine';
export type { SimulationState, GeneratedPlaybook } from '@/simulation/compat/dataCenterEngine';