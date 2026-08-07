/**
 * Run provenance resolution (Stage 5A).
 *
 * Run identifiers and calculation timestamps must originate from the actual
 * simulation execution lifecycle (the persisted simulation snapshot store),
 * never from render-time `new Date()`. When no simulation run has been
 * executed the UI must state that provenance is unavailable rather than
 * inventing one.
 */
import { useSimulationSnapshotStore } from '@/stores/simulationSnapshotStore';
import type { SimulationBlueprintSnapshot } from '@/types/simulationSnapshot';

export interface RunProvenance {
  /** Persisted simulation run identifier, or null when no run exists. */
  runId: string | null;
  /** ISO timestamp of when the run was calculated, or null. */
  calculatedAt: string | null;
  /** True when both a run id and a calculation time are available. */
  available: boolean;
}

export const RUN_UNAVAILABLE_LABEL = 'Unavailable';

export const NO_RUN_NOTICE =
  'No simulation run has been recorded yet. Run a simulation to establish provenance.';

export const UNAVAILABLE_PROVENANCE: RunProvenance = {
  runId: null,
  calculatedAt: null,
  available: false,
};

/** Pure resolver — used by the hook, exports and tests. */
export function resolveRunProvenance(
  snapshot: SimulationBlueprintSnapshot | null | undefined,
): RunProvenance {
  if (!snapshot?.simulationRunId || !snapshot.capturedAt) return UNAVAILABLE_PROVENANCE;
  return {
    runId: snapshot.simulationRunId,
    calculatedAt: snapshot.capturedAt,
    available: true,
  };
}

/**
 * Read the current run provenance from the persisted simulation store.
 * Falls back to the most recent historical run so a page refresh keeps the
 * same identifier instead of minting a new one.
 */
export function useRunProvenance(): RunProvenance {
  const current = useSimulationSnapshotStore((s) => s.currentSnapshot);
  const history = useSimulationSnapshotStore((s) => s.snapshotHistory);
  return resolveRunProvenance(current ?? history[0] ?? null);
}

/** Non-hook accessor for exporters and other imperative call sites. */
export function getRunProvenance(): RunProvenance {
  const { currentSnapshot, snapshotHistory } = useSimulationSnapshotStore.getState();
  return resolveRunProvenance(currentSnapshot ?? snapshotHistory[0] ?? null);
}

/** Formats a calculation timestamp for display, never fabricating one. */
export function formatCalculatedAt(iso: string | null): string {
  if (!iso) return RUN_UNAVAILABLE_LABEL;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return RUN_UNAVAILABLE_LABEL;
  return d.toLocaleString();
}
