/**
 * Workspace state: the single place that holds the engineering workflow
 * position, the selected asset, the configuration draft and every recorded
 * simulation run. Every workspace surface reads from here, so no panel can
 * hold a competing copy of the same value.
 */
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { DEFAULT_OVERRIDES, type ConfigOverrides, type FacilityDefinition, type KpiKey } from './facilityModel';
import {
  WORKSPACE_SCENARIOS,
  executeScenario,
  formatRunId,
  type DecisionState,
  type WorkspaceRun,
} from './scenarioEngine';
import { idempotencyKeyFor, loadServerRuns, persistRun } from './runPersistence';

export type WorkspaceTool = 'inspect' | 'configure' | 'simulate' | 'compare' | 'decide' | 'assist';

export type RoleView = 'engineer' | 'operator' | 'executive' | 'compliance';

export const WORKFLOW_STEPS: Array<{ tool: WorkspaceTool; label: string }> = [
  { tool: 'inspect', label: 'Inspect' },
  { tool: 'configure', label: 'Configure' },
  { tool: 'simulate', label: 'Simulate' },
  { tool: 'compare', label: 'Compare' },
  { tool: 'decide', label: 'Review' },
];

/** Draft configuration handed over from Blueprint. Never auto-executed. */
export interface HandoffDraft {
  blueprintId: string;
  versionId: string | null;
}

interface WorkspaceState {
  activeTool: WorkspaceTool;
  roleView: RoleView;
  selectedAssetId: string | null;
  panelOpen: boolean;
  overrides: ConfigOverrides;
  scenarioId: string;
  isRunning: boolean;
  /**
   * Outcome of the most recent execution attempt. A failed run must never be
   * presentable as a success, so the failure is stored explicitly.
   */
  lastRunError: string | null;
  runs: WorkspaceRun[];
  activeRunId: string | null;
  /** True while the authoritative server records are being loaded. */
  runsLoading: boolean;
  /** Set when the server record list could not be read. */
  runsError: string | null;
  /** Identity the cached runs belong to; a change clears incompatible cache. */
  runsOwnerKey: string | null;
  compareRunIds: string[];
  evidenceKpi: KpiKey | null;
  /** Blueprint handoff currently loaded as a draft configuration. */
  handoff: HandoffDraft | null;
  /**
   * Explicit operator acknowledgement of the run inputs. Execution is blocked
   * until this is true, so opening Simulation can never start a run.
   */
  assumptionsReviewed: boolean;

  setTool: (tool: WorkspaceTool) => void;
  setRoleView: (role: RoleView) => void;
  selectAsset: (assetId: string | null) => void;
  setPanelOpen: (open: boolean) => void;
  setOverride: <K extends keyof ConfigOverrides>(key: K, value: ConfigOverrides[K]) => void;
  resetOverrides: () => void;
  setScenario: (scenarioId: string) => void;
  setHandoff: (handoff: HandoffDraft | null) => void;
  setAssumptionsReviewed: (reviewed: boolean) => void;
  runScenario: (facility: FacilityDefinition) => Promise<string | null>;
  /** Replaces cached server runs with the authoritative server records. */
  hydrateRuns: (ownerKey: string | null, twinId?: string | null) => Promise<void>;
  /** Drops every cached run when the session or tenant changes. */
  resetRunCache: () => void;
  clearRunError: () => void;
  setActiveRun: (runId: string) => void;
  toggleCompareRun: (runId: string) => void;
  recordDecision: (runId: string, recommendationId: string, decision: DecisionState) => void;
  openEvidence: (kpi: KpiKey) => void;
  closeEvidence: () => void;
  /** Test/verification helper: inserts deterministic fixture runs (idempotent). */
  seedFixtureRuns: (fixtures: WorkspaceRun[]) => void;
  /** Removes any previously seeded fixture runs, leaving real runs untouched. */
  clearFixtureRuns: () => void;
}

export const useWorkspaceStore = create<WorkspaceState>()(
  persist(
    (set, get) => ({
      activeTool: 'inspect',
      roleView: 'engineer',
      selectedAssetId: 'facility',
      panelOpen: true,
      overrides: { ...DEFAULT_OVERRIDES },
      scenarioId: WORKSPACE_SCENARIOS[0].id,
      isRunning: false,
      lastRunError: null,
      runs: [],
      activeRunId: null,
      runsLoading: false,
      runsError: null,
      runsOwnerKey: null,
      compareRunIds: [],
      evidenceKpi: null,
      handoff: null,
      assumptionsReviewed: false,

      setTool: (activeTool) => set({ activeTool, panelOpen: true }),
      setRoleView: (roleView) => set({ roleView }),
      selectAsset: (selectedAssetId) => set({ selectedAssetId, panelOpen: true }),
      setPanelOpen: (panelOpen) => set({ panelOpen }),
      setOverride: (key, value) =>
        set((s) => ({ overrides: { ...s.overrides, [key]: value }, assumptionsReviewed: false })),
      resetOverrides: () => set({ overrides: { ...DEFAULT_OVERRIDES }, assumptionsReviewed: false }),
      // Changing any run input invalidates the previous review.
      setScenario: (scenarioId) => set({ scenarioId, assumptionsReviewed: false }),
      setHandoff: (handoff) => set({ handoff, assumptionsReviewed: false }),
      setAssumptionsReviewed: (assumptionsReviewed) => set({ assumptionsReviewed }),
      clearRunError: () => set({ lastRunError: null }),

      runScenario: async (facility) => {
        const { scenarioId, overrides, runs, isRunning, assumptionsReviewed } = get();
        // Duplicate-submission guard: one run in flight at a time.
        if (isRunning) return null;
        // Execution requires an explicit review inside Simulation. This is the
        // single place a run record is created.
        if (!assumptionsReviewed) {
          set({ lastRunError: 'Run inputs have not been reviewed. Execution was not attempted.' });
          return null;
        }
        const scenario = WORKSPACE_SCENARIOS.find((s) => s.id === scenarioId);
        if (!scenario) {
          set({ lastRunError: 'No scenario is selected. Execution was not attempted.' });
          return null;
        }

        set({ isRunning: true, lastRunError: null });
        const startedAt = new Date();
        const sameDay = runs.filter((r) => r.id.includes(startedAt.toISOString().slice(0, 10))).length;
        const runId = formatRunId(startedAt, sameDay + 1);

        // Short deterministic settle so the canvas can show the running state.
        await new Promise((resolve) => setTimeout(resolve, 600));

        let run: WorkspaceRun;
        try {
          run = executeScenario({
            facility,
            overrides,
            scenario,
            runId,
            startedAt: startedAt.toISOString(),
            completedAt: new Date().toISOString(),
          });
        } catch (error) {
          // A failed run produces no record and never advances the workflow.
          set({
            isRunning: false,
            lastRunError:
              error instanceof Error
                ? `Simulation failed: ${error.message.slice(0, 200)}`
                : 'Simulation failed for an unknown reason. No run was recorded.',
          });
          return null;
        }

        // The database row is the authoritative record. A write failure must
        // never present as a successful run.
        const outcome = await persistRun({
          run,
          twinId: facility.id,
          scenarioType: 'operational',
          idempotencyKey: idempotencyKeyFor({
            facilityId: facility.id,
            scenarioId: scenario.id,
            overrides,
            startedAt: startedAt.toISOString(),
          }),
        });

        if (outcome.status === 'unsaved') {
          set({ isRunning: false, lastRunError: outcome.reason });
          return null;
        }

        run = {
          ...run,
          id: outcome.runKey,
          serverId: outcome.id,
          persistence: 'server',
          executionOrigin: 'client-browser',
          validationStatus: 'client-produced-unverified',
        };

        set((s) => ({
          isRunning: false,
          lastRunError: null,
          runs: [run, ...s.runs.filter((r) => r.serverId !== run.serverId)].slice(0, 20),
          activeRunId: run.id,
          activeTool: 'compare',
          panelOpen: true,
          compareRunIds: [run.id, ...s.compareRunIds.filter((id) => id !== run.id)].slice(0, 2),
        }));
        return run.id;
      },

      hydrateRuns: async (ownerKey, twinId) => {
        const previousOwner = get().runsOwnerKey;
        if (previousOwner && ownerKey !== previousOwner) {
          // Session or tenant changed: incompatible cache must not survive.
          set({ runs: [], activeRunId: null, compareRunIds: [] });
        }
        if (!ownerKey) {
          set({ runs: [], activeRunId: null, compareRunIds: [], runsOwnerKey: null });
          return;
        }
        set({ runsLoading: true, runsError: null, runsOwnerKey: ownerKey });
        try {
          const server = await loadServerRuns(twinId);
          set((s) => {
            // Cached local-only runs are retained but stay clearly marked.
            const legacy = s.runs
              .filter((r) => !r.serverId && r.persistence !== 'fixture')
              .map((r) => ({ ...r, persistence: 'local-legacy' as const }));
            const runs = [...server, ...legacy].slice(0, 20);
            const fixtures = s.runs.filter((r) => r.persistence === 'fixture');
            const all = [...runs, ...fixtures].slice(0, 20);
            return {
              runs: all,
              runsLoading: false,
              activeRunId: all.some((r) => r.id === s.activeRunId) ? s.activeRunId : (all[0]?.id ?? null),
              compareRunIds: s.compareRunIds.filter((id) => all.some((r) => r.id === id)),
            };
          });
        } catch (error) {
          set({
            runsLoading: false,
            runsError:
              error instanceof Error
                ? `Saved runs could not be loaded: ${error.message.slice(0, 160)}`
                : 'Saved runs could not be loaded.',
          });
        }
      },

      resetRunCache: () =>
        set({ runs: [], activeRunId: null, compareRunIds: [], runsOwnerKey: null, runsError: null }),

      setActiveRun: (activeRunId) => set({ activeRunId }),

      toggleCompareRun: (runId) =>
        set((s) => {
          const exists = s.compareRunIds.includes(runId);
          if (exists) return { compareRunIds: s.compareRunIds.filter((id) => id !== runId) };
          return { compareRunIds: [runId, ...s.compareRunIds].slice(0, 2) };
        }),

      recordDecision: (runId, recommendationId, decision) =>
        set((s) => ({
          runs: s.runs.map((r) =>
            r.id === runId ? { ...r, decisions: { ...r.decisions, [recommendationId]: decision } } : r,
          ),
        })),

      openEvidence: (evidenceKpi) => set({ evidenceKpi }),
      closeEvidence: () => set({ evidenceKpi: null }),

      seedFixtureRuns: (fixtures) =>
        set((s) => {
          const existing = new Set(s.runs.map((r) => r.id));
          const additions = fixtures.filter((f) => !existing.has(f.id));
          if (additions.length === 0) return {} as Partial<WorkspaceState>;
          const runs = [...s.runs, ...additions].slice(0, 20);
          return {
            runs,
            activeRunId: s.activeRunId ?? additions[0].id,
            compareRunIds:
              s.compareRunIds.length > 0
                ? s.compareRunIds
                : additions.slice(0, 2).map((r) => r.id),
          };
        }),

      clearFixtureRuns: () =>
        set((s) => {
          const runs = s.runs.filter((r) => !r.id.startsWith('FIXTURE-'));
          return {
            runs,
            activeRunId: runs.some((r) => r.id === s.activeRunId) ? s.activeRunId : (runs[0]?.id ?? null),
            compareRunIds: s.compareRunIds.filter((id) => runs.some((r) => r.id === id)),
          };
        }),
    }),
    {
      name: 'aura-workspace',
      version: 2,
      // v1 stored browser-only runs as if they were operational records.
      migrate: (state, version) => {
        const s = state as Partial<WorkspaceState> | undefined;
        if (!s) return s as WorkspaceState;
        if (version < 2) {
          return {
            ...s,
            runs: (s.runs ?? []).map((r) => ({ ...r, persistence: 'local-legacy' as const })),
          } as WorkspaceState;
        }
        return s as WorkspaceState;
      },
      partialize: (s) => ({
        roleView: s.roleView,
        overrides: s.overrides,
        scenarioId: s.scenarioId,
        runs: s.runs,
        activeRunId: s.activeRunId,
        compareRunIds: s.compareRunIds,
        runsOwnerKey: s.runsOwnerKey,
      }),
    },
  ),
);

export function useActiveRun(): WorkspaceRun | null {
  return useWorkspaceStore((s) => s.runs.find((r) => r.id === s.activeRunId) ?? null);
}

export const ROLE_VIEWS: Record<RoleView, { label: string; description: string; kpis: KpiKey[]; defaultTool: WorkspaceTool }> = {
  engineer: {
    label: 'Engineering',
    description: 'Physical subsystems, thermal margin and configuration changes.',
    kpis: ['pue', 'thermalStability', 'coolingEfficiency', 'gpuUtilization', 'itLoadKw'],
    defaultTool: 'inspect',
  },
  operator: {
    label: 'Operations',
    description: 'Live workflow position, capacity headroom and scenario response.',
    kpis: ['gpuUtilization', 'thermalStability', 'capacityHeadroom', 'itLoadKw', 'pue'],
    defaultTool: 'simulate',
  },
  executive: {
    label: 'Executive',
    description: 'Efficiency, cost and carbon outcomes of the modelled facility.',
    kpis: ['pue', 'energyCostPerMwh', 'carbonIntensity', 'capacityHeadroom', 'sovereigntyScore'],
    defaultTool: 'compare',
  },
  compliance: {
    label: 'Compliance',
    description: 'Sovereignty posture, evidence and decision record.',
    kpis: ['sovereigntyScore', 'carbonIntensity', 'pue', 'thermalStability', 'capacityHeadroom'],
    defaultTool: 'decide',
  },
};