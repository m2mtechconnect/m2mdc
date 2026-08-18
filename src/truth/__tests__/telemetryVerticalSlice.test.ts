/**
 * Phase 3.6 - the telemetry-to-evidence vertical slice, proven end to end in
 * the deterministic layers.
 *
 * Chain under test:
 *   persisted twin_property_values row
 *     -> mapReadingRow (typed reading with writer provenance)
 *     -> resolveReading (fail-closed data-mode contract)
 *     -> canonical telemetry snapshot + hash (identical client and edge side)
 *     -> CanonicalRun carrying that snapshot hash
 *     -> canonical evidence record and exports carrying the same citation
 *
 * The one link this suite cannot execute is the database read itself, which
 * is RLS-scoped and belongs to scripts/phase3/external-validation.mjs.
 */
import { describe, expect, it } from 'vitest';
import {
  aggregateMode,
  mapReadingRow,
  resolveReading,
  type ResolvedReading,
} from '@/telemetry/twinTelemetryApi';
import { hashCanonical } from '@/simulation/orchestrator/canonical';
import { canonicalHash as edgeHash } from '../../../supabase/functions/_shared/canonicalHash.ts';
import { buildCanonicalEvidenceRecord, evidenceToCsv, evidenceToJson } from '../canonicalEvidence';
import type { CanonicalRun } from '../canonicalRun';

const OBSERVED = '2026-02-10T12:00:00.000Z';
const NOW = Date.parse(OBSERVED) + 5_000;

function row(overrides: Record<string, unknown> = {}) {
  return {
    id: '11111111-1111-4111-8111-111111111111',
    target_entity: 'rack-a1',
    target_prim_path: '/World/DataHall/RackA1',
    target_property: 'inlet_temperature_c',
    value_numeric: 24.5,
    value_text: null,
    unit: 'degC',
    observed_at: OBSERVED,
    received_at: OBSERVED,
    provenance_class: 'MEASURED',
    provenance_reason: null,
    source_connection_id: '22222222-2222-4222-8222-222222222222',
    source_message_id: '33333333-3333-4333-8333-333333333333',
    source_mapping_id: '44444444-4444-4444-8444-444444444444',
    correlation_id: 'corr-1',
    ...overrides,
  };
}

/** The snapshot the orchestrator hashes as a run's telemetry input. */
function telemetrySnapshot(readings: ResolvedReading[]) {
  return {
    schema: 'aura-telemetry-snapshot-v1',
    readings: readings
      .map((r) => ({
        recordTable: r.recordTable,
        recordId: r.id,
        entity: r.targetEntity,
        primPath: r.targetPrimPath,
        property: r.targetProperty,
        value: r.valueNumeric,
        unit: r.unit,
        observedAt: r.observedAt,
        mode: r.mode,
        freshness: r.freshness,
        sourceConnectionId: r.sourceConnectionId,
        sourceMessageId: r.sourceMessageId,
      }))
      .sort((a, b) => (a.recordId < b.recordId ? -1 : 1)),
  };
}

describe('telemetry to evidence vertical slice', () => {
  it('maps a persisted row into a reading that keeps its writer provenance', () => {
    const reading = mapReadingRow(row());
    expect(reading.recordTable).toBe('twin_property_values');
    expect(reading.id).toBe('11111111-1111-4111-8111-111111111111');
    expect(reading.sourceConnectionId).toBe('22222222-2222-4222-8222-222222222222');
    expect(reading.sourceMessageId).toBe('33333333-3333-4333-8333-333333333333');
    expect(reading.valueNumeric).toBe(24.5);
  });

  it('fails closed: a measured reading is not live without a verified gateway', () => {
    const resolved = resolveReading(mapReadingRow(row()), { now: NOW, liveVerified: false });
    expect(resolved.mode).toBe('UNAVAILABLE');
    expect(resolved.modeReason).toMatch(/no verified live gateway/i);
  });

  it('never silently downgrades an unavailable live source into a simulated one', () => {
    const stale = resolveReading(
      mapReadingRow(row({ observed_at: '2020-01-01T00:00:00.000Z' })),
      { now: NOW, liveVerified: true },
    );
    expect(stale.mode).not.toBe('SIMULATED');
    expect(stale.mode).toBe('UNAVAILABLE');
  });

  it('labels harness output as test evidence, never as an operational reading', () => {
    const resolved = resolveReading(
      mapReadingRow(row({ provenance_class: 'TEST_EVIDENCE' })),
      { now: NOW, liveVerified: true },
    );
    expect(resolved.mode).toBe('UNAVAILABLE');
    expect(resolved.modeReason).toMatch(/acceptance harness/i);
  });

  it('aggregates a mixed set to the weakest honest claim', () => {
    const readings = [
      resolveReading(mapReadingRow(row()), { now: NOW }),
      resolveReading(
        mapReadingRow(row({ id: '55555555-5555-4555-8555-555555555555', provenance_class: 'SIMULATED' })),
        { now: NOW },
      ),
    ];
    expect(aggregateMode(readings)).toBe('UNAVAILABLE');
  });

  it('hashes the telemetry snapshot identically in the browser and the edge runtime', async () => {
    const readings = [
      resolveReading(mapReadingRow(row()), { now: NOW }),
      resolveReading(
        mapReadingRow(row({ id: '55555555-5555-4555-8555-555555555555', provenance_class: 'REPLAYED' })),
        { now: NOW },
      ),
    ];
    const snapshot = telemetrySnapshot(readings);
    const client = hashCanonical(snapshot);
    expect(await edgeHash(snapshot)).toBe(client);

    // Reading order must not change the hash; a changed value must.
    const reordered = { ...snapshot, readings: [...snapshot.readings].reverse().sort((a, b) => (a.recordId < b.recordId ? -1 : 1)) };
    expect(hashCanonical(reordered)).toBe(client);
    const mutated = {
      ...snapshot,
      readings: snapshot.readings.map((r, i) => (i === 0 ? { ...r, value: 25.5 } : r)),
    };
    expect(hashCanonical(mutated)).not.toBe(client);
  });

  it('carries the snapshot hash all the way into the evidence record and exports', () => {
    const readings = [resolveReading(mapReadingRow(row()), { now: NOW })];
    const snapshotHash = hashCanonical(telemetrySnapshot(readings));
    const run = {
      id: '66666666-6666-4666-8666-666666666666',
      tenantId: 'tenant-a',
      twinId: 'twin-a',
      scenarioKey: 'cooling_degradation',
      scenarioName: 'Cooling degradation',
      scenarioType: 'thermal',
      lifecycleStatus: 'succeeded',
      runIntent: 'preview',
      verificationLevel: 'client-generated-unverified',
      requestedProvider: 'aura-local',
      actualProvider: 'aura-local',
      providerVersion: '1.0.0',
      requestedExecutionClass: 'analytical',
      outcomeExecutionClass: 'analytical',
      seed: '42',
      prngVersion: 'mulberry32-v1',
      seedDerivationVersion: 'aura-seed-v1',
      canonicalSchemaVersion: 'aura-canonical-v1',
      inputHash: 'a'.repeat(64),
      configurationHash: 'b'.repeat(64),
      outputHash: 'c'.repeat(64),
      telemetrySnapshotId: '11111111-1111-4111-8111-111111111111',
      telemetrySnapshotHash: snapshotHash,
      externalJobId: null,
      failureCode: null,
      failureMessage: null,
      serverCreatedAt: OBSERVED,
      startedAt: OBSERVED,
      finishedAt: OBSERVED,
      measuredDurationMs: 120,
      createdByUserId: 'user-a',
      retryOfRunId: null,
      attempt: 1,
      baselineKpis: {},
      finalKpis: { pue: 1.32 },
      metricProvenance: {},
      recordCitation: 'simulation_runs:66666666-6666-4666-8666-666666666666',
    } as unknown as CanonicalRun;

    const record = buildCanonicalEvidenceRecord(run);
    const field = record.fields.find((f) => f.key === 'telemetry_snapshot_hash');
    expect(field?.value).toBe(snapshotHash);
    expect(evidenceToJson(record)).toContain(snapshotHash);
    expect(evidenceToCsv(record)).toContain(snapshotHash);
    expect(evidenceToJson(record)).toContain('simulation_runs:66666666-6666-4666-8666-666666666666');
  });
});
