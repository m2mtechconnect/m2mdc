/**
 * Capability availability registry.
 *
 * Every workspace module declares, in one place, whether its underlying
 * source is genuinely instrumented in the Evidence Beta fixture. A module
 * that is not instrumented renders an honest Unavailable or Planned state.
 * No module may synthesise a value to fill a gap.
 */

export type CapabilityState = 'operational' | 'unavailable' | 'planned';

export interface Capability {
  id: string;
  label: string;
  state: CapabilityState;
  /** Plain-language reason shown to the operator. Never a marketing claim. */
  reason: string;
  /** Named inputs that would be required to make this operational. */
  missing_inputs: string[];
}

function cap(
  id: string,
  label: string,
  state: CapabilityState,
  reason: string,
  missing_inputs: string[] = [],
): Capability {
  return { id, label, state, reason, missing_inputs };
}

const INSTRUMENTED = 'Instrumented by the deterministic Evidence Beta fixture.';

export const CAPABILITIES: Record<string, Capability> = {
  // Thermal
  rack_inlet_temperature: cap('rack_inlet_temperature', 'Rack inlet temperature', 'operational', INSTRUMENTED),
  rack_exhaust_temperature: cap(
    'rack_exhaust_temperature', 'Rack exhaust temperature', 'unavailable',
    'No exhaust probe exists on any fixture rack.', ['rack_exhaust_temp_c'],
  ),
  airflow_field: cap(
    'airflow_field', 'Airflow and pressure field', 'unavailable',
    'No CFD, surrogate airflow model or differential-pressure instrumentation is connected.',
    ['airflow_m3_s', 'differential_pressure_pa'],
  ),

  // Power
  rack_power_metering: cap('rack_power_metering', 'Rack power metering', 'operational', INSTRUMENTED),
  ups_metering: cap(
    'ups_metering', 'UPS metering', 'unavailable',
    'The fixture UPS publishes no electrical telemetry.', ['ups_load_kw', 'ups_efficiency_pct'],
  ),
  power_quality: cap(
    'power_quality', 'Power quality', 'unavailable',
    'No harmonic, power-factor or voltage-quality source is connected.',
    ['power_factor', 'thd_pct', 'voltage_v'],
  ),
  maxlps: cap(
    'maxlps', 'DSX MaxLPS power allocation', 'unavailable',
    'DSX MaxLPS is not integrated. No power-allocation result is produced.',
    ['workload_requested_power_kw', 'rack_power_cap_kw', 'allocation_plan'],
  ),
  dsx_flex: cap(
    'dsx_flex', 'DSX Flex grid interaction', 'unavailable',
    'No grid, demand-response, price or BESS signal is connected.',
    ['grid_target_kw', 'demand_response_signal', 'bess_state_of_charge_pct', 'energy_price'],
  ),

  // Cooling
  cooling_unit_power: cap('cooling_unit_power', 'Cooling unit electrical draw', 'operational', INSTRUMENTED),
  coolant_temperatures: cap(
    'coolant_temperatures', 'Supply and return coolant temperature', 'unavailable',
    'The fixture CDU and cooling units publish no coolant temperature.',
    ['coolant_supply_c', 'coolant_return_c'],
  ),
  coolant_hydraulics: cap(
    'coolant_hydraulics', 'Flow rate and pressure drop', 'unavailable',
    'No flow meter or pressure transducer exists in the fixture.',
    ['flow_rate_l_min', 'pressure_drop_kpa'],
  ),
  leak_detection: cap(
    'leak_detection', 'Leak detection', 'unavailable',
    'No leak-detection loop is connected.', ['leak_alarm_state'],
  ),
  water_metering: cap(
    'water_metering', 'Facility water metering', 'unavailable',
    'No water meter is connected, so WUE cannot be calculated.',
    ['water_consumption_l', 'it_energy_kwh'],
  ),

  // Network
  compute_fabric: cap(
    'compute_fabric', 'Compute fabric telemetry', 'unavailable',
    'No compute-fabric (GPU east-west) telemetry source is connected.',
    ['link_utilisation_pct', 'packet_loss_pct', 'latency_p99_us'],
  ),
  storage_fabric: cap(
    'storage_fabric', 'Storage fabric telemetry', 'unavailable',
    'No storage-fabric telemetry source is connected.', ['link_utilisation_pct', 'iops'],
  ),
  management_network: cap(
    'management_network', 'Management network telemetry', 'unavailable',
    'No management-network telemetry source is connected.', ['reachability', 'error_rate'],
  ),
  dsx_exchange_runtime: cap(
    'dsx_exchange_runtime', 'Message bridge runtime', 'unavailable',
    'No broker is connected to this browser session. AURA\'s own MQTT/NATS message bridge is verified only against a local harness broker, and NVIDIA DSX Exchange is not deployed.',
    ['broker_endpoint', 'authenticated_session'],
  ),

  // Workload
  workload_scheduler: cap(
    'workload_scheduler', 'Workload scheduler', 'unavailable',
    'No scheduler or GPU inventory source is connected. Rack placement is shown from the facility fixture only.',
    ['gpu_inventory', 'job_queue', 'workload_placement'],
  ),

  // Sovereignty
  node_attestation: cap(
    'node_attestation', 'Node and DPU attestation', 'unavailable',
    'No attestation, measured-boot or key-location evidence source is connected.',
    ['attestation_report', 'measured_boot_state', 'key_location'],
  ),
  residency_evidence: cap(
    'residency_evidence', 'Workload and data residency evidence', 'unavailable',
    'No tenant, dataset or egress record source is connected.',
    ['workload_location', 'dataset_location', 'egress_log'],
  ),

  // Carbon
  grid_carbon_intensity: cap(
    'grid_carbon_intensity', 'Grid carbon intensity', 'unavailable',
    'No grid carbon-intensity feed or emission-factor registry is connected.',
    ['grid_intensity_g_per_kwh', 'emission_factor_source'],
  ),
  renewable_mix: cap(
    'renewable_mix', 'Renewable energy mix', 'unavailable',
    'No energy-mix or market-instrument source is connected.', ['renewable_pct'],
  ),
  heat_reuse: cap(
    'heat_reuse', 'Heat recovery', 'unavailable',
    'No heat-recovery instrumentation exists in the fixture.', ['heat_recovered_kwh'],
  ),

  // Financial
  energy_tariff: cap(
    'energy_tariff', 'Energy tariff and demand charges', 'unavailable',
    'No contracted tariff, demand-charge schedule or billing record is connected.',
    ['energy_price_per_kwh', 'demand_charge_per_kw'],
  ),
  cost_ledger: cap(
    'cost_ledger', 'Capital and operating cost ledger', 'unavailable',
    'No CAPEX/OPEX ledger, budget or maintenance-cost source is connected.',
    ['capex_records', 'opex_records', 'budget'],
  ),

  // Viewer
  omniverse_stream: cap(
    'omniverse_stream', 'Omniverse Kit stream', 'unavailable',
    'No Omniverse Kit / WebRTC endpoint is reachable from this session. The topology fallback is used.',
    ['kit_endpoint'],
  ),
};

export function capability(id: string): Capability {
  const c = CAPABILITIES[id];
  if (!c) throw new Error(`unknown capability: ${id}`);
  return c;
}

export function isOperational(id: string): boolean {
  return capability(id).state === 'operational';
}

/** Scenario catalogue. Only implemented + tested scenarios may run. */
export interface ScenarioCatalogueEntry {
  id: string;
  label: string;
  question: string;
  state: CapabilityState;
  reason: string;
  /** Timeline id used when the scenario is operational. */
  timeline: 'normal' | 'cooling_degradation' | null;
}

export const SCENARIO_CATALOGUE: ScenarioCatalogueEntry[] = [
  {
    id: 'baseline_normal',
    label: 'Baseline (normal operation)',
    question: 'What does the facility look like with cooling capacity intact?',
    state: 'operational',
    reason: 'Deterministic normal timeline, verified by the Evidence Beta test suite.',
    timeline: 'normal',
  },
  {
    id: 'cooling_degradation',
    label: 'Cooling degradation',
    question: 'What happens to thermal headroom when a cooling loop loses capacity?',
    state: 'operational',
    reason: 'Deterministic degradation timeline, verified end to end by the Evidence Beta test suite.',
    timeline: 'cooling_degradation',
  },
  ...([
    ['rpp_failure', 'RPP failure', 'Which racks and workloads lose supply when a remote power panel fails?'],
    ['utility_loss', 'Utility loss', 'How long can the facility ride through a utility outage?'],
    ['rack_density_increase', 'Increased rack density', 'Can power and cooling absorb a higher rack density?'],
    ['workload_surge', 'Workload surge', 'What breaks first when compute demand surges?'],
    ['network_congestion', 'Network congestion', 'Which workloads are blocked when the fabric congests?'],
    ['grid_curtailment', 'Grid curtailment', 'What must be shed when the grid curtails supply?'],
    ['leak_response', 'Leak response', 'What is isolated and what is exposed during a coolant leak?'],
    ['configuration_comparison', 'Configuration comparison', 'Which facility configuration performs better?'],
  ] as const).map(([id, label, question]) => ({
    id,
    label,
    question,
    state: 'planned' as const,
    reason: 'Not implemented. No model, no fixture and no test exist, so this scenario produces no results.',
    timeline: null,
  })),
];

export function scenarioEntry(id: string): ScenarioCatalogueEntry | undefined {
  return SCENARIO_CATALOGUE.find((s) => s.id === id);
}

/** Scenarios that may render results. */
export const OPERATIONAL_SCENARIO_IDS = SCENARIO_CATALOGUE.filter((s) => s.state === 'operational').map((s) => s.id);