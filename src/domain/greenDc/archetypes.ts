/**
 * Green DC Twin Archetypes - Base Configurations for Each Industry
 * Industry-specific templates with objectives, agents, KPIs, and scenarios
 * 
 * ═══════════════════════════════════════════════════════════════════════════════
 * INDUSTRY SOURCE REFERENCES
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * FINANCIAL SERVICES DATA CENTERS:
 * - Basel Committee on Banking Supervision - Operational Resilience
 *   https://www.bis.org/bcbs/publ/d516.htm
 * - OSFI (Office of the Superintendent of Financial Institutions) Guidelines
 *   https://www.osfi-bsif.gc.ca/Eng/fi-if/rg-ro/gdn-ort/gl-ld/Pages/b10.aspx
 * - PCI-DSS Physical Security Requirements for Data Centers
 *   https://www.pcisecuritystandards.org/documents/PCI-DSS-v4-0.pdf
 * 
 * GOVERNMENT & PUBLIC SECTOR:
 * - Treasury Board of Canada - Protected B Cloud Security
 *   https://www.canada.ca/en/government/system/digital-government/digital-government-innovations/cloud-services/government-canada-cloud-adoption-strategy.html
 * - NIST SP 800-53 Security and Privacy Controls
 *   https://csrc.nist.gov/publications/detail/sp/800-53/rev-5/final
 * - FedRAMP High Baseline Requirements
 *   https://www.fedramp.gov/baselines/
 * 
 * HEALTHCARE DATA CENTERS:
 * - HIPAA Technical Safeguards (45 CFR § 164.312)
 *   https://www.hhs.gov/hipaa/for-professionals/security/laws-regulations/index.html
 * - PHIPA (Personal Health Information Protection Act - Ontario)
 *   https://www.ontario.ca/laws/statute/04p03
 * - HL7 FHIR Infrastructure Requirements
 *   https://www.hl7.org/fhir/
 * 
 * RETAIL & E-COMMERCE:
 * - Retail Industry Leaders Association (RILA) Sustainability Guidelines
 *   https://www.rila.org/sustainability
 * - NRF (National Retail Federation) Technology Standards
 *   https://nrf.com/resources/retail-technology
 * - Cold Chain Logistics - ASHRAE Refrigeration Handbook
 *   https://www.ashrae.org/technical-resources/ashrae-handbook
 * 
 * TELECOMMUNICATIONS:
 * - ETSI NFV (Network Functions Virtualization) Standards
 *   https://www.etsi.org/technologies/nfv
 * - 3GPP 5G Core Network Requirements
 *   https://www.3gpp.org/technologies/5g-system-overview
 * - TM Forum Edge Computing Architecture
 *   https://www.tmforum.org/
 * 
 * MANUFACTURING & INDUSTRIAL:
 * - IEC 62443 Industrial Cybersecurity Standard
 *   https://www.iec.ch/cyber-security
 * - ISA-95 Enterprise-Control System Integration
 *   https://www.isa.org/standards-and-publications/isa-standards
 * - OPC UA (Unified Architecture) Specification
 *   https://opcfoundation.org/about/opc-technologies/opc-ua/
 * 
 * ENERGY & UTILITIES:
 * - NERC CIP (Critical Infrastructure Protection) Standards
 *   https://www.nerc.com/pa/Stand/Pages/CIPStandards.aspx
 * - IEEE 2030 Smart Grid Interoperability
 *   https://standards.ieee.org/standard/2030-2011.html
 * - IEC 61850 Communication Networks in Substations
 *   https://www.iec.ch/smartgrid/standards/
 * 
 * RESEARCH & EDUCATION:
 * - CANARIE (Canada's National Research and Education Network)
 *   https://www.canarie.ca/
 * - Internet2 Research Network Requirements
 *   https://internet2.edu/
 * - NSF Cyberinfrastructure Guidelines
 *   https://www.nsf.gov/cise/oac/
 * 
 * KPI TARGETS & BENCHMARKS:
 * - Uptime Institute Global Data Center Survey
 *   https://uptimeinstitute.com/annual-global-data-center-survey
 * - The Green Grid PUE Efficiency Benchmarks
 *   https://www.thegreengrid.org/en/resources/library
 * - EPA ENERGY STAR Data Center Rating
 *   https://www.energystar.gov/buildings/benchmark/understand_metrics/data_center
 * 
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import type { DcTwinArchetypeId, GreenDcTwinRecommendation } from "@/types/greenDcTwin";
import { AgentId, mapArchetypeAgentIds } from './agentsCatalog';
import { KPIKey } from './kpiCatalog';

export interface GreenDcArchetype {
  id: DcTwinArchetypeId;
  label: string;
  defaultObjectives: string[];
  /** Archetype agent IDs (will be mapped to AgentId via mapArchetypeAgentIds) */
  defaultAgents: string[];
  /** Mapped AgentIds for type-safe usage */
  defaultAgentIds?: AgentId[];
  defaultKpiTargets: Partial<GreenDcTwinRecommendation["kpiTargets"]>;
  /** KPI keys this archetype tracks */
  defaultKpiKeys?: KPIKey[];
  defaultScenarios: string[];
}

export const GREEN_DC_ARCHETYPES: Record<DcTwinArchetypeId, GreenDcArchetype> = {
  finance_core_banking_green_twin: {
    id: "finance_core_banking_green_twin",
    label: "Green Core Banking DC Twin",
    defaultObjectives: [
      "Guarantee 99.99% uptime for core banking systems",
      "Minimize carbon footprint per transaction",
      "Ensure strict financial data sovereignty compliance",
      "Optimize power usage during trading hours peaks"
    ],
    defaultAgents: [
      "thermal_agent",
      "power_agent",
      "cooling_agent",
      "network_agent",
      "facility_safety_agent",
      "workload_gpu_agent",
      "sovereignty_agent",
      "carbon_cost_agent",
      "incident_response_agent"
    ],
    defaultKpiTargets: {
      pueTarget: 1.25,
      renewableShareTargetPct: 80,
      sovereigntyScoreTargetPct: 98,
      carbonIntensityTargetGPerKwh: 50,
      uptimeTargetPct: 99.99
    },
    defaultScenarios: [
      "trading_peak_surge",
      "ups_failure_generator_failover",
      "cooling_unit_degradation",
      "grid_outage_battery_transition",
      "sovereignty_routing_violation"
    ]
  },
  retail_ecommerce_green_twin: {
    id: "retail_ecommerce_green_twin",
    label: "Green E-Commerce DC Twin",
    defaultObjectives: [
      "Scale elastically for Black Friday/Cyber Monday peaks",
      "Minimize carbon per order processed",
      "Maintain sub-100ms checkout latency globally",
      "Optimize cooling during demand spikes"
    ],
    defaultAgents: [
      "thermal_agent",
      "power_agent",
      "cooling_agent",
      "network_agent",
      "workload_gpu_agent",
      "carbon_cost_agent",
      "incident_response_agent"
    ],
    defaultKpiTargets: {
      pueTarget: 1.3,
      renewableShareTargetPct: 75,
      sovereigntyScoreTargetPct: 85,
      carbonIntensityTargetGPerKwh: 70,
      uptimeTargetPct: 99.95
    },
    defaultScenarios: [
      "black_friday_peak_load",
      "flash_sale_gpu_spike",
      "cooling_cascade_failure",
      "cdn_origin_overload",
      "carbon_price_spike"
    ]
  },
  retail_hyperscale_green_twin: {
    id: "retail_hyperscale_green_twin",
    label: "Hyperscale Retail DC Twin (Fortune 50)",
    defaultObjectives: [
      "Maintain sub-2-second failover for 4,000+ distributed retail edge sites",
      "Reduce cold-chain energy consumption across logistics and stores",
      "Optimize GPU fleet for real-time computer vision (inventory, robotics)",
      "Improve global supply chain sovereignty compliance",
      "Reduce carbon footprint for refrigerated warehouses",
      "Optimize edge–core–cloud routing for retail AI workloads"
    ],
    defaultAgents: [
      "thermal_agent",
      "power_agent",
      "cooling_agent",
      "network_agent",
      "facility_safety_agent",
      "workload_gpu_agent",
      "sovereignty_agent",
      "carbon_cost_agent",
      "incident_response_agent",
      "retail_edge_resilience_agent",
      "cold_chain_optimizer_agent",
      "supply_chain_sovereignty_agent"
    ],
    defaultKpiTargets: {
      pueTarget: 1.25,
      renewableShareTargetPct: 85,
      sovereigntyScoreTargetPct: 92,
      carbonIntensityTargetGPerKwh: 55,
      uptimeTargetPct: 99.99
    },
    defaultScenarios: [
      "black_friday_peak_load",
      "flash_sale_gpu_spike",
      "cooling_cascade_failure",
      "cdn_origin_overload",
      "carbon_price_spike",
      "retail_edge_failure",
      "cold_chain_failure",
      "logistics_dc_overload",
      "ai_model_drift",
      "global_sovereignty_breach"
    ]
  },
  gov_sovereign_cloud_twin: {
    id: "gov_sovereign_cloud_twin",
    label: "Sovereign Government Cloud Twin",
    defaultObjectives: [
      "100% data residency compliance within jurisdiction",
      "Zero unauthorized cross-border data flows",
      "Meet government net-zero commitments",
      "Maintain classified workload isolation"
    ],
    defaultAgents: [
      "thermal_agent",
      "power_agent",
      "cooling_agent",
      "network_agent",
      "facility_safety_agent",
      "workload_gpu_agent",
      "sovereignty_agent",
      "carbon_cost_agent",
      "incident_response_agent"
    ],
    defaultKpiTargets: {
      pueTarget: 1.35,
      renewableShareTargetPct: 90,
      sovereigntyScoreTargetPct: 100,
      carbonIntensityTargetGPerKwh: 40,
      uptimeTargetPct: 99.99
    },
    defaultScenarios: [
      "sovereignty_breach_attempt",
      "classified_workload_spillover",
      "grid_outage_critical_services",
      "thermal_excursion_secure_zone",
      "emergency_evacuation_protocol"
    ]
  },
  saas_multitenant_ai_twin: {
    id: "saas_multitenant_ai_twin",
    label: "Green Multi-Tenant AI/SaaS Twin",
    defaultObjectives: [
      "Optimize GPU utilization across training and inference",
      "Balance carbon intensity with latency SLAs",
      "Fair resource allocation across tenants",
      "Minimize idle GPU power consumption"
    ],
    defaultAgents: [
      "thermal_agent",
      "power_agent",
      "cooling_agent",
      "network_agent",
      "workload_gpu_agent",
      "carbon_cost_agent",
      "incident_response_agent"
    ],
    defaultKpiTargets: {
      pueTarget: 1.2,
      renewableShareTargetPct: 85,
      sovereigntyScoreTargetPct: 80,
      carbonIntensityTargetGPerKwh: 45,
      uptimeTargetPct: 99.9
    },
    defaultScenarios: [
      "training_job_surge",
      "gpu_thermal_throttling",
      "tenant_noisy_neighbor",
      "model_serving_spike",
      "renewable_availability_drop"
    ]
  },
  healthcare_phi_twin: {
    id: "healthcare_phi_twin",
    label: "Green Healthcare PHI Twin",
    defaultObjectives: [
      "HIPAA/PHIPA compliant data handling at all times",
      "Sub-second access to patient imaging systems",
      "Continuous uptime for life-critical systems",
      "Minimize carbon while maintaining redundancy"
    ],
    defaultAgents: [
      "thermal_agent",
      "power_agent",
      "cooling_agent",
      "network_agent",
      "facility_safety_agent",
      "sovereignty_agent",
      "carbon_cost_agent",
      "incident_response_agent"
    ],
    defaultKpiTargets: {
      pueTarget: 1.35,
      renewableShareTargetPct: 70,
      sovereigntyScoreTargetPct: 100,
      carbonIntensityTargetGPerKwh: 65,
      uptimeTargetPct: 99.999
    },
    defaultScenarios: [
      "ehr_access_surge",
      "imaging_storage_spike",
      "hipaa_audit_simulation",
      "emergency_generator_test",
      "phi_sovereignty_violation"
    ]
  },
  telco_edge_5g_twin: {
    id: "telco_edge_5g_twin",
    label: "Green Telco Edge/5G Twin",
    defaultObjectives: [
      "Ultra-low latency for 5G edge workloads",
      "Distributed cooling optimization across edge sites",
      "Minimize tower power consumption",
      "Carbon-aware traffic routing"
    ],
    defaultAgents: [
      "thermal_agent",
      "power_agent",
      "cooling_agent",
      "network_agent",
      "workload_gpu_agent",
      "carbon_cost_agent",
      "incident_response_agent"
    ],
    defaultKpiTargets: {
      pueTarget: 1.4,
      renewableShareTargetPct: 60,
      sovereigntyScoreTargetPct: 75,
      carbonIntensityTargetGPerKwh: 80,
      uptimeTargetPct: 99.95
    },
    defaultScenarios: [
      "edge_site_overload",
      "backhaul_congestion",
      "distributed_cooling_failure",
      "5g_traffic_surge",
      "renewable_grid_fluctuation"
    ]
  },
  manufacturing_iiot_twin: {
    id: "manufacturing_iiot_twin",
    label: "Green Manufacturing IIoT Twin",
    defaultObjectives: [
      "Real-time OT data processing with minimal latency",
      "Integration with factory floor systems (OPC-UA/Modbus)",
      "Predictive maintenance model hosting",
      "Carbon tracking per production line"
    ],
    defaultAgents: [
      "thermal_agent",
      "power_agent",
      "cooling_agent",
      "network_agent",
      "facility_safety_agent",
      "workload_gpu_agent",
      "carbon_cost_agent",
      "incident_response_agent"
    ],
    defaultKpiTargets: {
      pueTarget: 1.35,
      renewableShareTargetPct: 65,
      sovereigntyScoreTargetPct: 70,
      carbonIntensityTargetGPerKwh: 75,
      uptimeTargetPct: 99.9
    },
    defaultScenarios: [
      "production_line_surge",
      "ot_network_isolation",
      "scada_integration_failure",
      "predictive_model_update",
      "shift_change_load_spike"
    ]
  },
  energy_grid_ai_twin: {
    id: "energy_grid_ai_twin",
    label: "Green Energy/Grid AI Twin",
    defaultObjectives: [
      "Real-time grid balancing and demand response",
      "Maximize renewable energy utilization",
      "Carbon-negative data center operations",
      "Grid stability during peak demand"
    ],
    defaultAgents: [
      "thermal_agent",
      "power_agent",
      "cooling_agent",
      "network_agent",
      "carbon_cost_agent",
      "incident_response_agent"
    ],
    defaultKpiTargets: {
      pueTarget: 1.15,
      renewableShareTargetPct: 100,
      sovereigntyScoreTargetPct: 60,
      carbonIntensityTargetGPerKwh: 20,
      uptimeTargetPct: 99.9
    },
    defaultScenarios: [
      "grid_frequency_deviation",
      "renewable_intermittency",
      "demand_response_event",
      "battery_storage_cycle",
      "carbon_credit_optimization"
    ]
  },
  education_research_ai_twin: {
    id: "education_research_ai_twin",
    label: "Green Research/Education AI Twin",
    defaultObjectives: [
      "Burst capacity for research computing workloads",
      "Fair GPU allocation across research groups",
      "Grant compliance and usage tracking",
      "Minimize carbon per research computation"
    ],
    defaultAgents: [
      "thermal_agent",
      "power_agent",
      "cooling_agent",
      "network_agent",
      "workload_gpu_agent",
      "carbon_cost_agent",
      "incident_response_agent"
    ],
    defaultKpiTargets: {
      pueTarget: 1.25,
      renewableShareTargetPct: 80,
      sovereigntyScoreTargetPct: 70,
      carbonIntensityTargetGPerKwh: 55,
      uptimeTargetPct: 99.5
    },
    defaultScenarios: [
      "semester_end_compute_rush",
      "research_grant_deadline",
      "shared_cluster_contention",
      "data_intensive_experiment",
      "conference_demo_preparation"
    ]
  },
  generic_enterprise_green_twin: {
    id: "generic_enterprise_green_twin",
    label: "Green Enterprise DC Twin",
    defaultObjectives: [
      "Optimize power usage effectiveness (PUE)",
      "Increase renewable energy share",
      "Reduce carbon footprint year-over-year",
      "Maintain high availability for business workloads"
    ],
    defaultAgents: [
      "thermal_agent",
      "power_agent",
      "cooling_agent",
      "network_agent",
      "facility_safety_agent",
      "workload_gpu_agent",
      "sovereignty_agent",
      "carbon_cost_agent",
      "incident_response_agent"
    ],
    defaultKpiTargets: {
      pueTarget: 1.3,
      renewableShareTargetPct: 70,
      sovereigntyScoreTargetPct: 80,
      carbonIntensityTargetGPerKwh: 70,
      uptimeTargetPct: 99.9
    },
    defaultScenarios: [
      "gpu_spike_training_cluster",
      "cooling_unit_degradation",
      "ups_failure_generator_failover",
      "carbon_price_spike",
      "grid_outage_battery_transition"
    ]
  }
};

/**
 * Agent ID to display name mapping
 */
export const AGENT_DISPLAY_NAMES: Record<string, string> = {
  thermal_agent: "Thermal Guardian",
  power_agent: "Power & UPS Monitor",
  cooling_agent: "Cooling Optimization Agent",
  network_agent: "Network Fabric Agent",
  facility_safety_agent: "Facility & Safety Agent",
  workload_gpu_agent: "Workload Orchestrator",
  sovereignty_agent: "Sovereignty Sentinel",
  carbon_cost_agent: "Carbon & Cost Agent",
  incident_response_agent: "Incident Response Agent",
  // Retail-specific agents
  retail_edge_resilience_agent: "Retail Edge Resilience Agent",
  cold_chain_optimizer_agent: "Cold Chain Optimization Agent",
  supply_chain_sovereignty_agent: "Supply Chain Sovereignty Agent"
};

/**
 * Scenario ID to display info mapping
 */
export const SCENARIO_DISPLAY_INFO: Record<string, { name: string; severity: string; domain: string }> = {
  trading_peak_surge: { name: "Trading Peak Surge", severity: "high", domain: "workload" },
  ups_failure_generator_failover: { name: "UPS Failure – Generator Failover", severity: "critical", domain: "power" },
  cooling_unit_degradation: { name: "Cooling Unit Degradation", severity: "medium", domain: "cooling" },
  grid_outage_battery_transition: { name: "Grid Outage – Battery Transition", severity: "critical", domain: "power" },
  sovereignty_routing_violation: { name: "Sovereignty Routing Violation", severity: "high", domain: "sovereignty" },
  black_friday_peak_load: { name: "Black Friday Peak Load", severity: "high", domain: "workload" },
  flash_sale_gpu_spike: { name: "Flash Sale GPU Spike", severity: "medium", domain: "workload" },
  cooling_cascade_failure: { name: "Cooling Cascade Failure", severity: "critical", domain: "cooling" },
  cdn_origin_overload: { name: "CDN Origin Overload", severity: "medium", domain: "network" },
  carbon_price_spike: { name: "Carbon Price Spike", severity: "medium", domain: "financial" },
  gpu_spike_training_cluster: { name: "GPU Spike – Training Cluster", severity: "high", domain: "workload" },
  sovereignty_breach_attempt: { name: "Sovereignty Breach Attempt", severity: "critical", domain: "sovereignty" },
  classified_workload_spillover: { name: "Classified Workload Spillover", severity: "critical", domain: "sovereignty" },
  training_job_surge: { name: "Training Job Surge", severity: "high", domain: "workload" },
  gpu_thermal_throttling: { name: "GPU Thermal Throttling", severity: "medium", domain: "thermal" },
  tenant_noisy_neighbor: { name: "Tenant Noisy Neighbor", severity: "low", domain: "workload" },
  model_serving_spike: { name: "Model Serving Spike", severity: "medium", domain: "workload" },
  renewable_availability_drop: { name: "Renewable Availability Drop", severity: "low", domain: "financial" },
  ehr_access_surge: { name: "EHR Access Surge", severity: "high", domain: "workload" },
  imaging_storage_spike: { name: "Imaging Storage Spike", severity: "medium", domain: "workload" },
  hipaa_audit_simulation: { name: "HIPAA Audit Simulation", severity: "low", domain: "sovereignty" },
  emergency_generator_test: { name: "Emergency Generator Test", severity: "low", domain: "power" },
  phi_sovereignty_violation: { name: "PHI Sovereignty Violation", severity: "critical", domain: "sovereignty" },
  edge_site_overload: { name: "Edge Site Overload", severity: "high", domain: "network" },
  backhaul_congestion: { name: "Backhaul Congestion", severity: "medium", domain: "network" },
  distributed_cooling_failure: { name: "Distributed Cooling Failure", severity: "high", domain: "cooling" },
  "5g_traffic_surge": { name: "5G Traffic Surge", severity: "high", domain: "network" },
  renewable_grid_fluctuation: { name: "Renewable Grid Fluctuation", severity: "low", domain: "power" },
  production_line_surge: { name: "Production Line Surge", severity: "medium", domain: "workload" },
  ot_network_isolation: { name: "OT Network Isolation", severity: "high", domain: "network" },
  scada_integration_failure: { name: "SCADA Integration Failure", severity: "critical", domain: "facility" },
  predictive_model_update: { name: "Predictive Model Update", severity: "low", domain: "workload" },
  shift_change_load_spike: { name: "Shift Change Load Spike", severity: "low", domain: "workload" },
  grid_frequency_deviation: { name: "Grid Frequency Deviation", severity: "high", domain: "power" },
  renewable_intermittency: { name: "Renewable Intermittency", severity: "medium", domain: "power" },
  demand_response_event: { name: "Demand Response Event", severity: "medium", domain: "power" },
  battery_storage_cycle: { name: "Battery Storage Cycle", severity: "low", domain: "power" },
  carbon_credit_optimization: { name: "Carbon Credit Optimization", severity: "low", domain: "financial" },
  semester_end_compute_rush: { name: "Semester End Compute Rush", severity: "high", domain: "workload" },
  research_grant_deadline: { name: "Research Grant Deadline", severity: "medium", domain: "workload" },
  shared_cluster_contention: { name: "Shared Cluster Contention", severity: "medium", domain: "workload" },
  data_intensive_experiment: { name: "Data Intensive Experiment", severity: "medium", domain: "workload" },
  conference_demo_preparation: { name: "Conference Demo Preparation", severity: "low", domain: "workload" },
  thermal_excursion_secure_zone: { name: "Thermal Excursion – Secure Zone", severity: "high", domain: "thermal" },
  emergency_evacuation_protocol: { name: "Emergency Evacuation Protocol", severity: "critical", domain: "facility" },
  grid_outage_critical_services: { name: "Grid Outage – Critical Services", severity: "critical", domain: "power" },
  // Retail hyperscale scenarios
  retail_edge_failure: { name: "Retail Edge Outage", severity: "critical", domain: "network" },
  cold_chain_failure: { name: "Cold Chain Failure", severity: "critical", domain: "cooling" },
  logistics_dc_overload: { name: "Logistics DC Overload", severity: "high", domain: "workload" },
  ai_model_drift: { name: "AI Model Drift (Shelf Scanning)", severity: "medium", domain: "workload" },
  global_sovereignty_breach: { name: "Cross-Border Routing Violation", severity: "critical", domain: "sovereignty" }
};
