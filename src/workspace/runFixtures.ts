/**
 * Deterministic simulation-run fixtures.
 *
 * These exist so the Dashboard "Recent simulation runs" list, its deep links
 * into `/simulation`, and run-detail / comparison states can be verified even
 * when a fresh account has no recorded run history.
 *
 * Fixtures are opt-in only (`?seedRuns=1`), are never written automatically for
 * real users, and are marked SIMULATED like every other modelled value. They
 * are produced by the same `executeScenario` engine as real runs, with pinned
 * timestamps, so their KPI values are reproducible.
 */
import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { DEFAULT_OVERRIDES, type FacilityDefinition } from './facilityModel';
import { WORKSPACE_SCENARIOS, executeScenario, formatRunId, type DecisionState, type WorkspaceRun } from './scenarioEngine';
import { useFacilityModel } from './facilityModel';
import { useWorkspaceStore } from './workspaceStore';

/** Query parameter that opts a session into fixture seeding. */
export const SEED_RUNS_PARAM = 'seedRuns';

/** Pinned fixture definitions: scenario, age and recorded review decisions. */
const FIXTURE_SPECS: Array<{
  scenarioId: string;
  /** Completed-at anchor, as an ISO timestamp, so run IDs and ordering are stable. */
  completedAt: string;
  decisions: 'pending' | 'accepted' | 'mixed';
}> = [
  { scenarioId: 'ai-training-surge', completedAt: '2026-03-04T14:20:00.000Z', decisions: 'pending' },
  { scenarioId: 'cooling-loop-degradation', completedAt: '2026-03-03T09:05:00.000Z', decisions: 'mixed' },
  { scenarioId: 'baseline', completedAt: '2026-03-02T18:40:00.000Z', decisions: 'accepted' },
];

/** Prefix used to distinguish seeded fixture runs from user-recorded runs. */
export const FIXTURE_RUN_PREFIX = 'FIXTURE-';

export function isFixtureRun(run: WorkspaceRun): boolean {
  return run.id.startsWith(FIXTURE_RUN_PREFIX);
}

/** Builds the deterministic fixture runs for a facility. Pure: no state writes. */
export function buildRunFixtures(facility: FacilityDefinition): WorkspaceRun[] {
  return FIXTURE_SPECS.map((spec, index) => {
    const scenario = WORKSPACE_SCENARIOS.find((s) => s.id === spec.scenarioId) ?? WORKSPACE_SCENARIOS[0];
    const completed = new Date(spec.completedAt);
    const started = new Date(completed.getTime() - scenario.durationMinutes * 60_000);
    const run = executeScenario({
      facility,
      overrides: { ...DEFAULT_OVERRIDES },
      scenario,
      runId: `${FIXTURE_RUN_PREFIX}${formatRunId(completed, index + 1)}`,
      startedAt: started.toISOString(),
      completedAt: completed.toISOString(),
    });

    const decisions: Record<string, DecisionState> = {};
    run.recommendations.forEach((rec, recIndex) => {
      if (spec.decisions === 'accepted') decisions[rec.id] = 'accepted';
      else if (spec.decisions === 'mixed') decisions[rec.id] = recIndex === 0 ? 'accepted' : 'pending';
    });

    return { ...run, decisions, persistence: 'fixture' as const };
  });
}

/**
 * Seeds fixture runs when the current URL carries `?seedRuns=1`.
 *
 * Existing recorded runs are preserved; fixtures are appended after them and
 * are only inserted once per session.
 */
export function useSeededRunFixtures(): void {
  const { search } = useLocation();
  const { facility } = useFacilityModel();
  const seedFixtureRuns = useWorkspaceStore((s) => s.seedFixtureRuns);
  const clearFixtureRuns = useWorkspaceStore((s) => s.clearFixtureRuns);

  const flag = new URLSearchParams(search).get(SEED_RUNS_PARAM);
  const wantsFixtures = flag === '1' || flag === 'true';
  const wantsClear = flag === '0' || flag === 'false';

  useEffect(() => {
    if (wantsFixtures) seedFixtureRuns(buildRunFixtures(facility));
    else if (wantsClear) clearFixtureRuns();
  }, [wantsFixtures, wantsClear, facility, seedFixtureRuns, clearFixtureRuns]);
}
