/**
 * AURA_ARCHITECTURE_CONSOLIDATION_AND_NVIDIA_ALIGNMENT - Phase 3 guard.
 *
 * Enforces "do not add another simulation engine" and "no fabricated NVIDIA
 * execution claim" as executable rules rather than review etiquette.
 */
import { readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { describe, expect, it } from 'vitest';
import { SIMULATION_ENGINES, canonicalEngines } from '../engineRegistry';
import { createDefaultRegistry } from '../providers/registry';

const ROOT = process.cwd();
const SRC = join(ROOT, 'src');

/** Modules that look like a simulation engine by filename. */
function findEngineModules(dir: string, found: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      if (entry === '__tests__' || entry === 'node_modules') continue;
      findEngineModules(full, found);
      continue;
    }
    if (!/\.tsx?$/.test(entry)) continue;
    if (/\.(test|spec)\.tsx?$/.test(entry)) continue;
    // React hooks are wrappers around a declared engine, not engines.
    if (/^use[A-Z]/.test(entry)) continue;
    if (/(^|[a-z])simulationEngine\.tsx?$|^SimulationEngine\.tsx?$|Engine\.ts$/i.test(entry)) {
      found.push(relative(ROOT, full).replace(/\\/g, '/'));
    }
  }
  return found;
}

describe('simulation engine consolidation', () => {
  it('declares every engine module in the engine registry', () => {
    const declared = new Set(SIMULATION_ENGINES.map((e) => e.module));
    const undeclared = findEngineModules(SRC).filter((m) => !declared.has(m));
    expect(undeclared, 'add the module to src/simulation/engineRegistry.ts').toEqual([]);
  });

  it('keeps at least one canonical engine and never duplicates a module', () => {
    expect(canonicalEngines().length).toBeGreaterThan(0);
    const modules = SIMULATION_ENGINES.map((e) => e.module);
    expect(new Set(modules).size).toBe(modules.length);
  });

  it('never claims NVIDIA execution for an AURA engine', () => {
    for (const engine of SIMULATION_ENGINES) {
      expect(['aura-deterministic', 'fixture-preview']).toContain(engine.executionClass);
    }
  });

  it('reports no NVIDIA-integrated simulation provider', () => {
    const registry = createDefaultRegistry();
    for (const id of registry.ids()) {
      const provider = registry.get(id);
      expect(provider.capabilities.nvidiaIntegrated).toBe(false);
      expect(provider.capabilities.live).toBe(false);
    }
  });

  it('routes the NVIDIA boundary through a disabled, non-executing stub', async () => {
    const registry = createDefaultRegistry();
    for (const id of ['nvidia-dsx-sim', 'specialist-solver', 'omniverse'] as const) {
      const provider = registry.get(id);
      expect(provider.id).toBe(id);
      expect(provider.capabilities.executionClass).toBe('nvidia-solver');
      expect(provider.listScenarios().kind).toBe('disabled');
      const run = await provider.runScenario({ scenarioId: 'baseline' });
      expect(run.kind).toBe('disabled');
      expect(run.provenance).toBe('unavailable');
    }
  });
});