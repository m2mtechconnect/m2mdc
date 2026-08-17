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
  baseline: { pue: 1.4, itLoadKw: 1000, coolingLoadKw: 400, waterUsageLpm: 20, carbonIntensity: 30, energyCostPerMwh: 60, thermalMarginC: 5, availabilityPct: 99.99 },
  result: { pue: 1.32, itLoadKw: 1000, coolingLoadKw: 320, waterUsageLpm: 18, carbonIntensity: 28, energyCostPerMwh: 58, thermalMarginC: 6, availabilityPct: 99.99 },
  events: [],
  recommendations: [],
  decisions: {},
};

describe('workspace run export', () => {
  it('exports baseline and scenario KPIs as simulated records', () => {
    const payload = buildRunExportPayload(run);
    expect(payload.records.length).toBe(16);
    expect(payload.records.every((r) => r.provenance === 'simulated')).toBe(true);
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
    expect(JSON.parse(toJson(payload)).records.length).toBe(16);
  });

  it('produces a filesystem-safe filename', () => {
    expect(runExportFilename(run, 'csv')).toBe('aura-run-sim-2026-08-17-001.csv');
  });
});
