/**
 * Turns an ingested SourceSnapshot into provenanced KPIs.
 * Inputs that never arrived stay missing: the KPI renders Unavailable and
 * names the missing input. Nothing is defaulted to zero.
 */
import { computeMetric, type DsxProvenancedMetric, type MetricInputRef } from '../contracts/provenancedMetric';
import { freshnessFor } from '../modes';
import { KPI_DEFINITIONS } from './definitions';
import type { SourceSnapshot } from '../adapters/types';
import { EVIDENCE_BETA_SITE, EVIDENCE_BETA_RACKS } from '../fixtures/evidenceBetaFacility';

export const DESIGN_INLET_LIMIT_C = 27;

export interface RackReading {
  aura_asset_id: string;
  source_asset_id: string;
  name: string;
  usd_prim_path: string;
  inlet_c: number | null;
  it_power_kw: number | null;
  inlet_event_id: string | null;
  power_event_id: string | null;
  observed_at: string | null;
}

function latestBy(
  snapshot: SourceSnapshot,
  sourceAssetId: string,
  metric: string,
): { value: number; event_id: string; observed_at: string } | null {
  const matches = snapshot.accepted.filter(
    (a) => a.mapping.source_asset_id === sourceAssetId && a.metric_name === metric && typeof a.envelope.value === 'number',
  );
  if (matches.length === 0) return null;
  const latest = matches.reduce((a, b) =>
    Date.parse(b.envelope.observed_at) > Date.parse(a.envelope.observed_at) ? b : a,
  );
  return {
    value: latest.envelope.value as number,
    event_id: latest.envelope.event_id,
    observed_at: latest.envelope.observed_at,
  };
}

export function rackReadings(snapshot: SourceSnapshot): RackReading[] {
  return EVIDENCE_BETA_RACKS.map((rack) => {
    const inlet = latestBy(snapshot, `${rack.source_asset_id}-INLET`, 'inlet_temp');
    const power = latestBy(snapshot, `${rack.source_asset_id}-PWR`, 'it_power');
    return {
      aura_asset_id: rack.aura_asset_id,
      source_asset_id: rack.source_asset_id,
      name: rack.name,
      usd_prim_path: rack.usd_prim_path,
      inlet_c: inlet?.value ?? null,
      it_power_kw: power?.value ?? null,
      inlet_event_id: inlet?.event_id ?? null,
      power_event_id: power?.event_id ?? null,
      observed_at: inlet?.observed_at ?? power?.observed_at ?? null,
    };
  });
}

export interface KpiBundle {
  metrics: Record<string, DsxProvenancedMetric>;
  racks: RackReading[];
  hotspot: RackReading | null;
}

export function computeKpiBundle(snapshot: SourceSnapshot, nowMs: number): KpiBundle {
  const racks = rackReadings(snapshot);
  const freshness = freshnessFor(snapshot.last_observed_at, nowMs);

  const powered = racks.filter((r) => r.it_power_kw !== null);
  const itTotal = powered.reduce((s, r) => s + (r.it_power_kw ?? 0), 0);
  const coolingEvents = ['CRAH-01', 'CRAH-02']
    .map((id) => latestBy(snapshot, id, 'cooling_power'))
    .filter((v): v is NonNullable<typeof v> => v !== null);
  const coolingTotal = coolingEvents.reduce((s, e) => s + e.value, 0);
  const inlets = racks.filter((r) => r.inlet_c !== null);
  const maxInlet = inlets.length ? Math.max(...inlets.map((r) => r.inlet_c as number)) : null;
  const hotspot = inlets.length
    ? inlets.reduce((a, b) => ((b.inlet_c as number) > (a.inlet_c as number) ? b : a))
    : null;

  const observedSources = new Set([
    ...snapshot.accepted.map((a) => a.mapping.source_asset_id),
    ...snapshot.rejected.map((r) => r.source_asset_id),
  ]).size;
  const mappedSources = new Set(snapshot.accepted.map((a) => a.mapping.source_asset_id)).size;

  // Event ids that back the coverage / quality / freshness counters. Without
  // these, claims that cite those metrics (e.g. sovereignty identity_chain)
  // would render as evidenced with zero traceable observations.
  const acceptedEventIds = snapshot.accepted.map((a) => a.envelope.event_id).filter((v): v is string => !!v);
  const rejectedEventIds = snapshot.rejected.map((r) => r.event_id).filter((v): v is string => !!v);
  // One representative event per mapped source: the identity evidence is the
  // resolution of a source id to a governed asset, not every reading.
  const mappedSourceEventIds = Array.from(
    snapshot.accepted
      .reduce((acc, a) => {
        if (a.envelope.event_id && !acc.has(a.mapping.source_asset_id)) {
          acc.set(a.mapping.source_asset_id, a.envelope.event_id);
        }
        return acc;
      }, new Map<string, string>())
      .values(),
  );
  const latestEventId =
    snapshot.accepted.length && snapshot.last_observed_at
      ? (snapshot.accepted.find((a) => a.envelope.observed_at === snapshot.last_observed_at)?.envelope.event_id ?? null)
      : null;

  const ref = (name: string, value: number | null, unit: string, eventIds: string[]): MetricInputRef => ({
    name,
    value,
    unit,
    event_ids: eventIds,
    provenance: 'observed',
  });

  /**
   * A registry/nameplate value. It has no observation behind it, so it is
   * flagged as declared and unattested: the UI must not imply it was metered.
   */
  const declaredRef = (
    name: string,
    value: number | null,
    unit: string,
    declaredSource: string,
  ): MetricInputRef => ({
    name,
    value,
    unit,
    event_ids: [],
    provenance: 'declared',
    declared_source: declaredSource,
    unattested: true,
  });

  const inputs: Record<string, MetricInputRef | undefined> = {
    it_power_total: ref(
      'it_power_total',
      powered.length === racks.length ? itTotal : null,
      'kW',
      powered.map((r) => r.power_event_id).filter((v): v is string => !!v),
    ),
    cooling_power_total: ref(
      'cooling_power_total',
      coolingEvents.length === 2 ? coolingTotal : null,
      'kW',
      coolingEvents.map((e) => e.event_id),
    ),
    max_inlet_c: ref(
      'max_inlet_c',
      maxInlet,
      'degC',
      inlets.map((r) => r.inlet_event_id).filter((v): v is string => !!v),
    ),
    design_inlet_limit_c: declaredRef(
      'design_inlet_limit_c',
      DESIGN_INLET_LIMIT_C,
      'degC',
      'facility registry (design thermal limit)',
    ),
    site_rated_kw: declaredRef(
      'site_rated_kw',
      EVIDENCE_BETA_SITE.rated_kw,
      'kW',
      `facility registry nameplate for ${EVIDENCE_BETA_SITE.name}`,
    ),
    age_seconds: ref(
      'age_seconds',
      snapshot.last_observed_at ? Math.max(0, Math.round((nowMs - Date.parse(snapshot.last_observed_at)) / 1000)) : null,
      's',
      latestEventId ? [latestEventId] : [],
    ),
    mapped_sources: ref('mapped_sources', observedSources ? mappedSources : null, 'count', mappedSourceEventIds),
    observed_sources: ref('observed_sources', observedSources || null, 'count', [
      ...mappedSourceEventIds,
      ...rejectedEventIds,
    ]),
    accepted_events: ref('accepted_events', snapshot.accepted.length || null, 'count', acceptedEventIds),
    rejected_events: ref('rejected_events', snapshot.rejected.length, 'count', rejectedEventIds),
    // WUE / CUE inputs are intentionally absent: the Evidence Beta fixture
    // has no water or grid-intensity instrumentation. These KPIs must render
    // as Unavailable rather than as an invented number.
    water_consumption_l: undefined,
    it_energy_kwh: undefined,
    facility_energy_kwh: undefined,
    grid_intensity_g_per_kwh: undefined,
  };

  const window = snapshot.accepted.length
    ? {
        from: snapshot.accepted.reduce((a, b) =>
          Date.parse(b.envelope.observed_at) < Date.parse(a.envelope.observed_at) ? b : a,
        ).envelope.observed_at,
        to: snapshot.last_observed_at ?? '',
      }
    : null;

  const ctxBase = {
    inputs,
    data_mode: snapshot.data_mode,
    freshness,
    last_observed_at: snapshot.last_observed_at,
    observation_window: window,
    simulation_run_id: snapshot.data_mode === 'SIMULATED' ? snapshot.run_id : null,
    replay_run_id: snapshot.data_mode === 'REPLAYED' ? snapshot.run_id : null,
    calibration: 'uncalibrated' as const,
  };

  const metrics: Record<string, DsxProvenancedMetric> = {};
  for (const [key, def] of Object.entries(KPI_DEFINITIONS)) {
    metrics[key] = computeMetric(def, ctxBase);
  }

  return { metrics, racks, hotspot };
}