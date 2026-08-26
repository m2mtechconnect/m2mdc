import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const read = (path: string) => readFileSync(resolve(process.cwd(), path), 'utf8');

const blueprintPreview = read('src/pages/BlueprintPreview.tsx');
const simulationPreview = read('src/pages/SimulationPreview.tsx');
const systemManage = read('src/pages/SystemManage.tsx');
const systemLayout = read('src/components/system-manage/TwinDetailsLayout.tsx');
const unifiedPreview = read('src/components/agent-preview/UnifiedAgentPreview.tsx');
const configTabs = read('src/components/system-manage/SystemConfigTabs.tsx');

describe('P1 Batch B blueprint preview truth contract', () => {
  it('derives agents, scenarios and KPI target count from recommendation data', () => {
    expect(blueprintPreview).toContain('const agents = recommendation.agents ?? [];');
    expect(blueprintPreview).toContain('const scenarios = recommendation.scenarios ?? [];');
    expect(blueprintPreview).toContain('Object.keys(recommendation.kpiTargets ?? {}).length');
  });

  it('does not infer facility tier, MW capacity, fixed workflow/role/data-source counts, or default agents', () => {
    expect(blueprintPreview).not.toContain('getDefaultAgentsForIndustry');
    expect(blueprintPreview).not.toContain('Tier IV');
    expect(blueprintPreview).not.toContain('Tier III');
    expect(blueprintPreview).not.toContain('20+ MW');
    expect(blueprintPreview).not.toContain('10-20 MW');
    expect(blueprintPreview).not.toContain('>24<');
    expect(blueprintPreview).not.toContain('>12<');
  });

  it('labels recommendation values as planning inputs rather than runtime evidence', () => {
    expect(blueprintPreview).toContain('They are not deployed infrastructure, measured telemetry, or validated runtime results.');
    expect(blueprintPreview).toContain('Planning targets from the recommendation, not measured KPI values.');
  });
});

describe('P1 Batch B simulation preview truth contract', () => {
  it('retires the recommendation-only preview into the canonical Simulation workspace', () => {
    expect(simulationPreview).toContain("import { Navigate, useLocation } from 'react-router-dom';");
    expect(simulationPreview).toContain('const suffix = `${location.search}${location.hash}`;');
    expect(simulationPreview).toContain('return <Navigate to={`/simulation${suffix}`} replace />;');
  });

  it('does not ship fabricated preview scenarios or simulated/live KPI claims', () => {
    expect(simulationPreview).not.toContain('const previewScenarios');
    expect(simulationPreview).not.toContain('PRESET_SCENARIOS');
    expect(simulationPreview).not.toContain('~1.35');
    expect(simulationPreview).not.toContain('99.99%');
    expect(simulationPreview).not.toContain('real-time KPI tracking');
    expect(simulationPreview).not.toContain('recommendation.scenarios ?? []');
  });

  it('keeps recommendation planning targets on Blueprint instead of duplicating them in the retired preview', () => {
    expect(blueprintPreview).toContain('Planning targets from the recommendation, not measured KPI values.');
    expect(simulationPreview).not.toContain('recommendation.kpiTargets');
  });
});

describe('P1 Batch B system-management truth contract', () => {
  it('does not invent provider, model temperature, compatibility, integrations or zero metrics', () => {
    expect(systemManage).not.toContain('llmProvider="Google"');
    expect(systemManage).not.toContain('temperature: 0.7');
    expect(systemManage).not.toContain('mcpEnabled: true');
    expect(systemManage).not.toContain('cloudReady: true');
    expect(systemManage).not.toContain('enterpriseSecure: true');
    expect(systemManage).not.toContain('success_rate || 0');
    expect(systemManage).not.toContain('total_runs || 0');
  });

  it('preserves missing persisted values as unavailable', () => {
    expect(systemManage).toContain("typeof agent.success_rate === 'number' ? agent.success_rate : null");
    expect(systemManage).toContain("typeof agent.total_runs === 'number' ? agent.total_runs : null");
    expect(systemManage).toContain('.maybeSingle()');
    expect(systemManage).toContain('channel: null');
  });

  it('does not convert missing values to zero in the shared layout or preview', () => {
    expect(systemLayout).toContain('system?.successRate ?? undefined');
    expect(systemLayout).toContain('system?.roi ?? undefined');
    expect(unifiedPreview).toContain("'Unavailable'");
    expect(unifiedPreview).not.toContain('successRate = 0');
    expect(unifiedPreview).not.toContain('roi = 0');
  });

  it('renders lifecycle controls only when real callbacks exist', () => {
    expect(unifiedPreview).toContain('onDeploy &&');
    expect(unifiedPreview).toContain('onRollback &&');
    expect(unifiedPreview).toContain('onPause &&');
    expect(unifiedPreview).toContain('onResume &&');
  });

  it('does not substitute a conventional temperature when configuration evidence is absent', () => {
    expect(configTabs).toContain("typeof system.intelligence?.temperature === 'number'");
    expect(configTabs).not.toContain('temperature || 0.7');
    expect(configTabs).toContain('Knowledge-source evidence is unavailable on this view.');
  });
});
