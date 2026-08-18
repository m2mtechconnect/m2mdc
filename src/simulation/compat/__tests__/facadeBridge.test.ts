/**
 * Phase 4 — the compat engines are only reachable through the facade bridge,
 * and the bridge can never leak an untagged value or a thrown error.
 */
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import {
  runCompatEngine,
  runSovereignScenario,
  COMPAT_EXECUTION_CLASS,
} from '../facadeBridge';
import { SIMULATION_ENGINES } from '../../engineRegistry';
import type { SovereignKpis } from '@/types/sovereignDataCenterTwin';

const baseKpis: SovereignKpis = {
  sovereignComputeRatioPct: 80,
  effectiveAiPue: 1.25,
  gco2PerGpuHour: 40,
  sovereignRiskScore: 20,
  economicEfficiencyScore: 70,
  renewableRatioPct: 60,
  carbonIntensityKgPerMwh: 120,
  totalGpuCount: 1024,
  activeWorkloads: 42,
};

describe('simulation/compat/facadeBridge', () => {
  it('never claims an NVIDIA execution class', () => {
    expect(COMPAT_EXECUTION_CLASS).toBe('aura-deterministic');
  });

  it('returns a simulated ok outcome for a valid sovereign scenario', () => {
    const outcome = runSovereignScenario({ baseKpis, type: 'gpu_overload' });
    expect(outcome.kind).toBe('ok');
    if (outcome.kind === 'ok') {
      expect(outcome.provenance).toBe('simulated');
      expect(outcome.providerId).toBe('compatibility');
      expect(typeof outcome.observedAt).toBe('string');
    }
  });

  it('is deterministic for identical input', () => {
    const a = runSovereignScenario({ baseKpis, type: 'cooling_failure' });
    const b = runSovereignScenario({ baseKpis, type: 'cooling_failure' });
    expect(a.kind === 'ok' && b.kind === 'ok').toBe(true);
    if (a.kind === 'ok' && b.kind === 'ok') {
      expect(a.value.kpiDeltas).toEqual(b.value.kpiDeltas);
    }
  });

  it('converts a thrown engine error into an unavailable outcome', () => {
    const outcome = runCompatEngine(() => {
      throw new Error('engine exploded');
    });
    expect(outcome.kind).toBe('error');
    if (outcome.kind === 'error') {
      expect(outcome.provenance).toBe('unavailable');
      expect(outcome.code).toBe('COMPAT_ENGINE_THREW');
    }
  });

  it('is declared in the engine registry', () => {
    const record = SIMULATION_ENGINES.find(
      (e) => e.module === 'src/simulation/compat/facadeBridge.ts',
    );
    expect(record).toBeDefined();
    expect(record?.executionClass).toBe('aura-deterministic');
  });

  it('leaves no app consumer importing the frozen sovereign engine directly', () => {
    const root = path.resolve(__dirname, '../../..'); // src/
    const offenders: string[] = [];
    const walk = (dir: string) => {
      for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          if (entry.name === '__tests__' || entry.name === 'node_modules') continue;
          walk(full);
          continue;
        }
        if (!/\.tsx?$/.test(entry.name)) continue;
        const rel = path.relative(root, full).replace(/\\/g, '/');
        if (rel.startsWith('simulation/compat/')) continue;
        // Phase 2: the orchestrator provider is the sanctioned adapter for the
        // frozen sovereign engine - it is the reason the engine still exists.
        if (rel === 'simulation/orchestrator/providers/sovereignScenarioProvider.ts') continue;
        // The twins barrel re-exports for backwards compatibility only.
        if (rel === 'twins/sovereignDataCenter/index.ts') continue;
        if (rel === 'twins/dataCenter/index.ts') continue;
        // The registry lists module paths as documentation strings.
        if (rel === 'simulation/engineRegistry.ts') continue;
        const src = fs.readFileSync(full, 'utf8');
        if (src.includes('simulation/compat/sovereignDataCenterEngine')) offenders.push(rel);
      }
    };
    walk(root);
    expect(offenders).toEqual([]);
  });
});
