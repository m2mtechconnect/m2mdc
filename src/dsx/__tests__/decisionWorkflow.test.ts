import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useEvidenceBeta } from '../runtime/useEvidenceBeta';
import { validateDecisionInput, decisionStateFor } from '../contracts/recommendation';

describe('recommendation decision workflow', () => {
  it('requires a rationale, and an escalation target when escalating', () => {
    expect(validateDecisionInput({ outcome: 'approved', rationale: '  ' }).valid).toBe(false);
    expect(validateDecisionInput({ outcome: 'escalated', rationale: 'ok' }).valid).toBe(false);
    expect(validateDecisionInput({ outcome: 'escalated', rationale: 'ok', escalated_to: 'duty manager' }).valid).toBe(true);
    expect(decisionStateFor(undefined)).toBe('pending_human_decision');
  });

  it('records outcome, comment, escalation and an evidence snapshot', () => {
    const { result } = renderHook(() => useEvidenceBeta());
    act(() => result.current.setTick(result.current.maxTick));

    const rec = result.current.scenario.recommendations[0];
    expect(rec).toBeDefined();
    expect(result.current.pendingRecommendations).toHaveLength(
      result.current.scenario.recommendations.length,
    );

    let outcome: { ok: boolean; errors: string[] } = { ok: true, errors: [] };
    act(() => {
      outcome = result.current.recordDecision(rec, {
        outcome: 'approved',
        rationale: '',
        approver: 'operator',
      });
    });
    expect(outcome.ok).toBe(false);
    expect(result.current.decisions).toHaveLength(0);

    act(() => {
      result.current.recordDecision(rec, {
        outcome: 'escalated',
        rationale: 'needs facility sign-off',
        approver: 'operator',
        comment: 'reviewed with shift lead',
        escalated_to: 'duty manager',
      });
    });

    const d = result.current.decisions[0];
    expect(d.outcome).toBe('escalated');
    expect(d.comment).toBe('reviewed with shift lead');
    expect(d.escalated_to).toBe('duty manager');
    expect(d.execution_status).toBe('not_executed');
    expect(d.evidence_snapshot.snapshot_hash).toMatch(/^fnv1a32:/);
    expect(d.evidence_snapshot.recommendation_text).toBe(rec.text);
    expect(result.current.pendingRecommendations).toHaveLength(
      result.current.scenario.recommendations.length - 1,
    );
  });

  it('keeps the snapshot immutable when the scenario advances afterwards', () => {
    const { result } = renderHook(() => useEvidenceBeta());
    act(() => result.current.setTick(result.current.maxTick));
    const rec = result.current.scenario.recommendations[0];
    act(() => {
      result.current.recordDecision(rec, { outcome: 'approved', rationale: 'ok', approver: 'operator' });
    });
    const before = JSON.stringify(result.current.decisions[0].evidence_snapshot);
    act(() => result.current.setTick(0));
    expect(JSON.stringify(result.current.decisions[0].evidence_snapshot)).toBe(before);
    expect(result.current.decisions[0].execution_status).toBe('manual_execution_pending');
  });
});
