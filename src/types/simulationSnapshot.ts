/**
 * Simulation Blueprint Snapshot Types
 * Captures a point-in-time copy of a blueprint for simulation runs
 */

import type { DataCentreBlueprint } from './dataCentreBlueprint';

/**
 * A snapshot of a blueprint captured at simulation start time
 * This ensures simulation results are tied to a specific configuration
 */
export interface SimulationBlueprintSnapshot {
  /** Reference to the original blueprint ID */
  blueprintId: string;
  
  /** Version of the blueprint when snapshot was taken */
  blueprintVersion: string;
  
  /** Unique ID for this simulation run */
  simulationRunId: string;
  
  /** ISO timestamp when snapshot was captured */
  capturedAt: string;
  
  /** Deep copy of the full blueprint configuration */
  config: DataCentreBlueprint;
  
  /** Optional: IDs of agents actively used in this simulation */
  activeAgentIds?: string[];
  
  /** Optional: IDs of KPIs being tracked in this simulation */
  activeKpiIds?: string[];
  
  /** Optional: IDs of scenarios being run */
  activeScenarioIds?: string[];
  
  /** Optional: IDs of workflows triggered during simulation */
  triggeredWorkflowIds?: string[];
}

/**
 * Create a snapshot from a blueprint for a simulation run
 */
export function createSimulationSnapshot(
  blueprint: DataCentreBlueprint,
  runId: string,
  options?: {
    activeAgentIds?: string[];
    activeKpiIds?: string[];
    activeScenarioIds?: string[];
  }
): SimulationBlueprintSnapshot {
  return {
    blueprintId: blueprint.id,
    blueprintVersion: String(blueprint.version),
    simulationRunId: runId,
    capturedAt: new Date().toISOString(),
    config: structuredClone(blueprint),
    activeAgentIds: options?.activeAgentIds,
    activeKpiIds: options?.activeKpiIds,
    activeScenarioIds: options?.activeScenarioIds,
    triggeredWorkflowIds: [],
  };
}

/**
 * Compare two blueprints for consistency
 * Used to verify Designer and Snapshot show identical data
 */
export function assertBlueprintConsistency(
  a: DataCentreBlueprint,
  b: DataCentreBlueprint
): { consistent: boolean; differences: string[] } {
  const differences: string[] = [];
  
  // Check ID and version
  if (a.id !== b.id) differences.push(`ID mismatch: ${a.id} vs ${b.id}`);
  if (a.version !== b.version) differences.push(`Version mismatch: ${a.version} vs ${b.version}`);
  
  // Check facility info
  if (a.capacityKw !== b.capacityKw) differences.push(`Capacity mismatch`);
  if (a.location !== b.location) differences.push(`Location mismatch`);
  if (a.racks !== b.racks) differences.push(`Racks mismatch`);
  if (a.tier !== b.tier) differences.push(`Tier mismatch`);
  
  // Check agents
  if (a.agents.length !== b.agents.length) {
    differences.push(`Agent count mismatch: ${a.agents.length} vs ${b.agents.length}`);
  } else {
    a.agents.forEach((agent, i) => {
      if (agent.id !== b.agents[i]?.id) {
        differences.push(`Agent ${i} ID mismatch`);
      }
    });
  }
  
  // Check KPIs
  if (a.kpis.length !== b.kpis.length) {
    differences.push(`KPI count mismatch: ${a.kpis.length} vs ${b.kpis.length}`);
  } else {
    a.kpis.forEach((kpi, i) => {
      if (kpi.id !== b.kpis[i]?.id) {
        differences.push(`KPI ${i} ID mismatch`);
      }
    });
  }
  
  // Check workflows
  if (a.workflows.length !== b.workflows.length) {
    differences.push(`Workflow count mismatch: ${a.workflows.length} vs ${b.workflows.length}`);
  }
  
  // Check scenarios
  if (a.simulationScenarios.length !== b.simulationScenarios.length) {
    differences.push(`Scenario count mismatch`);
  }
  
  return {
    consistent: differences.length === 0,
    differences,
  };
}
