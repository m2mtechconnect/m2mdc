/**
 * Sovereign Green AI Data Centre Twin Types
 * Complete type definitions for data center digital twin simulation
 * 
 * Industry Sources & Compliance Frameworks:
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * CANADIAN DATA SOVEREIGNTY:
 * - PIPEDA (Personal Information Protection and Electronic Documents Act)
 *   https://www.priv.gc.ca/en/privacy-topics/privacy-laws-in-canada/the-personal-information-protection-and-electronic-documents-act-pipeda/
 * - Quebec Law 25 (Private Sector Privacy Act modernization)
 *   https://www.cai.gouv.qc.ca/english/
 * - OSFI B-13 Technology and Cyber Risk Management (Banking sector)
 *   https://www.osfi-bsif.gc.ca/Eng/Docs/b13.pdf
 * - ITSG-33 Security Control Catalogue (Government of Canada)
 *   https://cyber.gc.ca/en/guidance/it-security-risk-management-lifecycle-approach-itsg-33
 * - Protected B Classification Requirements
 *   https://www.tpsgc-pwgsc.gc.ca/esc-src/protection-safeguarding/niveaux-levels-eng.html
 * 
 * US DATA RESIDENCY:
 * - FedRAMP (Federal Risk and Authorization Management Program)
 *   https://www.fedramp.gov/
 * - CCPA (California Consumer Privacy Act)
 *   https://oag.ca.gov/privacy/ccpa
 * - HIPAA (Health Insurance Portability and Accountability Act)
 *   https://www.hhs.gov/hipaa/index.html
 * 
 * EUROPEAN REGULATIONS:
 * - GDPR (General Data Protection Regulation)
 *   https://gdpr.eu/
 * - EU Cloud Code of Conduct (CISPE)
 *   https://eucoc.cloud/en/home.html
 * - Gaia-X European Data Infrastructure
 *   https://gaia-x.eu/
 * 
 * DATA CENTRE INFRASTRUCTURE:
 * - Uptime Institute Tier Standards (I-IV)
 *   https://uptimeinstitute.com/tiers
 * - TIA-942 Data Center Standards
 *   https://tiaonline.org/products/tia-942-c-2017-rev-c-data-center-design/
 * - EN 50600 European Data Centre Standard Series
 *   https://www.en50600.com/
 * 
 * ENVIRONMENTAL STANDARDS:
 * - ASHRAE TC 9.9 Thermal Guidelines for Data Processing Environments
 *   https://tc0909.ashraetcs.org/documents/ASHRAE_TC0909_Power_White_Paper_22_June_2016_REVISED.pdf
 * - ISO 14001 Environmental Management Systems
 *   https://www.iso.org/iso-14001-environmental-management.html
 * - ISO 50001 Energy Management Systems
 *   https://www.iso.org/iso-50001-energy-management.html
 * 
 * PUE & EFFICIENCY:
 * - The Green Grid PUE Measurement Methodology
 *   https://www.thegreengrid.org/
 * - Uptime Institute Annual Data Center Survey (PUE benchmarks)
 *   https://uptimeinstitute.com/resources/research-and-reports/uptime-institute-global-data-center-survey-results-2024
 * 
 * ═══════════════════════════════════════════════════════════════════════════════
 */

export type EnergyMix = {
  renewable: number; // 0–1
  naturalGas: number; // 0–1
  nuclear?: number; // 0–1
  other?: number; // 0–1
};

export type CoolingZoneStatus = 'normal' | 'warning' | 'critical';

export type CoolingZone = {
  id: string;
  name: string;
  currentTempC: number;
  targetTempC: number;
  pueContribution: number;
  status: CoolingZoneStatus;
};

export type GpuType = 'H100' | 'A100' | 'L40S' | 'Other';

export type GpuCluster = {
  id: string;
  name: string;
  region: string;
  gpuCount: number;
  gpuType: GpuType;
  avgUtilizationPct: number;
  tenantCount: number;
  isSovereign: boolean;
  powerDrawKw?: number;
};

export type DataFlowStage = 'training' | 'fine_tuning' | 'inference' | 'backup' | 'logging';

export type SovereignDataFlow = {
  id: string;
  stage: DataFlowStage;
  jurisdiction: string; // e.g. "QC", "ON", "US-VA"
  sovereign: boolean;
  workloadName: string;
  dataVolumeGb?: number;
  lastSyncedAt?: string;
};

export type CarbonScenario = {
  id: string;
  name: string;
  carbonPricePerTon: number;
  projectedOpexDeltaPct: number;
  description: string;
};

export type FinancialProfile = {
  baselineCapexM: number;
  baselineOpexMPerYear: number;
  currentCarbonPricePerTon: number;
  projectedNPVGreenBuildM: number;
  projectedNPVGasBuildM: number;
  paybackYears?: number;
  annualSavingsM?: number;
};

export type SovereignKpis = {
  sovereignComputeRatioPct: number; // % of compute in sovereign jurisdiction
  effectiveAiPue: number; // Power Usage Effectiveness (1.0 = perfect, 1.5+ = inefficient)
  gco2PerGpuHour: number; // grams CO2 per GPU hour
  sovereignRiskScore: number; // 0–100 (0 = no risk, 100 = critical)
  economicEfficiencyScore: number; // 0–100 (100 = highly efficient)
  renewableRatioPct?: number; // % renewable energy
  carbonIntensityKgPerMwh?: number;
  totalGpuCount?: number;
  activeWorkloads?: number;
};

export type IncidentCategory = 'cooling' | 'power' | 'workload' | 'network' | 'security' | 'compliance';

export type IncidentScenario = {
  id: string;
  name: string;
  category: IncidentCategory;
  description: string;
  probabilityPerYear: number;
  mttrMinutes: number;
  impactDescription: string;
  recommendedActions: string[];
  severity?: 'low' | 'medium' | 'high' | 'critical';
};

export type SimulationType = 
  | 'gpu_overload'
  | 'cooling_failure'
  | 'carbon_price_shock'
  | 'new_tenant_onboarding'
  | 'emissions_vs_sovereignty'
  | 'power_grid_outage'
  | 'sovereignty_violation'
  | 'mixed_custom';

export type SimulationRun = {
  id: string;
  facilityId: string;
  name: string;
  type: SimulationType;
  inputParams: Record<string, any>;
  resultsSummary: string;
  kpiDeltas: Partial<SovereignKpis>;
  createdAt: string;
  /** Measured elapsed time. `null` means unmeasured - zero never means unknown. */
  durationMs?: number | null;
  status?: 'running' | 'completed' | 'failed';
};

// Full facility model
export interface SovereignDCFacility {
  id: string;
  projectId: string;
  name: string;
  region: string;
  description?: string;
  energyMix: EnergyMix;
  financialProfile: FinancialProfile;
  baseKpis: SovereignKpis;
  coolingZones: CoolingZone[];
  gpuClusters: GpuCluster[];
  dataFlows: SovereignDataFlow[];
  incidentScenarios: IncidentScenario[];
  carbonScenarios: CarbonScenario[];
  createdAt: string;
  updatedAt?: string;
}

// Template configuration structure
export interface SovereignDCTemplateConfig {
  industry: string;
  industries: string[];
  departments: string[];
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  estimatedSetupTime: string;
  enabledModels: {
    energyEmissions: boolean;
    gpuCapacity: boolean;
    sovereigntyDataResidency: boolean;
    financialPolicy: boolean;
    incidentEmergency: boolean;
  };
  demoFacilityId?: string;
  defaultCarbonPricePerTon: number;
  thresholds: {
    pueWarning: number;
    pueCritical: number;
    sovereignRiskWarning: number;
    sovereignRiskCritical: number;
    carbonIntensityWarning: number;
    carbonIntensityCritical: number;
  };
}

// Playbook types
export interface SovereignDCPlaybookSection {
  title: string;
  content: string;
  subsections?: { title: string; content: string }[];
}

export interface SovereignDCPlaybook {
  id: string;
  facilityName: string;
  generatedAt: string;
  executiveSummary: string;
  implementationPhases: SovereignDCPlaybookSection[];
  resourceNeeds: SovereignDCPlaybookSection;
  kpiTargets: { kpi: string; current: number; target: number; unit: string }[];
  riskMitigation: SovereignDCPlaybookSection;
  complianceChecklist: { item: string; status: 'required' | 'recommended' | 'optional' }[];
}

// Builder step state
export interface SovereignDCBuilderState {
  step1: {
    facilityName: string;
    region: string;
    description: string;
    selectedFacilityId?: string;
  };
  step2: {
    enabledModels: SovereignDCTemplateConfig['enabledModels'];
    model: string;
    temperature: number;
  };
  step3: {
    integrations: string[];
    usingSyntheticData: boolean;
    connectedSources: string[];
  };
  step4: {
    workflows: {
      id: string;
      name: string;
      trigger: string;
      enabled: boolean;
    }[];
  };
  step5: {
    selectedScenario?: SimulationType;
    simulationHistory: SimulationRun[];
    activeKpis: (keyof SovereignKpis)[];
  };
}
