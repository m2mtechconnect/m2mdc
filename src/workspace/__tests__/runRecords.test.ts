import { describe, expect, it } from 'vitest';
import { impactScore, mapRunRecord, type SimulationRunRow } from '../runRecords';

const row = (over: Partial<SimulationRunRow> = {}): SimulationRunRow => ({
  id: 'row-1',
  twin_id: 'twin-1',
  run_key: 'run-abc',
  scenario_key: 'heatwave',
  scenario_name: 'Heatwave',
  status: 'completed',
  started_at: '2026-08-01T10:00:00Z',
  finished_at: '2026-08-01T10:00:30Z',
  duration_ms: 30_000,
  baseline_kpis: { pue: 1.5, load: 100 },
  final_kpis: { pue: 1.35, load: 110 },
  events: [{ id: 'e1' }, { id: 'e2' }],
  engine_version: 'aura-workspace-scenario-engine@1.0.0',
  execution_origin: 'client-browser',
  validation_status: 'client-produced-unverified',
  checksum: 'fnv1a-deadbeef',
  created_at: '2026-08-01T10:00:31Z',
  ...over,
});

describe('mapRunRecord', () => {
  it('normalizes a canonical run row', () => {
    const r = mapRunRecord(row());
    expect(r.runId).toBe('run-abc');
    expect(r.durationSeconds).toBe(30);
    expect(r.eventsCount).toBe(2);
    expect(r.scenarioName).toBe('Heatwave');
    expect(r.recordCitation).toBe('simulation_runs:row-1');
  });

  it('never claims server validation unless the record says so', () => {
    expect(mapRunRecord(row()).serverValidated).toBe(false);
    expect(mapRunRecord(row({ validation_status: 'server-validated' })).serverValidated).toBe(true);
  });

  it('exposes the run envelope instead of inferring it', () => {
    const r = mapRunRecord(row({ engine_version: null, execution_origin: null }));
    expect(r.engineVersion).toBeNull();
    expect(r.executionOrigin).toBeNull();
  });

  it('falls back through run_key, run_label then id', () => {
    expect(mapRunRecord(row({ run_key: null, run_label: 'label-x' })).runId).toBe('label-x');
    expect(mapRunRecord(row({ run_key: null, run_label: null })).runId).toBe('row-1');
  });

  it('drops non-numeric KPI values rather than coercing them', () => {
    const r = mapRunRecord(row({ final_kpis: { pue: 1.2, note: 'n/a' } }));
    expect(r.finalKpis).toEqual({ pue: 1.2 });
  });

  it('tolerates missing jsonb payloads', () => {
    const r = mapRunRecord(row({ baseline_kpis: null, final_kpis: null, events: null }));
    expect(r.baselineKpis).toEqual({});
    expect(r.eventsCount).toBe(0);
    expect(r.overallImpactScore).toBe(0);
  });
});

describe('impactScore', () => {
  it('averages relative change across KPIs', () => {
    expect(impactScore({ a: 100, b: 100 }, { a: 110, b: 90 })).toBe(0);
    expect(impactScore({ a: 100 }, { a: 150 })).toBe(50);
  });

  it('ignores KPIs with a zero baseline instead of dividing by zero', () => {
    expect(impactScore({ a: 0 }, { a: 5 })).toBe(0);
  });
});