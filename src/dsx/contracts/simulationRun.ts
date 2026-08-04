/**
 * Simulation / replay run contract.
 * Every simulated or replayed value must reference a run identifier.
 */
import type { CalibrationStatus } from './provenancedMetric';

export type RunStatus = 'created' | 'running' | 'paused' | 'completed' | 'reset' | 'failed';

export interface SimulationRun {
  run_id: string;
  scenario_id: string;
  scenario_version: string;
  model_version: string;
  parameters: Record<string, number | string | boolean>;
  input_snapshot_hash: string;
  input_event_ids: string[];
  started_at: string | null;
  completed_at: string | null;
  status: RunStatus;
  results: Record<string, number | null>;
  calibration: CalibrationStatus;
  limitations: string[];
  initiated_by: string;
  data_mode: 'SIMULATED' | 'REPLAYED';
}

export function newRunId(scenarioId: string, seed: number, startedAtIso: string): string {
  return `${scenarioId}:${seed}:${startedAtIso}`;
}