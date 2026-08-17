/**
 * Phase 7 guard: agent-facing copy must not claim autonomy AURA does not
 * have, or NVIDIA inference that is not deployed.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  AURA_AGENT_POSITIONING,
  findAgentPositioningViolations,
  isAgentCopyAllowed,
} from '../agentPositioning';

const ROOT = process.cwd();

/** User-facing agent copy surfaces. */
const COPY_SURFACES = [
  'src/ux/UX_STRINGS.ts',
  'src/components/auth/AuthLayout.tsx',
  'src/components/templates/StandardizedTemplatePreview.tsx',
  'src/pages/ManageAgents.tsx',
];

describe('AURA agent positioning', () => {
  it('never claims closed-loop autonomy or NVIDIA inference', () => {
    expect(AURA_AGENT_POSITIONING.autonomy).toBe('human-approved');
    expect(AURA_AGENT_POSITIONING.actuatesInfrastructure).toBe(false);
    expect(AURA_AGENT_POSITIONING.availableInference).not.toContain('nvidia-nim');
    expect(AURA_AGENT_POSITIONING.unavailableInference).toContain('nvidia-nim');
  });

  it('flags overclaiming wording', () => {
    expect(isAgentCopyAllowed('AURA agents recommend actions for approval')).toBe(true);
    expect(findAgentPositioningViolations('NIM-powered autonomous agent')).toHaveLength(2);
  });

  it('keeps overclaiming wording out of agent copy surfaces', () => {
    const offenders: string[] = [];
    for (const file of COPY_SURFACES) {
      const src = readFileSync(join(ROOT, file), 'utf8');
      const code = src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|\s)\/\/.*$/gm, '');
      for (const violation of findAgentPositioningViolations(code)) {
        offenders.push(`${file}: "${violation.phrase}" -> "${violation.replacement}"`);
      }
    }
    expect(offenders).toEqual([]);
  });
});
