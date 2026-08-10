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

export type WorkspaceTool = 'inspect' | 'configure' | 'simulate' | 'compare' | 'decide' | 'assist';

export type RoleView = 'engineer' | 'operator' | 'executive' | 'compliance';

export const WORKFLOW_STEPS: Array<{ tool: WorkspaceTool; label: string }> = [
  { tool: 'inspect', label: 'Inspect' },
  { tool: 'configure', label: 'Configure' },
  { tool: 'simulate', label: 'Simulate' },
  { tool: 'compare', label: 'Compare' },
  { tool: 'decide', label: 'Review' },
];

interface WorkspaceState {
  activeTool: WorkspaceTool;
  roleView: RoleView;
  selectedAssetId: string | null;
  panelOpen: boolean;
  overrides: ConfigOverrides;
  scenarioId: string;
  isRunning: boolean;
  runs: WorkspaceRun[];
  activeRunId: string | null;
  compareRunIds: string[];
  evidenceKpi: KpiKey | null;

  setTool: (tool: WorkspaceTool) => void;
  setRoleView: (role: RoleView) => void;
  selectAsset: (assetId: string | null) => void;
  setPanelOpen: (open: boolean) => void;
  setOverride: <K extends keyof ConfigOverrides>(key: K, value: ConfigOverrides[K]) => void;
  resetOverrides: () => void;
  setScenario: (scenarioId: string) => void;
  runScenario: (facility: FacilityDefinition) => Promise<string | null>;
  setActiveRun: (runId: string) => void;
  toggleCompareRun: (runId: string) => void;
  recordDecision: (runId: string, recommendationId: string, decision: DecisionState) => void;
  openEvidence: (kpi: KpiKey) => void;
  closeEvidence: () => void;
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
      runs: [],
      activeRunId: null,
      compareRunIds: [],
      evidenceKpi: null,

      setTool: (activeTool) => set({ activeTool, panelOpen: true }),
      setRoleView: (roleView) => set({ roleView }),
      selectAsset: (selectedAssetId) => set({ selectedAssetId, panelOpen: true }),
      setPanelOpen: (panelOpen) => set({ panelOpen }),
      setOverride: (key, value) => set((s) => ({ overrides: { ...s.overrides, [key]: value } })),
      resetOverrides: () => set({ overrides: { ...DEFAULT_OVERRIDES } }),
      setScenario: (scenarioId) => set({ scenarioId }),

      runScenario: async (facility) => {
        const { scenarioId, overrides, runs, isRunning } = get();
        if (isRunning) return null;
        const scenario = WORKSPACE_SCENARIOS.find((s) => s.id === scenarioId);
        if (!scenario) return null;

        set({ isRunning: true });
        const startedAt = new Date();
        const sameDay = runs.filter((r) => r.id.includes(startedAt.toISOString().slice(0, 10))).length;
        const runId = formatRunId(startedAt, sameDay + 1);

        // Short deterministic settle so the canvas can show the running state.
        await new Promise((resolve) => setTimeout(resolve, 600));

        const run = executeScenario({
          facility,
          overrides,
          scenario,
          runId,
          startedAt: startedAt.toISOString(),
          completedAt: new Date().toISOString(),
        });

        set((s) => ({
          isRunning: false,
          runs: [run, ...s.runs].slice(0, 20),
          activeRunId: run.id,
          activeTool: 'compare',
          panelOpen: true,
          compareRunIds: [run.id, ...s.compareRunIds].slice(0, 2),
        }));
        return run.id;
      },

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
    }),
    {
      name: 'aura-workspace',
      partialize: (s) => ({
        roleView: s.roleView,
        overrides: s.overrides,
        scenarioId: s.scenarioId,
        runs: s.runs,
        activeRunId: s.activeRunId,
        compareRunIds: s.compareRunIds,
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