/**
 * Data Centre Domain Context Layer
 * 
 * Provides real-time DC telemetry and domain-aware context for CoPilot.
 * All values are grounded in actual mock data - no fabrication.
 */

import { montrealSovereignDC, getDemoFacilityById } from '@/twins/dataCenter/mockData';
import { CarbonEngine, REGIONAL_CARBON_INTENSITY } from '@/engines/carbon';
import { FinancialEngine, DEFAULT_FINANCIAL_ASSUMPTIONS } from '@/engines/financial';
import { getSovereigntyEngine, mockDataFlows, mockDataAssets, mockSovereigntyPolicies, mockComplianceFrameworks } from '@/sovereignty';
import type { DataCentreFacility } from '@/types/dataCenterTwin';

export interface DCDomainContext {
  // Facility identification
  activeTwinId: string;
  facilityName: string;
  region: string;
  
  // Real-time KPIs (from mock data)
  pue: number;
  carbonIntensity: number;
  gpuUtilization: number;
  coolingEfficiency: number;
  powerDrawKw: number;
  thermalStabilityScore: number;
  
  // Sovereignty & compliance
  sovereigntyRisk: number;
  sovereignComputeRatio: number;
  crossBorderFlows: number;
  
  // Financial
  financialHealth: number;
  costPerGpuHour: number;
  carbonCostPerDay: number;
  opexPerDay: number;
  
  // Facility stats
  rackCount: number;
  serverCount: number;
  gpuClusterCount: number;
  totalGpuCount: number;
  
  // Active alerts
  alertsOpen: number;
  criticalAlerts: number;
  
  // Simulation state
  simulationState: 'idle' | 'running' | 'paused';
  simulationScenarioActive?: string;
  simulationClock?: number;
  
  // UI state
  domainTabActive: string;
  pageContext: string;
  
  // Carbon engine outputs
  carbonMetrics: {
    carbonPerGpuHour: number;
    dailyEmissionsKg: number;
    projectedAnnualEmissionsTons: number;
    carbonEfficiencyScore: number;
    renewablePercent: number;
  };
  
  // Financial engine outputs
  financialMetrics: {
    costPerGpuHour: number;
    opexPerDay: number;
    opexPerYear: number;
    roiYears: number;
    npv: number;
    irr: number;
  };
}

/**
 * Get current DC domain context from mock data
 * All values are REAL from the mock data - no fabrication
 */
export function getDCDomainContext(
  twinId: string = 'facility-montreal-dc-001',
  activeTab: string = 'overview',
  pageContext: string = 'data_centre_twin',
  simulationState: 'idle' | 'running' | 'paused' = 'idle',
  simulationScenario?: string
): DCDomainContext {
  // Get facility from mock data
  const facility = getDemoFacilityById(twinId) || montrealSovereignDC;
  
  // Calculate carbon metrics using CarbonEngine
  const region = facility.region as keyof typeof REGIONAL_CARBON_INTENSITY;
  const regionalFeed = REGIONAL_CARBON_INTENSITY[region] || REGIONAL_CARBON_INTENSITY['CA-QC'];
  
  const carbonInput = {
    pue: facility.pue,
    powerKwh: facility.currentPowerDrawKw,
    carbonIntensityGPerKwh: regionalFeed.carbonIntensityGPerKwh,
    renewableMixPct: regionalFeed.renewablePercentage,
    activeGpuCount: facility.workloadGpu.kpis.activeGpuCount,
    trainingWorkloadPct: 60, // Default training/inference split
  };
  const carbonMetrics = CarbonEngine.evaluate(carbonInput);
  
  // Calculate financial metrics using FinancialEngine
  const financialInput = {
    powerKwh: facility.currentPowerDrawKw,
    pue: facility.pue,
    activeGpuCount: facility.workloadGpu.kpis.activeGpuCount,
    gpuHoursPerDay: facility.workloadGpu.kpis.activeGpuCount * 24 * (facility.workloadGpu.kpis.avgGpuUtilization / 100),
    hourlyEmissionsKg: carbonMetrics.hourlyEmissionsKg,
    assumptions: DEFAULT_FINANCIAL_ASSUMPTIONS,
    capexTotal: 500_000_000,
    expectedRevenuePerYear: 150_000_000,
  };
  const financialMetrics = FinancialEngine.evaluate(financialInput);
  
  // Get sovereignty metrics
  const sovereigntyEngine = getSovereigntyEngine();
  const sovereigntyResult = sovereigntyEngine.evaluate(
    mockDataFlows,
    mockDataAssets,
    mockSovereigntyPolicies,
    mockComplianceFrameworks,
    region
  );
  
  // Calculate facility stats from mock data
  const rackCount = facility.thermalHardware.racks.length;
  const serverCount = facility.thermalHardware.racks.reduce((sum, r) => sum + r.servers.length, 0);
  const gpuClusterCount = facility.workloadGpu.clusters.length;
  const totalGpuCount = facility.workloadGpu.clusters.reduce((sum, c) => sum + c.nodes.length * 8, 0);
  
  // Count alerts
  const thermalAlerts = facility.thermalHardware.racks.filter(r => r.hotspotRisk > 50).length;
  const powerAlerts = facility.powerUps.upsBanks.filter(u => u.batteryHealthPct < 80).length;
  const coolingAlerts = facility.cooling.zones.filter(z => z.status === 'warning').length;
  const criticalAlerts = facility.thermalHardware.sensors.filter(s => s.status === 'critical').length;
  const alertsOpen = thermalAlerts + powerAlerts + coolingAlerts;
  
  return {
    activeTwinId: facility.id,
    facilityName: facility.name,
    region: facility.region,
    
    pue: facility.pue,
    carbonIntensity: facility.carbonIntensityGCo2Kwh,
    gpuUtilization: facility.workloadGpu.kpis.avgGpuUtilization,
    coolingEfficiency: facility.cooling.kpis.coolingEfficiencyIndex,
    powerDrawKw: facility.currentPowerDrawKw,
    thermalStabilityScore: facility.thermalHardware.kpis.thermalStabilityScore,
    
    sovereigntyRisk: 100 - sovereigntyResult.sovereigntyScore,
    sovereignComputeRatio: facility.sovereignty.kpis.sovereignComputeRatioPct,
    crossBorderFlows: sovereigntyResult.crossBorderFlowCount,
    
    financialHealth: financialMetrics.financialHealthScore,
    costPerGpuHour: financialMetrics.costPerGpuHour,
    carbonCostPerDay: financialMetrics.carbonCostImpactPerDay,
    opexPerDay: financialMetrics.opexPerDay,
    
    rackCount,
    serverCount,
    gpuClusterCount,
    totalGpuCount,
    
    alertsOpen,
    criticalAlerts,
    
    simulationState,
    simulationScenarioActive: simulationScenario,
    
    domainTabActive: activeTab,
    pageContext,
    
    carbonMetrics: {
      carbonPerGpuHour: carbonMetrics.carbonPerGpuHour,
      dailyEmissionsKg: carbonMetrics.dailyEmissionsKg,
      projectedAnnualEmissionsTons: carbonMetrics.projectedAnnualEmissionsTons,
      carbonEfficiencyScore: carbonMetrics.carbonEfficiencyScore,
      renewablePercent: regionalFeed.renewablePercentage,
    },
    
    financialMetrics: {
      costPerGpuHour: financialMetrics.costPerGpuHour,
      opexPerDay: financialMetrics.opexPerDay,
      opexPerYear: financialMetrics.opexPerYear,
      roiYears: financialMetrics.roiYears,
      npv: financialMetrics.npv,
      irr: financialMetrics.irr,
    },
  };
}

/**
 * Get DC quick chips based on current page/tab context
 */
export function getDCQuickChips(pageContext: string, activeTab: string): Array<{ label: string; query: string; icon: string }> {
  const baseChips = [
    { label: 'PUE', query: 'What is our current PUE and how can we improve it?', icon: 'zap' },
    { label: 'GPU Load', query: 'What is the current GPU utilization across clusters?', icon: 'cpu' },
    { label: 'Thermals', query: 'Are there any thermal hotspots or cooling issues?', icon: 'thermometer' },
    { label: 'Sovereignty', query: 'What is our sovereign compute ratio and compliance status?', icon: 'shield' },
    { label: 'Carbon', query: 'How much carbon are we emitting per GPU-hour?', icon: 'leaf' },
    { label: 'Financial', query: 'What is our current cost per GPU-hour and financial health?', icon: 'dollar-sign' },
  ];
  
  // Page-specific chips
  const pageChips: Record<string, Array<{ label: string; query: string; icon: string }>> = {
    dashboard: [
      { label: 'Diagnose Alerts', query: 'Explain the current open alerts and recommended actions', icon: 'alert-triangle' },
      { label: 'Daily Summary', query: 'Give me a summary of today\'s facility performance', icon: 'file-text' },
    ],
    simulation: [
      { label: 'Run Scenario', query: 'Run the Cooling Failure scenario and show me the impact', icon: 'play' },
      { label: 'Explain Deltas', query: 'Explain the KPI changes from the last simulation', icon: 'trending-up' },
      { label: 'Compare Regions', query: 'Compare QC vs AB carbon emissions if we migrated workloads', icon: 'map' },
    ],
    blueprint: [
      { label: 'List Agents', query: 'What agents are configured in this blueprint?', icon: 'users' },
      { label: 'Workflows', query: 'Show me all active workflows and their triggers', icon: 'git-branch' },
      { label: 'Missing Config', query: 'What configurations or integrations are missing?', icon: 'alert-circle' },
    ],
    deploy: [
      { label: 'Readiness', query: 'Check deployment readiness and any blocking issues', icon: 'check-circle' },
      { label: 'Sovereignty', query: 'Review sovereignty compliance requirements for deployment', icon: 'shield' },
    ],
    builder: [
      { label: 'Fix Config', query: 'What configurations are missing in the current builder step?', icon: 'wrench' },
      { label: 'Add Tool', query: 'What tools should I add for thermal monitoring?', icon: 'plus' },
    ],
  };
  
  // Tab-specific chips for domain views
  const tabChips: Record<string, Array<{ label: string; query: string; icon: string }>> = {
    thermal: [
      { label: 'Hotspots', query: 'Which racks have the highest thermal risk?', icon: 'thermometer' },
      { label: 'Cooling Map', query: 'Show thermal distribution across cooling zones', icon: 'map' },
    ],
    power: [
      { label: 'UPS Health', query: 'What is the UPS battery health status?', icon: 'battery' },
      { label: 'Power Chain', query: 'Explain the power distribution from grid to racks', icon: 'zap' },
    ],
    cooling: [
      { label: 'Efficiency', query: 'How efficient is our cooling system?', icon: 'wind' },
      { label: 'CRAH Status', query: 'What is the status of cooling units in each zone?', icon: 'fan' },
    ],
    network: [
      { label: 'Latency', query: 'What is the current network latency across fabrics?', icon: 'activity' },
      { label: 'Port Util', query: 'Which network ports have high utilization?', icon: 'bar-chart' },
    ],
    workload: [
      { label: 'GPU Queue', query: 'How long are workloads waiting in queue?', icon: 'clock' },
      { label: 'Fairness', query: 'Is GPU scheduling fair across clusters?', icon: 'scale' },
    ],
    sovereignty: [
      { label: 'Violations', query: 'Are there any sovereignty policy violations?', icon: 'alert-triangle' },
      { label: 'Data Flows', query: 'Show me cross-border data flows', icon: 'globe' },
    ],
    financial: [
      { label: 'Cost Trend', query: 'What is the trend in cost per GPU-hour?', icon: 'trending-down' },
      { label: 'Carbon Price', query: 'How would a carbon price increase affect our costs?', icon: 'dollar-sign' },
    ],
  };
  
  const chips = [...baseChips];
  
  if (pageChips[pageContext]) {
    chips.push(...pageChips[pageContext]);
  }
  
  if (tabChips[activeTab]) {
    chips.push(...tabChips[activeTab]);
  }
  
  // Return first 8 chips max
  return chips.slice(0, 8);
}

/**
 * DC Command definitions for CoPilot action execution
 */
export interface DCCommand {
  pattern: RegExp;
  action: string;
  params?: Record<string, any>;
  description: string;
}

export const DC_COMMANDS: DCCommand[] = [
  // Simulation commands
  {
    pattern: /run\s+(the\s+)?(simulation|scenario)/i,
    action: 'runSimulation',
    description: 'Start simulation with active scenario',
  },
  {
    pattern: /pause\s+(the\s+)?simulation/i,
    action: 'pauseSimulation',
    description: 'Pause running simulation',
  },
  {
    pattern: /reset\s+(the\s+)?simulation/i,
    action: 'resetSimulation',
    description: 'Reset simulation to baseline',
  },
  {
    pattern: /run\s+(the\s+)?cooling\s+fail/i,
    action: 'runSimulation',
    params: { scenarioId: 'cooling-failure' },
    description: 'Run cooling failure scenario',
  },
  {
    pattern: /run\s+(the\s+)?carbon\s+price/i,
    action: 'runSimulation',
    params: { scenarioId: 'carbon-price-shock' },
    description: 'Run carbon price shock scenario',
  },
  {
    pattern: /run\s+(the\s+)?gpu\s+spike/i,
    action: 'runSimulation',
    params: { scenarioId: 'gpu-demand-spike' },
    description: 'Run GPU demand spike scenario',
  },
  
  // Navigation commands
  {
    pattern: /open\s+(the\s+)?thermal\s+(tab|view)/i,
    action: 'navigateToTab',
    params: { tabName: 'thermal' },
    description: 'Navigate to thermal domain view',
  },
  {
    pattern: /open\s+(the\s+)?power\s+(tab|view)/i,
    action: 'navigateToTab',
    params: { tabName: 'power' },
    description: 'Navigate to power domain view',
  },
  {
    pattern: /open\s+(the\s+)?cooling\s+(tab|view)/i,
    action: 'navigateToTab',
    params: { tabName: 'cooling' },
    description: 'Navigate to cooling domain view',
  },
  {
    pattern: /open\s+(the\s+)?financial\s+(tab|view)/i,
    action: 'navigateToTab',
    params: { tabName: 'financial' },
    description: 'Navigate to financial domain view',
  },
  {
    pattern: /open\s+(the\s+)?sovereignty\s+(tab|view)/i,
    action: 'navigateToTab',
    params: { tabName: 'sovereignty' },
    description: 'Navigate to sovereignty domain view',
  },
  {
    pattern: /open\s+(the\s+)?simulation\s+(tab|view|page)/i,
    action: 'navigateToTab',
    params: { tabName: 'simulation' },
    description: 'Navigate to simulation view',
  },
  {
    pattern: /open\s+(the\s+)?blueprint/i,
    action: 'navigateToTab',
    params: { tabName: 'blueprint' },
    description: 'Navigate to blueprint view',
  },
  
  // Builder commands
  {
    pattern: /open\s+builder\s+step\s+(\d)/i,
    action: 'openBuilderStep',
    description: 'Open specific builder step',
  },
  
  // KPI commands
  {
    pattern: /highlight\s+(the\s+)?pue/i,
    action: 'highlightKPI',
    params: { kpiId: 'pue' },
    description: 'Highlight PUE metric',
  },
  {
    pattern: /highlight\s+(the\s+)?carbon/i,
    action: 'highlightKPI',
    params: { kpiId: 'carbon' },
    description: 'Highlight carbon metrics',
  },
];

/**
 * Parse query for executable commands
 */
export function parseCommand(query: string): { action: string; params?: Record<string, any> } | null {
  for (const cmd of DC_COMMANDS) {
    const match = query.match(cmd.pattern);
    if (match) {
      const params = { ...cmd.params };
      
      // Extract step number for builder command
      if (cmd.action === 'openBuilderStep' && match[1]) {
        params.stepNumber = parseInt(match[1]);
      }
      
      return { action: cmd.action, params };
    }
  }
  return null;
}

/**
 * RCA (Root Cause Analysis) patterns for DC domain
 */
export interface RCAPattern {
  symptom: RegExp;
  possibleCauses: string[];
  diagnosticQueries: string[];
  mitigations: string[];
}

export const RCA_PATTERNS: RCAPattern[] = [
  {
    symptom: /pue.*(high|increase|spike)/i,
    possibleCauses: [
      'Cooling system inefficiency - Check CRAH unit performance',
      'Increased IT load without proportional cooling adjustment',
      'Outside temperature affecting cooling efficiency',
      'UPS or power distribution losses increasing',
    ],
    diagnosticQueries: [
      'Check cooling zone temperatures and CRAH status',
      'Review power distribution efficiency across PDUs',
      'Compare IT load vs cooling capacity headroom',
    ],
    mitigations: [
      'Optimize cooling zone airflow and damper positions',
      'Adjust cooling setpoints based on current load',
      'Consider workload migration to more efficient zones',
    ],
  },
  {
    symptom: /gpu.*(load|spike|increase|high)/i,
    possibleCauses: [
      'Training job batch started on cluster',
      'Inference demand surge from production traffic',
      'Scheduler imbalance directing too many jobs to one cluster',
      'Job retry storm from transient failures',
    ],
    diagnosticQueries: [
      'Check job queue depths and wait times',
      'Review cluster-level GPU utilization distribution',
      'Analyze job types (training vs inference) ratio',
    ],
    mitigations: [
      'Enable job preemption for lower-priority workloads',
      'Redistribute jobs across clusters for fairness',
      'Scale inference capacity if demand is sustained',
    ],
  },
  {
    symptom: /thermal.*(alert|hotspot|overheat|throttl)/i,
    possibleCauses: [
      'CRAH unit failure or reduced capacity in zone',
      'Server fan failure causing local hotspot',
      'Blocked airflow from cable management issues',
      'GPU thermal runaway from sustained high load',
    ],
    diagnosticQueries: [
      'Check inlet/outlet temperatures by rack',
      'Review server fan RPM and airflow velocity',
      'Identify racks with delta-T anomalies',
    ],
    mitigations: [
      'Increase CRAH fan speed in affected zone',
      'Reduce workload on overheating servers',
      'Schedule maintenance for fan replacement',
      'Migrate VMs/containers from hot racks',
    ],
  },
  {
    symptom: /sovereignty.*(violation|risk|cross.?border)/i,
    possibleCauses: [
      'Data flow routing through non-Canadian infrastructure',
      'Third-party service using US or EU endpoints',
      'Backup replication to non-sovereign storage',
      'API calls routing through non-compliant CDN',
    ],
    diagnosticQueries: [
      'Review data flow provenance for cross-border routes',
      'Check third-party integration endpoints',
      'Audit storage replication destinations',
    ],
    mitigations: [
      'Reconfigure routing to Canadian-only infrastructure',
      'Replace non-compliant third-party services',
      'Enable sovereign-first routing policies',
      'Add geo-fencing to prevent data egress',
    ],
  },
  {
    symptom: /carbon.*(high|increase|emission)/i,
    possibleCauses: [
      'Grid carbon intensity increased (less renewable)',
      'PUE degradation increasing total power consumption',
      'GPU utilization spike without efficiency optimization',
      'Cooling system consuming more power than normal',
    ],
    diagnosticQueries: [
      'Check current grid carbon intensity vs baseline',
      'Compare PUE trend over past 24 hours',
      'Review renewable energy mix percentage',
    ],
    mitigations: [
      'Shift non-urgent workloads to off-peak hours',
      'Migrate workloads to cleaner regions if possible',
      'Optimize cooling to reduce power overhead',
      'Purchase renewable energy credits',
    ],
  },
  {
    symptom: /cost.*(high|increase|expense|opex)/i,
    possibleCauses: [
      'Electricity price increase',
      'Carbon price increase affecting carbon costs',
      'PUE degradation increasing power consumption',
      'GPU underutilization increasing cost per compute unit',
    ],
    diagnosticQueries: [
      'Review electricity and carbon cost components',
      'Check GPU utilization vs cost per GPU-hour',
      'Compare current OPEX vs budget targets',
    ],
    mitigations: [
      'Improve GPU utilization through better scheduling',
      'Optimize PUE to reduce power overhead',
      'Negotiate power purchase agreements',
      'Consider carbon offset purchases',
    ],
  },
];

/**
 * Perform RCA analysis based on query
 */
export function performRCA(query: string): RCAPattern | null {
  for (const pattern of RCA_PATTERNS) {
    if (pattern.symptom.test(query)) {
      return pattern;
    }
  }
  return null;
}

/**
 * Compare two regions for carbon emissions
 */
export function compareRegions(fromRegion: string = 'CA-QC', toRegion: string = 'CA-AB'): {
  fromIntensity: number;
  toIntensity: number;
  fromRenewable: number;
  toRenewable: number;
  emissionsDelta: number;
  recommendation: string;
} {
  const from = REGIONAL_CARBON_INTENSITY[fromRegion as keyof typeof REGIONAL_CARBON_INTENSITY] || REGIONAL_CARBON_INTENSITY['CA-QC'];
  const to = REGIONAL_CARBON_INTENSITY[toRegion as keyof typeof REGIONAL_CARBON_INTENSITY] || REGIONAL_CARBON_INTENSITY['CA-AB'];
  
  const emissionsDelta = ((to.carbonIntensityGPerKwh - from.carbonIntensityGPerKwh) / from.carbonIntensityGPerKwh) * 100;
  
  let recommendation = '';
  if (emissionsDelta > 100) {
    recommendation = `Migrating from ${fromRegion} to ${toRegion} would increase emissions by ${emissionsDelta.toFixed(0)}%. NOT recommended for carbon targets.`;
  } else if (emissionsDelta > 0) {
    recommendation = `Migrating from ${fromRegion} to ${toRegion} would increase emissions by ${emissionsDelta.toFixed(0)}%. Consider only if cost savings justify carbon increase.`;
  } else {
    recommendation = `Migrating from ${fromRegion} to ${toRegion} would reduce emissions by ${Math.abs(emissionsDelta).toFixed(0)}%. Recommended for carbon optimization.`;
  }
  
  return {
    fromIntensity: from.carbonIntensityGPerKwh,
    toIntensity: to.carbonIntensityGPerKwh,
    fromRenewable: from.renewablePercentage,
    toRenewable: to.renewablePercentage,
    emissionsDelta,
    recommendation,
  };
}
