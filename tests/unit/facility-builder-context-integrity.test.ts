import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

const read = (path: string) => readFileSync(path, 'utf8');

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

  it('hands the active facility to Blueprint and Simulation', () => {
    const source = read('src/components/builder/steps/Step5Deploy.tsx');
    expect(source).toContain("blueprintId: activeTwin?.id ?? builderId ?? 'unavailable'");
    expect(source).toContain('twinId={activeTwin?.id || "unavailable"}');
  });
});
