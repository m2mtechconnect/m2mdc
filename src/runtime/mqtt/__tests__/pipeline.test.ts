import { describe, expect, it } from 'vitest';
import { evaluateMessage, type PipelineContext, type RuntimeMapping } from '../pipeline';
import { resolvePolicy } from '../policy';

const TENANT = '11111111-1111-4111-8111-111111111111';
const SITE = '22222222-2222-4222-8222-222222222222';
const CONNECTION = '33333333-3333-4333-8333-333333333333';
const TOPIC = `aura/${TENANT}/telemetry/crah-01/supply_temp`;

const mapping: RuntimeMapping = {
  id: '44444444-4444-4444-8444-444444444444',
  connection_id: CONNECTION,
  source_identifier: TOPIC,
  target_entity: 'CRAH-01',
  target_prim_path: '/World/Cooling/CRAH_01',
  target_property: 'supplyTemperatureC',
  target_facility_id: null,
  source_unit: 'degC',
  target_unit: 'degC',
  data_type: 'number',
  direction: 'inbound',
  active: true,
  validation_status: 'VALID',
  timestamp_rule: null,
};

const NOW = Date.parse('2026-01-01T12:00:00.000Z');

function envelope(overrides: Record<string, unknown> = {}) {
  const observed = new Date(NOW - 1_000).toISOString();
  return {
    schema_version: 1,
    event_id: '55555555-5555-4555-8555-555555555555',
    tenant_id: TENANT,
    site_id: SITE,
    asset_id: null,
    connection_id: CONNECTION,
    source_system: 'dsx_cooling',
    source_subject: TOPIC,
    event_type: 'telemetry',
    observed_at: observed,
    received_at: observed,
    value: 21.5,
    unit: 'degC',
    quality: 'validated',
    validation_state: 'accepted',
    mapping_state: 'mapped',
    ingestion_version: 'test',
    ...overrides,
  };
}

function context(overrides: Partial<PipelineContext> = {}): PipelineContext {
  return {
    connection_id: CONNECTION,
    tenant_id: TENANT,
    policy: resolvePolicy({ topic_allowlist: [`aura/${TENANT}/telemetry/#`], allow_wildcard_subscriptions: true }),
    contract: { id: '66666666-6666-4666-8666-666666666666', schema_type: 'dsx_event_envelope', schema_version: '1' },
    mappings: [mapping],
    brokerUrl: 'mqtt://127.0.0.1:1883',
    productionAuthorised: false,
    seenEventIds: new Set<string>(),
    nowMs: NOW,
    correlationId: 'corr-1',
    ...overrides,
  };
}

function message(body: string, topic = TOPIC) {
  return {
    topic,
    qos: 1,
    payload: new TextEncoder().encode(body),
    received_at: new Date(NOW).toISOString(),
  };
}

describe('evaluateMessage', () => {
  it('accepts a valid observation and resolves its mapping', () => {
    const result = evaluateMessage(message(JSON.stringify(envelope())), context());
    expect(result.outcome).toBe('ACCEPTED');
    if (result.outcome !== 'ACCEPTED') return;
    expect(result.value).toBe(21.5);
    expect(result.mapping.target_property).toBe('supplyTemperatureC');
  });

  it('labels a local broker observation as test evidence, never measured', () => {
    const result = evaluateMessage(message(JSON.stringify(envelope())), context());
    if (result.outcome !== 'ACCEPTED') throw new Error('expected acceptance');
    expect(result.provenance.provenance_class).toBe('TEST_EVIDENCE');
    expect(result.provenance.evidence_class).toBe('TEST_EVIDENCE');
  });

  it('converts within a unit family when the mapping targets another unit', () => {
    const result = evaluateMessage(
      message(JSON.stringify(envelope({ unit: 'kW', value: 2 }))),
      context({ mappings: [{ ...mapping, source_unit: 'kW', target_unit: 'W' }] }),
    );
    if (result.outcome !== 'ACCEPTED') throw new Error('expected acceptance');
    expect(result.value).toBe(2000);
    expect(result.conversion_applied).toBe(true);
  });

  it('rejects a payload above the size ceiling without parsing it', () => {
    const ctx = context({ policy: resolvePolicy({ topic_allowlist: [TOPIC], max_payload_bytes: 10 }) });
    const result = evaluateMessage(message(JSON.stringify(envelope())), ctx);
    expect(result.outcome).toBe('REJECTED');
    if (result.outcome === 'ACCEPTED') return;
    expect(result.reason).toBe('payload_too_large');
  });

  it('rejects a topic outside the allowlist', () => {
    const result = evaluateMessage(message(JSON.stringify(envelope()), `aura/${TENANT}/other/x`), context());
    if (result.outcome === 'ACCEPTED') throw new Error('expected rejection');
    expect(result.reason).toBe('topic_not_allowed');
  });

  it('rejects a topic belonging to another tenant', () => {
    const foreign = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
    const result = evaluateMessage(
      message(JSON.stringify(envelope()), `aura/${foreign}/telemetry/crah-01/supply_temp`),
      context(),
    );
    if (result.outcome === 'ACCEPTED') throw new Error('expected rejection');
    expect(result.reason).toBe('topic_not_allowed');
  });

  it('rejects malformed JSON', () => {
    const result = evaluateMessage(message('{not json'), context());
    if (result.outcome === 'ACCEPTED') throw new Error('expected rejection');
    expect(result.reason).toBe('malformed_json');
  });

  it('rejects an unknown unit as a schema violation', () => {
    const result = evaluateMessage(message(JSON.stringify(envelope({ unit: 'furlongs' }))), context());
    if (result.outcome === 'ACCEPTED') throw new Error('expected rejection');
    expect(result.reason).toBe('schema_invalid');
  });

  it('rejects an unsupported schema version rather than upgrading it', () => {
    const result = evaluateMessage(message(JSON.stringify(envelope({ schema_version: 99 }))), context());
    if (result.outcome === 'ACCEPTED') throw new Error('expected rejection');
    expect(result.reason).toBe('unsupported_version');
  });

  it('rejects a stale observation', () => {
    const stale = new Date(NOW - 60 * 60_000).toISOString();
    const result = evaluateMessage(
      message(JSON.stringify(envelope({ observed_at: stale, received_at: stale }))),
      context(),
    );
    if (result.outcome === 'ACCEPTED') throw new Error('expected rejection');
    expect(result.reason).toBe('stale');
  });

  it('flags a replayed event_id as a duplicate', () => {
    const body = JSON.stringify(envelope());
    const seen = new Set(['55555555-5555-4555-8555-555555555555']);
    const result = evaluateMessage(message(body), context({ seenEventIds: seen }));
    expect(result.outcome).toBe('DUPLICATE');
  });

  it('refuses an envelope carrying a foreign tenant', () => {
    const result = evaluateMessage(
      message(JSON.stringify(envelope({ tenant_id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa' }))),
      context(),
    );
    if (result.outcome === 'ACCEPTED') throw new Error('expected rejection');
    expect(result.reason).toBe('tenant_mismatch');
  });

  it('does not write a property when the mapping is inactive', () => {
    const result = evaluateMessage(
      message(JSON.stringify(envelope())),
      context({ mappings: [{ ...mapping, active: false }] }),
    );
    if (result.outcome === 'ACCEPTED') throw new Error('expected rejection');
    expect(result.reason).toBe('mapping_not_active');
  });

  it('rejects a null value instead of coercing it to zero', () => {
    const result = evaluateMessage(message(JSON.stringify(envelope({ value: null }))), context());
    if (result.outcome === 'ACCEPTED') throw new Error('expected rejection');
    expect(result.reason).toBe('missing_value');
  });

  it('refuses a cross-family unit conversion', () => {
    const result = evaluateMessage(
      message(JSON.stringify(envelope())),
      context({ mappings: [{ ...mapping, source_unit: 'degC', target_unit: 'kW' }] }),
    );
    if (result.outcome === 'ACCEPTED') throw new Error('expected rejection');
    expect(result.reason).toBe('unit_incompatible');
  });
});