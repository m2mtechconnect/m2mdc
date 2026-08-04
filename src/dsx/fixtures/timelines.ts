/**
 * Deterministic DSX-compatible event timelines for the Evidence Beta.
 *
 * ALL events are SIMULATED. Two timelines are provided:
 *   - `normal`               steady-state operation
 *   - `cooling_degradation`  controlled CRAH-01 capacity loss
 *
 * The degradation timeline also embeds the required adversarial fixtures:
 * duplicate event, stale event, invalid unit, unknown asset mapping,
 * missing observation, and a power-distribution warning.
 */
import type { DsxEventEnvelopeV1 } from '../contract';
import {
  EVIDENCE_BETA_CONNECTION_ID,
  EVIDENCE_BETA_ORG_ID,
  EVIDENCE_BETA_RACKS,
  EVIDENCE_BETA_SITE_ID,
  EVIDENCE_BETA_SOURCE_SYSTEM,
  UNMAPPED_SOURCE_ID,
  assetBySourceId,
} from './evidenceBetaFacility';
import { mulberry32, roundTo, stableUuid, fnv1a } from './determinism';

export type TimelineId = 'normal' | 'cooling_degradation';

export const TIMELINE_START_ISO = '2026-03-02T08:00:00.000Z';
export const TICK_MS = 60_000;
export const TICKS = 30;
export const INGESTION_VERSION = 'evidence-beta/1.0.0';

/** A raw fixture record before contract validation. */
export interface FixtureRecord {
  /** Payload as it would arrive from the source (may be intentionally bad). */
  payload: Record<string, unknown>;
  source_asset_id: string;
  tick: number;
  /** Human note explaining an intentionally adversarial record. */
  note?: string;
}

function iso(tick: number, offsetMs = 0): string {
  return new Date(Date.parse(TIMELINE_START_ISO) + tick * TICK_MS + offsetMs).toISOString();
}

function envelope(
  key: string,
  sourceAssetId: string,
  tick: number,
  metric: string,
  value: number | null,
  unit: string,
  overrides: Partial<DsxEventEnvelopeV1> = {},
): Record<string, unknown> {
  const asset = assetBySourceId(sourceAssetId);
  return {
    schema_version: 1,
    event_id: stableUuid(`evidence-beta:event:${key}`),
    tenant_id: EVIDENCE_BETA_ORG_ID,
    site_id: EVIDENCE_BETA_SITE_ID,
    asset_id: asset ? asset.aura_asset_id : null,
    connection_id: EVIDENCE_BETA_CONNECTION_ID,
    source_system: 'dsx_cooling',
    source_subject: `${EVIDENCE_BETA_SOURCE_SYSTEM}/${sourceAssetId}/${metric}`,
    event_type: 'telemetry',
    observed_at: iso(tick),
    received_at: iso(tick, 1_500),
    value,
    unit,
    quality: 'validated',
    validation_state: 'accepted',
    mapping_state: asset ? 'mapped' : 'unmapped',
    ingestion_version: INGESTION_VERSION,
    ...overrides,
  };
}

/** Deterministic per-rack noise in [-0.25, 0.25] degC. */
function noise(seedKey: string): number {
  return (mulberry32(fnv1a(seedKey))() - 0.5) * 0.5;
}

/** Cooling capacity multiplier over the degradation timeline (1 → 0.55). */
export function coolingCapacityAt(tick: number, timeline: TimelineId): number {
  if (timeline === 'normal') return 1;
  if (tick < 8) return 1;
  if (tick > 22) return 0.55;
  return roundTo(1 - ((tick - 8) / 14) * 0.45, 4);
}

/** Rack inlet temperature model. Racks 01-04 are served by CRAH-01. */
export function inletTempAt(rackIndex: number, tick: number, timeline: TimelineId): number {
  const base = 22.5;
  const cap = coolingCapacityAt(tick, timeline);
  const affected = rackIndex < 4 ? 1 : 0.25;
  const rise = (1 / cap - 1) * 18 * affected;
  return roundTo(base + rise + noise(`inlet:${rackIndex}:${tick}`), 2);
}

/** Rack IT power draw (kW), mildly load-varying but deterministic. */
export function rackPowerAt(rackIndex: number, tick: number): number {
  const base = 78 + rackIndex * 3;
  return roundTo(base + Math.sin((tick + rackIndex) / 5) * 4, 2);
}

/** Cooling unit electrical draw (kW) rises as it fights the heat. */
export function coolingPowerAt(tick: number, timeline: TimelineId): number {
  const cap = coolingCapacityAt(tick, timeline);
  return roundTo(120 + (1 / cap - 1) * 90, 2);
}

export function buildTimeline(timeline: TimelineId): FixtureRecord[] {
  const records: FixtureRecord[] = [];

  for (let tick = 0; tick < TICKS; tick++) {
    EVIDENCE_BETA_RACKS.forEach((rack, i) => {
      // Missing observation fixture: RACK-08 inlet drops out at tick 12.
      const missing = timeline === 'cooling_degradation' && i === 7 && tick === 12;
      if (!missing) {
        records.push({
          source_asset_id: `${rack.source_asset_id}-INLET`,
          tick,
          payload: envelope(
            `${timeline}:inlet:${rack.source_asset_id}:${tick}`,
            `${rack.source_asset_id}-INLET`,
            tick,
            'inlet_temp',
            inletTempAt(i, tick, timeline),
            'degC',
          ),
        });
      } else {
        records.push({
          source_asset_id: `${rack.source_asset_id}-INLET`,
          tick,
          note: 'missing observation: sensor dropout',
          payload: envelope(
            `${timeline}:inlet-missing:${rack.source_asset_id}:${tick}`,
            `${rack.source_asset_id}-INLET`,
            tick,
            'inlet_temp',
            null,
            'degC',
            { quality: 'unavailable' },
          ),
        });
      }

      records.push({
        source_asset_id: `${rack.source_asset_id}-PWR`,
        tick,
        payload: envelope(
          `${timeline}:pwr:${rack.source_asset_id}:${tick}`,
          `${rack.source_asset_id}-PWR`,
          tick,
          'it_power',
          rackPowerAt(i, tick),
          'kW',
          { source_system: 'dsx_power' },
        ),
      });
    });

    records.push({
      source_asset_id: 'CRAH-01',
      tick,
      payload: envelope(
        `${timeline}:crah1:${tick}`,
        'CRAH-01',
        tick,
        'cooling_power',
        coolingPowerAt(tick, timeline),
        'kW',
      ),
    });
    records.push({
      source_asset_id: 'CRAH-02',
      tick,
      payload: envelope(`${timeline}:crah2:${tick}`, 'CRAH-02', tick, 'cooling_power', 118.4, 'kW'),
    });
  }

  if (timeline === 'cooling_degradation') {
    // Duplicate event: exact re-send of the tick-10 CRAH-01 record.
    records.push({
      source_asset_id: 'CRAH-01',
      tick: 10,
      note: 'duplicate event: identical event_id re-sent',
      payload: envelope(
        `${timeline}:crah1:10`,
        'CRAH-01',
        10,
        'cooling_power',
        coolingPowerAt(10, timeline),
        'kW',
      ),
    });

    // Stale event: observed 45 minutes before it is delivered at tick 20.
    records.push({
      source_asset_id: 'CRAH-02',
      tick: 20,
      note: 'stale event: observation older than the freshness budget',
      payload: {
        ...envelope(`${timeline}:crah2-stale:20`, 'CRAH-02', 20, 'cooling_power', 117.9, 'kW'),
        observed_at: iso(20, -45 * 60_000),
      },
    });

    // Invalid unit.
    records.push({
      source_asset_id: 'RACK-01-INLET',
      tick: 15,
      note: 'invalid unit: fahrenheit is not in the DSX unit enum',
      payload: {
        ...envelope(`${timeline}:bad-unit:15`, 'RACK-01-INLET', 15, 'inlet_temp', 88.2, 'degC'),
        unit: 'degF',
      },
    });

    // Unknown asset mapping.
    records.push({
      source_asset_id: UNMAPPED_SOURCE_ID,
      tick: 16,
      note: 'unknown asset mapping: source asset is not in the registry',
      payload: {
        ...envelope(`${timeline}:unmapped:16`, UNMAPPED_SOURCE_ID, 16, 'inlet_temp', 26.4, 'degC'),
        asset_id: null,
        mapping_state: 'unmapped',
      },
    });

    // Power-distribution warning on RPP-01.
    records.push({
      source_asset_id: 'RPP-01',
      tick: 18,
      note: 'power distribution warning: branch loading above advisory threshold',
      payload: envelope(
        `${timeline}:rpp1-warn:18`,
        'RPP-01',
        18,
        'branch_load',
        92.4,
        'pct',
        { source_system: 'dsx_power', event_type: 'alert', quality: 'degraded' },
      ),
    });
  }

  return records;
}

export const TIMELINE_IDS: TimelineId[] = ['normal', 'cooling_degradation'];