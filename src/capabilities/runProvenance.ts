/**
 * Run provenance resolution (Stage 5A, re-based on the Phase 3 truth chain).
 *
 * The canonical run identity is `simulation_runs.id`. Provenance therefore
 * resolves from the canonical persisted run cache first. The legacy
 * simulation snapshot store remains only as a compatibility selector: when it
 * is the sole source, the result is reported as an unpersisted preview and
 * must never be labelled validated, authoritative, live or NVIDIA-backed.
 */
import { useSimulationSnapshotStore } from '@/stores/simulationSnapshotStore';
import type { SimulationBlueprintSnapshot } from '@/types/simulationSnapshot';
import {
  RUN_UNAVAILABLE,
  RUN_UNPERSISTED_PREVIEW,
  type CanonicalRun,
} from '@/truth/canonicalRun';
import {
  getActiveCanonicalRun,
  selectActiveCanonicalRun,
  useCanonicalRunStore,
} from '@/truth/canonicalRunStore';

export interface RunProvenance {
  /** Persisted simulation run identifier, or null when no run exists. */
  runId: string | null;
  /** ISO timestamp of when the run was calculated, or null. */
  calculatedAt: string | null;
  /** True when both a run id and a calculation time are available. */
  available: boolean;
  /** Where the identity came from. Only `canonical` is persisted authority. */
  source?: 'canonical' | 'compatibility-snapshot' | 'none';
  /** Operator-readable persistence wording. */
  persistenceLabel?: string;
}

export const RUN_UNAVAILABLE_LABEL = RUN_UNAVAILABLE;
export const RUN_UNPERSISTED_PREVIEW_LABEL = RUN_UNPERSISTED_PREVIEW;

export const NO_RUN_NOTICE =
  'No simulation run has been recorded yet. Run a simulation to establish provenance.';

export const UNAVAILABLE_PROVENANCE: RunProvenance = {
  runId: null,
  calculatedAt: null,
  available: false,
  source: 'none',
  persistenceLabel: RUN_UNAVAILABLE,
};

/** Provenance derived from the canonical persisted run. */
export function provenanceFromCanonicalRun(run: CanonicalRun | null): RunProvenance | null {
  if (!run) return null;
  const calculatedAt = run.finishedAt ?? run.startedAt ?? run.serverCreatedAt;
  if (!calculatedAt) return null;
  return {
    runId: run.id,
    calculatedAt,
    available: true,
    source: 'canonical',
    persistenceLabel: 'Persisted run record',
  };
}

/** Pure resolver — used by the hook, exports and tests. */
export function resolveRunProvenance(
  snapshot: SimulationBlueprintSnapshot | null | undefined,
): RunProvenance {
  if (!snapshot?.simulationRunId || !snapshot.capturedAt) return UNAVAILABLE_PROVENANCE;
  return {
    runId: snapshot.simulationRunId,
    calculatedAt: snapshot.capturedAt,
    available: true,
    source: 'compatibility-snapshot',
    persistenceLabel: RUN_UNPERSISTED_PREVIEW,
  };
}

/**
 * Read the current run provenance. The canonical persisted run wins; the
 * legacy snapshot store is consulted only as a compatibility fallback.
 */
export function useRunProvenance(): RunProvenance {
  const canonical = useCanonicalRunStore(selectActiveCanonicalRun);
  const current = useSimulationSnapshotStore((s) => s.currentSnapshot);
  const history = useSimulationSnapshotStore((s) => s.snapshotHistory);
  return (
    provenanceFromCanonicalRun(canonical) ??
    resolveRunProvenance(current ?? history[0] ?? null)
  );
}

/** Non-hook accessor for exporters and other imperative call sites. */
export function getRunProvenance(): RunProvenance {
  const canonical = provenanceFromCanonicalRun(getActiveCanonicalRun());
  if (canonical) return canonical;
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
