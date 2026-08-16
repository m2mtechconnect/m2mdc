/**
 * Step resolution rules (finding PW-P2-01). The URL owns the step, unknown
 * steps fall back visibly, and gated steps cannot be entered without a run.
 */
import { describe, expect, it } from 'vitest';
import { GATED_STEPS, isWorkflowStep, resolveWorkflowStep, stepLabel } from '../useWorkflowStep';

describe('resolveWorkflowStep', () => {
  it('falls back and rewrites when no step is requested', () => {
    const r = resolveWorkflowStep(null, false, 'simulate');
    expect(r).toMatchObject({ step: 'simulate', notice: null, rewrite: true });
  });

  it('honours a valid ungated step without rewriting', () => {
    const r = resolveWorkflowStep('inspect', false, 'simulate');
    expect(r).toMatchObject({ step: 'inspect', notice: null, rewrite: false });
  });

  it('explains an unknown step instead of failing silently', () => {
    const r = resolveWorkflowStep('bogus', true, 'simulate');
    expect(r.step).toBe('simulate');
    expect(r.notice).toContain('bogus');
    expect(r.rewrite).toBe(true);
  });

  it.each([...GATED_STEPS])('blocks %s until a run exists', (step) => {
    const blocked = resolveWorkflowStep(step, false, 'simulate');
    expect(blocked.step).toBe('simulate');
    expect(blocked.notice).toContain('completed run');

    const allowed = resolveWorkflowStep(step, true, 'simulate');
    expect(allowed.step).toBe(step);
    expect(allowed.notice).toBeNull();
  });

  it('recognises only real workflow steps', () => {
    expect(isWorkflowStep('simulate')).toBe(true);
    expect(isWorkflowStep('')).toBe(false);
    expect(isWorkflowStep(null)).toBe(false);
    expect(stepLabel('simulate')).toBeTruthy();
  });
});
