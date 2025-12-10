/**
 * Agent Definition Types - Single source of truth for subsystem agents
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
  workload_gpu: { label: 'Workload & GPU', color: 'text-purple-500' },
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
