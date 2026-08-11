import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { useWorkspaceStore } from '../workspaceStore';
import type { FacilityDefinition } from '../facilityModel';

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
  const facility: FacilityDefinition = {
    id: 'test-facility',
    name: 'Test facility',
    city: 'Toronto',
    regionCode: 'CA-ON',
    tier: 'Tier-III',
    capacityKw: 4200,
    rackCount: 24,
    rowCount: 3,
    designRackEstimate: 24,
    pueTarget: 1.28,
    renewableTargetPct: 85,
    carbonIntensity: 32,
    sovereigntyLevel: 'sovereign',
    industry: 'AI infrastructure',
  };

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

describe('Stage 7H — Builder is a design surface', () => {
  const read = (p: string) => readFileSync(p, 'utf8');

  it('Builder step 5 contains no simulation execution path', () => {
    const src = read('src/components/builder/steps/Step5Deploy.tsx');
    expect(src).not.toMatch(/handleRunSimulation/);
    expect(src).not.toMatch(/type:\s*'simulation'/);
    expect(src).toMatch(/buildSimulationHandoffUrl/);
  });

  it('Builder simulation preview offers only a handoff affordance', () => {
    const src = read('src/components/builder/step5/deploy/SimulationPreviewPanel.tsx');
    expect(src).not.toMatch(/useSimulation\b/);
    expect(src).not.toMatch(/startScenario|onRunSimulation/);
    expect(src).toMatch(/Open in Simulation/);
  });
});

describe('Stage 7I — Blueprint terminology and mutation boundary', () => {
  const MISLEADING = [
    /Run simulation/i,
    /Preview simulation/i,
    /Start run/i,
    /Run scenario/i,
    /Apply workflow/i,
    /Co-?Pilot/i,
  ];

  /**
   * Only user-visible text is audited: imports, comments and internal
   * identifiers (CoPilotContext, showCoPilotPanel) are implementation names,
   * not labels a data-centre operator ever reads.
   */
  function visibleLines(src: string): string[] {
    return src
      .split('\n')
      .filter((line) => !/^\s*(import|\/\/|\*|\/\*)/.test(line))
      .map((line) => line.replace(/\b\w*[Cc]o-?[Pp]ilot\w*\b(?=[\s.,)]*[({=]|Panel|Context|Props)/g, ''))
      .map((line) => line.replace(/[A-Za-z]*CoPilot[A-Za-z]*/g, ''));
  }

  it('contains no misleading execution or legacy assistant labels', () => {
    const offenders: string[] = [];
    for (const file of BLUEPRINT_FILES) {
      const lines = visibleLines(readFileSync(file, 'utf8'));
      for (const pattern of MISLEADING) {
        const hit = lines.find((line) => pattern.test(line));
        if (hit) offenders.push(`${file} :: ${pattern} :: ${hit.trim().slice(0, 80)}`);
      }
    }
    expect(offenders).toEqual([]);
  });

  it('never issues a simulation write through the backend client', () => {
    const offenders = BLUEPRINT_FILES.filter((file) => {
      const src = readFileSync(file, 'utf8');
      return /from\('(simulation|simulation_runs|scenario_runs|simulations)'\)/.test(src)
        || /functions\.invoke\(\s*['"][^'"]*(simulat|solver|scenario)/i.test(src);
    });
    expect(offenders).toEqual([]);
  });

  it('keeps workflow validation structural only', () => {
    const src = readFileSync('src/components/blueprint/tabs/BlueprintWorkflowsTab.tsx', 'utf8');
    expect(src).not.toMatch(/execute|solver|queueRun/i);
  });
});
