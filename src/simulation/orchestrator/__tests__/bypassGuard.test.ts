/**
 * Phase 2 - orchestrator bypass guard.
 *
 * Source-level assertion that no application module constructs a simulation
 * engine directly, and that simulation code draws no unseeded randomness.
 * The ESLint rule catches this during development; this test catches it in
 * CI regardless of lint configuration drift.
 */

import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const SRC = join(process.cwd(), 'src');

/** Files permitted to construct engines: the orchestrator's own adapters. */
const ENGINE_CONSTRUCTION_ALLOWLIST = [
  'src/simulation/orchestrator/providers/builderPreviewProviders.ts',
];

/** Files permitted to call the summary engine directly. */
const SUMMARY_ALLOWLIST = [
  'src/simulation/generateSimulationResult.ts',
  'src/simulation/orchestrator/providers/panelSummaryProvider.ts',
];

/** Simulation code that must never draw unseeded randomness. */
const SEEDED_ONLY_DIRS = ['src/simulation', 'src/components/builder/step5'];

/** Strip comments so prose mentioning an engine or `Math.random()` is ignored. */
function code(text: string): string {
  return text.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
}

function walk(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      if (entry === '__tests__') continue;
      walk(full, out);
    } else if (/\.tsx?$/.test(full) && !full.endsWith('.d.ts')) {
      out.push(full);
    }
  }
  return out;
}

const files = walk(SRC).map((f) => ({
  rel: f.slice(process.cwd().length + 1).replace(/\\/g, '/'),
  text: code(readFileSync(f, 'utf8')),
}));

describe('simulation orchestrator bypass guard', () => {
  it('no module outside the orchestrator constructs a simulation engine', () => {
    const offenders = files
      .filter((f) => !ENGINE_CONSTRUCTION_ALLOWLIST.includes(f.rel))
      .filter((f) => /new\s+(BuilderPreviewEngine|MockSimulationEngine)\s*\(/.test(f.text))
      .map((f) => f.rel);
    expect(offenders).toEqual([]);
  });

  it('no module outside the orchestrator calls the summary engine directly', () => {
    const offenders = files
      .filter((f) => !SUMMARY_ALLOWLIST.includes(f.rel))
      .filter((f) => /\bgenerateSimulationResult\s*\(/.test(f.text))
      .map((f) => f.rel);
    expect(offenders).toEqual([]);
  });

  it('simulation code draws no unseeded randomness', () => {
    const offenders = files
      .filter((f) => SEEDED_ONLY_DIRS.some((d) => f.rel.startsWith(d)))
      .filter((f) => /Math\.random\s*\(/.test(f.text))
      .map((f) => f.rel);
    expect(offenders).toEqual([]);
  });
});