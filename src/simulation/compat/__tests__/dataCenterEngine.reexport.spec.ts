/**
 * Phase 1B.6 — compat re-export integrity.
 *
 * After Phase 1B.6 the historical shim at
 * `src/twins/dataCenter/simulationEngine.ts` was deleted. This spec now
 * guards that the `twins/dataCenter` barrel re-exports the pure-function
 * DC engine by identity from the canonical compat module.
 */
import { describe, expect, it } from 'vitest';

import * as compat from '@/simulation/compat/dataCenterEngine';
import * as barrel from '@/twins/dataCenter';

describe('simulation/compat/dataCenterEngine — re-export identity', () => {
  const names = [
    'calculateBaseKpis',
    'applyScenarioDeltas',
    'generateScenarioEvents',
    'createSimulationRun',
    'updateSimulationRun',
    'generatePlaybook',
    'playbookToMarkdown',
  ] as const;

  it.each(names)('twins/dataCenter barrel re-exports %s from compat by identity', (name) => {
    expect((barrel as Record<string, unknown>)[name]).toBe(
      (compat as Record<string, unknown>)[name],
    );
  });
});