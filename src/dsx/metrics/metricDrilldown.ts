/**
 * KPI drilldown derivations.
 *
 * Every number returned here is counted from the metric's own provenance or
 * from the ingest snapshot that produced it. Nothing is estimated: when a
 * count cannot be established from evidence it is reported as zero and the
 * rationale says why.
 */
import type { SourceSnapshot } from '../adapters/types';
import type { DsxProvenancedMetric } from '../contracts/provenancedMetric';
import type { DomainConstraint, DomainId } from '../workspaces/constraints';

export interface MetricEvidenceCounts {
  /** Distinct source events cited by this metric. */
  source_events: number;
  /** Cited events that are present in the accepted set of this snapshot. */
  accepted_events: number;
  /** Cited events that are not in the accepted set (cannot be re-verified). */
  unmatched_events: number;
  /** Ingest rejections in this snapshot (quarantined, never used in a value). */
  quarantined_events: number;
  observed_inputs: number;
  declared_inputs: number;
  unattested_inputs: number;
  missing_inputs: number;
}

export function metricEvidenceCounts(
  metric: DsxProvenancedMetric,
  snapshot: SourceSnapshot,
): MetricEvidenceCounts {
  const cited = new Set(metric.source_event_ids);
  const acceptedIds = new Set(
    snapshot.accepted.map((a) => a.envelope.event_id).filter((v): v is string => !!v),
  );
  let accepted = 0;
  cited.forEach((id) => {
    if (acceptedIds.has(id)) accepted += 1;
  });
  return {
    source_events: cited.size,
    accepted_events: accepted,
    unmatched_events: cited.size - accepted,
    quarantined_events: snapshot.rejected.length,
    observed_inputs: metric.inputs.filter((i) => i.provenance !== 'declared').length,
    declared_inputs: metric.declared_inputs.length,
    unattested_inputs: metric.unattested_inputs.length,
    missing_inputs: metric.missing_inputs.length,
  };
}

/**
 * Which operational domains an input belongs to. An input with no declared
 * domain contributes to the evidence pipeline itself, not to a physical domain.
 */
const INPUT_DOMAIN: Record<string, DomainId> = {
  it_power_total: 'power',
  site_rated_kw: 'power',
  cooling_power_total: 'cooling',
  max_inlet_c: 'thermal',
  design_inlet_limit_c: 'thermal',
  age_seconds: 'facility',
  mapped_sources: 'facility',
  observed_sources: 'facility',
  accepted_events: 'facility',
  rejected_events: 'facility',
  water_consumption_l: 'cooling',
  it_energy_kwh: 'carbon',
  facility_energy_kwh: 'carbon',
  grid_intensity_g_per_kwh: 'carbon',
};

export interface DomainCoverage {
  /** Domains that contributed an input to this metric, with their status. */
  contributing: DomainConstraint[];
  /** Contributing domain ids with no matching constraint record. */
  unmapped: DomainId[];
  /** Domains that cannot be assessed at all in this facility right now. */
  unassessable: DomainConstraint[];
  assessed_domains: number;
  total_domains: number;
}

export function metricDomainCoverage(
  metric: DsxProvenancedMetric,
  constraints: DomainConstraint[],
): DomainCoverage {
  const ids = new Set<DomainId>();
  for (const name of [...metric.inputs.map((i) => i.name), ...metric.missing_inputs]) {
    const domain = INPUT_DOMAIN[name];
    if (domain) ids.add(domain);
  }
  const contributing = constraints.filter((c) => ids.has(c.domain));
  const found = new Set(contributing.map((c) => c.domain));
  const unassessable = constraints.filter((c) => c.status === 'unavailable');
  return {
    contributing,
    unmapped: [...ids].filter((d) => !found.has(d)),
    unassessable,
    assessed_domains: constraints.length - unassessable.length,
    total_domains: constraints.length,
  };
}

export interface ValidationRationale {
  /** Same wording as the badge on the tile. */
  verdict: string;
  /** Ordered, plain reasons for that verdict. Never empty. */
  reasons: string[];
  /** What would have to exist before the value could be called verified. */
  to_verify: string[];
}

export function validationRationale(metric: DsxProvenancedMetric): ValidationRationale {
  const unverified =
    metric.calibration === 'uncalibrated' || metric.unattested_inputs.length > 0;
  const reasons: string[] = [];
  const toVerify: string[] = [];

  if (metric.validation === 'unavailable') {
    reasons.push(
      `No value is produced: ${metric.missing_inputs.length} required input(s) are missing (${metric.missing_inputs.join(', ')}).`,
    );
    toVerify.push('Connect a source for every missing input listed above.');
    return { verdict: 'Unavailable', reasons, to_verify: toVerify };
  }

  if (metric.validation === 'invalid') {
    reasons.push('The formula did not produce a finite result from the resolved inputs.');
    toVerify.push('Correct the inputs or the formula before this value is used.');
    return { verdict: 'Invalid', reasons, to_verify: toVerify };
  }

  if (metric.validation === 'requires_review') {
    reasons.push('The newest observation behind this value is stale, so it is held for review.');
    toVerify.push('Restore a fresh observation stream for the contributing sources.');
    return { verdict: 'Requires review', reasons, to_verify: toVerify };
  }

  reasons.push(
    `Every required input resolved and passed range checks: ${metric.inputs.length} input(s), ${metric.source_event_ids.length} source event(s).`,
  );
  reasons.push(`Computed by ${metric.formula} (version ${metric.formula_version}).`);
  if (metric.data_mode === 'SIMULATED') {
    reasons.push('Inputs come from a seeded simulation, not from a physical facility.');
  }
  if (metric.data_mode === 'REPLAYED') {
    reasons.push('Inputs come from a replayed historical dataset, not from a current measurement.');
  }
  if (metric.calibration === 'uncalibrated') {
    reasons.push('No calibration record exists for the contributing instruments.');
    toVerify.push('File a calibration record for the contributing instruments.');
  }
  if (metric.unattested_inputs.length > 0) {
    reasons.push(
      `${metric.unattested_inputs.length} declared input(s) have no attestation on file: ${metric.unattested_inputs.join(', ')}.`,
    );
    toVerify.push('Attest the declared inputs, or replace them with observed values.');
  }

  return {
    verdict: unverified ? 'Range-checked · unverified' : 'Range-checked',
    reasons,
    to_verify: toVerify,
  };
}
