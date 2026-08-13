/**
 * Overlay contract for the facility model.
 *
 * Every selectable layer declares what it colours, at what resolution, with
 * which units, thresholds and legend. A layer that cannot be resolved at the
 * rack level must say so explicitly (`rackResolution: 'unavailable'`) instead
 * of reusing a generic Nominal / Watch / Constraint legend that does not apply
 * to the displayed evidence.
 */

import type { TwinOverlay } from '@/context/TwinOverlayContext';

export interface LegendStop {
  label: string;
  /** CSS colour used by both the 3D overlay meshes and the HTML legend. */
  color: string;
}

export interface OverlayContract {
  id: TwinOverlay;
  label: string;
  /** Short statement of what the coloured surface means. */
  meaning: string;
  /** Unit rendered alongside values, empty when the layer is categorical. */
  unit: string;
  /** Where the layer can be resolved with the evidence AURA actually holds. */
  rackResolution: 'rack' | 'facility' | 'unavailable';
  /** Message shown when the layer has no rack-level spatial effect. */
  unavailableNote?: string;
  legend: LegendStop[];
  /** How the value is derived, surfaced next to the legend for provenance. */
  provenance: string;
}

const NOMINAL = '#22c55e';
const WATCH = '#f59e0b';
const CONSTRAINT = '#ef4444';
const UNKNOWN = '#6b7280';

export const OVERLAY_CONTRACTS: Record<TwinOverlay, OverlayContract> = {
  none: {
    id: 'none',
    label: 'No layer',
    meaning: 'Physical model only. No telemetry is applied to the equipment.',
    unit: '',
    rackResolution: 'unavailable',
    unavailableNote: 'Select a layer to apply evidence to the model.',
    legend: [],
    provenance: 'Physical model geometry, no telemetry binding.',
  },
  thermal: {
    id: 'thermal',
    label: 'Thermal',
    meaning: 'Rack inlet temperature applied to the rack face.',
    unit: '\u00b0C',
    rackResolution: 'rack',
    legend: [
      { label: 'Under 22 \u00b0C', color: '#3b82f6' },
      { label: '22 to 27 \u00b0C', color: NOMINAL },
      { label: '27 to 32 \u00b0C', color: WATCH },
      { label: 'Over 32 \u00b0C', color: CONSTRAINT },
      { label: 'No evidence', color: UNKNOWN },
    ],
    provenance: 'Simulated inlet temperature per rack from the active run.',
  },
  power: {
    id: 'power',
    label: 'Power',
    meaning: 'Rack power draw against modelled branch capacity.',
    unit: '% of capacity',
    rackResolution: 'rack',
    legend: [
      { label: 'Under 70 %', color: NOMINAL },
      { label: '70 to 90 %', color: WATCH },
      { label: 'Over 90 %', color: CONSTRAINT },
      { label: 'No evidence', color: UNKNOWN },
    ],
    provenance: 'Rack kW from the active run over modelled branch capacity.',
  },
  cooling: {
    id: 'cooling',
    label: 'Cooling',
    meaning: 'Cooling delivery path and return-air temperature by aisle.',
    unit: '\u00b0C return',
    rackResolution: 'rack',
    legend: [
      { label: 'Within setpoint', color: NOMINAL },
      { label: 'Approaching limit', color: WATCH },
      { label: 'Above limit', color: CONSTRAINT },
      { label: 'No evidence', color: UNKNOWN },
    ],
    provenance: 'Cooling loop model plus per-rack return temperature.',
  },
  gpu: {
    id: 'gpu',
    label: 'Accelerator load',
    meaning: 'Accelerator utilisation on racks that report compute telemetry.',
    unit: '% utilisation',
    rackResolution: 'rack',
    legend: [
      { label: 'Under 50 %', color: '#3b82f6' },
      { label: '50 to 85 %', color: NOMINAL },
      { label: 'Over 85 %', color: WATCH },
      { label: 'No evidence', color: UNKNOWN },
    ],
    provenance: 'Accelerator utilisation reported by the simulated workload.',
  },
  workload: {
    id: 'workload',
    label: 'Workload',
    meaning: 'Placed workload density per rack.',
    unit: '% of usable capacity',
    rackResolution: 'rack',
    legend: [
      { label: 'Light', color: '#3b82f6' },
      { label: 'Balanced', color: NOMINAL },
      { label: 'Saturated', color: WATCH },
      { label: 'No evidence', color: UNKNOWN },
    ],
    provenance: 'Workload placement from the active scenario.',
  },
  network: {
    id: 'network',
    label: 'Network',
    meaning: 'Fabric links between top-of-rack and spine equipment.',
    unit: 'Gb/s',
    rackResolution: 'rack',
    legend: [
      { label: 'Link healthy', color: NOMINAL },
      { label: 'Congested', color: WATCH },
      { label: 'Degraded', color: CONSTRAINT },
      { label: 'No evidence', color: UNKNOWN },
    ],
    provenance: 'Modelled fabric topology, not live SNMP counters.',
  },
  sovereignty: {
    id: 'sovereignty',
    label: 'Sovereignty',
    meaning: 'Data-residency zone assigned to each rack group.',
    unit: '',
    rackResolution: 'rack',
    legend: [
      { label: 'In-jurisdiction', color: NOMINAL },
      { label: 'Review required', color: WATCH },
      { label: 'Out of jurisdiction', color: CONSTRAINT },
      { label: 'Unclassified', color: UNKNOWN },
    ],
    provenance: 'Residency classification recorded on the facility model.',
  },
  carbon: {
    id: 'carbon',
    label: 'Carbon',
    meaning:
      'Grid carbon intensity is a facility-wide input. AURA holds no per-rack energy allocation evidence, so no rack-level emissions are drawn.',
    unit: 'gCO2e/kWh (facility)',
    rackResolution: 'facility',
    unavailableNote:
      'Rack-level carbon allocation unavailable. Carbon intensity applies to the facility energy flow, not to individual racks.',
    legend: [
      { label: 'Facility intensity (grid input)', color: '#0ea5a4' },
      { label: 'Facility energy flow', color: '#38bdf8' },
      { label: 'Rack allocation unavailable', color: UNKNOWN },
    ],
    provenance:
      'Facility energy total from the active run multiplied by the published regional grid intensity. No per-rack sub-metering evidence exists.',
  },
};

export function overlayContract(id: TwinOverlay | 'none' | undefined): OverlayContract {
  return OVERLAY_CONTRACTS[(id ?? 'none') as TwinOverlay] ?? OVERLAY_CONTRACTS.none;
}
