/**
 * Evidence boundary model for the assurance domains (sovereignty, carbon,
 * financial).
 *
 * These three domains are the easiest place in a digital twin to publish a
 * claim that no source can support. This module makes the boundary explicit
 * and testable: every claim a workspace may display is declared here, and
 * each one is either EVIDENCED (backed by a named basis and, where numeric,
 * by provenanced event ids) or NOT EVIDENCED (backed by nothing, naming the
 * blocking capability and the exact inputs that are missing).
 *
 * A claim is never promoted to evidenced by inference, and a numeric claim
 * is demoted to not-evidenced the moment its underlying metric is
 * unavailable. Silence is never presented as compliance.
 */
import type { KpiBundle } from '../metrics/computeKpis';
import type { SourceSnapshot } from '../adapters/types';
import { capability, type Capability } from './availability';
import { ALL_IDENTITIES } from './facilityGraph';

export type AssuranceDomain = 'sovereignty' | 'carbon' | 'financial';
export type AssertionStatus = 'evidenced' | 'not_evidenced';

export interface EvidenceAssertion {
  id: string;
  domain: AssuranceDomain;
  /** The claim an operator might want to make. Phrased as a claim, not a boast. */
  claim: string;
  status: AssertionStatus;
  /** Why the claim holds. Only present when evidenced. */
  basis: string | null;
  /** Provenanced event ids supporting a numeric claim. May be empty for structural claims. */
  evidence_event_ids: string[];
  /** Capability that blocks the claim. Only present when not evidenced. */
  blocking_capability: Capability | null;
  /** Named inputs required before the claim could be evidenced. */
  missing_inputs: string[];
  /** What an operator must connect or do next. Always present. */
  next_step: string;
}

function evidenced(
  id: string,
  domain: AssuranceDomain,
  claim: string,
  basis: string,
  eventIds: string[],
  nextStep: string,
): EvidenceAssertion {
  return {
    id, domain, claim,
    status: 'evidenced',
    basis,
    evidence_event_ids: eventIds,
    blocking_capability: null,
    missing_inputs: [],
    next_step: nextStep,
  };
}

function blocked(
  id: string,
  domain: AssuranceDomain,
  claim: string,
  capabilityId: string,
  extraMissing: string[] = [],
): EvidenceAssertion {
  const c = capability(capabilityId);
  return {
    id, domain, claim,
    status: 'not_evidenced',
    basis: null,
    evidence_event_ids: [],
    blocking_capability: c,
    missing_inputs: Array.from(new Set([...c.missing_inputs, ...extraMissing])).sort(),
    next_step: `Connect ${c.label.toLowerCase()} before this claim may be displayed.`,
  };
}

/**
 * A numeric claim is evidenced only when its metric carries a value.
 * Otherwise it reports the metric's own missing inputs.
 */
function fromMetric(
  id: string,
  domain: AssuranceDomain,
  claim: string,
  bundle: KpiBundle,
  metricKey: string,
  capabilityId: string,
  basis: string,
): EvidenceAssertion {
  const m = bundle.metrics[metricKey];
  if (m && m.value !== null) {
    return evidenced(id, domain, claim, basis, m.source_event_ids,
      'Open the metric provenance to review the contributing observations.');
  }
  const a = blocked(id, domain, claim, capabilityId, m?.missing_inputs ?? []);
  return a;
}

export function sovereigntyAssertions(bundle: KpiBundle, snapshot: SourceSnapshot): EvidenceAssertion[] {
  const approved = ALL_IDENTITIES.filter((a) => a.mapping_approval === 'approved').length;
  const mapping = bundle.metrics.mapping_coverage;

  const assertions: EvidenceAssertion[] = [
    evidenced(
      'telemetry_confinement',
      'sovereignty',
      'Telemetry rendered in this workspace is not transmitted to any external system.',
      `Every observation in this window originates from the version-controlled Evidence Beta fixture and is processed in the browser session. The workspace performs no outbound request, which is enforced by the zero-egress network guard in the verification suite. ${snapshot.accepted.length} observation(s) were processed locally.`,
      [],
      'Re-run the zero-egress verification whenever a new data source is added.',
    ),
    evidenced(
      'identity_chain',
      'sovereignty',
      'Every displayed observation resolves to a governed asset identity.',
      `${approved} asset identit(ies) are approved in the facility registry, and unmapped observations are quarantined rather than displayed.`,
      mapping?.source_event_ids ?? [],
      'Review mapping exceptions in the Facility registry workspace.',
    ),
    blocked('facility_jurisdiction', 'sovereignty',
      'This facility operates within a declared legal jurisdiction.',
      'residency_evidence', ['site_jurisdiction', 'operator_of_record']),
    blocked('data_residency', 'sovereignty',
      'Tenant data remains inside the declared jurisdiction.',
      'residency_evidence', ['dataset_location', 'egress_log']),
    blocked('workload_residency', 'sovereignty',
      'Workloads execute only on nodes inside the declared jurisdiction.',
      'workload_scheduler', ['workload_location']),
    blocked('node_attestation', 'sovereignty',
      'Compute nodes are running attested, unmodified firmware.',
      'node_attestation'),
    blocked('key_custody', 'sovereignty',
      'Encryption keys are held under sovereign custody.',
      'node_attestation', ['key_custody_record']),
  ];
  return assertions;
}

export function carbonAssertions(bundle: KpiBundle): EvidenceAssertion[] {
  return [
    fromMetric('facility_power_draw', 'carbon',
      'Current facility electrical draw is known.',
      bundle, 'facility_load', 'grid_carbon_intensity',
      'IT and cooling power are metered in the fixture and summed by the facility-load KPI.'),
    fromMetric('efficiency_ratio', 'carbon',
      'Current facility energy efficiency (PUE) is known.',
      bundle, 'pue', 'grid_carbon_intensity',
      'PUE is calculated from metered IT and cooling power at the same observation window.'),
    blocked('energy_consumed', 'carbon',
      'Energy consumed over the reporting period is known.',
      'grid_carbon_intensity', ['facility_energy_kwh', 'it_energy_kwh', 'meter_interval']),
    blocked('operational_emissions', 'carbon',
      'Operational (scope 2) emissions for this period are known.',
      'grid_carbon_intensity'),
    blocked('carbon_usage_effectiveness', 'carbon',
      'Carbon usage effectiveness (CUE) is known.',
      'grid_carbon_intensity', ['facility_energy_kwh', 'it_energy_kwh']),
    blocked('water_usage_effectiveness', 'carbon',
      'Water usage effectiveness (WUE) is known.',
      'water_metering'),
    blocked('renewable_share', 'carbon',
      'The renewable share of consumed energy is known.',
      'renewable_mix'),
    blocked('heat_reuse', 'carbon',
      'Recovered heat offsets facility emissions.',
      'heat_reuse'),
  ];
}

export function financialAssertions(bundle: KpiBundle): EvidenceAssertion[] {
  return [
    fromMetric('load_driver', 'financial',
      'The physical cost driver (facility electrical load) is known.',
      bundle, 'facility_load', 'energy_tariff',
      'Facility load is the metered quantity that any energy cost would be priced against.'),
    fromMetric('capacity_driver', 'financial',
      'Committed share of rated site capacity is known.',
      bundle, 'power_capacity_utilisation', 'cost_ledger',
      'Capacity utilisation is calculated from metered load against the declared site rating.'),
    blocked('energy_cost', 'financial',
      'The cost of energy consumed in this period is known.',
      'energy_tariff', ['facility_energy_kwh']),
    blocked('demand_charge', 'financial',
      'Peak-demand charge exposure for this period is known.',
      'energy_tariff', ['billing_period_peak_kw']),
    blocked('operating_cost', 'financial',
      'Operating cost for this facility is known.',
      'cost_ledger'),
    blocked('sla_exposure', 'financial',
      'Financial exposure from an SLA breach is known.',
      'cost_ledger', ['sla_terms', 'penalty_schedule']),
    blocked('avoided_cost', 'financial',
      'A recommendation avoided a quantified cost.',
      'energy_tariff', ['energy_price_per_kwh', 'baseline_counterfactual']),
  ];
}

export function assertionsFor(
  domain: AssuranceDomain,
  bundle: KpiBundle,
  snapshot: SourceSnapshot,
): EvidenceAssertion[] {
  switch (domain) {
    case 'sovereignty': return sovereigntyAssertions(bundle, snapshot);
    case 'carbon': return carbonAssertions(bundle);
    case 'financial': return financialAssertions(bundle);
  }
}

export interface BoundarySummary {
  total: number;
  evidenced: number;
  not_evidenced: number;
  /** Deduplicated, sorted list of every input needed to close the boundary. */
  required_inputs: string[];
  /** Deduplicated list of blocking capability ids. */
  blocking_capabilities: string[];
}

export function summarise(assertions: EvidenceAssertion[]): BoundarySummary {
  const notEvidenced = assertions.filter((a) => a.status === 'not_evidenced');
  return {
    total: assertions.length,
    evidenced: assertions.length - notEvidenced.length,
    not_evidenced: notEvidenced.length,
    required_inputs: Array.from(new Set(notEvidenced.flatMap((a) => a.missing_inputs))).sort(),
    blocking_capabilities: Array.from(
      new Set(notEvidenced.map((a) => a.blocking_capability?.id).filter((v): v is string => !!v)),
    ).sort(),
  };
}

/**
 * A domain may only be reported as assured when every declared claim in it
 * is evidenced. Partial evidence is reported as unverified, never as pass.
 */
export function domainVerdict(assertions: EvidenceAssertion[]): 'assured' | 'unverified' {
  return assertions.every((a) => a.status === 'evidenced') ? 'assured' : 'unverified';
}
