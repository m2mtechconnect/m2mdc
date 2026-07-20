/**
 * Phase 1B.6 — compat re-export integrity (Sovereign DC).
 *
 * After Phase 1B.6 the legacy path `src/twins/sovereignDataCenter/simulationEngine.ts`
 * was deleted and the `twins/sovereignDataCenter` barrel now re-exports from
 * `src/simulation/compat/sovereignDataCenterEngine.ts`. This spec pins that
 * re-export by function-reference identity so the compat layer cannot silently
 * fork from the barrel.
 */
import { describe, expect, it } from 'vitest';

import * as compat from '@/simulation/compat/sovereignDataCenterEngine';
import * as barrel from '@/twins/sovereignDataCenter';

describe('simulation/compat/sovereignDataCenterEngine — re-export identity', () => {
  const names = ['runSimulation', 'createSimulationRun', 'getScenarioSuggestions'] as const;

  it.each(names)('twins/sovereignDataCenter barrel re-exports %s from compat by identity', (name) => {
    expect((barrel as Record<string, unknown>)[name]).toBe(
      (compat as Record<string, unknown>)[name],
    );
  });
});
