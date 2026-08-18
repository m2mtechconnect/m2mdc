/**
 * Truth-in-UI guard: operational surfaces must not fabricate telemetry.
 *
 * These files render or persist values that a user can reasonably read as
 * measurements. They must derive stochastic terms from the seeded
 * `mulberry32-v1` generator (or omit the value entirely), never from
 * `Math.random()`.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const GUARDED_FILES = [
  'src/hooks/useAgentRuns.ts',
  'src/pages/IntelligenceDashboard.tsx',
  'src/pages/Teams.tsx',
  'src/components/dc-twin/tabs/DCSimulationTab.tsx',
  'src/components/data-centre-twin/domains/NetworkDomainView.tsx',
  'src/components/data-centre-twin/overview/SparklineChart.tsx',
  'src/components/data-centre-twin/overview/EnhancedRackOverview.tsx',
  'src/components/data-centre-twin/overview/CompactRackOverview.tsx',
  'src/components/data-centre-twin/thermal/ThermalHeatmapUtils.ts',
  'src/pages/SystemManage.tsx',
];

/** Strip block and line comments so documentation of the rule is allowed. */
function stripComments(source: string): string {
  return source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
}

describe('no fabricated telemetry on operational surfaces', () => {
  it.each(GUARDED_FILES)('%s does not call Math.random()', (file) => {
    const code = stripComments(readFileSync(resolve(process.cwd(), file), 'utf8'));
    expect(code).not.toMatch(/Math\.random\s*\(/);
  });

  it('useAgentRuns never writes a synthetic run outcome', () => {
    const code = readFileSync(resolve(process.cwd(), 'src/hooks/useAgentRuns.ts'), 'utf8');
    expect(code).not.toContain('tokensUsed');
    expect(code).not.toContain('Simulated failure');
    expect(code).toContain('no execution backend is bound');
  });

  it('SystemManage does not ship placeholder department or ROI values', () => {
    const code = stripComments(
      readFileSync(resolve(process.cwd(), 'src/pages/SystemManage.tsx'), 'utf8'),
    );
    expect(code).not.toMatch(/department:\s*'[^']+'/);
    expect(code).not.toMatch(/roi:\s*\d/);
  });
});
