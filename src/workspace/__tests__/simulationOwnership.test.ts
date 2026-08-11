import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { useWorkspaceStore } from '../workspaceStore';
import { buildFacilityFromTwin, FALLBACK_FACILITY } from '../facilityModel';

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) return walk(full);
    return /\.tsx?$/.test(entry) ? [full] : [];
  });
}

const BLUEPRINT_FILES = [...walk('src/components/blueprint'), 'src/pages/Blueprint.tsx'];

describe('Blueprint cannot execute simulations', () => {
  it('never imports simulation execution APIs', () => {
    const offenders = BLUEPRINT_FILES.filter((file) => {
      const src = readFileSync(file, 'utf8');
      return /from ['"](@\/)?(simulation\/(api|SimulationEngine|useSimulation)|workspace\/workspaceStore)/.test(src);
    });
    expect(offenders).toEqual([]);
  });

  it('never calls run/start/cancel simulation helpers', () => {
    const offenders = BLUEPRINT_FILES.filter((file) =>
      /\b(runScenario|runSimulation|startSimulation|cancelSimulation|createRun|rerun)\s*\(/.test(
        readFileSync(file, 'utf8'),
      ),
    );
    expect(offenders).toEqual([]);
  });

  it('exposes exactly one simulation handoff action', () => {
    const matches = BLUEPRINT_FILES.filter((f) => /Open in Simulation/.test(readFileSync(f, 'utf8')));
    expect(matches).toEqual(['src/components/blueprint/DesignerModeHeader.tsx']);
  });
});

describe('Simulation run gate', () => {
  const facility = FALLBACK_FACILITY ?? buildFacilityFromTwin(null as never);

  it('does not start a run until inputs are reviewed', async () => {
    useWorkspaceStore.setState({ assumptionsReviewed: false, isRunning: false });
    const runId = await useWorkspaceStore.getState().runScenario(facility);
    expect(runId).toBeNull();
    expect(useWorkspaceStore.getState().runs.length).toBe(0);
  });

  it('runs only after explicit review', async () => {
    useWorkspaceStore.setState({ runs: [], activeRunId: null });
    useWorkspaceStore.getState().setAssumptionsReviewed(true);
    const runId = await useWorkspaceStore.getState().runScenario(facility);
    expect(runId).toBeTruthy();
  });

  it('invalidates the review whenever a run input changes', () => {
    useWorkspaceStore.getState().setAssumptionsReviewed(true);
    useWorkspaceStore.getState().setScenario('baseline');
    expect(useWorkspaceStore.getState().assumptionsReviewed).toBe(false);

    useWorkspaceStore.getState().setAssumptionsReviewed(true);
    useWorkspaceStore.getState().setHandoff({ blueprintId: 'bp-1', versionId: '2' });
    expect(useWorkspaceStore.getState().assumptionsReviewed).toBe(false);
  });
});
