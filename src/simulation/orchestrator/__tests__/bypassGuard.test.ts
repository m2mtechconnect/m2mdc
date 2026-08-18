/**
 * Phase 2 - orchestrator bypass guard.
 *
 * Source-level assertion that no module constructs a simulation engine
 * directly, and that simulation code draws no unseeded randomness. The ESLint
 * rule catches this during development; this test catches it in CI regardless
 * of lint configuration drift.
 *
 * Scope is the whole repository - `src/`, `tests/`, `cypress/`, `scripts/`
 * and `supabase/functions/` - including test files, so a bypass cannot hide
 * in a spec. Every exemption is enumerated in the allowlists below and
 * mirrored in `eslint.config.js`.
 */

import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const ROOT = process.cwd();

/** Every scanned tree. Adding a new source tree must extend this list. */
const SCANNED_TREES = ['src', 'tests', 'cypress', 'scripts', 'supabase/functions'];

/** Directories excluded from the scan because they hold no first-party code. */
const SKIPPED_DIRS = new Set(['node_modules', 'dist', 'build', 'coverage', '.git']);

/**
 * Files permitted to construct engines.
 *
 * - the orchestrator's preview adapter, which owns construction;
 * - characterization specs, which pin the frozen engines' behaviour and must
 *   instantiate them directly to do so.
 */
const ENGINE_CONSTRUCTION_ALLOWLIST = [
  'src/simulation/orchestrator/providers/builderPreviewProviders.ts',
  'src/simulation/__tests__/characterization/builder.mockSimulationEngine.spec.ts',
];

/**
 * Files permitted to call the summary engine directly: its own definition,
 * the orchestrator provider that adapts it, and its characterization spec.
 */
const SUMMARY_ALLOWLIST = [
  'src/simulation/generateSimulationResult.ts',
  'src/simulation/orchestrator/providers/panelSummaryProvider.ts',
  'src/simulation/__tests__/characterization/generateSimulationResult.spec.ts',
  // Equivalence test: asserts the orchestrator facade returns exactly what the
  // frozen engine returns, so it must call both sides.
  'src/simulation/providers/__tests__/panelFacade.test.ts',
];

/**
 * Files permitted to call the frozen sovereign engine directly: its own
 * definition, the orchestrator provider that adapts it, and the
 * characterization / re-export specs that pin it.
 */
const SOVEREIGN_ALLOWLIST = [
  'src/simulation/compat/sovereignDataCenterEngine.ts',
  'src/simulation/orchestrator/providers/sovereignScenarioProvider.ts',
  'src/simulation/__tests__/characterization/sovereign.simulationEngine.spec.ts',
  'src/simulation/compat/__tests__/sovereignDataCenterEngine.reexport.spec.ts',
  'src/twins/sovereignDataCenter/__tests__/simulationEngine.test.ts',
];

/** Simulation code that must never draw unseeded randomness. */
const SEEDED_ONLY_DIRS = ['src/simulation', 'src/components/builder/step5'];

/**
 * Randomness exemptions. Tests may draw unseeded randomness to *generate*
 * inputs; production simulation code may not.
 */
const RANDOMNESS_ALLOWLIST: string[] = [];

/** Strip comments so prose mentioning an engine or `Math.random()` is ignored. */
function code(text: string): string {
  return text.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
}

function walk(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (SKIPPED_DIRS.has(entry)) continue;
    if (statSync(full).isDirectory()) {
      walk(full, out);
    } else if (/\.tsx?$/.test(full) && !full.endsWith('.d.ts')) {
      out.push(full);
    }
  }
  return out;
}

const files = SCANNED_TREES.filter((tree) => existsSync(join(ROOT, tree)))
  .flatMap((tree) => walk(join(ROOT, tree)))
  .map((f) => ({
    rel: f.slice(ROOT.length + 1).replace(/\\/g, '/'),
    text: code(readFileSync(f, 'utf8')),
  }));

const isTest = (rel: string) => /(^|\/)__tests__\//.test(rel) || /\.(test|spec)\.tsx?$/.test(rel);

describe('simulation orchestrator bypass guard', () => {
  it('scans the whole repository, including test files', () => {
    // A guard that silently scans nothing always passes. Prove the corpus.
    expect(files.length).toBeGreaterThan(500);
    expect(files.some((f) => isTest(f.rel))).toBe(true);
    expect(files.some((f) => f.rel.startsWith('tests/'))).toBe(true);
  });

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

  it('no module outside the orchestrator calls the sovereign engine directly', () => {
    const offenders = files
      .filter((f) => !SOVEREIGN_ALLOWLIST.includes(f.rel))
      .filter((f) => /from\s+['"][^'"]*compat\/sovereignDataCenterEngine['"]/.test(f.text))
      .filter((f) => /\brunSimulation\s*\(/.test(f.text))
      .map((f) => f.rel);
    expect(offenders).toEqual([]);
  });

  it('simulation code draws no unseeded randomness', () => {
    const offenders = files
      .filter((f) => SEEDED_ONLY_DIRS.some((d) => f.rel.startsWith(d)))
      .filter((f) => !RANDOMNESS_ALLOWLIST.includes(f.rel))
      .filter((f) => /Math\.random\s*\(/.test(f.text))
      .map((f) => f.rel);
    expect(offenders).toEqual([]);
  });

  it('every declared exemption still points at a real file', () => {
    const declared = [
      ...ENGINE_CONSTRUCTION_ALLOWLIST,
      ...SUMMARY_ALLOWLIST,
      ...SOVEREIGN_ALLOWLIST,
      ...RANDOMNESS_ALLOWLIST,
    ];
    const stale = declared.filter((rel) => !existsSync(join(ROOT, rel)));
    expect(stale).toEqual([]);
  });
});