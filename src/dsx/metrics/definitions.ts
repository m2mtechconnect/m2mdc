/**
 * Operational KPI definitions. Every value is computed from named inputs;
 * no KPI is hardcoded. Missing inputs produce an UNAVAILABLE metric.
 */
import type { MetricDefinition } from '../contracts/provenancedMetric';

export const FORMULA_VERSION = 'aura-dsx-kpi/1.0.0';

export const KPI_DEFINITIONS: Record<string, MetricDefinition> = {
  it_load: {
    metric_name: 'IT load',
    unit: 'kW',
    formula: 'sum(rack_it_power)',
    formula_version: FORMULA_VERSION,
    required_inputs: ['it_power_total'],
    compute: (i) => i.it_power_total,
  },
  cooling_load: {
    metric_name: 'Cooling load',
    unit: 'kW',
    formula: 'sum(cooling_unit_power)',
    formula_version: FORMULA_VERSION,
    required_inputs: ['cooling_power_total'],
    compute: (i) => i.cooling_power_total,
  },
  facility_load: {
    metric_name: 'Facility load',
    unit: 'kW',
    formula: 'it_power_total + cooling_power_total',
    formula_version: FORMULA_VERSION,
    required_inputs: ['it_power_total', 'cooling_power_total'],
    compute: (i) => i.it_power_total + i.cooling_power_total,
  },
  pue: {
    metric_name: 'PUE',
    unit: 'ratio',
    formula: '(it_power_total + cooling_power_total) / it_power_total',
    formula_version: FORMULA_VERSION,
    required_inputs: ['it_power_total', 'cooling_power_total'],
    compute: (i) => (i.it_power_total + i.cooling_power_total) / i.it_power_total,
  },
  wue: {
    metric_name: 'WUE',
    unit: 'L/kWh',
    formula: 'water_consumption_l / it_energy_kwh',
    formula_version: FORMULA_VERSION,
    required_inputs: ['water_consumption_l', 'it_energy_kwh'],
    compute: (i) => i.water_consumption_l / i.it_energy_kwh,
  },
  cue: {
    metric_name: 'CUE',
    unit: 'kgCO2e/kWh',
    formula: '(facility_energy_kwh * grid_intensity_g_per_kwh / 1000) / it_energy_kwh',
    formula_version: FORMULA_VERSION,
    required_inputs: ['facility_energy_kwh', 'grid_intensity_g_per_kwh', 'it_energy_kwh'],
    compute: (i) => (i.facility_energy_kwh * i.grid_intensity_g_per_kwh) / 1000 / i.it_energy_kwh,
  },
  max_rack_inlet: {
    metric_name: 'Max rack inlet temperature',
    unit: 'degC',
    formula: 'max(rack_inlet_temp)',
    formula_version: FORMULA_VERSION,
    required_inputs: ['max_inlet_c'],
    compute: (i) => i.max_inlet_c,
  },
  thermal_headroom: {
    metric_name: 'Thermal headroom',
    unit: 'degC',
    formula: 'design_inlet_limit_c - max_inlet_c',
    formula_version: FORMULA_VERSION,
    required_inputs: ['design_inlet_limit_c', 'max_inlet_c'],
    compute: (i) => i.design_inlet_limit_c - i.max_inlet_c,
  },
  power_capacity_utilisation: {
    metric_name: 'Power capacity utilisation',
    unit: '%',
    formula: '100 * (it_power_total + cooling_power_total) / site_rated_kw',
    formula_version: FORMULA_VERSION,
    required_inputs: ['it_power_total', 'cooling_power_total', 'site_rated_kw'],
    compute: (i) => (100 * (i.it_power_total + i.cooling_power_total)) / i.site_rated_kw,
  },
  telemetry_freshness: {
    metric_name: 'Telemetry freshness',
    unit: 's',
    formula: '(now - last_observed_at) / 1000',
    formula_version: FORMULA_VERSION,
    required_inputs: ['age_seconds'],
    compute: (i) => i.age_seconds,
  },
  mapping_coverage: {
    metric_name: 'Asset-mapping coverage',
    unit: '%',
    formula: '100 * mapped_sources / observed_sources',
    formula_version: FORMULA_VERSION,
    required_inputs: ['mapped_sources', 'observed_sources'],
    compute: (i) => (100 * i.mapped_sources) / i.observed_sources,
  },
  data_quality: {
    metric_name: 'Data-quality score',
    unit: '%',
    formula: '100 * accepted_events / (accepted_events + rejected_events)',
    formula_version: FORMULA_VERSION,
    required_inputs: ['accepted_events', 'rejected_events'],
    compute: (i) => (100 * i.accepted_events) / (i.accepted_events + i.rejected_events),
  },
};

export type KpiKey = keyof typeof KPI_DEFINITIONS;