/**
 * Related-view generation.
 *
 * Cross-workspace destinations are derived from the selected entity's class,
 * never hardcoded per page. Every destination keeps the current investigation
 * context so the operator never has to re-find the same object.
 */
import type { AssetClass } from '../contracts/assetMapping';

export const DSX_ROOT = '/dsx/evidence-beta';

export interface RelatedView {
  id: string;
  label: string;
  path: string;
  /** Shown as a tooltip when the destination is not self-evident. */
  hint: string;
}

const V = {
  facility: { id: 'facility', label: 'View in Assets', path: `${DSX_ROOT}/assets`, hint: 'Show this object in the facility hierarchy and registry.' },
  thermal: { id: 'thermal', label: 'View Thermal', path: `${DSX_ROOT}/operations/thermal`, hint: 'Rank inlet temperatures and headroom for the selected scope.' },
  power: { id: 'power', label: 'Trace Power', path: `${DSX_ROOT}/operations/power`, hint: 'Follow the electrical supply chain that feeds this object.' },
  cooling: { id: 'cooling', label: 'Trace Cooling', path: `${DSX_ROOT}/operations/cooling`, hint: 'Follow the cooling loop that serves this object.' },
  network: { id: 'network', label: 'View Compute', path: `${DSX_ROOT}/operations/compute`, hint: 'Compute fabric state for this scope.' },
  workload: { id: 'workload', label: 'View Workloads', path: `${DSX_ROOT}/operations/workload`, hint: 'Workloads placed on this object, when a scheduler source is connected.' },
  evidence: { id: 'evidence', label: 'View Decision log', path: `${DSX_ROOT}/decisions/log`, hint: 'Source events, decisions and quarantined records.' },
  simulations: { id: 'simulations', label: 'Open Decisions', path: `${DSX_ROOT}/decisions`, hint: 'Latest evaluated run and the decisions it produced.' },
  carbon: { id: 'carbon', label: 'View Energy and carbon', path: `${DSX_ROOT}/sustainability`, hint: 'Energy drivers behind emissions reporting.' },
  financials: { id: 'financials', label: 'View Financial exposure', path: `${DSX_ROOT}/sustainability/financial`, hint: 'Cost drivers and the assumptions behind them.' },
  sovereignty: { id: 'sovereignty', label: 'View Sovereignty', path: `${DSX_ROOT}/sustainability/sovereignty`, hint: 'Residency, custody and attestation claims.' },
  overview: { id: 'overview', label: 'Back to Overview', path: `${DSX_ROOT}/overview`, hint: 'Facility condition, exceptions and coverage.' },
} satisfies Record<string, RelatedView>;

const BY_CLASS: Record<AssetClass, RelatedView[]> = {
  site: [V.facility, V.thermal, V.power, V.cooling, V.network, V.workload, V.evidence],
  data_hall: [V.facility, V.thermal, V.cooling, V.power, V.workload, V.evidence],
  rack: [V.facility, V.thermal, V.power, V.cooling, V.network, V.workload, V.evidence],
  cooling_unit: [V.cooling, V.thermal, V.facility, V.simulations, V.evidence],
  cdu: [V.cooling, V.thermal, V.facility, V.simulations, V.evidence],
  ups: [V.power, V.facility, V.workload, V.financials, V.evidence],
  rpp: [V.power, V.facility, V.workload, V.evidence],
  sensor: [V.facility, V.evidence],
};

export function relatedViewsForAsset(assetClass: AssetClass): RelatedView[] {
  return BY_CLASS[assetClass] ?? [V.facility, V.evidence];
}

const BY_DOMAIN: Record<string, RelatedView[]> = {
  thermal: [V.thermal, V.facility, V.cooling, V.workload, V.evidence],
  power: [V.power, V.facility, V.workload, V.financials],
  cooling: [V.cooling, V.thermal, V.facility, V.simulations],
  network: [V.network, V.facility, V.workload, V.evidence],
  facility: [V.facility, V.thermal, V.power, V.cooling, V.network],
  workload: [V.workload, V.facility, V.thermal, V.power, V.sovereignty],
  sovereignty: [V.sovereignty, V.workload, V.facility, V.evidence],
  carbon: [V.carbon, V.power, V.workload, V.financials],
  financial: [V.financials, V.power, V.simulations, V.evidence],
};

export function relatedViewsForDomain(domain: string): RelatedView[] {
  return BY_DOMAIN[domain] ?? [V.overview, V.evidence];
}
