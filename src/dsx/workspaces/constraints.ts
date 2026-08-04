/**
 * Domain constraint stack.
 *
 * Each domain reports one status derived from calculated KPIs, or
 * "unavailable" when its inputs are not instrumented. A domain with no
 * source is never reported as normal or healthy.
 */
import type { KpiBundle } from '../metrics/computeKpis';
import { DESIGN_INLET_LIMIT_C } from '../metrics/computeKpis';
import type { SourceSnapshot } from '../adapters/types';
import { capability, type Capability } from './availability';
import { identityFor, type AssetIdentity } from './facilityGraph';
import { assetBySourceId } from '../fixtures/evidenceBetaFacility';

export type ConstraintStatus = 'normal' | 'attention' | 'violation' | 'unavailable';

export type DomainId =
  | 'thermal' | 'power' | 'cooling' | 'network' | 'facility'
  | 'workload' | 'sovereignty' | 'carbon' | 'financial';

export interface DomainConstraint {
  domain: DomainId;
  label: string;
  route: string;
  status: ConstraintStatus;
  /** One-line operator summary. Never a health claim without evidence. */
  summary: string;
  affected_assets: AssetIdentity[];
  affected_workloads: string[];
  /** Number of source events backing the assessment. Zero means no evidence. */
  evidence_events: number;
  detected_at: string | null;
  next_step: string;
  blocking_capability: Capability | null;
}

const ROUTE = '/dsx/evidence-beta';

function unavailableDomain(
  domain: DomainId,
  label: string,
  route: string,
  capId: string,
  nextStep: string,
): DomainConstraint {
  const c = capability(capId);
  return {
    domain,
    label,
    route,
    status: 'unavailable',
    summary: c.reason,
    affected_assets: [],
    affected_workloads: [],
    evidence_events: 0,
    detected_at: null,
    next_step: nextStep,
    blocking_capability: c,
  };
}

export function buildConstraintStack(bundle: KpiBundle, snapshot: SourceSnapshot): DomainConstraint[] {
  const headroom = bundle.metrics.thermal_headroom;
  const hotspot = bundle.hotspot;
  const observedAt = snapshot.last_observed_at;

  const thermalStatus: ConstraintStatus =
    headroom?.value === null || headroom?.value === undefined
      ? 'unavailable'
      : headroom.value <= 0
        ? 'violation'
        : headroom.value <= 3
          ? 'attention'
          : 'normal';

  const thermal: DomainConstraint = {
    domain: 'thermal',
    label: 'Thermal',
    route: `${ROUTE}/thermal`,
    status: thermalStatus,
    summary:
      headroom?.value === null || headroom?.value === undefined
        ? `Thermal headroom unavailable. Missing: ${(headroom?.missing_inputs ?? []).join(', ') || 'inlet observations'}.`
        : `Minimum thermal headroom ${headroom.value.toFixed(2)} degC against a ${DESIGN_INLET_LIMIT_C} degC design inlet limit.`,
    affected_assets: hotspot && thermalStatus !== 'normal'
      ? [assetBySourceId(hotspot.source_asset_id)].filter(Boolean).map((a) => identityFor(a!))
      : [],
    affected_workloads: [],
    evidence_events: headroom?.source_event_ids.length ?? 0,
    detected_at: observedAt,
    next_step:
      thermalStatus === 'normal'
        ? 'No thermal action is indicated at this observation.'
        : 'Open the Thermal workspace and review the ranked hotspot queue.',
    blocking_capability: null,
  };

  const util = bundle.metrics.power_capacity_utilisation;
  const powerStatus: ConstraintStatus =
    util?.value === null || util?.value === undefined
      ? 'unavailable'
      : util.value >= 100 ? 'violation' : util.value >= 85 ? 'attention' : 'normal';
  const power: DomainConstraint = {
    domain: 'power',
    label: 'Power',
    route: `${ROUTE}/power`,
    status: powerStatus,
    summary:
      util?.value === null || util?.value === undefined
        ? `Power capacity utilisation unavailable. Missing: ${(util?.missing_inputs ?? []).join(', ')}.`
        : `Facility draw is ${util.value.toFixed(1)}% of site rated capacity.`,
    affected_assets: [],
    affected_workloads: [],
    evidence_events: util?.source_event_ids.length ?? 0,
    detected_at: observedAt,
    next_step: 'Review the electrical single-line diagram for the constrained branch.',
    blocking_capability: null,
  };

  const coolingLoad = bundle.metrics.cooling_load;
  const coolingStatus: ConstraintStatus =
    coolingLoad?.value === null || coolingLoad?.value === undefined
      ? 'unavailable'
      : thermalStatus === 'violation'
        ? 'violation'
        : thermalStatus === 'attention'
          ? 'attention'
          : 'normal';
  const cooling: DomainConstraint = {
    domain: 'cooling',
    label: 'Cooling',
    route: `${ROUTE}/cooling`,
    status: coolingStatus,
    summary:
      coolingLoad?.value === null || coolingLoad?.value === undefined
        ? `Cooling load unavailable. Missing: ${(coolingLoad?.missing_inputs ?? []).join(', ')}.`
        : `Cooling units draw ${coolingLoad.value.toFixed(1)} kW. Coolant temperature, flow and pressure are not instrumented.`,
    affected_assets: [],
    affected_workloads: [],
    evidence_events: coolingLoad?.source_event_ids.length ?? 0,
    detected_at: observedAt,
    next_step: 'Trace the cooling dependency for the affected rack group.',
    blocking_capability: null,
  };

  const mapping = bundle.metrics.mapping_coverage;
  const quality = bundle.metrics.data_quality;
  const facilityStatus: ConstraintStatus =
    mapping?.value === null || mapping?.value === undefined
      ? 'unavailable'
      : mapping.value < 100 || (quality?.value ?? 100) < 100
        ? 'attention'
        : 'normal';
  const facility: DomainConstraint = {
    domain: 'facility',
    label: 'Facility',
    route: `${ROUTE}/facility`,
    status: facilityStatus,
    summary:
      mapping?.value === null || mapping?.value === undefined
        ? 'Asset-mapping coverage unavailable; no source was observed in this window.'
        : `${snapshot.rejected.length} observation(s) quarantined; mapping coverage ${mapping.value.toFixed(1)}%.`,
    affected_assets: [],
    affected_workloads: [],
    evidence_events: snapshot.accepted.length,
    detected_at: observedAt,
    next_step: 'Review quarantined records and unmapped assets in the Facility registry.',
    blocking_capability: null,
  };

  return [
    thermal,
    power,
    cooling,
    unavailableDomain('network', 'Network', `${ROUTE}/network`, 'compute_fabric',
      'Connect a fabric telemetry source before network constraints can be assessed.'),
    facility,
    unavailableDomain('workload', 'Workload', `${ROUTE}/workload`, 'workload_scheduler',
      'Connect a scheduler and GPU inventory source before workload exposure can be assessed.'),
    unavailableDomain('sovereignty', 'Sovereignty', `${ROUTE}/sovereignty`, 'residency_evidence',
      'Sovereignty status stays unverified until residency and attestation evidence is connected.'),
    unavailableDomain('carbon', 'Carbon', `${ROUTE}/carbon`, 'grid_carbon_intensity',
      'Connect a grid carbon-intensity feed before emissions can be calculated.'),
    unavailableDomain('financial', 'Financial exposure', `${ROUTE}/financials`, 'cost_ledger',
      'Connect a cost ledger and tariff source before financial exposure can be calculated.'),
  ];
}

export function statusRank(s: ConstraintStatus): number {
  return { violation: 0, attention: 1, unavailable: 2, normal: 3 }[s];
}