/**
 * KPI and attention-item drilldown routing.
 *
 * Every indicator on the Command Centre must be traceable: clicking it opens
 * the surface that explains it, carrying the KPI as context rather than
 * dropping the user on a summary page. Blueprint receives the model layer the
 * KPI is derived from; Evidence receives the matching domain workspace.
 */
import { KPI_DESCRIPTORS, type KpiKey } from './facilityModel';

/** Evidence Beta domain workspace for each KPI. */
const EVIDENCE_WORKSPACE: Record<KpiKey, string> = {
  pue: 'carbon',
  itLoadKw: 'carbon',
  gpuUtilization: 'workload',
  thermalStability: 'thermal',
  coolingEfficiency: 'cooling',
  capacityHeadroom: 'financials',
  carbonIntensity: 'carbon',
  sovereigntyScore: 'sovereignty',
  energyCostPerMwh: 'financials',
};

/**
 * Canonical Evidence record (assertion id in an assurance domain's evidence
 * boundary) that a KPI is answerable from. Only KPIs that have a declared
 * claim record appear here: the remaining ones open their domain workspace,
 * because no canonical record exists for them yet.
 */
const EVIDENCE_CLAIM: Partial<Record<KpiKey, string>> = {
  pue: 'efficiency_ratio',
  itLoadKw: 'facility_power_draw',
  capacityHeadroom: 'capacity_driver',
  sovereigntyScore: 'data_residency',
  carbonIntensity: 'operational_emissions',
  energyCostPerMwh: 'energy_cost',
};

/** The canonical Evidence claim record id for a KPI, if one is declared. */
export function evidenceClaimForKpi(key: KpiKey): string | null {
  return EVIDENCE_CLAIM[key] ?? null;
}

/** Blueprint deep link that opens the model layer backing a KPI. */
export function blueprintHrefForKpi(facilityId: string, key: KpiKey): string {
  const layer = KPI_DESCRIPTORS[key]?.overlay ?? 'thermal';
  const params = new URLSearchParams({ tab: 'model', layer, kpi: key });
  return `/blueprint/${facilityId || 'default'}?${params.toString()}`;
}

/**
 * Evidence deep link for a KPI. When the KPI has a canonical claim record the
 * link opens that exact record's provenance drilldown; otherwise it opens the
 * domain workspace.
 */
export function evidenceHrefForKpi(key: KpiKey): string {
  const workspace = EVIDENCE_WORKSPACE[key] ?? 'evidence';
  const params = new URLSearchParams({ kpi: key });
  const claim = EVIDENCE_CLAIM[key];
  if (claim) params.set('claim', claim);
  return `/dsx/evidence-beta/${workspace}?${params.toString()}`;
}

/** Human-readable layer name used in drilldown affordances. */
export function layerLabelForKpi(key: KpiKey): string {
  return KPI_DESCRIPTORS[key]?.overlay ?? 'model';
}
