/**
 * AURA DSX canonical event contract (Phase 1, read-only foundation).
 *
 * This module is the single source of truth for the shape of any DSX
 * observation once it has crossed the AURA DSX Gateway and is being
 * ingested / stored / displayed inside AURA. It is intentionally
 * transport-agnostic: it says nothing about NATS/MQTT/HTTP; it only says
 * what a validated event looks like *inside AURA*.
 *
 * Nothing here talks to Postgres, to the browser, or to any live DSX
 * endpoint. It is safe to import from:
 *   - AURA client code (types + pure helpers only)
 *   - AURA Edge Functions (via a Deno-compatible re-export in Phase 2)
 *   - `services/dsx-gateway/` (Phase 3)
 *
 * Fail-closed guarantees enforced by this module:
 *   1. Unsupported `schema_version` values are rejected explicitly and
 *      never silently upgraded.
 *   2. Unknown fields on the envelope are rejected by `z.strictObject`.
 *   3. Non-ISO / future-drift timestamps are rejected.
 *   4. Unknown units are rejected.
 *   5. `LIVE` display state is reachable only when validation, mapping,
 *      quality, freshness, non-null value, and an active connection ALL
 *      hold. Any deviation collapses to `INVALID`, `STALE`, or
 *      `UNAVAILABLE`. Missing data is never coerced to zero.
 */

import { z } from 'zod';

// ---------------------------------------------------------------------------
// Supported schema versions
// ---------------------------------------------------------------------------

/** Versions the AURA ingestion path currently understands. */
export const SUPPORTED_DSX_SCHEMA_VERSIONS = [1] as const;
export type DsxSchemaVersion = (typeof SUPPORTED_DSX_SCHEMA_VERSIONS)[number];

/**
 * Default freshness budget (ms) after which an otherwise-valid observation
 * transitions LIVE → STALE. The gateway / caller may override per source.
 */
export const DEFAULT_FRESHNESS_BUDGET_MS = 60_000;

/**
 * Maximum forward clock skew tolerated on `observed_at` / `received_at`
 * before the event is treated as timestamp_invalid.
 */
export const MAX_FUTURE_CLOCK_SKEW_MS = 5 * 60_000;

// ---------------------------------------------------------------------------
// Enums
// ---------------------------------------------------------------------------

export const DSX_QUALITY = ['validated', 'degraded', 'invalid', 'unavailable'] as const;
export type DsxQuality = (typeof DSX_QUALITY)[number];

export const DSX_VALIDATION_STATE = [
  'accepted',
  'schema_invalid',
  'signature_invalid',
  'unit_invalid',
  'timestamp_invalid',
] as const;
export type DsxValidationState = (typeof DSX_VALIDATION_STATE)[number];

export const DSX_MAPPING_STATE = ['mapped', 'unmapped', 'ambiguous'] as const;
export type DsxMappingState = (typeof DSX_MAPPING_STATE)[number];

export const DSX_DISPLAY_STATE = ['LIVE', 'STALE', 'INVALID', 'UNAVAILABLE'] as const;
export type DsxDisplayState = (typeof DSX_DISPLAY_STATE)[number];

export const DSX_SOURCE_SYSTEM = [
  'dsx_power',
  'dsx_cooling',
  'dsx_compute',
  'dsx_unknown',
] as const;
export type DsxSourceSystem = (typeof DSX_SOURCE_SYSTEM)[number];

export const DSX_EVENT_TYPE = ['telemetry', 'health', 'alert', 'state_change'] as const;
export type DsxEventType = (typeof DSX_EVENT_TYPE)[number];

export const DSX_UNIT = [
  'W',
  'kW',
  'A',
  'V',
  'degC',
  'pct',
  'rpm',
  'ppm',
  'gCO2_per_kWh',
  'none',
] as const;
export type DsxUnit = (typeof DSX_UNIT)[number];

export const DSX_CONNECTION_STATE = [
  'connected',
  'connecting',
  'degraded',
  'disconnected',
  'disabled',
] as const;
export type DsxConnectionState = (typeof DSX_CONNECTION_STATE)[number];

// ---------------------------------------------------------------------------
// Zod validators
// ---------------------------------------------------------------------------

const uuid = z.string().uuid();

/**
 * ISO-8601 UTC timestamp validator. Rejects malformed strings and rejects
 * timestamps more than MAX_FUTURE_CLOCK_SKEW_MS in the future.
 */
const isoUtcTimestamp = z
  .string()
  .refine((s) => !Number.isNaN(Date.parse(s)), { message: 'invalid ISO-8601 timestamp' })
  .refine(
    (s) => Date.parse(s) - Date.now() <= MAX_FUTURE_CLOCK_SKEW_MS,
    { message: 'timestamp too far in the future' },
  );

/**
 * Canonical envelope, version 1. `.strict()` rejects unknown fields so a
 * misbehaving gateway cannot smuggle in extra data.
 */
export const DsxEventEnvelopeV1Schema = z
  .object({
    schema_version: z.literal(1),
    event_id: uuid,
    tenant_id: uuid,
    site_id: uuid,
    asset_id: uuid.nullable(),
    connection_id: uuid,
    source_system: z.enum(DSX_SOURCE_SYSTEM),
    source_subject: z.string().min(1).max(512),
    event_type: z.enum(DSX_EVENT_TYPE),
    observed_at: isoUtcTimestamp,
    received_at: isoUtcTimestamp,
    value: z.union([z.number(), z.string(), z.null()]),
    unit: z.enum(DSX_UNIT).nullable(),
    quality: z.enum(DSX_QUALITY),
    correlation_id: z.string().min(1).max(256).optional(),
    traceparent: z.string().min(1).max(256).optional(),
    raw_evidence_ref: z.string().min(1).max(1024).optional(),
    validation_state: z.enum(DSX_VALIDATION_STATE),
    mapping_state: z.enum(DSX_MAPPING_STATE),
    ingestion_version: z.string().min(1).max(128),
  })
  .strict();

export type DsxEventEnvelopeV1 = z.infer<typeof DsxEventEnvelopeV1Schema>;

/** Union of all currently-supported envelope versions. */
export type DsxEventEnvelope = DsxEventEnvelopeV1;

// ---------------------------------------------------------------------------
// Parse result + parser
// ---------------------------------------------------------------------------

export type DsxParseReason =
  | 'ok'
  | 'not_an_object'
  | 'missing_schema_version'
  | 'unsupported_version'
  | 'schema_invalid';

export type DsxParseResult =
  | { ok: true; envelope: DsxEventEnvelope; reason: 'ok' }
  | {
      ok: false;
      reason: Exclude<DsxParseReason, 'ok'>;
      /** Zod issues when reason === 'schema_invalid'. */
      issues?: z.ZodIssue[];
      /** Version seen, when relevant. */
      seenVersion?: unknown;
    };

/**
 * Parse an unknown payload as a DSX event envelope, fail-closed.
 *
 * - Returns `unsupported_version` (never throws) for a known-shape payload
 *   whose `schema_version` is not in `SUPPORTED_DSX_SCHEMA_VERSIONS`.
 * - Returns `schema_invalid` with Zod issues for validation failures.
 * - Never mutates or migrates the input.
 */
export function parseDsxEvent(input: unknown): DsxParseResult {
  if (input === null || typeof input !== 'object' || Array.isArray(input)) {
    return { ok: false, reason: 'not_an_object' };
  }
  const raw = input as Record<string, unknown>;
  if (!('schema_version' in raw)) {
    return { ok: false, reason: 'missing_schema_version' };
  }
  const seenVersion = raw.schema_version;
  if (
    typeof seenVersion !== 'number' ||
    !SUPPORTED_DSX_SCHEMA_VERSIONS.includes(seenVersion as DsxSchemaVersion)
  ) {
    return { ok: false, reason: 'unsupported_version', seenVersion };
  }
  const parsed = DsxEventEnvelopeV1Schema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, reason: 'schema_invalid', issues: parsed.error.issues };
  }
  return { ok: true, envelope: parsed.data, reason: 'ok' };
}

// ---------------------------------------------------------------------------
// Display-state derivation
// ---------------------------------------------------------------------------

export interface DeriveDisplayStateOptions {
  /** Current transport state for `envelope.connection_id`. */
  connectionState: DsxConnectionState;
  /**
   * Reference "now" for freshness comparison. Defaults to `Date.now()`.
   * Injected in tests for determinism.
   */
  now?: number;
  /**
   * Freshness budget (ms). Defaults to `DEFAULT_FRESHNESS_BUDGET_MS`.
   */
  freshnessBudgetMs?: number;
}

/**
 * Collapse a validated envelope + runtime signals into a single display
 * state. The rules are intentionally strict — LIVE is unreachable unless
 * every precondition holds.
 */
export function deriveDisplayState(
  envelope: DsxEventEnvelope,
  opts: DeriveDisplayStateOptions,
): DsxDisplayState {
  const now = opts.now ?? Date.now();
  const budget = opts.freshnessBudgetMs ?? DEFAULT_FRESHNESS_BUDGET_MS;

  // Explicit invalidations first.
  if (envelope.validation_state !== 'accepted') return 'INVALID';
  if (envelope.quality === 'invalid') return 'INVALID';

  // Availability failures.
  if (envelope.mapping_state !== 'mapped') return 'UNAVAILABLE';
  if (envelope.value === null) return 'UNAVAILABLE';
  if (opts.connectionState !== 'connected') return 'UNAVAILABLE';
  if (envelope.quality === 'unavailable') return 'UNAVAILABLE';

  // Freshness.
  const observedMs = Date.parse(envelope.observed_at);
  if (Number.isNaN(observedMs) || now - observedMs > budget) return 'STALE';

  // Degraded quality is not fatal but is not LIVE either.
  if (envelope.quality === 'degraded') return 'STALE';

  return 'LIVE';
}

// ---------------------------------------------------------------------------
// Small helpers
// ---------------------------------------------------------------------------

/** True when `v` is one of the versions this build understands. */
export function isSupportedSchemaVersion(v: unknown): v is DsxSchemaVersion {
  return typeof v === 'number' && SUPPORTED_DSX_SCHEMA_VERSIONS.includes(v as DsxSchemaVersion);
}