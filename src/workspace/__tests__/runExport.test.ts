/** Run export must carry real run values and truthful provenance (PW-P1-03). */
import { describe, expect, it } from 'vitest';
import { buildRunExportPayload, runExportFilename } from '../runExport';
import { toCsv, toJson } from '@/lib/provenance/exporters';
import type { WorkspaceRun } from '../scenarioEngine';

const run: WorkspaceRun = {
  id: 'SIM-2026-08-17-001',
  scenarioId: 'baseline',
  scenarioLabel: 'Baseline operations',
  facilityId: 'mtl',
  facilityName: 'Montreal Sovereign AI DC',
  startedAt: '2026-08-17T00:00:00.000Z',
  completedAt: '2026-08-17T00:00:05.000Z',
  overrides: { coolingSetpointC: 22, gpuPowerCapPct: 90, workloadDensityPct: 70, renewableMixPct: 80 },
  baseline: {
    pue: 1.4,
    itLoadKw: 1000,
    gpuUtilization: 70,
    thermalStability: 95,
    coolingEfficiency: 78,
    capacityHeadroom: 30,
    carbonIntensity: 30,
    energyCostPerMwh: 60,
    sovereigntyScore: 88,
  },
  result: {
    pue: 1.32,
    itLoadKw: 1000,
    gpuUtilization: 72,
    thermalStability: 96,
    coolingEfficiency: 82,
    capacityHeadroom: 28,
    carbonIntensity: 28,
    energyCostPerMwh: 58,
    sovereigntyScore: 88,
  },
  events: [],
  recommendations: [],
  decisions: {},
};

describe('workspace run export', () => {
  it('exports baseline and scenario KPIs as simulated records', () => {
    const payload = buildRunExportPayload(run);
    expect(payload.records.length).toBe(18);
    // Any KPI missing from the run downgrades to `unavailable` with a null
    // value rather than exporting a fabricated number.
    const expected = Object.keys(run.result).filter((k) => payload.records.some((r) => r.metricId === `result.${k}`)).length * 2;
    expect(payload.records.filter((r) => r.provenance === 'simulated').length).toBe(expected);
    expect(payload.records.every((r) => r.provenance === 'simulated' || r.value === null)).toBe(true);
    const pue = payload.records.find((r) => r.metricId === 'result.pue');
    expect(pue?.value).toBe(1.32);
    expect(pue?.observedAt).toBe(run.completedAt);
  });

  it('binds the payload to the run in its truth block', () => {
    const payload = buildRunExportPayload(run);
    expect(payload.operatingState?.simulationRunId).toBe(run.id);
    expect(payload.operatingState?.liveFacilityDataUsed).toBe('No');
    expect(payload.title).toContain(run.id);
  });

  it('serializes to CSV and JSON containing the run id', () => {
    const payload = buildRunExportPayload(run);
    expect(toCsv(payload)).toContain('SIM-2026-08-17-001');
    expect(JSON.parse(toJson(payload)).records.length).toBe(18);
  });

  it('produces a filesystem-safe filename', () => {
    expect(runExportFilename(run, 'csv')).toBe('aura-run-sim-2026-08-17-001.csv');
  });
});
