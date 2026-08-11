/**
 * Blueprint -> Simulation handoff (Stage 7H, item 3).
 *
 * Blueprint may hand a design to the canonical Simulation workspace. It may
 * NOT create, queue or start a run. This module builds and parses the handoff
 * URL only; it deliberately exports no mutation of any kind.
 */
import { useRBAC } from '@/contexts/RBACContext';
import type { FieldProvenanceMap } from '@/lib/provenance/twinFieldProvenance';

/** The canonical Simulation workspace route. There is exactly one. */
export const SIMULATION_ROUTE = '/simulation';

export interface SimulationHandoff {
  blueprintId: string;
  /** Explicitly selected blueprint version / snapshot. */
  versionId: string | null;
  /** Facility (tenant-scoped twin) context carried across the handoff. */
  twinId: string | null;
  /** Provenance of any non-authoritative values travelling with the design. */
  provenance?: FieldProvenanceMap;
}

export interface BuildHandoffOptions {
  blueprintId: string;
  versionId?: string | number | null;
  twinId?: string | null;
  /** Blueprint tab to return to when the user presses Browser Back. */
  returnTab?: string | null;
}

/**
 * Build the canonical Simulation URL. Navigation only: no run is created.
 */
export function buildSimulationHandoffUrl(options: BuildHandoffOptions): string {
  const params = new URLSearchParams();
  params.set('blueprintId', options.blueprintId);
  if (options.versionId !== undefined && options.versionId !== null && options.versionId !== '') {
    params.set('versionId', String(options.versionId));
  }
  if (options.twinId) params.set('twin', options.twinId);
  if (options.returnTab) params.set('from', `blueprint:${options.returnTab}`);
  // Explicit draft marker: Simulation must open unexecuted.
  params.set('state', 'draft');
  return `${SIMULATION_ROUTE}?${params.toString()}`;
}

/** Read the handoff back out of the Simulation URL. */
export function parseSimulationHandoff(search: URLSearchParams): SimulationHandoff | null {
  const blueprintId = search.get('blueprintId');
  if (!blueprintId) return null;
  return {
    blueprintId,
    versionId: search.get('versionId'),
    twinId: search.get('twin'),
  };
}

export interface SimulationPermissions {
  canViewSimulation: boolean;
  canConfigureSimulation: boolean;
  canExecuteSimulation: boolean;
  canCancelSimulation: boolean;
  loading: boolean;
}

/**
 * Simulation capabilities mapped onto the canonical permission vocabulary.
 * The UI gate is a convenience mirror; the database remains the boundary.
 */
export function useSimulationPermissions(): SimulationPermissions {
  const { can, loading } = useRBAC();
  const execute = can('deployment.execute');
  return {
    canViewSimulation: can('twin.view'),
    canConfigureSimulation: can('twin.edit'),
    canExecuteSimulation: execute,
    canCancelSimulation: execute,
    loading,
  };
}
