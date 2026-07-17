/**
 * Phase 1A.3.d.1 — Sovereign DC Simulation dashboard "Playbook" export
 * is disabled with a visible, documented reason. Source-level check
 * so the test does not depend on rendering the full dashboard.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

describe('SovereignDCSimulationDashboard — Playbook export disabled', () => {
  const src = readFileSync(
    resolve(__dirname, '../SovereignDCSimulationDashboard.tsx'),
    'utf8',
  );

  it('renders a disabled control with aria-disabled and data-export-blocked', () => {
    expect(src).toMatch(/data-export-blocked=\{playbookBlockReason\}/);
    expect(src).toMatch(/aria-disabled="true"/);
    expect(src).toMatch(/disabled/);
    expect(src).toMatch(/Playbook \(disabled\)/);
  });

  it('surfaces the documented reason via describeExportBlock', () => {
    expect(src).toMatch(/describeExportBlock\(playbookBlockReason\)/);
    expect(src).toMatch(/'no-audited-source'/);
  });

  it('does not still invoke the download / blob pipeline', () => {
    expect(src).not.toMatch(/URL\.createObjectURL/);
    expect(src).not.toMatch(/playbookToMarkdown\(/);
    expect(src).not.toMatch(/generatePlaybook\(/);
  });
});