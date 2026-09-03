import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { recommendedKPIsFor } from '@/components/builder/step5/deploy/AutoSuggestedKPIs';

const read = (path: string) => readFileSync(path, 'utf8').replace(/\r\n/g, '\n');

describe('builder deployment truth', () => {
  it('uses facility KPIs without invented baselines or targets', () => {
    const kpis = recommendedKPIsFor('Technology', '3d_twin');
    expect(kpis.map((kpi) => kpi.id)).toEqual([
      'pue',
      'rack-inlet-temperature',
      'power-capacity-utilization',
      'renewable-energy-share',
    ]);
    expect(kpis.every((kpi) => kpi.baseline === undefined && kpi.target === undefined)).toBe(true);
  });

  it('does not present generic agent semantics for a facility summary', () => {
    const source = read('src/components/builder/step5/deploy/DeploymentSummaryCard.tsx');
    expect(source).toContain("const sections = isFacilityProduct ? facilitySections : agentSections");
    expect(source).toContain("{ label: 'Facility binding', value: twinId || 'Not bound' }");
    expect(source).toContain("{ label: 'Owner', value: 'Unavailable' }");
    expect(source).not.toContain("{ label: 'Owner', value: 'Current User' }");
    expect(source).not.toContain('new Date().toLocaleDateString()');
  });

  it('never queries agent runs for an unbound facility product', () => {
    const source = read('src/components/builder/steps/Step5Deploy.tsx');
    const facilityBranch = source.indexOf("savedProductKind === '3d_twin'");
    const agentRunQuery = source.indexOf(".from('agent_runs')");
    expect(facilityBranch).toBeGreaterThan(-1);
    expect(agentRunQuery).toBeGreaterThan(facilityBranch);
    expect(source.slice(facilityBranch, agentRunQuery)).toContain('setSimulationHistory([])');
  });
});
