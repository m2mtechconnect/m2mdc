import { existsSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const read = (path: string) => readFileSync(new URL(path, import.meta.url), 'utf8');

describe('AURA Builder and Connections UX invariants', () => {
  it('uses flow-accurate Builder navigation labels', () => {
    const source = read('../../components/builder/BuilderLayout.tsx');
    expect(source).toContain("title: 'Overview'");
    expect(source).toContain("title: 'Intelligence'");
    expect(source).toContain("title: 'Connections'");
    expect(source).toContain("title: 'Workflow'");
    expect(source).toContain("title: 'Blueprint'");
    expect(source).toContain("title: 'Scenarios'");
    expect(source).toContain("title: 'Review & Deploy'");
    expect(source).not.toContain("title: 'Business Profile'");
    expect(source).not.toContain("title: 'AI & Integrations'");
    expect(source).not.toContain("title: 'Capabilities'");
  });

  it('does not ship invented Builder facility or outcome defaults', () => {
    const builder = read('../../pages/Builder.tsx');
    const summary = read('../../components/builder/steps/Step1Summary.tsx');
    for (const forbidden of [
      "city: 'Montreal'",
      "region_code: 'QC'",
      "tier: 'Tier III'",
      'capacity_kw: 5000',
      'NVIDIA H100 x 256',
      "'85%'",
      "'35-50%'",
      "'20+ hrs/week'",
      "'3-5x faster'",
      'value="1.2-1.4"',
      'value="99.99%"',
    ]) {
      expect(`${builder}\n${summary}`).not.toContain(forbidden);
    }
    expect(summary).toContain("const NOT_CONFIGURED = 'Not configured'");
  });

  it('uses progressive disclosure in Intelligence and recommendation-first Connections', () => {
    const intelligence = read('../../components/builder/steps/Step2Intelligence.tsx');
    const connections = read('../../components/builder/steps/Step3Tools.tsx');
    expect(intelligence).toContain('Advanced operational controls');
    expect(intelligence).toContain('Suggested defaults below are policy starting points, not observed telemetry');
    expect(connections).toContain('Recommended for this build');
    expect(connections).toContain('Browse all approved capabilities');
  });

  it('keeps demo integrations out of the primary Connections tab bar', () => {
    const source = read('../../pages/Connections.tsx');
    expect(source).toContain("{ value: 'catalogue', label: 'Connectors' }");
    expect(source).toContain("{ value: 'activity', label: 'Activity' }");
    expect(source).not.toContain("{ value: 'demo', label: 'Demo integrations' }");
    expect(source).not.toContain('data-[state=active]:border-[hsl(var(--v2-simulated))]');
    expect(source).toContain('data-[state=active]:border-primary');
  });

  it('separates account and data truth in featured integration cards', () => {
    const source = read('../../components/connections/DemoIntegrationsTab.tsx');
    expect(source).toContain('Account');
    expect(source).toContain('Data');
    expect(source).toContain('Connected · read only');
    expect(source).toContain('Live · verified');
    expect(source).toContain('Demo data');
  });

  it('uses the shared status descriptors instead of raw enum formatting', () => {
    const source = read('../../components/connections/ConnectionsTab.tsx');
    expect(source).toContain('STATUS_DESCRIPTORS');
    expect(source).not.toContain("replace(/_/g, ' ').toLowerCase()");
    expect(source).toMatch(/\bOpen\b/);
  });

  it('has no duplicate DC step implementation tree under builder/steps', () => {
    for (const name of ['DCStep1Summary.tsx', 'DCStep2Blueprint.tsx', 'DCStep3Integrations.tsx', 'DCStep4Scenarios.tsx', 'DCStep5Deploy.tsx']) {
      const url = new URL(`../../components/builder/steps/${name}`, import.meta.url);
      expect(existsSync(url)).toBe(false);
    }
  });
});
