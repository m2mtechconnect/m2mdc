/**
 * Industry Profile Overlay System
 * Provides industry-specific customizations for Data Centre Twins
 * Each profile defines objectives, KPI overrides, extra agents, scenarios, and financial tweaks
 */

export type IndustryId =
  | "retail"
  | "financial_services"
  | "healthcare"
  | "telecom"
  | "manufacturing"
  | "energy"
  | "public_sector"
  | "technology_saas"
  | "ai_compute"
  | "generic";

export interface IndustryProfile {
  id: IndustryId;
  label: string;
  objectives: string[];
  kpiOverrides: Array<{ id: string; target?: number; enabled?: boolean }>;
  extraAgentIds: string[];
  extraScenarioIds: string[];
  financialTweaks: Record<string, number>;
  descriptionOverride?: (companyName: string) => string;
  primaryUseCases?: string[];
  defaultTier?: "Tier II" | "Tier III" | "Tier IV";
  defaultCapacityKw?: number;
}

export const INDUSTRY_PROFILES: Record<IndustryId, IndustryProfile> = {
  retail: {
    id: "retail",
    label: "Retail & E-Commerce",
    objectives: [
      "Maintain sub-2-second failover for distributed retail edge sites",
      "Optimize cold-chain energy consumption across logistics and stores",
      "Scale elastically for Black Friday / Cyber Monday peaks",
      "Enable real-time computer vision for inventory and robotics",
      "Reduce carbon footprint for refrigerated warehouses",
      "Ensure global supply chain sovereignty compliance",
    ],
    kpiOverrides: [
      { id: "retail-edge-uptime", enabled: true, target: 99.99 },
      { id: "cold-chain-efficiency", enabled: true, target: 50 },
      { id: "gpu-fleet-saturation", enabled: true, target: 85 },
      { id: "retail-latency", enabled: true, target: 15 },
      { id: "carbon-cost-exposure", enabled: true },
    ],
    extraAgentIds: [
      "retail-edge-resilience",
      "cold-chain-optimizer",
      "supply-chain-sovereignty",
    ],
    extraScenarioIds: [
      "scenario-retail-edge-failure",
      "scenario-cold-chain-failure",
      "scenario-logistics-overload",
      "scenario-black-friday-peak",
    ],
    financialTweaks: {
      coldChainMultiplier: 0.25,
      edgeComputeMultiplier: 0.15,
      carbonTaxRate: 50,
    },
    descriptionOverride: (companyName) =>
      `${companyName} operates one of the world's largest distributed retail infrastructures. This Sovereign Green AI Data Centre Twin optimizes hyperscale data centres and retail edge workloads across thousands of sites, with focus on cold-chain efficiency, edge resilience, and supply chain sovereignty.`,
    primaryUseCases: [
      "Retail Edge Optimization",
      "Cold Chain Management",
      "Supply Chain AI",
      "Inventory Computer Vision",
      "Black Friday Scaling",
    ],
  },

  financial_services: {
    id: "financial_services",
    label: "Finance & Banking",
    objectives: [
      "Guarantee 99.99% uptime for core banking systems",
      "Minimize carbon footprint per financial transaction",
      "Ensure strict financial data sovereignty compliance",
      "Optimize power usage during trading hours peaks",
      "Maintain real-time fraud detection AI workloads",
      "Meet regulatory requirements for data residency",
    ],
    kpiOverrides: [
      { id: "uptime", target: 99.99 },
      { id: "sovereign-compute-ratio", target: 98 },
      { id: "effective-ai-pue", target: 1.25 },
    ],
    extraAgentIds: [],
    extraScenarioIds: [
      "scenario-trading-peak-surge",
      "scenario-fraud-detection-spike",
    ],
    financialTweaks: {
      complianceCostMultiplier: 1.4,
      redundancyMultiplier: 1.5,
    },
    descriptionOverride: (companyName) =>
      `${companyName} requires enterprise-grade resilience for mission-critical financial operations. This Sovereign Green AI Data Centre Twin ensures 99.99% uptime, strict data sovereignty, and optimized power efficiency for trading and transaction workloads.`,
    primaryUseCases: [
      "Core Banking Infrastructure",
      "Trading Platform Optimization",
      "Fraud Detection AI",
      "Regulatory Compliance",
      "Financial Data Sovereignty",
    ],
    defaultTier: "Tier IV",
  },

  healthcare: {
    id: "healthcare",
    label: "Healthcare & Life Sciences",
    objectives: [
      "Maintain HIPAA/PHIPA compliant data handling at all times",
      "Provide sub-second access to patient imaging systems",
      "Ensure continuous uptime for life-critical systems",
      "Support medical AI and diagnostic workloads",
      "Minimize carbon while maintaining full redundancy",
      "Enable secure cross-facility data sharing",
    ],
    kpiOverrides: [
      { id: "uptime", target: 99.999 },
      { id: "sovereign-compute-ratio", target: 100 },
      { id: "effective-ai-pue", target: 1.35 },
    ],
    extraAgentIds: [],
    extraScenarioIds: [
      "scenario-ehr-access-surge",
      "scenario-imaging-storage-spike",
      "scenario-hipaa-audit",
    ],
    financialTweaks: {
      complianceCostMultiplier: 1.3,
      redundancyMultiplier: 1.4,
    },
    descriptionOverride: (companyName) =>
      `${companyName} demands the highest levels of data protection and system availability for patient care. This Sovereign Green AI Data Centre Twin ensures HIPAA/PHIPA compliance, five-nines uptime, and optimized infrastructure for medical imaging and diagnostic AI.`,
    primaryUseCases: [
      "EHR Infrastructure",
      "Medical Imaging AI",
      "Diagnostic Workloads",
      "Clinical Data Sovereignty",
      "Telemedicine Platform",
    ],
    defaultTier: "Tier IV",
  },

  telecom: {
    id: "telecom",
    label: "Telecommunications",
    objectives: [
      "Deliver ultra-low latency for 5G edge workloads",
      "Optimize distributed cooling across edge sites",
      "Minimize tower and edge power consumption",
      "Enable carbon-aware traffic routing",
      "Support network function virtualization (NFV)",
      "Maintain high availability for core network",
    ],
    kpiOverrides: [
      { id: "retail-latency", enabled: true, target: 5 },
      { id: "effective-ai-pue", target: 1.4 },
    ],
    extraAgentIds: [],
    extraScenarioIds: [
      "scenario-edge-site-overload",
      "scenario-backhaul-congestion",
      "scenario-5g-traffic-surge",
    ],
    financialTweaks: {
      edgeDistributionMultiplier: 1.3,
    },
    descriptionOverride: (companyName) =>
      `${companyName} requires a distributed edge-to-core architecture optimized for 5G and telecommunications workloads. This Sovereign Green AI Data Centre Twin minimizes latency, optimizes power across edge sites, and enables carbon-aware traffic routing.`,
    primaryUseCases: [
      "5G Edge Computing",
      "Network Function Virtualization",
      "Traffic Optimization",
      "Edge Site Management",
      "Backhaul Optimization",
    ],
  },

  manufacturing: {
    id: "manufacturing",
    label: "Manufacturing & Industrial",
    objectives: [
      "Process real-time OT data with minimal latency",
      "Integrate with factory floor systems (OPC-UA/Modbus)",
      "Host predictive maintenance AI models",
      "Track carbon emissions per production line",
      "Enable digital twin for factory operations",
      "Ensure IT/OT network convergence security",
    ],
    kpiOverrides: [
      { id: "effective-ai-pue", target: 1.35 },
      { id: "uptime", target: 99.9 },
    ],
    extraAgentIds: [],
    extraScenarioIds: [
      "scenario-production-line-surge",
      "scenario-scada-integration-failure",
      "scenario-predictive-model-update",
    ],
    financialTweaks: {
      otIntegrationMultiplier: 1.2,
    },
    descriptionOverride: (companyName) =>
      `${companyName} operates complex manufacturing environments requiring real-time data processing. This Sovereign Green AI Data Centre Twin integrates with factory systems, hosts predictive maintenance AI, and tracks carbon per production line.`,
    primaryUseCases: [
      "IIoT Data Processing",
      "Predictive Maintenance AI",
      "Production Line Optimization",
      "Factory Digital Twin",
      "Carbon Tracking",
    ],
  },

  energy: {
    id: "energy",
    label: "Energy & Utilities",
    objectives: [
      "Enable real-time grid balancing and demand response",
      "Maximize renewable energy utilization",
      "Target carbon-negative data center operations",
      "Maintain grid stability during peak demand",
      "Support battery storage optimization",
      "Enable carbon credit optimization",
    ],
    kpiOverrides: [
      { id: "effective-ai-pue", target: 1.15 },
      { id: "gco2-per-gpu-hour", target: 20 },
    ],
    extraAgentIds: [],
    extraScenarioIds: [
      "scenario-grid-frequency-deviation",
      "scenario-renewable-intermittency",
      "scenario-demand-response-event",
    ],
    financialTweaks: {
      renewableMultiplier: 1.5,
      carbonCreditMultiplier: 1.3,
    },
    descriptionOverride: (companyName) =>
      `${companyName} leads in energy innovation and sustainability. This Sovereign Green AI Data Centre Twin maximizes renewable utilization, enables real-time grid balancing, and targets carbon-negative operations through advanced optimization.`,
    primaryUseCases: [
      "Grid AI Optimization",
      "Demand Response",
      "Renewable Integration",
      "Battery Storage Optimization",
      "Carbon Credit Management",
    ],
    defaultCapacityKw: 15000,
  },

  public_sector: {
    id: "public_sector",
    label: "Government & Public Sector",
    objectives: [
      "Ensure 100% data residency compliance within jurisdiction",
      "Prevent unauthorized cross-border data flows",
      "Meet government net-zero commitments",
      "Maintain classified workload isolation",
      "Support citizen services with high availability",
      "Enable secure inter-agency data sharing",
    ],
    kpiOverrides: [
      { id: "sovereign-compute-ratio", target: 100 },
      { id: "sovereign-risk-score", target: 0 },
      { id: "uptime", target: 99.99 },
    ],
    extraAgentIds: [],
    extraScenarioIds: [
      "scenario-sovereignty-breach-attempt",
      "scenario-classified-workload-spillover",
      "scenario-emergency-evacuation",
    ],
    financialTweaks: {
      sovereigntyMultiplier: 1.5,
      securityMultiplier: 1.4,
    },
    descriptionOverride: (companyName) =>
      `${companyName} requires absolute data sovereignty and security for citizen data and government operations. This Sovereign Green AI Data Centre Twin ensures 100% data residency, classified workload isolation, and alignment with net-zero mandates.`,
    primaryUseCases: [
      "Sovereign Cloud Infrastructure",
      "Citizen Services Platform",
      "Classified Workload Hosting",
      "Inter-Agency Data Sharing",
      "Net-Zero Compliance",
    ],
    defaultTier: "Tier IV",
  },

  technology_saas: {
    id: "technology_saas",
    label: "Technology & SaaS",
    objectives: [
      "Optimize GPU utilization across training and inference",
      "Balance carbon intensity with latency SLAs",
      "Ensure fair resource allocation across tenants",
      "Minimize idle GPU power consumption",
      "Support rapid scaling for AI workloads",
      "Enable multi-region deployment",
    ],
    kpiOverrides: [
      { id: "gpu-fleet-saturation", enabled: true, target: 85 },
      { id: "effective-ai-pue", target: 1.2 },
    ],
    extraAgentIds: [],
    extraScenarioIds: [
      "scenario-training-job-surge",
      "scenario-tenant-noisy-neighbor",
      "scenario-model-serving-spike",
    ],
    financialTweaks: {
      gpuMultiplier: 1.5,
      scalingMultiplier: 1.2,
    },
    descriptionOverride: (companyName) =>
      `${companyName} delivers AI-powered SaaS solutions requiring high-performance compute. This Sovereign Green AI Data Centre Twin optimizes GPU utilization, balances carbon with performance SLAs, and ensures fair multi-tenant resource allocation.`,
    primaryUseCases: [
      "AI/ML Training Infrastructure",
      "Multi-Tenant SaaS Platform",
      "Model Serving Optimization",
      "GPU Scheduling",
      "Carbon-Aware Workload Routing",
    ],
  },

  ai_compute: {
    id: "ai_compute",
    label: "AI & High-Performance Computing",
    objectives: [
      "Maximize GPU cluster utilization for training",
      "Optimize liquid cooling for high-density racks",
      "Enable burst capacity for research workloads",
      "Fair allocation across research groups and grants",
      "Minimize carbon per compute operation",
      "Support massive data transfer for datasets",
    ],
    kpiOverrides: [
      { id: "gpu-fleet-saturation", enabled: true, target: 90 },
      { id: "effective-ai-pue", target: 1.15 },
      { id: "gco2-per-gpu-hour", target: 30 },
    ],
    extraAgentIds: [],
    extraScenarioIds: [
      "scenario-training-cluster-spike",
      "scenario-research-grant-deadline",
      "scenario-data-intensive-experiment",
    ],
    financialTweaks: {
      gpuMultiplier: 2.0,
      coolingMultiplier: 1.5,
    },
    descriptionOverride: (companyName) =>
      `${companyName} operates high-performance AI and HPC infrastructure. This Sovereign Green AI Data Centre Twin maximizes GPU utilization, optimizes advanced cooling for high-density racks, and ensures fair resource allocation for compute-intensive workloads.`,
    primaryUseCases: [
      "AI Training Clusters",
      "HPC Workloads",
      "Research Computing",
      "GPU Optimization",
      "Liquid Cooling Management",
    ],
    defaultCapacityKw: 25000,
  },

  generic: {
    id: "generic",
    label: "General Enterprise",
    objectives: [
      "Optimize power usage effectiveness (PUE)",
      "Increase renewable energy share",
      "Reduce carbon footprint year-over-year",
      "Maintain high availability for business workloads",
      "Enable sustainability reporting",
      "Support hybrid cloud operations",
    ],
    kpiOverrides: [],
    extraAgentIds: [],
    extraScenarioIds: [],
    financialTweaks: {},
    descriptionOverride: (companyName) =>
      `${companyName} benefits from a sustainable, high-availability data centre infrastructure. This Sovereign Green AI Data Centre Twin optimizes PUE, increases renewable energy share, and provides comprehensive carbon tracking for ESG reporting.`,
    primaryUseCases: [
      "Enterprise IT Infrastructure",
      "Hybrid Cloud Operations",
      "Sustainability Optimization",
      "Carbon Tracking",
      "High Availability Workloads",
    ],
  },
};

/**
 * Map raw industry detection to normalized IndustryId
 */
export function normalizeIndustryId(rawIndustry: string): IndustryId {
  const lower = rawIndustry.toLowerCase();
  
  if (lower.includes("retail") || lower.includes("ecommerce") || lower.includes("e-commerce")) {
    return "retail";
  }
  if (lower.includes("finance") || lower.includes("bank") || lower.includes("insurance")) {
    return "financial_services";
  }
  if (lower.includes("health") || lower.includes("medical") || lower.includes("pharma")) {
    return "healthcare";
  }
  if (lower.includes("telecom") || lower.includes("telco") || lower.includes("5g")) {
    return "telecom";
  }
  if (lower.includes("manufactur") || lower.includes("industrial") || lower.includes("iiot")) {
    return "manufacturing";
  }
  if (lower.includes("energy") || lower.includes("utility") || lower.includes("grid") || lower.includes("power")) {
    return "energy";
  }
  if (lower.includes("government") || lower.includes("public sector") || lower.includes("gov")) {
    return "public_sector";
  }
  if (lower.includes("saas") || lower.includes("cloud") || lower.includes("software")) {
    return "technology_saas";
  }
  if (lower.includes("ai") || lower.includes("hpc") || lower.includes("research") || lower.includes("education")) {
    return "ai_compute";
  }
  
  return "generic";
}

/**
 * Get industry profile by ID
 */
export function getIndustryProfile(industryId: IndustryId): IndustryProfile {
  return INDUSTRY_PROFILES[industryId] || INDUSTRY_PROFILES.generic;
}

/**
 * Get display label for industry
 */
export function getIndustryLabel(industryId: IndustryId | string): string {
  const profile = INDUSTRY_PROFILES[industryId as IndustryId];
  return profile?.label || industryId || "Enterprise";
}
