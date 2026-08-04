/**
 * Shared validating ingestion boundary.
 *
 * Applies, in order: schema validation → unit validation → identity/duplicate
 * rejection → freshness (stale) rejection → asset-mapping resolution.
 * Anything that fails is quarantined with a reason; nothing is coerced.
 */
import { parseDsxEvent, DSX_UNIT } from '../contract';
import { lookupMapping, type AssetMapping } from '../contracts/assetMapping';
import { payloadHash } from '../fixtures/determinism';
import type { AcceptedEvent, IngestRejection } from './types';
import type { FixtureRecord } from '../fixtures/timelines';

export const STALE_BUDGET_MS = 10 * 60_000;

export interface IngestResult {
  accepted: AcceptedEvent[];
  rejected: IngestRejection[];
}

function metricFromSubject(subject: string): string {
  const parts = subject.split('/');
  return parts[parts.length - 1] ?? 'unknown';
}

export function ingestRecords(
  records: readonly FixtureRecord[],
  mappings: readonly AssetMapping[],
  sourceSystem: string,
): IngestResult {
  const accepted: AcceptedEvent[] = [];
  const rejected: IngestRejection[] = [];
  const seen = new Set<string>();

  for (const record of records) {
    const hash = payloadHash(record.payload);
    const raw = record.payload as Record<string, unknown>;
    const eventId = typeof raw.event_id === 'string' ? raw.event_id : null;
    const observedAt = typeof raw.observed_at === 'string' ? raw.observed_at : null;

    // Unit validation is reported distinctly from generic schema failure.
    if (raw.unit !== null && typeof raw.unit === 'string' && !(DSX_UNIT as readonly string[]).includes(raw.unit)) {
      rejected.push({
        reason: 'unit_invalid',
        source_asset_id: record.source_asset_id,
        event_id: eventId,
        observed_at: observedAt,
        detail: `unit "${raw.unit}" is not in the DSX unit enum`,
        payload_hash: hash,
      });
      continue;
    }

    const parsed = parseDsxEvent(record.payload);
    if (!parsed.ok) {
      rejected.push({
        reason: parsed.reason,
        source_asset_id: record.source_asset_id,
        event_id: eventId,
        observed_at: observedAt,
        detail: parsed.reason === 'schema_invalid'
          ? (parsed.issues ?? []).map((i) => `${i.path.join('.')}: ${i.message}`).join('; ')
          : parsed.reason,
        payload_hash: hash,
      });
      continue;
    }

    const env = parsed.envelope;

    if (seen.has(env.event_id)) {
      rejected.push({
        reason: 'duplicate',
        source_asset_id: record.source_asset_id,
        event_id: env.event_id,
        observed_at: env.observed_at,
        detail: 'event_id already ingested in this run',
        payload_hash: hash,
      });
      continue;
    }

    const lag = Date.parse(env.received_at) - Date.parse(env.observed_at);
    if (lag > STALE_BUDGET_MS) {
      seen.add(env.event_id);
      rejected.push({
        reason: 'stale',
        source_asset_id: record.source_asset_id,
        event_id: env.event_id,
        observed_at: env.observed_at,
        detail: `observation delivered ${Math.round(lag / 60_000)} minutes late`,
        payload_hash: hash,
      });
      continue;
    }

    const mapping = lookupMapping(mappings, sourceSystem, record.source_asset_id, env.observed_at);
    if (!mapping.ok) {
      seen.add(env.event_id);
      rejected.push({
        reason: mapping.reason === 'unknown_asset' ? 'unknown_mapping' : 'mapping_not_approved',
        source_asset_id: record.source_asset_id,
        event_id: env.event_id,
        observed_at: env.observed_at,
        detail: `asset mapping ${mapping.reason}`,
        payload_hash: hash,
      });
      continue;
    }

    seen.add(env.event_id);

    if (env.value === null) {
      rejected.push({
        reason: 'missing_value',
        source_asset_id: record.source_asset_id,
        event_id: env.event_id,
        observed_at: env.observed_at,
        detail: 'observation carried no value; metric input treated as missing',
        payload_hash: hash,
      });
      continue;
    }

    accepted.push({
      envelope: env,
      mapping: mapping.mapping,
      metric_name: metricFromSubject(env.source_subject),
      payload_hash: hash,
    });
  }

  return { accepted, rejected };
}