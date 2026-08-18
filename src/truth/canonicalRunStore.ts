/**
 * Phase 3 - the single frontend cache of canonical persisted runs.
 *
 * This store holds records read back from `simulation_runs` only. It never
 * mints a run id, never invents provenance and never promotes a preview.
 * The legacy `simulationSnapshotStore` is a compatibility selector layered
 * on top of this cache, not a competing source of truth.
 */
import { create } from 'zustand';
import { loadCanonicalRuns, type CanonicalRun } from './canonicalRun';

interface CanonicalRunState {
  runs: CanonicalRun[];
  activeRunId: string | null;
  loading: boolean;
  error: string | null;
  /** Identity the cache belongs to; a change clears incompatible records. */
  ownerKey: string | null;
  hydrate: (ownerKey: string | null, twinId?: string | null) => Promise<void>;
  setActiveRun: (runId: string | null) => void;
  upsertRun: (run: CanonicalRun) => void;
  reset: () => void;
}

export const useCanonicalRunStore = create<CanonicalRunState>()((set, get) => ({
  runs: [],
  activeRunId: null,
  loading: false,
  error: null,
  ownerKey: null,

  hydrate: async (ownerKey, twinId) => {
    if (get().ownerKey !== ownerKey) set({ runs: [], activeRunId: null, ownerKey });
    set({ loading: true, error: null });
    try {
      const runs = await loadCanonicalRuns(twinId ?? null);
      set((state) => ({
        runs,
        loading: false,
        activeRunId:
          state.activeRunId && runs.some((r) => r.id === state.activeRunId)
            ? state.activeRunId
            : (runs[0]?.id ?? null),
      }));
    } catch (error) {
      set({
        loading: false,
        error: error instanceof Error ? error.message : 'Canonical run records could not be read.',
      });
    }
  },

  setActiveRun: (activeRunId) => set({ activeRunId }),

  upsertRun: (run) =>
    set((state) => ({
      runs: [run, ...state.runs.filter((r) => r.id !== run.id)],
      activeRunId: run.id,
    })),

  reset: () => set({ runs: [], activeRunId: null, ownerKey: null, error: null, loading: false }),
}));

/** The canonical active run, or null when none is persisted. */
export function selectActiveCanonicalRun(state: {
  runs: CanonicalRun[];
  activeRunId: string | null;
}): CanonicalRun | null {
  if (state.activeRunId) return state.runs.find((r) => r.id === state.activeRunId) ?? null;
  return state.runs[0] ?? null;
}

export function getActiveCanonicalRun(): CanonicalRun | null {
  return selectActiveCanonicalRun(useCanonicalRunStore.getState());
}