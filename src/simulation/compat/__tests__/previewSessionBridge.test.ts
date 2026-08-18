/**
 * Phase 4 guard: builder preview engines are only reachable via the bridge.
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { describe, expect, it } from 'vitest';
import { createBuilderPreviewSession } from '../previewSessionBridge';

const ROOT = process.cwd();
const ALLOWED = new Set([
  // Phase 2: engines are constructed only by the orchestrator's providers.
  'src/simulation/orchestrator/providers/builderPreviewProviders.ts',
  'src/components/builder/step5/BuilderPreviewEngine.ts',
  'src/components/builder/step5/fixtures/builderMock.ts',
]);

function walk(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      if (entry === '__tests__' || entry === 'node_modules') continue;
      walk(full, out);
      continue;
    }
    if (/\.tsx?$/.test(entry) && !/\.(test|spec)\.tsx?$/.test(entry)) {
      out.push(relative(ROOT, full).replace(/\\/g, '/'));
    }
  }
  return out;
}

describe('builder preview session bridge', () => {
  it('returns an unavailable session instead of throwing when no scenario is selected', () => {
    const outcome = createBuilderPreviewSession({ scenario: null, speed: 1 });
    expect(outcome.kind).toBe('unavailable');
    expect(outcome.provenance).toBe('unavailable');
  });

  it('labels the estimator path as seeded-stochastic and simulated', () => {
    const outcome = createBuilderPreviewSession({
      scenario: { id: 'demo', title: 'Demo' },
      speed: 1,
      workflows: [],
      kpis: [],
    });
    expect(outcome.kind).toBe('ok');
    if (outcome.kind !== 'ok') return;
    // Phase 2 correction: the estimator draws from a PRNG, so it is seeded,
    // not deterministic. The seed is recorded on the provenance record.
    expect(outcome.executionClass).toBe('aura-stochastic-seeded');
    expect(outcome.record.seed).toBeTypeOf('number');
    expect(outcome.record.prngAlgorithm).toBe('mulberry32-v1');
    expect(outcome.provenance).toBe('simulated');
    expect(outcome.fixtureBacked).toBe(false);
    outcome.engine.stop();
  });

  it('labels scripted template previews as fixture-backed', () => {
    const outcome = createBuilderPreviewSession({
      scenario: { id: 'peak', title: 'Peak' },
      speed: 1,
      useFixturePreview: true,
      previewConfig: {
        baseline_metrics: { pue: 1.3 },
        scenarios: {
          peak: { label: 'Peak', duration_seconds: 10, ticks: [{ t: 0 }], events: ['start'] },
        },
      },
    });
    expect(outcome.kind).toBe('ok');
    if (outcome.kind !== 'ok') return;
    expect(outcome.executionClass).toBe('fixture-preview');
    expect(outcome.fixtureBacked).toBe(true);
    outcome.engine.stop();
  });

  it('keeps direct engine construction out of app modules', () => {
    const offenders = walk(join(ROOT, 'src')).filter((file) => {
      if (ALLOWED.has(file)) return false;
      const src = readFileSync(join(ROOT, file), 'utf8');
      return /new\s+(BuilderPreviewEngine|MockSimulationEngine)\s*\(/.test(src);
    });
    expect(offenders, 'use createBuilderPreviewSession instead').toEqual([]);
  });
});
