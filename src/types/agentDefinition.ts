/**
 * Agent Definition Types - Single source of truth for subsystem agents
 * 
 * Industry Sources & Design Patterns:
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * AGENT ARCHITECTURE:
 * - Multi-Agent Systems (MAS): Wooldridge "An Introduction to MultiAgent Systems"
 * - BDI (Belief-Desire-Intention) Agent Architecture
 *   Reference: Rao & Georgeff, "BDI Agents: From Theory to Practice"
 * - FIPA Agent Communication Language (ACL) Standards
 *   http://www.fipa.org/specs/fipa00061/
 * 
 * OBSERVABILITY PATTERNS:
 * - OpenTelemetry: Distributed tracing and metrics collection
 *   https://opentelemetry.io/
 * - Prometheus Monitoring: Time-series metrics and alerting
 *   https://prometheus.io/docs/concepts/
 * - Grafana Observability Stack: Visualization and dashboarding
 *   https://grafana.com/
 * 
 * DATA CENTER OPERATIONS:
 * - ITIL v4 Service Operations: Agent responsibility domains
 *   https://www.axelos.com/certifications/itil-service-management
 * - Gartner AIOps: Artificial Intelligence for IT Operations
 *   https://www.gartner.com/en/information-technology/glossary/aiops-artificial-intelligence-operations
 * - ServiceNow IT Operations Management (ITOM)
 *   https://docs.servicenow.com/bundle/tokyo-it-operations-management/
 * 
 * DOMAIN CLASSIFICATIONS:
 * - Thermal: ASHRAE TC 9.9 thermal envelope management
 * - Power: IEEE 493 reliability, TIA-942 redundancy tiers
 * - Cooling: ASHRAE 90.1 energy efficiency
 * - Network: RFC 7011 IPFIX, sFlow (RFC 3176)
 * - Facility: NFPA 75/76 fire protection, EN 50600 physical security
 * - Workload: NVIDIA DCGM, Kubernetes resource management
 * - Sovereignty: PIPEDA, GDPR, CCPA compliance frameworks
 * - Financial: GHG Protocol Scope 2, ISO 14064 carbon accounting
 * 
 * RUNTIME PATTERNS:
 * - Cron Scheduling: Quartz Scheduler syntax
 * - Event-Driven Architecture: Apache Kafka, AWS EventBridge patterns
 * - Circuit Breaker: Hystrix/Resilience4j fault tolerance
 * 
 * ═══════════════════════════════════════════════════════════════════════════════
 */

export type AgentDomain =
  | 'thermal_hardware'
  | 'power_ups'
  | 'cooling'
  | 'network'
  | 'facility_safety'
  | 'workload_gpu'
  | 'sovereignty'
  | 'financial_carbon'
  | 'incident_response';

export type AgentType = 'monitoring' | 'control' | 'optimizer' | 'scheduler';

export type RunStatus = 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';

export interface AgentIOField {
  name: string;
  type: string;
  required?: boolean;
  default?: unknown;
  description?: string;
}

export interface AgentToolBinding {
  id: string;
  name: string;
  category: 'sensor' | 'control' | 'action' | 'compute' | 'audit';
  description?: string;
}

export interface AgentKpiBinding {
  kpiId: string;
  weight: number;
}

export interface AgentRuntimeConfig {
  schedule?: string;
  maxSteps?: number;
  modelProfile?: string;
  timeout?: number;
}

export interface AgentDefinition {
  id: string;
  slug: string;
  name: string;
  domain: AgentDomain;
  type: AgentType;
  description: string | null;
  icon: string;
  
  inputs: AgentIOField[];
  outputs: AgentIOField[];
  tools: AgentToolBinding[];
  kpiBindings: AgentKpiBinding[];
  safetyRules: string[];
  runtimeConfig: AgentRuntimeConfig;
  
  ownerId: string | null;
  isSystemDefault: boolean;
  isActive: boolean;
  
  totalRuns: number;
  successRate: number;
  avgDurationMs: number;
  lastRunAt: string | null;
  
  version: number;
  createdAt: string;
  updatedAt: string;
}

export interface AgentDefinitionRun {
  id: string;
  agentDefinitionId: string;
  twinId: string | null;
  userId: string | null;
  
  status: RunStatus;
  inputData: Record<string, unknown>;
  outputData: Record<string, unknown>;
  metrics: Record<string, unknown>;
  logs: Array<{ timestamp: string; level: string; message: string }>;
  errorMessage: string | null;
  
  startedAt: string | null;
  completedAt: string | null;
  durationMs: number | null;
  createdAt: string;
}

export interface TwinAgentBinding {
  id: string;
  twinId: string;
  agentDefinitionId: string;
  isEnabled: boolean;
  configOverrides: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

// Domain display info
export const DOMAIN_INFO: Record<AgentDomain, { label: string; color: string }> = {
  thermal_hardware: { label: 'Thermal & Hardware', color: 'text-red-500' },
  power_ups: { label: 'Power & UPS', color: 'text-yellow-500' },
  cooling: { label: 'Cooling', color: 'text-cyan-500' },
  network: { label: 'Network', color: 'text-blue-500' },
  facility_safety: { label: 'Facility & Safety', color: 'text-orange-500' },
  workload_gpu: { label: 'Workload & GPU', color: 'text-primary' },
  sovereignty: { label: 'Sovereignty', color: 'text-emerald-500' },
  financial_carbon: { label: 'Financial & Carbon', color: 'text-green-500' },
  incident_response: { label: 'Incident Response', color: 'text-rose-500' },
};

export const TYPE_INFO: Record<AgentType, { label: string; description: string }> = {
  monitoring: { label: 'Monitoring', description: 'Observes and reports on system state' },
  control: { label: 'Control', description: 'Takes actions to modify system state' },
  optimizer: { label: 'Optimizer', description: 'Finds optimal configurations' },
  scheduler: { label: 'Scheduler', description: 'Manages job and resource scheduling' },
};
