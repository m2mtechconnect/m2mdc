/**
 * Phase 5 - operational telemetry read path.
 *
 * The MQTT runtime writes ingested readings into `twin_property_values` with
 * full provenance (source connection, contract, mapping, message, correlation
 * id, provenance class). Until now nothing in the twin surfaces read that
 * table, so an operator could not tell an ingested measurement from a
 * modelled design value. This module closes the loop: it reads the persisted
 * readings for a facility and resolves each one against the AURA data-mode
 * contract.
 *
 * The contract is fail-closed and is enforced here, not in the UI: a reading
 * is only presentable as LIVE when the platform has a verified live gateway
 * (`LIVE_MODE_ENABLED`), the row is classed MEASURED, and the observation is
 * fresh. Anything else resolves to its honest class - REPLAYED, SIMULATED or
 * UNAVAILABLE. There is no silent downgrade of an unavailable live source
 * into a simulated reading.
 */
import { supabase } from '@/integrations/supabase/client';
import {
  LIVE_MODE_ENABLED,
  freshnessFor,
  type DataMode,
  type FreshnessState,
} from '@/dsx/modes';

/** Provenance classes permitted by the `twin_property_values` check constraint. */
export const PROVENANCE_CLASSES = [
  'MEASURED',
  'TEST_EVIDENCE',
  'SIMULATED',
  'REPLAYED',
  'UNVERIFIED',
] as const;
export type ProvenanceClass = (typeof PROVENANCE_CLASSES)[number];

export interface TwinPropertyReading {
  id: string;
  targetEntity: string;
  targetPrimPath: string | null;
  targetProperty: string;
  valueNumeric: number | null;
  valueText: string | null;
  unit: string | null;
  observedAt: string | null;
  receivedAt: string | null;
  provenanceClass: ProvenanceClass;
  provenanceReason: string | null;
  /** Provenance citation: every reading can be traced back to its writer. */
  sourceConnectionId: string | null;
  sourceMessageId: string | null;
  sourceMappingId: string | null;
  correlationId: string | null;
  /** Always `twin_property_values`; carried so the UI can cite the record. */
  recordTable: 'twin_property_values';
}

/** A reading plus the mode and freshness it is allowed to be presented as. */
export interface ResolvedReading extends TwinPropertyReading {
  mode: DataMode;
  freshness: FreshnessState;
  /** Why the reading resolved to this mode, in operator-readable words. */
  modeReason: string;
}

export const TELEMETRY_COLUMNS =
  'id,target_entity,target_prim_path,target_property,value_numeric,value_text,unit,' +
  'observed_at,received_at,provenance_class,provenance_reason,source_connection_id,' +
  'source_message_id,source_mapping_id,correlation_id';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Facility ids reach this module from the workspace model, which also holds
 *  synthetic ids like `reference-hall`. Only a real uuid can scope a query. */
export function isFacilityRecordId(value: string | null | undefined): boolean {
  return typeof value === 'string' && UUID_RE.test(value);
}

function str(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

function nullableStr(value: unknown): string | null {
  return typeof value === 'string' && value.length > 0 ? value : null;
}

function nullableNum(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function provenanceOf(value: unknown): ProvenanceClass {
  return (PROVENANCE_CLASSES as readonly string[]).includes(str(value))
    ? (str(value) as ProvenanceClass)
    : 'UNVERIFIED';
}

export function mapReadingRow(row: Record<string, unknown>): TwinPropertyReading {
  return {
    id: str(row.id),
    targetEntity: str(row.target_entity),
    targetPrimPath: nullableStr(row.target_prim_path),
    targetProperty: str(row.target_property),
    valueNumeric: nullableNum(row.value_numeric),
    valueText: nullableStr(row.value_text),
    unit: nullableStr(row.unit),
    observedAt: nullableStr(row.observed_at),
    receivedAt: nullableStr(row.received_at),
    provenanceClass: provenanceOf(row.provenance_class),
    provenanceReason: nullableStr(row.provenance_reason),
    sourceConnectionId: nullableStr(row.source_connection_id),
    sourceMessageId: nullableStr(row.source_message_id),
    sourceMappingId: nullableStr(row.source_mapping_id),
    correlationId: nullableStr(row.correlation_id),
    recordTable: 'twin_property_values',
  };
}

export interface ResolveOptions {
  now?: number;
  /** True only when a live gateway has been verified for this tenant. */
  liveVerified?: boolean;
}

/**
 * Resolve one reading against the data-mode contract. Fail-closed: an
 * unavailable live path never borrows another mode's credibility.
 */
export function resolveReading(
  reading: TwinPropertyReading,
  { now = Date.now(), liveVerified = false }: ResolveOptions = {},
): ResolvedReading {
  const freshness = freshnessFor(reading.observedAt, now);
  const base = { ...reading, freshness };

  switch (reading.provenanceClass) {
    case 'MEASURED': {
      if (!LIVE_MODE_ENABLED || !liveVerified) {
        return {
          ...base,
          mode: 'UNAVAILABLE',
          modeReason: 'Measured reading, but no verified live gateway. Not presentable as live.',
        };
      }
      if (freshness === 'stale' || freshness === 'unknown') {
        return {
          ...base,
          mode: 'UNAVAILABLE',
          modeReason: `Measured reading is ${freshness}. Not presentable as live.`,
        };
      }
      return { ...base, mode: 'LIVE', modeReason: `Measured by a verified gateway, ${freshness}.` };
    }
    case 'REPLAYED':
      return { ...base, mode: 'REPLAYED', modeReason: 'Replayed from a recorded capture.' };
    case 'SIMULATED':
      return { ...base, mode: 'SIMULATED', modeReason: 'Produced by the AURA simulation engine.' };
    case 'TEST_EVIDENCE':
      return {
        ...base,
        mode: 'UNAVAILABLE',
        modeReason: 'Test evidence from an acceptance harness. Not an operational reading.',
      };
    default:
      return {
        ...base,
        mode: 'UNAVAILABLE',
        modeReason: reading.provenanceReason ?? 'Provenance unverified.',
      };
  }
}

/** Aggregate mode for a set of readings: the weakest claim present wins. */
export function aggregateMode(readings: ResolvedReading[]): DataMode {
  if (readings.length === 0) return 'UNAVAILABLE';
  if (readings.some((r) => r.mode === 'UNAVAILABLE')) return 'UNAVAILABLE';
  if (readings.some((r) => r.mode === 'SIMULATED')) return 'SIMULATED';
  if (readings.some((r) => r.mode === 'REPLAYED')) return 'REPLAYED';
  return 'LIVE';
}

/**
 * Readings belonging to one modelled asset. Ingest mappings address a twin by
 * entity key or USD prim path, so both are accepted; matching is exact rather
 * than fuzzy so a reading is never attributed to the wrong asset.
 */
export function readingsForAsset(
  readings: ResolvedReading[],
  asset: { id: string; name?: string; primPath?: string | null },
): ResolvedReading[] {
  const keys = new Set(
    [asset.id, asset.name, asset.primPath]
      .filter((k): k is string => typeof k === 'string' && k.length > 0)
      .map((k) => k.toLowerCase()),
  );
  return readings.filter(
    (r) =>
      keys.has(r.targetEntity.toLowerCase()) ||
      (r.targetPrimPath !== null && keys.has(r.targetPrimPath.toLowerCase())),
  );
}

/** Human-readable value with its unit, or the text value when not numeric. */
export function formatReadingValue(reading: TwinPropertyReading): string {
  if (reading.valueNumeric !== null) {
    const value = reading.valueNumeric.toLocaleString(undefined, { maximumFractionDigits: 3 });
    return reading.unit ? `${value} ${reading.unit}` : value;
  }
  return reading.valueText ?? '-';
}

export interface TelemetryClient {
  /** Postgrest-style builder; chaining is dynamic, rows are narrowed on read. */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- dynamic query builder
  from: (table: string) => any;
}

export interface FetchTelemetryOptions extends ResolveOptions {
  client?: TelemetryClient;
  limit?: number;
}

export interface TelemetryResponse {
  readings: ResolvedReading[];
  mode: DataMode;
  /** Null when the facility id is not a persisted record, so nothing was queried. */
  queriedFacilityId: string | null;
  error: string | null;
}

/**
 * Read the persisted readings for one facility. Row-level security decides
 * what is visible; this function never widens the scope.
 */
export async function fetchFacilityTelemetry(
  facilityId: string | null | undefined,
  { client = supabase as unknown as TelemetryClient, limit = 200, now, liveVerified }: FetchTelemetryOptions = {},
): Promise<TelemetryResponse> {
  if (!isFacilityRecordId(facilityId)) {
    return { readings: [], mode: 'UNAVAILABLE', queriedFacilityId: null, error: null };
  }

  const { data, error } = await client
    .from('twin_property_values')
    .select(TELEMETRY_COLUMNS)
    .eq('facility_id', facilityId)
    .order('observed_at', { ascending: false })
    .limit(limit);

  if (error) {
    return {
      readings: [],
      mode: 'UNAVAILABLE',
      queriedFacilityId: facilityId as string,
      error: error.message ?? String(error),
    };
  }

  const readings = ((data ?? []) as Record<string, unknown>[]).map((row) =>
    resolveReading(mapReadingRow(row), { now, liveVerified }),
  );

  return {
    readings,
    mode: aggregateMode(readings),
    queriedFacilityId: facilityId as string,
    error: null,
  };
}
