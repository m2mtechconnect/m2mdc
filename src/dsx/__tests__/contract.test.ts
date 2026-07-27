import { describe, expect, it } from 'vitest';
import {
  DEFAULT_FRESHNESS_BUDGET_MS,
  DsxEventEnvelopeV1Schema,
  SUPPORTED_DSX_SCHEMA_VERSIONS,
  deriveDisplayState,
  isSupportedSchemaVersion,
  parseDsxEvent,
  type DsxEventEnvelopeV1,
} from '../contract';

const NOW = Date.parse('2026-07-27T12:00:00.000Z');

function validEnvelope(overrides: Partial<DsxEventEnvelopeV1> = {}): DsxEventEnvelopeV1 {
  return {
    schema_version: 1,
    event_id: '11111111-1111-4111-8111-111111111111',
    tenant_id: '22222222-2222-4222-8222-222222222222',
    site_id: '33333333-3333-4333-8333-333333333333',
    asset_id: '44444444-4444-4444-8444-444444444444',
    connection_id: '55555555-5555-4555-8555-555555555555',
    source_system: 'dsx_power',
    source_subject: 'dsx.power.rack.pdu.watts',
    event_type: 'telemetry',
    observed_at: new Date(NOW - 5_000).toISOString(),
    received_at: new Date(NOW - 4_000).toISOString(),
    value: 1234.5,
    unit: 'W',
    quality: 'validated',
    validation_state: 'accepted',
    mapping_state: 'mapped',
    ingestion_version: 'gateway@1.0.0-test',
    ...overrides,
  };
}

describe('DsxEventEnvelopeV1Schema', () => {
  it('accepts a well-formed envelope', () => {
    expect(DsxEventEnvelopeV1Schema.safeParse(validEnvelope()).success).toBe(true);
  });

  it('rejects unknown fields (strict)', () => {
    const r = DsxEventEnvelopeV1Schema.safeParse({
      ...validEnvelope(),
      extra_field: 'nope',
    });
    expect(r.success).toBe(false);
  });

  it('rejects malformed timestamps', () => {
    expect(
      DsxEventEnvelopeV1Schema.safeParse(validEnvelope({ observed_at: 'not-a-date' })).success,
    ).toBe(false);
  });

  it('rejects timestamps too far in the future', () => {
    const r = DsxEventEnvelopeV1Schema.safeParse(
      validEnvelope({ observed_at: new Date(Date.now() + 60 * 60_000).toISOString() }),
    );
    expect(r.success).toBe(false);
  });

  it('rejects unknown units', () => {
    const r = DsxEventEnvelopeV1Schema.safeParse(
      // @ts-expect-error deliberate
      validEnvelope({ unit: 'furlongs_per_fortnight' }),
    );
    expect(r.success).toBe(false);
  });

  it('accepts null value + null unit + null asset_id', () => {
    const r = DsxEventEnvelopeV1Schema.safeParse(
      validEnvelope({ value: null, unit: null, asset_id: null }),
    );
    expect(r.success).toBe(true);
  });
});

describe('parseDsxEvent — fail-closed', () => {
  it('returns not_an_object for primitives / arrays / null', () => {
    expect(parseDsxEvent(42)).toMatchObject({ ok: false, reason: 'not_an_object' });
    expect(parseDsxEvent(null)).toMatchObject({ ok: false, reason: 'not_an_object' });
    expect(parseDsxEvent([validEnvelope()])).toMatchObject({ ok: false, reason: 'not_an_object' });
  });

  it('rejects payloads with no schema_version', () => {
    const { schema_version: _sv, ...rest } = validEnvelope();
    expect(parseDsxEvent(rest)).toMatchObject({ ok: false, reason: 'missing_schema_version' });
  });

  it('rejects unsupported schema_version explicitly (never migrates)', () => {
    const r = parseDsxEvent({ ...validEnvelope(), schema_version: 999 });
    expect(r).toMatchObject({ ok: false, reason: 'unsupported_version', seenVersion: 999 });
  });

  it('rejects string schema_version', () => {
    expect(parseDsxEvent({ ...validEnvelope(), schema_version: '1' })).toMatchObject({
      ok: false,
      reason: 'unsupported_version',
    });
  });

  it('returns schema_invalid with Zod issues on structural failure', () => {
    const r = parseDsxEvent({ ...validEnvelope(), event_id: 'not-a-uuid' });
    expect(r.ok).toBe(false);
    if (!r.ok && r.reason === 'schema_invalid') {
      expect(Array.isArray(r.issues)).toBe(true);
      expect((r.issues ?? []).length).toBeGreaterThan(0);
    } else {
      throw new Error('expected schema_invalid');
    }
  });

  it('accepts and echoes the envelope on ok', () => {
    const env = validEnvelope();
    const r = parseDsxEvent(env);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.envelope.event_id).toBe(env.event_id);
  });
});

describe('isSupportedSchemaVersion', () => {
  it('accepts every listed version', () => {
    for (const v of SUPPORTED_DSX_SCHEMA_VERSIONS) expect(isSupportedSchemaVersion(v)).toBe(true);
  });
  it('rejects everything else', () => {
    expect(isSupportedSchemaVersion(0)).toBe(false);
    expect(isSupportedSchemaVersion(2)).toBe(false);
    expect(isSupportedSchemaVersion('1')).toBe(false);
    expect(isSupportedSchemaVersion(undefined)).toBe(false);
  });
});

describe('deriveDisplayState', () => {
  const opts = { connectionState: 'connected' as const, now: NOW };

  it('returns LIVE when everything holds', () => {
    expect(deriveDisplayState(validEnvelope(), opts)).toBe('LIVE');
  });

  it('returns STALE when observation exceeds freshness budget', () => {
    const env = validEnvelope({
      observed_at: new Date(NOW - DEFAULT_FRESHNESS_BUDGET_MS - 1_000).toISOString(),
    });
    expect(deriveDisplayState(env, opts)).toBe('STALE');
  });

  it('returns STALE when quality is degraded (never LIVE)', () => {
    expect(deriveDisplayState(validEnvelope({ quality: 'degraded' }), opts)).toBe('STALE');
  });

  it('returns INVALID for every non-accepted validation_state', () => {
    for (const vs of ['schema_invalid', 'signature_invalid', 'unit_invalid', 'timestamp_invalid'] as const) {
      expect(deriveDisplayState(validEnvelope({ validation_state: vs }), opts)).toBe('INVALID');
    }
  });

  it('returns INVALID when quality is invalid', () => {
    expect(deriveDisplayState(validEnvelope({ quality: 'invalid' }), opts)).toBe('INVALID');
  });

  it('returns UNAVAILABLE when mapping is unmapped or ambiguous', () => {
    expect(deriveDisplayState(validEnvelope({ mapping_state: 'unmapped' }), opts)).toBe('UNAVAILABLE');
    expect(deriveDisplayState(validEnvelope({ mapping_state: 'ambiguous' }), opts)).toBe('UNAVAILABLE');
  });

  it('returns UNAVAILABLE when value is null (never coerced to 0)', () => {
    expect(deriveDisplayState(validEnvelope({ value: null }), opts)).toBe('UNAVAILABLE');
  });

  it('returns UNAVAILABLE when connection is not connected', () => {
    for (const cs of ['connecting', 'degraded', 'disconnected', 'disabled'] as const) {
      expect(deriveDisplayState(validEnvelope(), { ...opts, connectionState: cs })).toBe('UNAVAILABLE');
    }
  });

  it('returns UNAVAILABLE when quality is unavailable', () => {
    expect(deriveDisplayState(validEnvelope({ quality: 'unavailable' }), opts)).toBe('UNAVAILABLE');
  });
});