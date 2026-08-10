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
  pue: 'power',
  itLoadKw: 'power',
  gpuUtilization: 'workload',
  thermalStability: 'thermal',
  coolingLoadKw: 'cooling',
  capacityHeadroom: 'facility',
  carbonIntensity: 'carbon',
  sovereigntyScore: 'sovereignty',
  costPerHour: 'financials',
} as Record<KpiKey, string>;

/** Blueprint deep link that opens the model layer backing a KPI. */
export function blueprintHrefForKpi(facilityId: string, key: KpiKey): string {
  const layer = KPI_DESCRIPTORS[key]?.overlay ?? 'thermal';
  const params = new URLSearchParams({ tab: 'model', layer, kpi: key });
  return `/blueprint/${facilityId || 'default'}?${params.toString()}`;
}

/** Evidence deep link that opens the domain workspace backing a KPI. */
export function evidenceHrefForKpi(key: KpiKey): string {
  const workspace = EVIDENCE_WORKSPACE[key] ?? 'evidence';
  return `/dsx/evidence-beta/${workspace}?kpi=${encodeURIComponent(key)}`;
}

/** Human-readable layer name used in drilldown affordances. */
export function layerLabelForKpi(key: KpiKey): string {
  return KPI_DESCRIPTORS[key]?.overlay ?? 'model';
}
