/**
 * The single validating ingestion path for MQTT runtime messages.
 *
 * Pure: it receives a raw broker message plus the connection's contract,
 * policy and active mappings, and returns the decision that must be written
 * to the evidence tables. It never writes, never connects, and never invents
 * a value. Every rejection carries a machine-readable reason.
 */
import { parseDsxEvent, type DsxEventEnvelope } from '../../dsx/contract';
import type { MqttRuntimePolicy } from './policy';
import { topicAllowed } from './policy';
import { convertUnit } from './units';
import { classifyProvenance, type ProvenanceDecision } from './provenance';

export type RejectionReason =
  | 'payload_too_large'
  | 'topic_not_allowed'
  | 'malformed_json'
  | 'schema_invalid'
  | 'unsupported_version'
  | 'not_an_object'
  | 'missing_schema_version'
  | 'unit_invalid'
  | 'tenant_mismatch'
  | 'connection_mismatch'
  | 'stale'
  | 'timestamp_invalid'
  | 'missing_value'
  | 'unknown_mapping'
  | 'mapping_not_active'
  | 'unit_incompatible';

export interface RuntimeMapping {
  id: string;
  connection_id: string;
  source_identifier: string;
  target_entity: string | null;
  target_prim_path: string | null;
  target_property: string | null;
  target_facility_id: string | null;
  source_unit: string | null;
  target_unit: string | null;
  data_type: string;
  direction: string;
  active: boolean;
  validation_status: string;
  timestamp_rule: string | null;
}

export interface RuntimeContract {
  id: string;
  schema_type: string;
  schema_version: string;
}

export interface RawMessage {
  topic: string;
  qos: number;
  payload: Uint8Array;
  received_at: string;
}

export interface PipelineContext {
  connection_id: string;
  tenant_id: string | null;
  policy: MqttRuntimePolicy;
  contract: RuntimeContract | null;
  mappings: RuntimeMapping[];
  brokerUrl: string;
  productionAuthorised: boolean;
  /** event_ids already accepted on this connection (replay/duplicate guard). */
  seenEventIds: ReadonlySet<string>;
  nowMs: number;
  correlationId: string;
}

export interface AcceptedDecision {
  outcome: 'ACCEPTED';
  topic: string;
  qos: number;
  payload_bytes: number;
  payload_hash: string;
  event_id: string;
  observed_at: string;
  envelope: DsxEventEnvelope;
  contract_id: string | null;
  mapping: RuntimeMapping;
  value: number;
  unit: string | null;
  conversion_applied: boolean;
  provenance: ProvenanceDecision;
  transport_latency_ms: number;
  correlation_id: string;
}

export interface RejectedDecision {
  outcome: 'REJECTED' | 'DUPLICATE';
  topic: string;
  qos: number;
  payload_bytes: number;
  payload_hash: string;
  event_id: string | null;
  observed_at: string | null;
  reason: RejectionReason | 'duplicate';
  detail: string;
  contract_id: string | null;
  mapping_id: string | null;
  correlation_id: string;
}

export type PipelineDecision = AcceptedDecision | RejectedDecision;

/** FNV-1a: stable, dependency-free content identity for evidence rows. */
export function payloadHash(bytes: Uint8Array): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < bytes.length; i += 1) {
    h ^= bytes[i];
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h.toString(16).padStart(8, '0');
}

function reject(
  base: { topic: string; qos: number; bytes: number; hash: string; correlationId: string; contractId: string | null },
  reason: RejectedDecision['reason'],
  detail: string,
  extra: { event_id?: string | null; observed_at?: string | null; mapping_id?: string | null; outcome?: 'REJECTED' | 'DUPLICATE' } = {},
): RejectedDecision {
  return {
    outcome: extra.outcome ?? 'REJECTED',
    topic: base.topic,
    qos: base.qos,
    payload_bytes: base.bytes,
    payload_hash: base.hash,
    event_id: extra.event_id ?? null,
    observed_at: extra.observed_at ?? null,
    reason,
    detail,
    contract_id: base.contractId,
    mapping_id: extra.mapping_id ?? null,
    correlation_id: base.correlationId,
  };
}

export function evaluateMessage(message: RawMessage, ctx: PipelineContext): PipelineDecision {
  const bytes = message.payload.length;
  const hash = payloadHash(message.payload);
  const base = {
    topic: message.topic,
    qos: message.qos,
    bytes,
    hash,
    correlationId: ctx.correlationId,
    contractId: ctx.contract?.id ?? null,
  };

  if (bytes > ctx.policy.max_payload_bytes) {
    return reject(base, 'payload_too_large', `${bytes} bytes exceeds the ${ctx.policy.max_payload_bytes} byte limit`);
  }
  if (!topicAllowed(message.topic, ctx.policy, ctx.tenant_id)) {
    return reject(base, 'topic_not_allowed', `topic "${message.topic}" is outside the authorised allowlist or tenant namespace`);
  }
  if (!ctx.contract) {
    return reject(base, 'schema_invalid', 'no data contract is selected for this connection');
  }

  let json: unknown;
  try {
    json = JSON.parse(new TextDecoder().decode(message.payload));
  } catch (error) {
    return reject(base, 'malformed_json', error instanceof Error ? error.message : 'payload is not JSON');
  }

  const raw = (json ?? {}) as Record<string, unknown>;
  const rawEventId = typeof raw.event_id === 'string' ? raw.event_id : null;
  const rawObservedAt = typeof raw.observed_at === 'string' ? raw.observed_at : null;

  const parsed = parseDsxEvent(json);
  if (parsed.ok !== true) {
    const failure = parsed as Extract<typeof parsed, { ok: false }>;
    const detail = failure.reason === 'schema_invalid'
      ? (failure.issues ?? []).map((i) => `${i.path.join('.')}: ${i.message}`).join('; ')
      : failure.reason;
    return reject(base, failure.reason as RejectionReason, detail || failure.reason, {
      event_id: rawEventId,
      observed_at: rawObservedAt,
    });
  }

  const env = parsed.envelope;
  const meta = { event_id: env.event_id, observed_at: env.observed_at };

  if (ctx.tenant_id && env.tenant_id !== ctx.tenant_id) {
    return reject(base, 'tenant_mismatch', 'envelope tenant does not match the connection tenant', meta);
  }
  if (env.connection_id !== ctx.connection_id) {
    return reject(base, 'connection_mismatch', 'envelope connection_id does not match the receiving connection', meta);
  }
  if (ctx.seenEventIds.has(env.event_id)) {
    return reject(base, 'duplicate', 'event_id was already accepted on this connection', { ...meta, outcome: 'DUPLICATE' });
  }

  const observedMs = Date.parse(env.observed_at);
  if (observedMs - ctx.nowMs > ctx.policy.max_clock_skew_ms) {
    return reject(base, 'timestamp_invalid', 'observed_at is further in the future than the tolerated clock skew', meta);
  }
  const age = ctx.nowMs - observedMs;
  if (age > ctx.policy.max_observation_age_ms) {
    return reject(base, 'stale', `observation is ${Math.round(age / 1000)}s old, beyond the freshness budget`, meta);
  }

  const mapping = ctx.mappings.find(
    (m) => m.connection_id === ctx.connection_id && m.source_identifier === env.source_subject,
  );
  if (!mapping) {
    return reject(base, 'unknown_mapping', `no mapping declares source "${env.source_subject}"`, meta);
  }
  if (!mapping.active || mapping.validation_status !== 'VALID') {
    return reject(base, 'mapping_not_active', 'the matching mapping is not active and validated', { ...meta, mapping_id: mapping.id });
  }
  if (env.value === null || typeof env.value !== 'number') {
    return reject(base, 'missing_value', 'observation carried no numeric value; no property is written', { ...meta, mapping_id: mapping.id });
  }

  const sourceUnit = mapping.source_unit ?? env.unit ?? null;
  const conversion = convertUnit(env.value, sourceUnit, mapping.target_unit);
  if (conversion.ok !== true) {
    return reject(base, 'unit_incompatible', conversion.reason, { ...meta, mapping_id: mapping.id });
  }

  const provenance = classifyProvenance({
    brokerUrl: ctx.brokerUrl,
    productionAuthorised: ctx.productionAuthorised,
    quality: env.quality,
    observedAt: env.observed_at,
    nowMs: ctx.nowMs,
    maxAgeMs: ctx.policy.max_observation_age_ms,
  });

  return {
    outcome: 'ACCEPTED',
    topic: message.topic,
    qos: message.qos,
    payload_bytes: bytes,
    payload_hash: hash,
    event_id: env.event_id,
    observed_at: env.observed_at,
    envelope: env,
    contract_id: ctx.contract.id,
    mapping,
    value: conversion.value,
    unit: mapping.target_unit,
    conversion_applied: conversion.applied,
    provenance,
    transport_latency_ms: Math.max(0, Date.parse(message.received_at) - observedMs),
    correlation_id: ctx.correlationId,
  };
}

/** Mapping coverage across the active mappings of a connection. */
export function mappingCoverage(mappings: RuntimeMapping[]): { total: number; active: number; exercised: number } {
  return {
    total: mappings.length,
    active: mappings.filter((m) => m.active).length,
    exercised: 0,
  };
}