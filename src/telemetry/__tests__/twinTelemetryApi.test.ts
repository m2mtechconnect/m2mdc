import { describe, it, expect } from 'vitest';
import { LIVE_MODE_ENABLED } from '@/dsx/modes';
import {
  aggregateMode,
  fetchFacilityTelemetry,
  formatReadingValue,
  isFacilityRecordId,
  mapReadingRow,
  readingsForAsset,
  resolveReading,
  type ProvenanceClass,
  type ResolvedReading,
  type TwinPropertyReading,
} from '../twinTelemetryApi';

const FACILITY = '65bdd602-165f-4a1b-a3e5-3011451bc823';
const NOW = Date.parse('2026-08-18T12:00:00Z');

function reading(overrides: Partial<TwinPropertyReading> = {}): TwinPropertyReading {
  return {
    id: 'tpv-1',
    targetEntity: 'rack-a-01',
    targetPrimPath: '/World/Hall/Rack_A_01',
    targetProperty: 'inletTemperatureC',
    valueNumeric: 22.5,
    valueText: null,
    unit: 'C',
    observedAt: '2026-08-18T11:59:30Z',
    receivedAt: '2026-08-18T11:59:31Z',
    provenanceClass: 'MEASURED',
    provenanceReason: null,
    sourceConnectionId: 'conn-1',
    sourceMessageId: 'msg-1',
    sourceMappingId: 'map-1',
    correlationId: 'corr-1',
    recordTable: 'twin_property_values',
    ...overrides,
  };
}

function fakeClient(rows: unknown[] | null, error?: string) {
  const calls: Array<{ table: string; filters: Record<string, unknown>; limit: number; order: string }> = [];
  const client = {
    from(table: string) {
      const call = { table, filters: {} as Record<string, unknown>, limit: 0, order: '' };
      const builder: any = {
        select: () => builder,
        eq: (column: string, value: unknown) => {
          call.filters[column] = value;
          return builder;
        },
        order: (column: string) => {
          call.order = column;
          return builder;
        },
        limit: (value: number) => {
          call.limit = value;
          calls.push(call);
          return Promise.resolve(error ? { data: null, error: new Error(error) } : { data: rows ?? [], error: null });
        },
      };
      return builder;
    },
  };
  return { client, calls };
}

describe('isFacilityRecordId', () => {
  it('accepts a uuid and rejects the synthetic reference-facility ids', () => {
    expect(isFacilityRecordId(FACILITY)).toBe(true);
    expect(isFacilityRecordId('reference-hall')).toBe(false);
    expect(isFacilityRecordId(null)).toBe(false);
  });
});

describe('mapReadingRow', () => {
  it('carries provenance through and defaults an unknown class to UNVERIFIED', () => {
    const mapped = mapReadingRow({
      id: 'tpv-9',
      target_entity: 'crah-2',
      target_property: 'supplyAirC',
      value_numeric: 18,
      provenance_class: 'not-a-class',
      source_message_id: 'msg-9',
    });
    expect(mapped.provenanceClass).toBe('UNVERIFIED');
    expect(mapped.sourceMessageId).toBe('msg-9');
    expect(mapped.recordTable).toBe('twin_property_values');
    expect(mapped.valueText).toBeNull();
  });
});

describe('resolveReading - data-mode contract', () => {
  it('refuses to present a measured reading as live while no gateway is verified', () => {
    const resolved = resolveReading(reading(), { now: NOW, liveVerified: false });
    expect(resolved.mode).toBe('UNAVAILABLE');
    expect(resolved.freshness).toBe('fresh');
  });

  it('keeps measured readings unavailable while the platform disables LIVE', () => {
    // The platform-level switch outranks per-request verification. When it is
    // finally enabled, this assertion is what forces the freshness path below
    // to be re-read rather than silently changing meaning.
    const resolved = resolveReading(reading(), { now: NOW, liveVerified: true });
    expect(resolved.mode).toBe(LIVE_MODE_ENABLED ? 'LIVE' : 'UNAVAILABLE');
  });

  it('never downgrades an unavailable live source into a simulated one', () => {
    const stale = resolveReading(reading({ observedAt: '2026-08-18T09:00:00Z' }), { now: NOW, liveVerified: true });
    expect(stale.freshness).toBe('stale');
    expect(stale.mode).toBe('UNAVAILABLE');
    expect(stale.mode).not.toBe('SIMULATED');
  });

  it('reports each remaining provenance class as itself', () => {
    const expected: Record<Exclude<ProvenanceClass, 'MEASURED'>, string> = {
      REPLAYED: 'REPLAYED',
      SIMULATED: 'SIMULATED',
      TEST_EVIDENCE: 'UNAVAILABLE',
      UNVERIFIED: 'UNAVAILABLE',
    };
    for (const [provenanceClass, mode] of Object.entries(expected)) {
      const resolved = resolveReading(reading({ provenanceClass: provenanceClass as ProvenanceClass }), { now: NOW });
      expect(resolved.mode).toBe(mode);
      expect(resolved.modeReason.length).toBeGreaterThan(0);
    }
  });
});

describe('aggregateMode', () => {
  const as = (mode: string) => ({ mode } as ResolvedReading);

  it('is UNAVAILABLE with no readings at all', () => {
    expect(aggregateMode([])).toBe('UNAVAILABLE');
  });

  it('lets the weakest claim decide, so a mixed set is never over-stated', () => {
    expect(aggregateMode([as('LIVE'), as('SIMULATED')])).toBe('SIMULATED');
    expect(aggregateMode([as('LIVE'), as('UNAVAILABLE')])).toBe('UNAVAILABLE');
    expect(aggregateMode([as('LIVE'), as('REPLAYED')])).toBe('REPLAYED');
    expect(aggregateMode([as('LIVE'), as('LIVE')])).toBe('LIVE');
  });
});

describe('readingsForAsset', () => {
  const rows = [
    resolveReading(reading({ id: 'a', targetEntity: 'rack-a-01' }), { now: NOW }),
    resolveReading(reading({ id: 'b', targetEntity: 'RACK-A-02', targetPrimPath: '/World/Hall/Rack_A_02' }), { now: NOW }),
    resolveReading(reading({ id: 'c', targetEntity: 'crah-1', targetPrimPath: null }), { now: NOW }),
  ];

  it('matches on entity key or prim path, case-insensitively', () => {
    expect(readingsForAsset(rows, { id: 'rack-a-01' }).map((r) => r.id)).toEqual(['a']);
    expect(readingsForAsset(rows, { id: 'x', name: '/World/Hall/Rack_A_02' }).map((r) => r.id)).toEqual(['b']);
    expect(readingsForAsset(rows, { id: 'RACK-A-02' }).map((r) => r.id)).toEqual(['b']);
  });

  it('does not attribute a reading to a merely similar asset', () => {
    expect(readingsForAsset(rows, { id: 'rack-a' })).toEqual([]);
    expect(readingsForAsset(rows, { id: 'crah' })).toEqual([]);
  });
});

describe('formatReadingValue', () => {
  it('appends the unit for numeric values and falls back to text', () => {
    expect(formatReadingValue(reading({ valueNumeric: 1234.5678, unit: 'kW' }))).toBe('1,234.568 kW');
    expect(formatReadingValue(reading({ valueNumeric: null, valueText: 'OPEN' }))).toBe('OPEN');
    expect(formatReadingValue(reading({ valueNumeric: null, valueText: null }))).toBe('-');
  });
});

describe('fetchFacilityTelemetry', () => {
  it('issues no query for a non-record facility id', async () => {
    const { client, calls } = fakeClient([]);
    const response = await fetchFacilityTelemetry('reference-hall', { client });
    expect(calls).toHaveLength(0);
    expect(response.queriedFacilityId).toBeNull();
    expect(response.mode).toBe('UNAVAILABLE');
  });

  it('scopes the query to the facility and orders by observation time', async () => {
    const { client, calls } = fakeClient([
      { id: 'tpv-1', target_entity: 'rack-a-01', target_property: 'inletTemperatureC', value_numeric: 22.5, provenance_class: 'REPLAYED', observed_at: '2026-08-18T11:59:30Z' },
    ]);
    const response = await fetchFacilityTelemetry(FACILITY, { client, limit: 50, now: NOW });
    expect(calls[0].table).toBe('twin_property_values');
    expect(calls[0].filters).toEqual({ facility_id: FACILITY });
    expect(calls[0].order).toBe('observed_at');
    expect(calls[0].limit).toBe(50);
    expect(response.readings[0].mode).toBe('REPLAYED');
    expect(response.mode).toBe('REPLAYED');
  });

  it('surfaces a read failure instead of returning an empty success', async () => {
    const { client } = fakeClient(null, 'permission denied for table twin_property_values');
    const response = await fetchFacilityTelemetry(FACILITY, { client });
    expect(response.error).toContain('permission denied');
    expect(response.readings).toEqual([]);
    expect(response.mode).toBe('UNAVAILABLE');
  });
});
