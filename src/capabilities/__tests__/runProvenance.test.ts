import { describe, it, expect, beforeEach } from 'vitest';
import { resolveRunProvenance, formatCalculatedAt, getRunProvenance, RUN_UNAVAILABLE_LABEL } from '../runProvenance';
import { evidenceBoundaryNotice } from '../operatingState';
import { useSimulationSnapshotStore } from '@/stores/simulationSnapshotStore';
import { toCsv, toJson, toPrintHtml, buildExportOperatingState } from '@/lib/provenance/exporters';

describe('run provenance (Stage 5A)', () => {
  beforeEach(() => {
    useSimulationSnapshotStore.setState({ currentSnapshot: null, snapshotHistory: [] });
  });

  it('reports unavailable when no simulation run exists', () => {
    const p = getRunProvenance();
    expect(p.available).toBe(false);
    expect(p.runId).toBeNull();
    expect(formatCalculatedAt(p.calculatedAt)).toBe(RUN_UNAVAILABLE_LABEL);
    expect(evidenceBoundaryNotice(p.runId)).toContain('No simulation run has been recorded');
  });

  it('labels a legacy snapshot as an unpersisted preview, never authoritative', () => {
    const p = resolveRunProvenance({
      blueprintId: 'bp', blueprintVersion: '1',
      simulationRunId: 'SIM-2026-08-07-001',
      capturedAt: '2026-08-07T10:00:00.000Z',
      config: {} as never,
    });
    expect(p).toEqual({
      runId: 'SIM-2026-08-07-001',
      calculatedAt: '2026-08-07T10:00:00.000Z',
      available: true,
      source: 'compatibility-snapshot',
      persistenceLabel: 'Unpersisted preview',
    });
  });

  it('never fabricates provenance from an incomplete snapshot', () => {
    expect(resolveRunProvenance({ simulationRunId: '', capturedAt: '' } as never).available).toBe(false);
  });
});

describe('export truth block (Stage 5A)', () => {
  const payload = {
    schemaVersion: '1.0.0' as const,
    surface: 'test.surface',
    title: 'Test',
    generatedAt: '2026-08-07T10:00:00.000Z',
    records: [],
  };

  it('states mode, NVIDIA and live usage in every format', () => {
    const os = buildExportOperatingState();
    expect(os.nvidiaRuntimeUsed).toBe('No');
    expect(os.liveFacilityDataUsed).toBe('No');

    const csv = toCsv(payload);
    expect(csv).toContain('operating_mode=SIMULATED');
    expect(csv).toContain('nvidia_runtime_used=No');
    expect(csv).toContain('live_facility_data_used=No');
    expect(csv).toContain('human_review=Not reviewed');

    const json = JSON.parse(toJson(payload));
    expect(json.operatingState.operatingMode).toBe('SIMULATED');
    expect(json.operatingState.humanReviewStatus).toBe('Not reviewed');
    expect(json.operatingState.knownLimitations).toMatch(/synthetic inputs/);

    const html = toPrintHtml(payload);
    expect(html).toContain('data-export-operating-state');
    expect(html).toContain('data-field="nvidia-runtime-used">No<');
    expect(html).toContain('data-field="simulation-run-id">Unavailable<');
  });

  it('does not label exports as live or NVIDIA generated', () => {
    const html = toPrintHtml(payload);
    expect(html).not.toMatch(/SimReady-validated asset\b(?!\s+or)/);
    expect(html).not.toMatch(/OpenUSD-backed/);
    expect(html).not.toMatch(/NVIDIA-generated/);
    expect(html).toContain('data-field="live-facility-data-used">No<');
  });
});
