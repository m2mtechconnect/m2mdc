/**
 * Phase 1B.4 — compat re-export integrity.
 *
 * Guards the invariant that both public import paths for the pure-function
 * DC engine resolve to the *same* function references. If this ever drifts,
 * the compat layer has stopped being a shim and the deletion criteria in
 * ADR-0007 no longer hold.
 */
import { describe, expect, it } from 'vitest';

import * as compat from '@/simulation/compat/dataCenterEngine';
import * as shim from '@/twins/dataCenter/simulationEngine';
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

  it.each(names)('shim path re-exports %s from compat by identity', (name) => {
    expect((shim as Record<string, unknown>)[name]).toBe(
      (compat as Record<string, unknown>)[name],
    );
  });

  it.each(names)('twins/dataCenter barrel re-exports %s from compat by identity', (name) => {
    expect((barrel as Record<string, unknown>)[name]).toBe(
      (compat as Record<string, unknown>)[name],
    );
  });
});