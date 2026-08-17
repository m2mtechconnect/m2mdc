/**
 * Phase 8 guard: one data-mode contract across every KPI surface.
 */
import { describe, expect, it } from 'vitest';
import { DATA_MODES, type DataMode } from '@/dsx/modes';
import type { DataProvenance } from '@/lib/provenance/types';
import {
  PROVENANCE_TO_DATA_MODE,
  dataModeFor,
  effectiveProvenance,
  isPresentableAsOperational,
  mayRenderValue,
  requiresRunId,
} from '../dataModeContract';

const ALL_PROVENANCE: DataProvenance[] = [
  'live',
  'derived',
  'simulated',
  'demo',
  'static',
  'unavailable',
];

describe('data mode contract', () => {
  it('maps every provenance tag to exactly one known DSX mode', () => {
    for (const p of ALL_PROVENANCE) {
      const mode = PROVENANCE_TO_DATA_MODE[p] as DataMode;
      expect(DATA_MODES).toContain(mode);
    }
    expect(Object.keys(PROVENANCE_TO_DATA_MODE).sort()).toEqual([...ALL_PROVENANCE].sort());
  });

  it('never presents synthetic or configured values as LIVE', () => {
    for (const p of ['simulated', 'demo', 'static', 'unavailable'] as DataProvenance[]) {
      expect(dataModeFor(p)).not.toBe('LIVE');
      expect(isPresentableAsOperational({ provenance: p })).toBe(false);
    }
  });

  it('degrades stale measurement-backed readings instead of showing them live', () => {
    for (const p of ['live', 'derived'] as DataProvenance[]) {
      expect(dataModeFor(p, false)).toBe('LIVE');
      expect(dataModeFor(p, true)).toBe('UNAVAILABLE');
      expect(effectiveProvenance({ provenance: p, stale: true })).toBe('unavailable');
      expect(effectiveProvenance({ provenance: p, stale: false })).toBe(p);
    }
  });

  it('never upgrades a synthetic tag when it is fresh', () => {
    expect(effectiveProvenance({ provenance: 'simulated', stale: false })).toBe('simulated');
    expect(effectiveProvenance({ provenance: 'demo' })).toBe('demo');
  });

  it('requires a run id for synthetic values only', () => {
    expect(requiresRunId('simulated')).toBe(true);
    expect(requiresRunId('demo')).toBe(true);
    expect(requiresRunId('live')).toBe(false);
    expect(requiresRunId('static')).toBe(false);
  });

  it('refuses to render a value for UNAVAILABLE surfaces', () => {
    expect(mayRenderValue('unavailable')).toBe(false);
    expect(mayRenderValue('static')).toBe(false);
    expect(mayRenderValue('live', true)).toBe(false);
    expect(mayRenderValue('simulated')).toBe(true);
  });
});
