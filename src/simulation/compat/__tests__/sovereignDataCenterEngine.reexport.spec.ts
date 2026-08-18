/**
 * Phase 1B.6 — compat re-export integrity (Sovereign DC).
 *
 * After Phase 1B.6 the legacy path `src/twins/sovereignDataCenter/simulationEngine.ts`
 * was deleted and the `twins/sovereignDataCenter` barrel now re-exports from
 * `src/simulation/compat/sovereignDataCenterEngine.ts`. This spec pins that
 * re-export by function-reference identity so the compat layer cannot silently
 * fork from the barrel.
 *
 * Phase 2 narrowed the barrel: `runSimulation` is no longer re-exported, since
 * executing a sovereign scenario must go through the orchestrator. The barrel
 * now carries only the pure helpers, and this spec pins that boundary.
 */
import { describe, expect, it } from 'vitest';

import * as compat from '@/simulation/compat/sovereignDataCenterEngine';
import * as barrel from '@/twins/sovereignDataCenter';

describe('simulation/compat/sovereignDataCenterEngine — re-export identity', () => {
  const names = ['createSimulationRun', 'getScenarioSuggestions'] as const;

  it.each(names)('twins/sovereignDataCenter barrel re-exports %s from compat by identity', (name) => {
    expect((barrel as Record<string, unknown>)[name]).toBe(
      (compat as Record<string, unknown>)[name],
    );
  });

  it('no longer re-exports runSimulation, so execution cannot bypass the orchestrator', () => {
    expect((barrel as Record<string, unknown>).runSimulation).toBeUndefined();
    expect(typeof (compat as Record<string, unknown>).runSimulation).toBe('function');
  });
});
