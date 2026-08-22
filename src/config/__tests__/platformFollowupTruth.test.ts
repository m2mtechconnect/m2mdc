import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

function source(relativePath: string): string {
  return readFileSync(fileURLToPath(new URL(relativePath, import.meta.url)), 'utf8');
}

describe('AURA platform follow-up truth and UX regressions', () => {
  it('does not present hard-coded Teams fixtures as tenant activity', () => {
    const teams = source('../../pages/Teams.tsx');

    for (const forbidden of [
      'Sarah Chen',
      'Michael Wong',
      'Alex Johnson',
      'run-001',
      'run-002',
      'run-003',
    ]) {
      expect(teams).not.toContain(forbidden);
    }

    expect(teams).toContain('lastActive: "Not tracked"');
    expect(teams).toContain('department: "Not tracked"');
    expect(teams).toContain('profile.is_approved ? "approved" : "pending"');
  });

  it('does not synthesize a fresh Command Center run timestamp', () => {
    const commandCentre = source('../../workspace/CommandCentre.tsx');

    expect(commandCentre).toContain('No run recorded');
    expect(commandCentre).not.toMatch(/:\s*new Date\(\)\.toLocaleTimeString/);
  });

  it('does not use operational status styling for Help documentation cards', () => {
    const help = source('../../pages/Help.tsx');
    expect(help).not.toContain('status="operational"');
  });

  it('preserves the operator inspector choice across responsive breakpoints', () => {
    const workspace = source('../../workspace/AuraWorkspace.tsx');
    expect(workspace).toContain('inspectorInitialized');
    expect(workspace).toContain("window.matchMedia(`(max-width: ${OVERLAY_BREAKPOINT - 1}px)`).matches");
    expect(workspace).toContain("if (inspectorInitialized.current) return;");
  });

  it('loads a shared reduced-motion guard for the authenticated shell', () => {
    const main = source('../../main.tsx');
    const accessibility = source('../../styles/aura-accessibility.css');

    expect(main).toContain('./styles/aura-accessibility.css');
    expect(accessibility).toContain('@media (prefers-reduced-motion: reduce)');
    expect(accessibility).toContain('scroll-behavior: auto !important');
  });
});
