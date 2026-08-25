import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { useRBAC } from '@/contexts/RBACContext';
import { SIGNAL_BASIS, SIGNAL_RULES } from '@/capabilities/recommendationSignal';
import { persistDecision, type DurableDecisionOutcome } from '../decisionPersistence';
import { useActiveRun, useWorkspaceStore } from '../workspaceStore';
import type { DecisionState } from '../scenarioEngine';
import { RunExportControls } from './RunExportControls';

const OUTCOME_TO_LOCAL: Record<DurableDecisionOutcome, DecisionState> = {
  approved: 'accepted',
  rejected: 'rejected',
  escalated: 'deferred',
};

export function DecidePanel() {
  const run = useActiveRun();
  const { can } = useRBAC();
  const recordDecision = useWorkspaceStore((s) => s.recordDecision);
  const setTool = useWorkspaceStore((s) => s.setTool);
  const [rationales, setRationales] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const canRecord = can('twin.edit');

  if (!run) {
    return (
      <div className="space-y-3">
        <p className="text-xs text-muted-foreground">
          No active simulation run, so there are no recommendations to review.
        </p>
        <Button size="sm" onClick={() => setTool('simulate')}>
          Run a scenario
        </Button>
      </div>
    );
  }

  const durable = Boolean(run.serverId && run.persistence === 'server');
  const canApprove = run.validationStatus === 'server-validated';

  async function submit(recommendationId: string, outcome: DurableDecisionOutcome) {
    if (!run || !durable || !canRecord || saving) return;
    const rationale = rationales[recommendationId]?.trim() ?? '';
    if (rationale.length < 10) {
      setErrors((current) => ({ ...current, [recommendationId]: 'Add at least 10 characters of rationale.' }));
      return;
    }
    setSaving(recommendationId);
    setErrors((current) => ({ ...current, [recommendationId]: '' }));
    try {
      await persistDecision({ run, recommendationId, outcome, rationale });
      recordDecision(run.id, recommendationId, OUTCOME_TO_LOCAL[outcome]);
    } catch (error) {
      setErrors((current) => ({
        ...current,
        [recommendationId]: error instanceof Error ? error.message : 'The decision could not be recorded.',
      }));
    } finally {
      setSaving(null);
    }
  }

  return (
    <div className="space-y-4">
      <div className="space-y-1 text-xs text-muted-foreground">
        <p>Recommendations for run {run.id}.</p>
        <p>
          Decisions are appended to the server evidence chain before this workspace updates. This run is{' '}
          <span className="font-medium text-foreground">{run.validationStatus ?? 'unverified'}</span>.
        </p>
        {!canApprove && (
          <p role="status">
            This is an unverified simulation preview. It may be rejected or escalated, but it cannot be approved.
          </p>
        )}
        {!durable && (
          <p role="alert">This run has no durable server record, so decision recording is unavailable.</p>
        )}
      </div>

      <RunExportControls run={run} />

      <ul className="space-y-3">
        {run.recommendations.map((rec) => {
          const decision = run.decisions[rec.id] ?? 'pending';
          const rationale = rationales[rec.id] ?? '';
          const error = errors[rec.id];
          return (
            <li key={rec.id} className="rounded-md border border-border p-3">
              <div className="mb-1 flex items-start justify-between gap-2">
                <h4 className="text-xs font-semibold text-foreground">{rec.title}</h4>
                <Badge variant="outline" className="shrink-0 text-xs">{rec.signal}</Badge>
              </div>
              <p className="mb-3 text-[11px] text-muted-foreground">{rec.rationale}</p>

              <label className="mb-1 block text-[11px] font-medium text-foreground" htmlFor={`decision-rationale-${rec.id}`}>
                Review rationale
              </label>
              <Textarea
                id={`decision-rationale-${rec.id}`}
                value={rationale}
                onChange={(event) => setRationales((current) => ({ ...current, [rec.id]: event.target.value }))}
                placeholder="Record why this recommendation is being rejected, escalated, or approved."
                rows={2}
                className="mb-2 min-h-[64px] text-xs"
                disabled={!durable || !canRecord || saving === rec.id}
              />
              {error && <p role="alert" className="mb-2 text-[11px] text-destructive">{error}</p>}

              <div className="flex flex-wrap items-center gap-1.5">
                {canApprove && (
                  <Button
                    size="sm"
                    variant={decision === 'accepted' ? 'secondary' : 'outline'}
                    aria-pressed={decision === 'accepted'}
                    className="h-7 px-2.5 text-[11px]"
                    disabled={!durable || !canRecord || rationale.trim().length < 10 || saving !== null}
                    onClick={() => { void submit(rec.id, 'approved'); }}
                  >
                    Approve
                  </Button>
                )}
                <Button
                  size="sm"
                  variant={decision === 'rejected' ? 'secondary' : 'outline'}
                  aria-pressed={decision === 'rejected'}
                  className="h-7 px-2.5 text-[11px]"
                  disabled={!durable || !canRecord || rationale.trim().length < 10 || saving !== null}
                  onClick={() => { void submit(rec.id, 'rejected'); }}
                >
                  Reject
                </Button>
                <Button
                  size="sm"
                  variant={decision === 'deferred' ? 'secondary' : 'outline'}
                  aria-pressed={decision === 'deferred'}
                  className="h-7 px-2.5 text-[11px]"
                  disabled={!durable || !canRecord || rationale.trim().length < 10 || saving !== null}
                  onClick={() => { void submit(rec.id, 'escalated'); }}
                >
                  Escalate
                </Button>
                <span
                  className={cn(
                    'ml-auto text-xs uppercase tracking-wide',
                    decision === 'pending' ? 'text-muted-foreground' : 'text-foreground',
                  )}
                >
                  {saving === rec.id ? 'recording' : decision}
                </span>
              </div>
            </li>
          );
        })}
      </ul>

      <div className="rounded-md bg-muted/50 p-2.5 text-[11px] text-muted-foreground">
        <p>{SIGNAL_BASIS}</p>
        <p className="mt-1">{SIGNAL_RULES}</p>
      </div>
    </div>
  );
}
