/**
 * Data Centre Simulation - Scenario Registry
 * 12+ preset scenarios with timeline scripts
 * 
 * ═══════════════════════════════════════════════════════════════════════════════
 * INDUSTRY SOURCE REFERENCES
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * POWER & UPS SCENARIOS:
 * - Uptime Institute Tier III/IV Concurrently Maintainable Requirements
 *   https://uptimeinstitute.com/tier-certification/tier-requirements
 * - IEEE 1100-2005 Recommended Practice for Powering and Grounding
 *   https://standards.ieee.org/standard/1100-2005.html
 * - NFPA 110 Standard for Emergency and Standby Power Systems
 *   https://www.nfpa.org/codes-and-standards/all-codes-and-standards/list-of-codes-and-standards/detail?code=110
 * - Schneider Electric UPS Battery Degradation Analysis (White Paper 176)
 *   https://www.se.com/ww/en/download/document/WP176/
 * 
 * COOLING FAILURE SCENARIOS:
 * - ASHRAE TC 9.9 Thermal Guidelines for Data Processing Environments (5th Ed)
 *   https://tc0909.ashraetcs.org/documents.php
 * - Uptime Institute Data Center Cooling Best Practices
 *   https://uptimeinstitute.com/resources/research-and-reports
 * - CRAH/CRAC Failure Response Protocols (Schneider Electric White Paper 59)
 *   https://www.se.com/ww/en/download/document/WP59/
 * 
 * FIRE SUPPRESSION SCENARIOS:
 * - NFPA 75 Standard for the Fire Protection of Information Technology Equipment
 *   https://www.nfpa.org/codes-and-standards/all-codes-and-standards/list-of-codes-and-standards/detail?code=75
 * - NFPA 2001 Standard on Clean Agent Fire Extinguishing Systems (FM-200)
 *   https://www.nfpa.org/codes-and-standards/all-codes-and-standards/list-of-codes-and-standards/detail?code=2001
 * - FM Global Data Sheet 5-32 Data Centers and Related Facilities
 *   https://www.fmglobal.com/research-and-resources/fm-global-data-sheets
 * 
 * WATER LEAK & ENVIRONMENTAL SCENARIOS:
 * - TIA-942-B Telecommunications Infrastructure Standard for Data Centers
 *   https://tiaonline.org/what-we-do/standards/
 * - Uptime Institute Environmental Best Practices
 *   https://uptimeinstitute.com/resources
 * 
 * CARBON PRICING SCENARIOS:
 * - Environment and Climate Change Canada - Federal Carbon Pricing Trajectory
 *   https://www.canada.ca/en/environment-climate-change/services/climate-change/pricing-pollution-how-it-will-work/carbon-pollution-pricing-federal-benchmark-information.html
 *   Current: $80/tonne (2024) → $170/tonne (2030)
 * - Government of Canada Greenhouse Gas Pollution Pricing Act
 *   https://laws-lois.justice.gc.ca/eng/acts/G-11.55/
 * - Canada's 2030 Emissions Reduction Plan
 *   https://www.canada.ca/en/services/environment/weather/climatechange/climate-plan/climate-plan-overview/emissions-reduction-2030.html
 * 
 * DATA SOVEREIGNTY SCENARIOS:
 * - PIPEDA (Personal Information Protection and Electronic Documents Act)
 *   https://www.priv.gc.ca/en/privacy-topics/privacy-laws-in-canada/the-personal-information-protection-and-electronic-documents-act-pipeda/
 * - Canadian Digital Charter Implementation Act (Bill C-27)
 *   https://www.parl.ca/DocumentViewer/en/44-1/bill/C-27/first-reading
 * - Treasury Board of Canada Secretariat - Direction on Electronic Data Residency
 *   https://www.canada.ca/en/government/system/digital-government/digital-government-innovations/cloud-services/direction-electronic-data-residency.html
 * 
 * GPU WORKLOAD SCENARIOS:
 * - NVIDIA DGX Cloud Infrastructure Guidelines
 *   https://docs.nvidia.com/dgx-cloud/
 * - MLCommons Training Benchmark Suite (MLPerf)
 *   https://mlcommons.org/en/training-normal-21/
 * - NVIDIA GPU Thermal Management Best Practices
 *   https://docs.nvidia.com/datacenter/tesla/mig-user-guide/
 * 
 * NETWORK RESILIENCE SCENARIOS:
 * - Cisco Data Center Network Design Guide
 *   https://www.cisco.com/c/en/us/td/docs/solutions/Enterprise/Data_Center/DC_3_0/DC-3_0_Design.html
 * - IEEE 802.1Q VLAN and Network Segmentation Standards
 *   https://standards.ieee.org/standard/802_1Q-2022.html
 * - BGP Security Best Practices (NIST SP 800-54)
 *   https://csrc.nist.gov/publications/detail/sp/800-54/final
 * 
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import type { ScenarioDefinition, ScenarioTimelineStep } from './types';
import type { DomainType } from '@/types/dataCenterTwin';

// ============================================================================
// PRESET SCENARIOS (12+)
// ============================================================================

export const PRESET_SCENARIOS: ScenarioDefinition[] = [
  // 1. GPU Spike Training Job
  {
    id: 'gpu_spike_training_job',
    name: 'GPU Spike - Training Job',
    description: 'Sudden GPU surge to 95%+ in training cluster due to large-scale distributed job launch.',
    durationSeconds: 300, // 5 minutes
    domainsInvolved: ['workload_gpu', 'thermal_hardware', 'power_ups', 'cooling'],
    severity: 'warning',
    category: 'workload_gpu',
    tags: ['GPU', 'Training', 'Thermal'],
    timeline: [
      { at: 0, type: 'START', kpiDeltas: {}, eventTitle: 'Scenario Started', eventDescription: 'GPU spike simulation initiated', severity: 'low', domain: 'workload_gpu' },
      { at: 15, type: 'TRIGGER', kpiDeltas: { avgGpuUtilization: 15 }, eventTitle: 'Training Job Launched', eventDescription: 'Large distributed training job submitted to cluster', severity: 'low', domain: 'workload_gpu' },
      { at: 30, type: 'ALERT', kpiDeltas: { avgGpuUtilization: 25, thermalStabilityScore: -5 }, eventTitle: 'GPU Utilization Rising', eventDescription: 'Cluster utilization exceeds 85% threshold', severity: 'medium', domain: 'workload_gpu', affectedClusters: ['cluster-training-alpha'] },
      { at: 60, type: 'ALERT', kpiDeltas: { avgGpuUtilization: 35, thermalStabilityScore: -10, effectivePue: 0.05 }, eventTitle: 'Thermal Impact Detected', eventDescription: 'GPU temperatures rising in affected racks', severity: 'high', domain: 'thermal_hardware', affectedRacks: ['rack-05', 'rack-06', 'rack-07'] },
      { at: 90, type: 'TRIGGER', kpiDeltas: { coolingEfficiencyIndex: -8, effectivePue: 0.08 }, eventTitle: 'Cooling Load Increase', eventDescription: 'CRAH units increasing fan speed to compensate', severity: 'medium', domain: 'cooling', affectedZones: ['B', 'C'] },
      { at: 120, type: 'MITIGATION', kpiDeltas: { avgGpuUtilization: -5 }, eventTitle: 'Throttling Initiated', eventDescription: 'Automatic workload throttling activated', severity: 'medium', domain: 'workload_gpu' },
      { at: 180, type: 'MITIGATION', kpiDeltas: { thermalStabilityScore: 5, coolingEfficiencyIndex: 4 }, eventTitle: 'Cooling Stabilized', eventDescription: 'Additional cooling capacity brought online', severity: 'low', domain: 'cooling' },
      { at: 240, type: 'RECOVERY', kpiDeltas: { avgGpuUtilization: -15, thermalStabilityScore: 5, effectivePue: -0.05 }, eventTitle: 'System Recovering', eventDescription: 'GPU load balancing across clusters', severity: 'low', domain: 'workload_gpu' },
      { at: 300, type: 'END', kpiDeltas: {}, eventTitle: 'Scenario Complete', eventDescription: 'GPU spike scenario completed', severity: 'low', domain: 'workload_gpu' },
    ],
  },

  // 2. Cooling Failure - Hot Aisle
  {
    id: 'cooling_failure_hot_aisle',
    name: 'CRAH Failure - Hot Aisle',
    description: 'CRAC unit failure in high-density zone, testing backup cooling activation.',
    durationSeconds: 360, // 6 minutes
    domainsInvolved: ['cooling', 'thermal_hardware', 'facility_safety'],
    severity: 'critical',
    category: 'cooling',
    tags: ['Cooling', 'CRAH', 'Emergency'],
    timeline: [
      { at: 0, type: 'START', kpiDeltas: {}, eventTitle: 'Scenario Started', eventDescription: 'Cooling failure simulation initiated', severity: 'low', domain: 'cooling' },
      { at: 10, type: 'ALERT', kpiDeltas: { coolingEfficiencyIndex: -15 }, eventTitle: 'CRAH Compressor Failure', eventDescription: 'CRAH-B-1 compressor current dropped to zero', severity: 'critical', domain: 'cooling', affectedZones: ['B'] },
      { at: 30, type: 'ALERT', kpiDeltas: { thermalStabilityScore: -12, coolingEfficiencyIndex: -25 }, eventTitle: 'Zone Temperature Rising', eventDescription: 'Zone B temperature exceeds safe threshold', severity: 'critical', domain: 'thermal_hardware', affectedZones: ['B'] },
      { at: 60, type: 'TRIGGER', kpiDeltas: { hotspotRiskProbability: 25, effectivePue: 0.1 }, eventTitle: 'Hotspot Risk Elevated', eventDescription: 'Multiple racks showing elevated inlet temperatures', severity: 'high', domain: 'thermal_hardware', affectedRacks: ['rack-04', 'rack-05', 'rack-06'] },
      { at: 90, type: 'MITIGATION', kpiDeltas: { coolingEfficiencyIndex: 10 }, eventTitle: 'Backup CRAH Activated', eventDescription: 'Standby cooling unit CRAH-B-2 brought online', severity: 'medium', domain: 'cooling' },
      { at: 120, type: 'MITIGATION', kpiDeltas: { thermalStabilityScore: 5 }, eventTitle: 'Adjacent Zone Support', eventDescription: 'Increased cooling from zones A and C', severity: 'low', domain: 'cooling' },
      { at: 180, type: 'MITIGATION', kpiDeltas: { avgGpuUtilization: -10 }, eventTitle: 'Workload Migration', eventDescription: 'Critical workloads migrated to cooler zones', severity: 'medium', domain: 'workload_gpu' },
      { at: 240, type: 'RECOVERY', kpiDeltas: { thermalStabilityScore: 8, coolingEfficiencyIndex: 8, hotspotRiskProbability: -15 }, eventTitle: 'Thermal Recovery', eventDescription: 'Zone temperatures returning to normal', severity: 'low', domain: 'cooling' },
      { at: 300, type: 'INFO', kpiDeltas: {}, eventTitle: 'Maintenance Dispatched', eventDescription: 'Engineering team dispatched for CRAH repair', severity: 'low', domain: 'facility_safety' },
      { at: 360, type: 'END', kpiDeltas: {}, eventTitle: 'Scenario Complete', eventDescription: 'Cooling failure scenario completed', severity: 'low', domain: 'cooling' },
    ],
  },

  // 3. UPS Failure - Runtime Drop
  {
    id: 'ups_failure_runtime_drop',
    name: 'UPS Battery Degradation',
    description: 'UPS bank shows accelerated battery degradation, testing redundancy and failover.',
    durationSeconds: 240, // 4 minutes
    domainsInvolved: ['power_ups'],
    severity: 'warning',
    category: 'power_ups',
    tags: ['UPS', 'Battery', 'Power'],
    timeline: [
      { at: 0, type: 'START', kpiDeltas: {}, eventTitle: 'Scenario Started', eventDescription: 'UPS degradation simulation initiated', severity: 'low', domain: 'power_ups' },
      { at: 20, type: 'ALERT', kpiDeltas: { upsHealthIndex: -15 }, eventTitle: 'Battery Health Alert', eventDescription: 'UPS Bank 1 internal resistance exceeds threshold', severity: 'medium', domain: 'power_ups' },
      { at: 45, type: 'ALERT', kpiDeltas: { upsHealthIndex: -25, avgUpsRuntime: -8 }, eventTitle: 'Runtime Reduced', eventDescription: 'Estimated runtime dropped below 15 minutes', severity: 'high', domain: 'power_ups' },
      { at: 75, type: 'TRIGGER', kpiDeltas: { powerReliabilityScore: -10 }, eventTitle: 'Redundancy Warning', eventDescription: 'N+1 redundancy at risk', severity: 'high', domain: 'power_ups' },
      { at: 100, type: 'MITIGATION', kpiDeltas: { powerReliabilityScore: 5 }, eventTitle: 'Load Shifting', eventDescription: 'Shifting load to healthy UPS bank', severity: 'medium', domain: 'power_ups' },
      { at: 140, type: 'MITIGATION', kpiDeltas: {}, eventTitle: 'Generator Staged', eventDescription: 'Generator pre-staged for potential activation', severity: 'low', domain: 'power_ups' },
      { at: 180, type: 'RECOVERY', kpiDeltas: { upsHealthIndex: 10, avgUpsRuntime: 4, powerReliabilityScore: 3 }, eventTitle: 'System Stabilized', eventDescription: 'UPS Bank 2 handling full load', severity: 'low', domain: 'power_ups' },
      { at: 220, type: 'INFO', kpiDeltas: {}, eventTitle: 'Replacement Scheduled', eventDescription: 'Emergency battery replacement scheduled', severity: 'low', domain: 'power_ups' },
      { at: 240, type: 'END', kpiDeltas: {}, eventTitle: 'Scenario Complete', eventDescription: 'UPS failure scenario completed', severity: 'low', domain: 'power_ups' },
    ],
  },

  // 4. Grid Outage - Generator Failover
  {
    id: 'grid_outage_ups_generator_failover',
    name: 'Grid Outage - Generator Failover',
    description: 'Complete utility grid loss, testing UPS to generator handoff sequence.',
    durationSeconds: 420, // 7 minutes
    domainsInvolved: ['power_ups', 'facility_safety'],
    severity: 'emergency',
    category: 'power_ups',
    tags: ['Grid', 'Emergency', 'Generator'],
    timeline: [
      { at: 0, type: 'START', kpiDeltas: {}, eventTitle: 'Scenario Started', eventDescription: 'Grid outage simulation initiated', severity: 'low', domain: 'power_ups' },
      { at: 5, type: 'ALERT', kpiDeltas: { powerReliabilityScore: -5 }, eventTitle: 'Grid Power Lost', eventDescription: 'Utility grid voltage dropped to zero', severity: 'critical', domain: 'power_ups' },
      { at: 8, type: 'TRIGGER', kpiDeltas: {}, eventTitle: 'UPS Activated', eventDescription: 'All UPS banks providing battery power', severity: 'high', domain: 'power_ups' },
      { at: 15, type: 'TRIGGER', kpiDeltas: {}, eventTitle: 'Generator Starting', eventDescription: 'Diesel generators auto-start initiated', severity: 'high', domain: 'power_ups' },
      { at: 30, type: 'INFO', kpiDeltas: {}, eventTitle: 'Generator Running', eventDescription: 'Generators at operating speed and voltage', severity: 'medium', domain: 'power_ups' },
      { at: 45, type: 'MITIGATION', kpiDeltas: { powerReliabilityScore: 3 }, eventTitle: 'Load Transfer', eventDescription: 'Transferring load from UPS to generators', severity: 'medium', domain: 'power_ups' },
      { at: 60, type: 'RECOVERY', kpiDeltas: { avgUpsRuntime: 5 }, eventTitle: 'Transfer Complete', eventDescription: 'All loads now on generator power', severity: 'low', domain: 'power_ups' },
      { at: 120, type: 'INFO', kpiDeltas: { effectivePue: 0.15 }, eventTitle: 'Steady State', eventDescription: 'Facility operating on backup power', severity: 'low', domain: 'power_ups' },
      { at: 300, type: 'RECOVERY', kpiDeltas: {}, eventTitle: 'Grid Restored', eventDescription: 'Utility power detected', severity: 'low', domain: 'power_ups' },
      { at: 360, type: 'MITIGATION', kpiDeltas: { powerReliabilityScore: 2, effectivePue: -0.1 }, eventTitle: 'Retransfer', eventDescription: 'Transferring load back to utility power', severity: 'low', domain: 'power_ups' },
      { at: 420, type: 'END', kpiDeltas: {}, eventTitle: 'Scenario Complete', eventDescription: 'Grid outage scenario completed', severity: 'low', domain: 'power_ups' },
    ],
  },

  // 5. Water Leak - Corridor Sensor
  {
    id: 'water_leak_corridor_sensor',
    name: 'Water Leak Detection',
    description: 'Water leak detected under raised floor near cooling loop.',
    durationSeconds: 210, // 3.5 minutes
    domainsInvolved: ['facility_safety', 'cooling'],
    severity: 'critical',
    category: 'facility_safety',
    tags: ['Water', 'Safety', 'Emergency'],
    timeline: [
      { at: 0, type: 'START', kpiDeltas: {}, eventTitle: 'Scenario Started', eventDescription: 'Water leak simulation initiated', severity: 'low', domain: 'facility_safety' },
      { at: 10, type: 'ALERT', kpiDeltas: { environmentalSafetyScore: -15, waterLeakRisk: 40 }, eventTitle: 'Water Detected', eventDescription: 'Leak sensor triggered under raised floor Zone C', severity: 'critical', domain: 'facility_safety', affectedZones: ['C'] },
      { at: 25, type: 'ALERT', kpiDeltas: { earlyWarningIndex: -10 }, eventTitle: 'Humidity Spike', eventDescription: 'Local humidity sensors detect anomaly', severity: 'high', domain: 'facility_safety' },
      { at: 45, type: 'MITIGATION', kpiDeltas: { coolingEfficiencyIndex: -10 }, eventTitle: 'Cooling Loop Isolated', eventDescription: 'Affected chilled water loop valve closed', severity: 'high', domain: 'cooling' },
      { at: 70, type: 'MITIGATION', kpiDeltas: {}, eventTitle: 'Equipment Protected', eventDescription: 'Nearby equipment powered down preventively', severity: 'medium', domain: 'facility_safety', affectedRacks: ['rack-08', 'rack-09'] },
      { at: 100, type: 'INFO', kpiDeltas: {}, eventTitle: 'Response Team Deployed', eventDescription: 'Facility emergency team on scene', severity: 'medium', domain: 'facility_safety' },
      { at: 140, type: 'RECOVERY', kpiDeltas: { environmentalSafetyScore: 8, waterLeakRisk: -25 }, eventTitle: 'Leak Contained', eventDescription: 'Water extraction in progress', severity: 'low', domain: 'facility_safety' },
      { at: 180, type: 'RECOVERY', kpiDeltas: { coolingEfficiencyIndex: 5, earlyWarningIndex: 5 }, eventTitle: 'Systems Recovering', eventDescription: 'Equipment inspection complete, no damage detected', severity: 'low', domain: 'facility_safety' },
      { at: 210, type: 'END', kpiDeltas: {}, eventTitle: 'Scenario Complete', eventDescription: 'Water leak scenario completed', severity: 'low', domain: 'facility_safety' },
    ],
  },

  // 6. Fire Suppression Discharge
  {
    id: 'fire_suppression_discharge',
    name: 'Fire Suppression Discharge',
    description: 'Fire detection triggers suppression system in server zone.',
    durationSeconds: 360, // 6 minutes
    domainsInvolved: ['facility_safety', 'thermal_hardware', 'workload_gpu'],
    severity: 'emergency',
    category: 'facility_safety',
    tags: ['Fire', 'Safety', 'Emergency'],
    timeline: [
      { at: 0, type: 'START', kpiDeltas: {}, eventTitle: 'Scenario Started', eventDescription: 'Fire suppression simulation initiated', severity: 'low', domain: 'facility_safety' },
      { at: 10, type: 'ALERT', kpiDeltas: { environmentalSafetyScore: -20 }, eventTitle: 'Smoke Detected', eventDescription: 'VESDA detector activation in Zone A', severity: 'critical', domain: 'facility_safety', affectedZones: ['A'] },
      { at: 20, type: 'ALERT', kpiDeltas: {}, eventTitle: 'Cross-Zone Verification', eventDescription: 'Second detector confirms smoke presence', severity: 'critical', domain: 'facility_safety' },
      { at: 30, type: 'TRIGGER', kpiDeltas: {}, eventTitle: 'Pre-Discharge Alarm', eventDescription: '30-second evacuation warning initiated', severity: 'critical', domain: 'facility_safety' },
      { at: 60, type: 'TRIGGER', kpiDeltas: { fireSuppressionReadiness: -100 }, eventTitle: 'FM-200 Discharge', eventDescription: 'Suppression agent released in Zone A', severity: 'critical', domain: 'facility_safety' },
      { at: 75, type: 'MITIGATION', kpiDeltas: { avgGpuUtilization: -20 }, eventTitle: 'Equipment Shutdown', eventDescription: 'All Zone A equipment powered down', severity: 'high', domain: 'workload_gpu', affectedRacks: ['rack-01', 'rack-02', 'rack-03'] },
      { at: 90, type: 'MITIGATION', kpiDeltas: { coolingEfficiencyIndex: -15 }, eventTitle: 'HVAC Isolated', eventDescription: 'Zone A HVAC dampers closed', severity: 'medium', domain: 'cooling' },
      { at: 150, type: 'INFO', kpiDeltas: {}, eventTitle: 'Fire Department', eventDescription: 'Fire department on scene for inspection', severity: 'medium', domain: 'facility_safety' },
      { at: 240, type: 'RECOVERY', kpiDeltas: { environmentalSafetyScore: 10 }, eventTitle: 'All Clear', eventDescription: 'Fire department clears zone for re-entry', severity: 'low', domain: 'facility_safety' },
      { at: 300, type: 'RECOVERY', kpiDeltas: { avgGpuUtilization: 10, coolingEfficiencyIndex: 8 }, eventTitle: 'Equipment Restart', eventDescription: 'Phased equipment restart initiated', severity: 'low', domain: 'workload_gpu' },
      { at: 360, type: 'END', kpiDeltas: {}, eventTitle: 'Scenario Complete', eventDescription: 'Fire suppression scenario completed', severity: 'low', domain: 'facility_safety' },
    ],
  },

  // 7. Sovereignty Routing Violation
  {
    id: 'sovereignty_routing_violation',
    name: 'Cross-Border Data Violation',
    description: 'Data replication to non-compliant region detected for classified workload.',
    durationSeconds: 180, // 3 minutes
    domainsInvolved: ['sovereignty'],
    severity: 'critical',
    category: 'sovereignty',
    tags: ['Compliance', 'Data', 'PIPEDA'],
    timeline: [
      { at: 0, type: 'START', kpiDeltas: {}, eventTitle: 'Scenario Started', eventDescription: 'Sovereignty violation simulation initiated', severity: 'low', domain: 'sovereignty' },
      { at: 15, type: 'ALERT', kpiDeltas: { sovereignComputeRatioPct: -5, sovereigntyRiskScore: 20 }, eventTitle: 'Routing Violation', eventDescription: 'Data flow to US region detected for CA-classified workload', severity: 'critical', domain: 'sovereignty' },
      { at: 30, type: 'ALERT', kpiDeltas: { policyComplianceRate: -10, auditReadinessScore: -15 }, eventTitle: 'Policy Breach', eventDescription: 'Data residency policy violation confirmed', severity: 'critical', domain: 'sovereignty' },
      { at: 50, type: 'MITIGATION', kpiDeltas: { dataFlowViolations: 1 }, eventTitle: 'Replication Blocked', eventDescription: 'Cross-border replication immediately halted', severity: 'high', domain: 'sovereignty' },
      { at: 70, type: 'MITIGATION', kpiDeltas: {}, eventTitle: 'Data Quarantined', eventDescription: 'Affected data flagged and quarantined', severity: 'high', domain: 'sovereignty' },
      { at: 100, type: 'INFO', kpiDeltas: {}, eventTitle: 'Compliance Notified', eventDescription: 'Compliance team alerted for review', severity: 'medium', domain: 'sovereignty' },
      { at: 130, type: 'RECOVERY', kpiDeltas: { sovereigntyRiskScore: -10, policyComplianceRate: 5 }, eventTitle: 'Policies Updated', eventDescription: 'Routing policies reinforced', severity: 'low', domain: 'sovereignty' },
      { at: 160, type: 'RECOVERY', kpiDeltas: { auditReadinessScore: 8 }, eventTitle: 'Audit Trail', eventDescription: 'Full incident documentation prepared', severity: 'low', domain: 'sovereignty' },
      { at: 180, type: 'END', kpiDeltas: {}, eventTitle: 'Scenario Complete', eventDescription: 'Sovereignty violation scenario completed', severity: 'low', domain: 'sovereignty' },
    ],
  },

  // 8. Carbon Price Shock (Based on Canadian Federal Carbon Pricing trajectory)
  // Source: Environment and Climate Change Canada - 2024 carbon pricing projections
  // Current: $80/tonne (2024), Rising to: $170/tonne (2030)
  {
    id: 'carbon_price_shock',
    name: 'Carbon Price Acceleration to $170/tonne',
    description: 'Accelerated carbon price increase to 2030 target ($170/tonne CAD), stress testing financial resilience per Canadian federal carbon pricing trajectory.',
    durationSeconds: 240, // 4 minutes
    domainsInvolved: ['financial_carbon'],
    severity: 'warning',
    category: 'financial_carbon',
    tags: ['Carbon', 'Financial', 'ESG', 'ECCC', 'Net-Zero'],
    timeline: [
      { at: 0, type: 'START', kpiDeltas: {}, eventTitle: 'Scenario Started', eventDescription: 'Carbon price acceleration simulation initiated (current: $80/tonne CAD)', severity: 'low', domain: 'financial_carbon' },
      { at: 20, type: 'ALERT', kpiDeltas: { economicEfficiencyScore: -8 }, eventTitle: 'ECCC Policy Update', eventDescription: 'Environment and Climate Change Canada announces accelerated carbon pricing: $170/tonne effective immediately', severity: 'medium', domain: 'financial_carbon' },
      { at: 45, type: 'TRIGGER', kpiDeltas: { economicEfficiencyScore: -15, gCo2PerGpuHour: 0 }, eventTitle: 'Financial Model Update', eventDescription: 'TCO models recalculating with 112% carbon cost increase', severity: 'medium', domain: 'financial_carbon' },
      { at: 80, type: 'INFO', kpiDeltas: {}, eventTitle: 'OPEX Impact Assessed', eventDescription: 'Quebec facility: minimal impact (99.8% hydro). Alberta equivalent: +$127,500/year per MW', severity: 'high', domain: 'financial_carbon' },
      { at: 120, type: 'MITIGATION', kpiDeltas: { carbonNeutralProgress: 5 }, eventTitle: 'PPA Strategy Review', eventDescription: 'Accelerating Hydro-Québec renewable PPA negotiations', severity: 'medium', domain: 'financial_carbon' },
      { at: 160, type: 'MITIGATION', kpiDeltas: { renewableEnergyScore: 5 }, eventTitle: 'Carbon Credit Strategy', eventDescription: 'Evaluating BC and Quebec carbon offset markets', severity: 'low', domain: 'financial_carbon' },
      { at: 200, type: 'RECOVERY', kpiDeltas: { economicEfficiencyScore: 5 }, eventTitle: 'Financial Resilience', eventDescription: 'Quebec location advantage confirmed: carbon cost exposure <0.1% of OPEX', severity: 'low', domain: 'financial_carbon' },
      { at: 240, type: 'END', kpiDeltas: {}, eventTitle: 'Scenario Complete', eventDescription: 'Carbon price shock scenario completed - Quebec hydro positioning validated', severity: 'low', domain: 'financial_carbon' },
    ],
  },

  // 9. Network Congestion - Core Switch
  {
    id: 'network_congestion_core_switch',
    name: 'InfiniBand Fabric Saturation',
    description: 'Core switch reaching capacity, packet errors rising.',
    durationSeconds: 210, // 3.5 minutes
    domainsInvolved: ['network', 'workload_gpu'],
    severity: 'warning',
    category: 'network',
    tags: ['Network', 'InfiniBand', 'Latency'],
    timeline: [
      { at: 0, type: 'START', kpiDeltas: {}, eventTitle: 'Scenario Started', eventDescription: 'Network congestion simulation initiated', severity: 'low', domain: 'network' },
      { at: 20, type: 'ALERT', kpiDeltas: { fabricSaturationIndex: 25, networkIntegrityScore: -5 }, eventTitle: 'Congestion Detected', eventDescription: 'InfiniBand fabric utilization exceeds 85%', severity: 'medium', domain: 'network' },
      { at: 45, type: 'ALERT', kpiDeltas: { avgLatencyMs: 2, fabricSaturationIndex: 40 }, eventTitle: 'Latency Spike', eventDescription: 'Cross-cluster latency increasing', severity: 'high', domain: 'network' },
      { at: 70, type: 'TRIGGER', kpiDeltas: { packetLossRate: 0.5, slaBreachRate: 2 }, eventTitle: 'Packet Errors', eventDescription: 'Packet errors detected on spine switches', severity: 'high', domain: 'network' },
      { at: 100, type: 'MITIGATION', kpiDeltas: { fabricSaturationIndex: -10 }, eventTitle: 'Traffic Shaping', eventDescription: 'QoS policies activated', severity: 'medium', domain: 'network' },
      { at: 130, type: 'MITIGATION', kpiDeltas: { avgGpuUtilization: -5 }, eventTitle: 'Job Scheduling', eventDescription: 'Non-critical batch jobs delayed', severity: 'low', domain: 'workload_gpu' },
      { at: 160, type: 'RECOVERY', kpiDeltas: { avgLatencyMs: -1, networkIntegrityScore: 3, fabricSaturationIndex: -15 }, eventTitle: 'Congestion Clearing', eventDescription: 'Traffic normalizing across fabric', severity: 'low', domain: 'network' },
      { at: 190, type: 'RECOVERY', kpiDeltas: { packetLossRate: -0.4, slaBreachRate: -1 }, eventTitle: 'Full Recovery', eventDescription: 'All network metrics returning to baseline', severity: 'low', domain: 'network' },
      { at: 210, type: 'END', kpiDeltas: {}, eventTitle: 'Scenario Complete', eventDescription: 'Network congestion scenario completed', severity: 'low', domain: 'network' },
    ],
  },

  // 10. Refrigerant Leak - CRAC
  {
    id: 'refrigerant_leak_crac',
    name: 'Chiller Refrigerant Leak',
    description: 'Refrigerant pressure drop in primary chiller plant.',
    durationSeconds: 300, // 5 minutes
    domainsInvolved: ['cooling', 'thermal_hardware'],
    severity: 'critical',
    category: 'cooling',
    tags: ['Refrigerant', 'Chiller', 'Environmental'],
    timeline: [
      { at: 0, type: 'START', kpiDeltas: {}, eventTitle: 'Scenario Started', eventDescription: 'Refrigerant leak simulation initiated', severity: 'low', domain: 'cooling' },
      { at: 25, type: 'ALERT', kpiDeltas: { coolingEfficiencyIndex: -10 }, eventTitle: 'Pressure Drop', eventDescription: 'Chiller 1 refrigerant pressure below threshold', severity: 'high', domain: 'cooling' },
      { at: 50, type: 'ALERT', kpiDeltas: { coolingEfficiencyIndex: -20, coolingRedundancyScore: -15 }, eventTitle: 'Performance Degrading', eventDescription: 'Chiller cooling capacity reduced 40%', severity: 'critical', domain: 'cooling' },
      { at: 80, type: 'TRIGGER', kpiDeltas: { thermalStabilityScore: -8, effectivePue: 0.05 }, eventTitle: 'Thermal Impact', eventDescription: 'Supply water temperature rising', severity: 'high', domain: 'thermal_hardware' },
      { at: 110, type: 'MITIGATION', kpiDeltas: { coolingEfficiencyIndex: 8 }, eventTitle: 'Chiller Isolated', eventDescription: 'Affected chiller taken offline', severity: 'high', domain: 'cooling' },
      { at: 140, type: 'MITIGATION', kpiDeltas: { coolingRedundancyScore: 8 }, eventTitle: 'Standby Activated', eventDescription: 'Standby chiller brought online', severity: 'medium', domain: 'cooling' },
      { at: 180, type: 'INFO', kpiDeltas: {}, eventTitle: 'Recovery Team', eventDescription: 'Refrigerant recovery team dispatched', severity: 'low', domain: 'cooling' },
      { at: 240, type: 'RECOVERY', kpiDeltas: { thermalStabilityScore: 5, coolingEfficiencyIndex: 10, effectivePue: -0.03 }, eventTitle: 'System Stabilized', eventDescription: 'Cooling capacity restored via standby', severity: 'low', domain: 'cooling' },
      { at: 280, type: 'INFO', kpiDeltas: {}, eventTitle: 'Environmental Report', eventDescription: 'Leak assessment for regulatory reporting', severity: 'low', domain: 'facility_safety' },
      { at: 300, type: 'END', kpiDeltas: {}, eventTitle: 'Scenario Complete', eventDescription: 'Refrigerant leak scenario completed', severity: 'low', domain: 'cooling' },
    ],
  },

  // 11. Hydrogen Detection - Battery Room
  {
    id: 'hydrogen_detection_battery_room',
    name: 'Battery Room Hydrogen Alert',
    description: 'Elevated hydrogen levels detected in UPS battery room.',
    durationSeconds: 150, // 2.5 minutes
    domainsInvolved: ['facility_safety', 'power_ups'],
    severity: 'emergency',
    category: 'facility_safety',
    tags: ['Hydrogen', 'Battery', 'Safety'],
    timeline: [
      { at: 0, type: 'START', kpiDeltas: {}, eventTitle: 'Scenario Started', eventDescription: 'Hydrogen detection simulation initiated', severity: 'low', domain: 'facility_safety' },
      { at: 10, type: 'ALERT', kpiDeltas: { environmentalSafetyScore: -20, earlyWarningIndex: -15 }, eventTitle: 'Hydrogen Warning', eventDescription: 'H2 concentration exceeds 500 ppm in UPS room', severity: 'critical', domain: 'facility_safety' },
      { at: 25, type: 'TRIGGER', kpiDeltas: {}, eventTitle: 'Ventilation Boost', eventDescription: 'Emergency ventilation automatically activated', severity: 'high', domain: 'facility_safety' },
      { at: 40, type: 'MITIGATION', kpiDeltas: { upsHealthIndex: -10 }, eventTitle: 'Charging Current Reduced', eventDescription: 'Battery charging current reduced to minimum', severity: 'high', domain: 'power_ups' },
      { at: 60, type: 'INFO', kpiDeltas: {}, eventTitle: 'Area Evacuated', eventDescription: 'Non-essential personnel evacuated from area', severity: 'high', domain: 'facility_safety' },
      { at: 85, type: 'MITIGATION', kpiDeltas: { earlyWarningIndex: 5 }, eventTitle: 'Cell Inspection', eventDescription: 'Identifying potential failing battery cells', severity: 'medium', domain: 'power_ups' },
      { at: 110, type: 'RECOVERY', kpiDeltas: { environmentalSafetyScore: 10 }, eventTitle: 'Levels Dropping', eventDescription: 'Hydrogen concentration returning to safe levels', severity: 'low', domain: 'facility_safety' },
      { at: 135, type: 'RECOVERY', kpiDeltas: { earlyWarningIndex: 8 }, eventTitle: 'All Clear', eventDescription: 'H2 levels normalized, investigation continues', severity: 'low', domain: 'facility_safety' },
      { at: 150, type: 'END', kpiDeltas: {}, eventTitle: 'Scenario Complete', eventDescription: 'Hydrogen detection scenario completed', severity: 'low', domain: 'facility_safety' },
    ],
  },

  // 12. Server Thermal Runaway
  {
    id: 'server_thermal_runaway',
    name: 'GPU Server Thermal Runaway',
    description: 'Cascading thermal event in high-density GPU rack.',
    durationSeconds: 180, // 3 minutes
    domainsInvolved: ['thermal_hardware', 'workload_gpu', 'cooling'],
    severity: 'emergency',
    category: 'thermal_hardware',
    tags: ['Thermal', 'GPU', 'Emergency'],
    timeline: [
      { at: 0, type: 'START', kpiDeltas: {}, eventTitle: 'Scenario Started', eventDescription: 'Thermal runaway simulation initiated', severity: 'low', domain: 'thermal_hardware' },
      { at: 10, type: 'ALERT', kpiDeltas: { thermalStabilityScore: -15, hotspotRiskProbability: 30 }, eventTitle: 'Temperature Spike', eventDescription: 'Server rack-05-12 CPU exceeds 85°C', severity: 'critical', domain: 'thermal_hardware', affectedRacks: ['rack-05'] },
      { at: 25, type: 'TRIGGER', kpiDeltas: { thermalThrottlingEvents: 5 }, eventTitle: 'Throttling Active', eventDescription: 'Thermal throttling engaged on affected servers', severity: 'high', domain: 'thermal_hardware' },
      { at: 40, type: 'ALERT', kpiDeltas: { thermalStabilityScore: -20, eccErrorRate: 8 }, eventTitle: 'Cascade Risk', eventDescription: 'Adjacent servers showing temperature rise', severity: 'critical', domain: 'thermal_hardware', affectedRacks: ['rack-04', 'rack-05', 'rack-06'] },
      { at: 60, type: 'MITIGATION', kpiDeltas: { avgGpuUtilization: -15 }, eventTitle: 'Emergency Shutdown', eventDescription: 'Affected servers emergency power-off', severity: 'critical', domain: 'workload_gpu' },
      { at: 80, type: 'MITIGATION', kpiDeltas: { coolingEfficiencyIndex: -5 }, eventTitle: 'Cooling Maximized', eventDescription: 'Local CRAH units at maximum capacity', severity: 'high', domain: 'cooling' },
      { at: 100, type: 'MITIGATION', kpiDeltas: { hotspotRiskProbability: -15 }, eventTitle: 'Workload Migration', eventDescription: 'Jobs migrated from adjacent racks', severity: 'medium', domain: 'workload_gpu' },
      { at: 130, type: 'RECOVERY', kpiDeltas: { thermalStabilityScore: 12, eccErrorRate: -5 }, eventTitle: 'Temperatures Dropping', eventDescription: 'Affected zone cooling down', severity: 'low', domain: 'thermal_hardware' },
      { at: 160, type: 'INFO', kpiDeltas: {}, eventTitle: 'Root Cause', eventDescription: 'Investigation: fan failure identified', severity: 'low', domain: 'thermal_hardware' },
      { at: 180, type: 'END', kpiDeltas: {}, eventTitle: 'Scenario Complete', eventDescription: 'Thermal runaway scenario completed', severity: 'low', domain: 'thermal_hardware' },
    ],
  },

  // 13. Sovereignty Policy Tightening
  {
    id: 'sovereignty_policy_tightening',
    name: 'Policy Tightening - New Restrictions',
    description: 'New sovereignty policy blocks previously allowed cross-border routes.',
    durationSeconds: 240, // 4 minutes
    domainsInvolved: ['sovereignty'],
    severity: 'warning',
    category: 'sovereignty',
    tags: ['Compliance', 'Policy', 'PIPEDA'],
    timeline: [
      { at: 0, type: 'START', kpiDeltas: {}, eventTitle: 'Scenario Started', eventDescription: 'Policy tightening simulation initiated', severity: 'low', domain: 'sovereignty' },
      { at: 20, type: 'INFO', kpiDeltas: {}, eventTitle: 'Policy Update Announced', eventDescription: 'New data residency requirements published', severity: 'medium', domain: 'sovereignty' },
      { at: 45, type: 'TRIGGER', kpiDeltas: { policyComplianceRate: -15 }, eventTitle: 'Flows Re-evaluated', eventDescription: 'Existing data flows being checked against new policy', severity: 'medium', domain: 'sovereignty' },
      { at: 70, type: 'ALERT', kpiDeltas: { sovereigntyRiskScore: 15, dataFlowViolations: 3 }, eventTitle: 'New Violations Found', eventDescription: '3 previously-compliant flows now violate new policy', severity: 'high', domain: 'sovereignty' },
      { at: 100, type: 'MITIGATION', kpiDeltas: { dataFlowViolations: -1 }, eventTitle: 'Route Migration 1', eventDescription: 'First flow rerouted to compliant region', severity: 'medium', domain: 'sovereignty' },
      { at: 140, type: 'MITIGATION', kpiDeltas: { dataFlowViolations: -1 }, eventTitle: 'Route Migration 2', eventDescription: 'Second flow rerouted to compliant region', severity: 'medium', domain: 'sovereignty' },
      { at: 180, type: 'MITIGATION', kpiDeltas: { dataFlowViolations: -1, policyComplianceRate: 10 }, eventTitle: 'Route Migration 3', eventDescription: 'Final flow rerouted - all compliant', severity: 'low', domain: 'sovereignty' },
      { at: 210, type: 'RECOVERY', kpiDeltas: { sovereigntyRiskScore: -10, auditReadinessScore: 5 }, eventTitle: 'Compliance Restored', eventDescription: 'All flows now compliant with new policy', severity: 'low', domain: 'sovereignty' },
      { at: 240, type: 'END', kpiDeltas: {}, eventTitle: 'Scenario Complete', eventDescription: 'Policy tightening scenario completed', severity: 'low', domain: 'sovereignty' },
    ],
  },

  // 14. Region Migration - Sovereignty Improvement
  {
    id: 'sovereignty_region_migration',
    name: 'Region Migration - Sovereignty Improvement',
    description: 'Migrate workloads from foreign to Canadian jurisdiction to improve sovereignty score.',
    durationSeconds: 300, // 5 minutes
    domainsInvolved: ['sovereignty', 'workload_gpu'],
    severity: 'warning',
    category: 'sovereignty',
    tags: ['Migration', 'Compliance', 'Canada'],
    timeline: [
      { at: 0, type: 'START', kpiDeltas: {}, eventTitle: 'Scenario Started', eventDescription: 'Region migration simulation initiated', severity: 'low', domain: 'sovereignty' },
      { at: 20, type: 'INFO', kpiDeltas: {}, eventTitle: 'Migration Planned', eventDescription: 'Workloads identified for sovereignty-compliant migration', severity: 'low', domain: 'sovereignty' },
      { at: 50, type: 'TRIGGER', kpiDeltas: { avgGpuUtilization: -5 }, eventTitle: 'Migration Phase 1', eventDescription: 'First batch of workloads paused for migration', severity: 'medium', domain: 'workload_gpu' },
      { at: 90, type: 'MITIGATION', kpiDeltas: { sovereignComputeRatioPct: 5, sovereigntyRiskScore: -5 }, eventTitle: 'Batch 1 Complete', eventDescription: 'First workload batch now in Canadian region', severity: 'low', domain: 'sovereignty' },
      { at: 130, type: 'TRIGGER', kpiDeltas: { avgGpuUtilization: -3 }, eventTitle: 'Migration Phase 2', eventDescription: 'Second batch of workloads migrating', severity: 'medium', domain: 'workload_gpu' },
      { at: 180, type: 'MITIGATION', kpiDeltas: { sovereignComputeRatioPct: 8, sovereigntyRiskScore: -8 }, eventTitle: 'Batch 2 Complete', eventDescription: 'Second batch now sovereign-compliant', severity: 'low', domain: 'sovereignty' },
      { at: 220, type: 'RECOVERY', kpiDeltas: { avgGpuUtilization: 8, policyComplianceRate: 10 }, eventTitle: 'Workloads Resumed', eventDescription: 'All migrated workloads running at full capacity', severity: 'low', domain: 'workload_gpu' },
      { at: 260, type: 'RECOVERY', kpiDeltas: { auditReadinessScore: 8 }, eventTitle: 'Compliance Improved', eventDescription: 'Sovereignty score significantly improved', severity: 'low', domain: 'sovereignty' },
      { at: 300, type: 'END', kpiDeltas: {}, eventTitle: 'Scenario Complete', eventDescription: 'Region migration scenario completed', severity: 'low', domain: 'sovereignty' },
    ],
  },

  // 15. Move Workload to Cleaner Region
  {
    id: 'carbon_workload_migration_clean_region',
    name: 'Migrate to Low-Carbon Region',
    description: 'Move GPU workloads from high-carbon grid (AB) to low-carbon region (QC) to reduce emissions.',
    durationSeconds: 300, // 5 minutes
    domainsInvolved: ['financial_carbon', 'workload_gpu'],
    severity: 'info',
    category: 'financial_carbon',
    tags: ['Carbon', 'Migration', 'Sustainability'],
    timeline: [
      { at: 0, type: 'START', kpiDeltas: {}, eventTitle: 'Scenario Started', eventDescription: 'Carbon region migration simulation initiated', severity: 'low', domain: 'financial_carbon' },
      { at: 20, type: 'INFO', kpiDeltas: {}, eventTitle: 'Analysis Complete', eventDescription: 'Identified workloads in high-carbon AB region for migration to QC', severity: 'low', domain: 'financial_carbon' },
      { at: 50, type: 'TRIGGER', kpiDeltas: { avgGpuUtilization: -8 }, eventTitle: 'Migration Started', eventDescription: 'Workloads pausing for cross-region migration', severity: 'medium', domain: 'workload_gpu' },
      { at: 100, type: 'MITIGATION', kpiDeltas: { gCo2PerGpuHour: -50, carbonNeutralProgress: 10 }, eventTitle: 'Phase 1 Complete', eventDescription: 'First batch now on Quebec hydro-powered grid', severity: 'low', domain: 'financial_carbon' },
      { at: 150, type: 'MITIGATION', kpiDeltas: { gCo2PerGpuHour: -30, economicEfficiencyScore: 5 }, eventTitle: 'Phase 2 Complete', eventDescription: 'Additional workloads migrated, carbon intensity dropping', severity: 'low', domain: 'financial_carbon' },
      { at: 200, type: 'RECOVERY', kpiDeltas: { avgGpuUtilization: 8, renewableEnergyScore: 15 }, eventTitle: 'Workloads Resumed', eventDescription: 'Full capacity restored in low-carbon region', severity: 'low', domain: 'workload_gpu' },
      { at: 250, type: 'RECOVERY', kpiDeltas: { economicEfficiencyScore: 8 }, eventTitle: 'Cost Savings Realized', eventDescription: 'Lower carbon costs improving economic efficiency', severity: 'low', domain: 'financial_carbon' },
      { at: 300, type: 'END', kpiDeltas: {}, eventTitle: 'Scenario Complete', eventDescription: 'Carbon region migration completed - 60% reduction in gCO2/GPU-hr', severity: 'low', domain: 'financial_carbon' },
    ],
  },

  // 16. Cooling Efficiency Drop
  {
    id: 'cooling_efficiency_drop_pue_spike',
    name: 'Cooling Efficiency Drop - PUE Spike',
    description: 'Cooling system degradation causes PUE to rise, increasing power costs and carbon footprint.',
    durationSeconds: 240, // 4 minutes
    domainsInvolved: ['cooling', 'financial_carbon'],
    severity: 'warning',
    category: 'financial_carbon',
    tags: ['PUE', 'Cooling', 'Cost'],
    timeline: [
      { at: 0, type: 'START', kpiDeltas: {}, eventTitle: 'Scenario Started', eventDescription: 'Cooling efficiency drop simulation initiated', severity: 'low', domain: 'cooling' },
      { at: 20, type: 'ALERT', kpiDeltas: { coolingEfficiencyIndex: -15, effectivePue: 0.1 }, eventTitle: 'Efficiency Dropping', eventDescription: 'Cooling system efficiency declining - damper malfunction suspected', severity: 'medium', domain: 'cooling' },
      { at: 50, type: 'TRIGGER', kpiDeltas: { effectivePue: 0.15, economicEfficiencyScore: -10 }, eventTitle: 'PUE Rising', eventDescription: 'PUE increased from 1.2 to 1.45 - 20% more power for same IT load', severity: 'high', domain: 'financial_carbon' },
      { at: 80, type: 'ALERT', kpiDeltas: { gCo2PerGpuHour: 15, carbonNeutralProgress: -5 }, eventTitle: 'Carbon Impact', eventDescription: 'Higher power draw increasing carbon emissions', severity: 'high', domain: 'financial_carbon' },
      { at: 110, type: 'INFO', kpiDeltas: {}, eventTitle: 'OPEX Impact Assessed', eventDescription: 'Daily OPEX increased by $2,400 due to power inefficiency', severity: 'high', domain: 'financial_carbon' },
      { at: 140, type: 'MITIGATION', kpiDeltas: { coolingEfficiencyIndex: 8 }, eventTitle: 'Issue Identified', eventDescription: 'Damper actuator malfunction confirmed - repair in progress', severity: 'medium', domain: 'cooling' },
      { at: 180, type: 'RECOVERY', kpiDeltas: { effectivePue: -0.12, economicEfficiencyScore: 6 }, eventTitle: 'Repair Complete', eventDescription: 'Cooling system restored - PUE returning to baseline', severity: 'low', domain: 'cooling' },
      { at: 220, type: 'RECOVERY', kpiDeltas: { gCo2PerGpuHour: -10, coolingEfficiencyIndex: 7, carbonNeutralProgress: 3 }, eventTitle: 'Efficiency Restored', eventDescription: 'Full cooling efficiency recovered - carbon and cost metrics normalizing', severity: 'low', domain: 'financial_carbon' },
      { at: 240, type: 'END', kpiDeltas: {}, eventTitle: 'Scenario Complete', eventDescription: 'Cooling efficiency scenario completed', severity: 'low', domain: 'financial_carbon' },
    ],
  },

  // 17. GPU Demand Spike - Financial Impact
  {
    id: 'gpu_spike_financial_impact',
    name: 'GPU Demand Spike - Financial Impact',
    description: 'Sudden GPU utilization surge to 95%+ increases power costs and GPU-hour pricing.',
    durationSeconds: 240, // 4 minutes
    domainsInvolved: ['workload_gpu', 'financial_carbon'],
    severity: 'warning',
    category: 'financial_carbon',
    tags: ['GPU', 'Cost', 'Demand'],
    timeline: [
      { at: 0, type: 'START', kpiDeltas: {}, eventTitle: 'Scenario Started', eventDescription: 'GPU demand spike financial simulation initiated', severity: 'low', domain: 'workload_gpu' },
      { at: 15, type: 'TRIGGER', kpiDeltas: { avgGpuUtilization: 25, costPerGpuHour: 0.5 }, eventTitle: 'Demand Surge', eventDescription: 'Large training job queue causing GPU utilization spike', severity: 'medium', domain: 'workload_gpu' },
      { at: 40, type: 'ALERT', kpiDeltas: { avgGpuUtilization: 15, economicEfficiencyScore: -5 }, eventTitle: 'Utilization at 95%', eventDescription: 'All GPU clusters at near-maximum utilization', severity: 'high', domain: 'workload_gpu' },
      { at: 70, type: 'TRIGGER', kpiDeltas: { gCo2PerGpuHour: 8, effectivePue: 0.03 }, eventTitle: 'Power Surge', eventDescription: 'Increased power draw raising emissions per GPU-hour', severity: 'medium', domain: 'financial_carbon' },
      { at: 100, type: 'INFO', kpiDeltas: {}, eventTitle: 'Revenue Opportunity', eventDescription: 'Peak utilization driving higher revenue - spot pricing in effect', severity: 'low', domain: 'financial_carbon' },
      { at: 130, type: 'MITIGATION', kpiDeltas: { queueDepth: -5 }, eventTitle: 'Queue Management', eventDescription: 'Lower-priority jobs deferred to manage demand', severity: 'low', domain: 'workload_gpu' },
      { at: 170, type: 'RECOVERY', kpiDeltas: { avgGpuUtilization: -15, costPerGpuHour: -0.3 }, eventTitle: 'Demand Normalizing', eventDescription: 'Training jobs completing - utilization returning to normal', severity: 'low', domain: 'workload_gpu' },
      { at: 210, type: 'RECOVERY', kpiDeltas: { economicEfficiencyScore: 5, gCo2PerGpuHour: -5 }, eventTitle: 'Metrics Stabilized', eventDescription: 'Cost and carbon metrics returning to baseline', severity: 'low', domain: 'financial_carbon' },
      { at: 240, type: 'END', kpiDeltas: {}, eventTitle: 'Scenario Complete', eventDescription: 'GPU demand spike financial scenario completed', severity: 'low', domain: 'financial_carbon' },
    ],
  },
];

// ============================================================================
// SCENARIO UTILITIES
// ============================================================================

let customScenarios: ScenarioDefinition[] = [];
let registeredScenarios: ScenarioDefinition[] = [];

export function getAllScenarios(): ScenarioDefinition[] {
  return [...PRESET_SCENARIOS, ...registeredScenarios, ...customScenarios];
}

export function getScenarioById(id: string): ScenarioDefinition | undefined {
  return getAllScenarios().find(s => s.id === id);
}

export function getScenariosByDomain(domain: DomainType): ScenarioDefinition[] {
  return getAllScenarios().filter(s => s.domainsInvolved.includes(domain));
}

export function getScenariosByCategory(category: DomainType): ScenarioDefinition[] {
  return getAllScenarios().filter(s => s.category === category);
}

export function addCustomScenario(scenario: ScenarioDefinition): void {
  customScenarios.push({ ...scenario, isCustom: true });
}

export function removeCustomScenario(id: string): void {
  customScenarios = customScenarios.filter(s => s.id !== id);
}

export function getCustomScenarios(): ScenarioDefinition[] {
  return customScenarios;
}

export function clearCustomScenarios(): void {
  customScenarios = [];
}

/**
 * Register a scenario from Blueprint or external source
 * These scenarios are available to the simulation engine
 */
export function registerScenario(scenario: ScenarioDefinition): void {
  const existingIndex = registeredScenarios.findIndex(s => s.id === scenario.id);
  if (existingIndex >= 0) {
    registeredScenarios[existingIndex] = scenario;
  } else {
    registeredScenarios.push(scenario);
  }
}

export function getRegisteredScenarios(): ScenarioDefinition[] {
  return registeredScenarios;
}

export function clearRegisteredScenarios(): void {
  registeredScenarios = [];
}

export const DOMAIN_ICONS: Record<DomainType, string> = {
  thermal_hardware: 'Thermometer',
  power_ups: 'Zap',
  cooling: 'Wind',
  network: 'Network',
  facility_safety: 'Shield',
  workload_gpu: 'Cpu',
  sovereignty: 'Globe',
  financial_carbon: 'DollarSign',
};

export const DOMAIN_LABELS: Record<DomainType, string> = {
  thermal_hardware: 'Thermal & Hardware',
  power_ups: 'Power & UPS',
  cooling: 'Cooling Systems',
  network: 'Network',
  facility_safety: 'Facility & Safety',
  workload_gpu: 'Workload & GPU',
  sovereignty: 'Sovereignty',
  financial_carbon: 'Financial & Carbon',
};

export const SEVERITY_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  low: { bg: 'bg-blue-500/10', text: 'text-blue-500', border: 'border-blue-500/30' },
  medium: { bg: 'bg-yellow-500/10', text: 'text-yellow-500', border: 'border-yellow-500/30' },
  high: { bg: 'bg-orange-500/10', text: 'text-orange-500', border: 'border-orange-500/30' },
  critical: { bg: 'bg-red-500/10', text: 'text-red-500', border: 'border-red-500/30' },
  info: { bg: 'bg-blue-500/10', text: 'text-blue-500', border: 'border-blue-500/30' },
  warning: { bg: 'bg-yellow-500/10', text: 'text-yellow-500', border: 'border-yellow-500/30' },
  emergency: { bg: 'bg-red-500/10', text: 'text-red-500', border: 'border-red-500/30' },
};
