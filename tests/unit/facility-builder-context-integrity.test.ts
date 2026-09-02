import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

const read = (path: string) => readFileSync(path, 'utf8').replace(/\r\n/g, '\n');

describe('facility builder context integrity', () => {
  it('persists the validated twin in both canonical and config fields', () => {
    const source = read('supabase/functions/builders-create/index.ts');
    expect(source).toContain("twin_id: twin_id || null,\n        config:");
    expect(source).toContain("twin_id: twin_id || null,\n          facility:");
    expect(source).toContain("facilityBuildName");
    expect(source).toContain(".select('id, name, city, region_code, industry, tier, capacity_kw, pue_target, renewable_target_pct, sovereignty_level')");
  });

  it('renders facility truth instead of Toronto or NVIDIA fixture claims', () => {
    const source = read('src/components/builder/steps/Step1Summary.tsx');
    expect(source).toContain('const { twin: activeTwin } = useActiveTwin()');
    expect(source).toContain('activeTwin.region_code');
    expect(source).toContain('activeTwin.city');
    expect(source).not.toContain("facilityLocation: 'CA-ON (Toronto)'");
    expect(source).not.toContain("gpuFleet: 'NVIDIA H100 x 256, A100 x 128'");
    expect(source).toContain('twinId={activeTwin?.id || "unavailable"}');
  });

  it('keeps percentage assumptions in percent units', () => {
    const source = read('src/components/builder/CarbonFinancialConfigSection.tsx');
    expect(source).toContain('useState([DEFAULT_FINANCIAL_ASSUMPTIONS.interestRatePct])');
    expect(source).toContain('interestRatePct: interestRate[0],');
    expect(source).not.toContain('interestRatePct * 100');
  });

  it('uses one managed-AI readiness contract and honest warning copy', () => {
    const warnings = read('src/components/builder/step5/deploy/DeploymentWarnings.tsx');
    const checklist = read('src/components/builder/step5/deploy/ReadinessChecklist.tsx');
    expect(warnings).toContain('modelConfig?.response_profile');
    expect(checklist).toContain('Critical checks passed;');
    expect(checklist).not.toContain('All critical checks passed! Ready for deployment.');
  });

  it('keeps one deployment-readiness heading and facility-specific guidance', () => {
    const step = read('src/components/builder/steps/Step5Deploy.tsx');
    const warnings = read('src/components/builder/step5/deploy/DeploymentWarnings.tsx');
    const checklist = read('src/components/builder/step5/deploy/ReadinessChecklist.tsx');
    expect(step.match(/title="Deployment Readiness"/g)).toHaveLength(1);
    expect(checklist).toContain('Pre-flight checks');
    expect(checklist).not.toContain('<CardTitle className="text-lg">Deployment Readiness</CardTitle>');
    expect(warnings).toContain('facility and twin outcomes');
    expect(warnings).not.toContain('track agent performance');
  });

  it('hands the persisted facility binding to Blueprint and Simulation', () => {
    const source = read('src/components/builder/steps/Step5Deploy.tsx');
    expect(source).toContain("blueprintId: persistedTwinId ?? builderId ?? 'unavailable'");
    expect(source).toContain('twinId: persistedTwinId');
    expect(source).toContain('twinId={persistedTwinId || "unavailable"}');
    expect(source).toContain('handleBindActiveFacility');
    expect(source).toContain('Generic agent-run evidence will not be used.');
  });
});
