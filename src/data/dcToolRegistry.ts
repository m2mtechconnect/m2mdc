/**
 * DC Tool Registry - Central definition of all Data Centre tools
 */

export type DcToolId =
  | "gpu-telemetry"
  | "power-monitor"
  | "cooling-optimizer"
  | "sovereignty-inspector"
  | "carbon-cost-analyzer";

export type DcToolDomain = "workload" | "power" | "cooling" | "sovereignty" | "financial";

export type DcToolOpenMode = "navigate" | "side-panel" | "modal";

export interface DcToolDefinition {
  id: DcToolId;
  name: string;
  description: string;
  domain: DcToolDomain;
  icon: string;
  primaryActionLabel: string;
  route?: string;
  openMode: DcToolOpenMode;
  tabTarget?: string;
  scrollAnchor?: string;
  requiredIntegrations?: string[];
  telemetryContext?: {
    defaultTab?: string;
    filters?: Record<string, string | number | boolean>;
  };
}

/**
 * Helper to generate twin route with tab
 */
export function getTwinRoute(twinId: string, tab: string): string {
  return `/data-centre-twin/${twinId}?tab=${tab}`;
}

/**
 * Core DC Tools Registry
 */
export const dcToolRegistry: DcToolDefinition[] = [
  {
    id: "gpu-telemetry",
    name: "GPU Telemetry Explorer",
    description: "Inspect GPU utilization, queue depth, and cluster-level metrics in real time.",
    domain: "workload",
    icon: "Cpu",
    primaryActionLabel: "Open GPU Telemetry",
    openMode: "navigate",
    tabTarget: "workload",
    scrollAnchor: "gpu-clusters",
    requiredIntegrations: ["Prometheus", "Slurm", "Kubernetes"],
    telemetryContext: {
      defaultTab: "workload",
      filters: { metricType: "gpu" },
    },
  },
  {
    id: "power-monitor",
    name: "Power Stability Monitor",
    description: "Track power draw, UPS health, and redundancy status across all power buses.",
    domain: "power",
    icon: "Zap",
    primaryActionLabel: "Open Power Monitor",
    openMode: "navigate",
    tabTarget: "power",
    scrollAnchor: "power-distribution",
    requiredIntegrations: ["SNMP", "Modbus", "BACnet"],
    telemetryContext: {
      defaultTab: "power",
      filters: { metricType: "power" },
    },
  },
  {
    id: "cooling-optimizer",
    name: "Cooling Optimizer",
    description: "Analyze cooling zones, CRAC units, airflow patterns, and cooling efficiency KPIs.",
    domain: "cooling",
    icon: "Wind",
    primaryActionLabel: "Open Cooling Optimizer",
    openMode: "navigate",
    tabTarget: "cooling",
    scrollAnchor: "cooling-zones",
    requiredIntegrations: ["BACnet", "Modbus", "SNMP"],
    telemetryContext: {
      defaultTab: "cooling",
      filters: { metricType: "cooling" },
    },
  },
  {
    id: "sovereignty-inspector",
    name: "Sovereignty & Compliance Inspector",
    description: "Inspect data residency, cross-border flows, and compliance framework status.",
    domain: "sovereignty",
    icon: "Shield",
    primaryActionLabel: "Open Sovereignty Inspector",
    openMode: "navigate",
    tabTarget: "sovereignty",
    scrollAnchor: "sovereignty-status",
    requiredIntegrations: ["REST API", "Sovereignty Validator"],
    telemetryContext: {
      defaultTab: "sovereignty",
      filters: { metricType: "sovereignty" },
    },
  },
  {
    id: "carbon-cost-analyzer",
    name: "Carbon & Cost Analyzer",
    description: "Review cost per GPU-hour, energy mix breakdown, and carbon emissions metrics.",
    domain: "financial",
    icon: "Leaf",
    primaryActionLabel: "Open Carbon Analyzer",
    openMode: "navigate",
    tabTarget: "financial",
    scrollAnchor: "carbon-footprint",
    requiredIntegrations: ["Carbon API", "Billing API"],
    telemetryContext: {
      defaultTab: "financial",
      filters: { metricType: "carbon" },
    },
  },
];

/**
 * Get tool by ID
 */
export function getToolById(id: DcToolId): DcToolDefinition | undefined {
  return dcToolRegistry.find((tool) => tool.id === id);
}

/**
 * Get tools by domain
 */
export function getToolsByDomain(domain: DcToolDomain): DcToolDefinition[] {
  return dcToolRegistry.filter((tool) => tool.domain === domain);
}

/**
 * Get simulation-relevant tools
 */
export function getSimulationTools(): DcToolDefinition[] {
  return dcToolRegistry.filter((tool) =>
    ["gpu-telemetry", "power-monitor", "cooling-optimizer", "carbon-cost-analyzer"].includes(tool.id)
  );
}

/**
 * Domain color mapping (uses existing badge variants)
 */
export function getDomainBadgeVariant(domain: DcToolDomain): "default" | "secondary" | "outline" | "destructive" {
  switch (domain) {
    case "workload":
      return "default";
    case "power":
      return "secondary";
    case "cooling":
      return "outline";
    case "sovereignty":
      return "destructive";
    case "financial":
      return "secondary";
    default:
      return "outline";
  }
}

/**
 * Domain display name
 */
export function getDomainDisplayName(domain: DcToolDomain): string {
  switch (domain) {
    case "workload":
      return "Workload";
    case "power":
      return "Power";
    case "cooling":
      return "Cooling";
    case "sovereignty":
      return "Sovereignty";
    case "financial":
      return "Financial";
    default:
      return domain;
  }
}
