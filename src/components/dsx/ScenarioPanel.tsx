/**
 * Shared scenario control and decision surface.
 *
 * Scenario selection is explicit and the catalogue states which scenarios
 * are operational and which are planned. A recommendation can only be
 * recorded as a human decision; AURA dispatches nothing.
 */
import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Slider } from '@/components/ui/slider';
import { Textarea } from '@/components/ui/textarea';
import { Play, Pause, RotateCcw } from 'lucide-react';
import { useWorkspace } from '@/dsx/runtime/EvidenceBetaContext';
import { SCENARIO_CATALOGUE } from '@/dsx/workspaces/availability';
import { TIMELINE_IDS, type TimelineId } from '@/dsx/fixtures/timelines';
import {
  PHYSICAL_CONTROL_ENABLED,
  type DecisionOutcome,
  type DecisionRecord,
  type Recommendation,
} from '@/dsx/contracts/recommendation';
import { PlannedState } from './StateBadges';

export function ScenarioControls() {
  const { rt } = useWorkspace();
  const timelineIds = TIMELINE_IDS as readonly string[];

  return (
    <Card data-testid="dsx-scenario-controls">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm">Scenario control</CardTitle>
        <CardDescription className="text-xs">
          Scenarios are deterministic replays of a seeded fixture. Selecting a scenario changes what
          is simulated, never what is measured.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap gap-2">
          {SCENARIO_CATALOGUE.map((s) => {
            const runnable = s.state === 'operational' && timelineIds.includes(s.timeline ?? '');
            const active = rt.timeline === s.timeline;
            return (
              <Button
                key={s.id}
                size="sm"
                variant={active ? 'default' : 'outline'}
                disabled={!runnable}
                onClick={() => runnable && rt.setTimeline(s.timeline as TimelineId)}
                data-testid={`dsx-scenario-${s.id}`}
                data-state={s.state}
                title={s.state === 'operational' ? s.question : s.reason}
              >
                {s.label}
                {s.state !== 'operational' && <span className="ml-2 text-[10px] uppercase">Planned</span>}
              </Button>
            );
          })}
        </div>

        <div className="space-y-2">
          <Label className="text-xs" htmlFor="dsx-tick">
            Observation step {rt.tick} of {rt.maxTick}
          </Label>
          <Slider
            id="dsx-tick"
            aria-label="Observation step"
            value={[rt.tick]}
            min={0}
            max={rt.maxTick}
            step={1}
            onValueChange={([v]) => rt.setTick(v)}
          />
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={() => rt.setPlaying(!rt.playing)} data-testid="dsx-play">
              {rt.playing ? <Pause className="mr-1 h-3.5 w-3.5" /> : <Play className="mr-1 h-3.5 w-3.5" />}
              {rt.playing ? 'Pause' : 'Play'}
            </Button>
            <Button size="sm" variant="outline" onClick={rt.reset} data-testid="dsx-reset">
              <RotateCcw className="mr-1 h-3.5 w-3.5" /> Reset
            </Button>
          </div>
        </div>

        <p className="text-[11px] text-muted-foreground">
          Baseline comparison: every scenario starts from step 0 of the same seeded fixture, so the
          step-0 reading is the baseline for the current run.
        </p>
      </CardContent>
    </Card>
  );
}

interface DraftDecision {
  rationale: string;
  comment: string;
  escalated_to: string;
  errors: string[];
}

const EMPTY_DRAFT: DraftDecision = { rationale: '', comment: '', escalated_to: '', errors: [] };

const OUTCOME_LABEL: Record<DecisionOutcome, string> = {
  approved: 'Approve',
  rejected: 'Reject',
  escalated: 'Escalate',
};

function DecisionRecordView({ decision }: { decision: DecisionRecord }) {
  const snap = decision.evidence_snapshot;
  return (
    <div
      data-testid="dsx-decision-recorded"
      data-outcome={decision.outcome}
      className="space-y-2 rounded-sm border border-border bg-muted/40 p-3"
    >
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant="outline" className="text-[11px] uppercase">{decision.outcome}</Badge>
        <span className="text-muted-foreground">
          by {decision.approver} at {decision.decided_at}
        </span>
      </div>
      <p>
        <span className="text-muted-foreground">Rationale: </span>
        {decision.rationale}
      </p>
      {decision.comment && (
        <p data-testid="dsx-decision-comment">
          <span className="text-muted-foreground">Comment: </span>
          {decision.comment}
        </p>
      )}
      {decision.escalated_to && (
        <p data-testid="dsx-decision-escalation-target">
          <span className="text-muted-foreground">Escalated to: </span>
          {decision.escalated_to}
        </p>
      )}
      <p>
        <span className="text-muted-foreground">Execution status: </span>
        {decision.execution_status.replace(/_/g, ' ')}. AURA performed no action.
      </p>
      <details data-testid="dsx-decision-evidence-snapshot" className="rounded-sm border border-border bg-background p-2">
        <summary className="cursor-pointer text-[11px] uppercase tracking-wide text-muted-foreground">
          Evidence snapshot at decision time
        </summary>
        <div className="space-y-1 pt-2">
          <p>
            Captured {snap.captured_at} · step {snap.observation_tick} · {snap.data_mode} ·
            timeline {snap.timeline_id}
          </p>
          <p>Hash {snap.snapshot_hash}</p>
          <ul className="list-disc pl-4">
            {snap.metrics.map((m) => (
              <li key={m.name}>
                {m.name}: {m.value === null ? 'unavailable' : `${m.value}${m.unit ? ` ${m.unit}` : ''}`}
              </li>
            ))}
          </ul>
          <p className="text-muted-foreground">
            Evidence events: {snap.evidence.event_ids.length > 0 ? snap.evidence.event_ids.join(', ') : 'none recorded'}
          </p>
        </div>
      </details>
    </div>
  );
}

function DecisionForm({ recommendation }: { recommendation: Recommendation }) {
  const { rt } = useWorkspace();
  const [draft, setDraft] = useState<DraftDecision>(EMPTY_DRAFT);
  const id = recommendation.recommendation_id;

  const submit = (outcome: DecisionOutcome) => {
    const result = rt.recordDecision(recommendation, {
      outcome,
      rationale: draft.rationale,
      approver: 'internal operator',
      comment: draft.comment,
      escalated_to: draft.escalated_to,
    });
    if (!result.ok) setDraft((p) => ({ ...p, errors: result.errors }));
  };

  return (
    <div className="space-y-3">
      <p data-testid="dsx-decision-pending" className="text-[11px] uppercase tracking-wide text-muted-foreground">
        Pending human decision
      </p>

      <div className="space-y-1">
        <Label className="text-xs" htmlFor={`rationale-${id}`}>
          Decision rationale (required)
        </Label>
        <Textarea
          id={`rationale-${id}`}
          value={draft.rationale}
          onChange={(e) => setDraft((p) => ({ ...p, rationale: e.target.value, errors: [] }))}
          rows={2}
        />
      </div>

      <div className="space-y-1">
        <Label className="text-xs" htmlFor={`comment-${id}`}>
          Operator comment (optional)
        </Label>
        <Textarea
          id={`comment-${id}`}
          data-testid="dsx-decision-comment-input"
          value={draft.comment}
          onChange={(e) => setDraft((p) => ({ ...p, comment: e.target.value }))}
          rows={2}
        />
      </div>

      <div className="space-y-1">
        <Label className="text-xs" htmlFor={`escalate-${id}`}>
          Escalation target (required to escalate)
        </Label>
        <Input
          id={`escalate-${id}`}
          data-testid="dsx-decision-escalation-input"
          value={draft.escalated_to}
          onChange={(e) => setDraft((p) => ({ ...p, escalated_to: e.target.value, errors: [] }))}
          placeholder="e.g. facility duty manager"
        />
      </div>

      {draft.errors.length > 0 && (
        <ul data-testid="dsx-decision-errors" className="list-disc pl-4 text-destructive">
          {draft.errors.map((e) => <li key={e}>{e}</li>)}
        </ul>
      )}

      <div className="flex flex-wrap gap-2">
        {(['approved', 'rejected', 'escalated'] as const).map((outcome) => (
          <Button
            key={outcome}
            size="sm"
            variant="outline"
            data-testid={`dsx-decide-${outcome}`}
            onClick={() => submit(outcome)}
          >
            {OUTCOME_LABEL[outcome]}
          </Button>
        ))}
      </div>

      <p className="text-[11px] text-muted-foreground">
        Recording a decision writes an audit entry with an evidence snapshot only. Physical control
        dispatch is {PHYSICAL_CONTROL_ENABLED ? 'enabled' : 'disabled'} in this build.
      </p>
    </div>
  );
}

export function RecommendationList() {
  const { rt } = useWorkspace();
  const byRec = Object.fromEntries(rt.decisions.map((d) => [d.recommendation_id, d]));

  if (rt.scenario.recommendations.length === 0) {
    return (
      <p className="text-sm text-muted-foreground" data-testid="dsx-no-recommendations">
        No recommendation is generated at this observation step.
      </p>
    );
  }

  return (
    <div className="space-y-3" data-testid="dsx-recommendations">
      <p className="text-xs text-muted-foreground" data-testid="dsx-pending-count">
        {rt.pendingRecommendations.length} of {rt.scenario.recommendations.length} recommendation(s)
        awaiting a human decision.
      </p>
      {rt.scenario.recommendations.map((r) => {
        const decision = byRec[r.recommendation_id];
        return (
          <Card
            key={r.recommendation_id}
            data-testid={`dsx-recommendation-${r.severity}`}
            data-decision-state={decision ? decision.outcome : 'pending_human_decision'}
          >
            <CardHeader className="pb-2">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="outline" className="text-[11px] uppercase">{r.severity}</Badge>
                <Badge variant="outline" className="text-[11px]">{r.data_mode}</Badge>
                <Badge variant="outline" className="text-[11px]">
                  Confidence {r.confidence === null ? 'not reported' : r.confidence}
                </Badge>
                <Badge variant="outline" className="text-[11px]">
                  {r.evidence.event_ids.length} evidence event(s)
                </Badge>
              </div>
              <CardTitle className="pt-2 text-sm font-medium leading-relaxed">{r.text}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-xs">
              <p><span className="text-muted-foreground">Expected effect: </span>{r.expected_effect}</p>
              <p><span className="text-muted-foreground">Operator action: </span>{r.proposed_action}</p>
              <ul className="list-disc pl-4 text-muted-foreground">
                {r.limitations.map((l) => <li key={l}>{l}</li>)}
              </ul>

              {decision ? <DecisionRecordView decision={decision} /> : <DecisionForm recommendation={r} />}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

export function DecisionLog() {
  const { rt } = useWorkspace();
  return (
    <Card data-testid="dsx-decision-log">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm">Decision log</CardTitle>
        <CardDescription className="text-xs">
          Append-only record of human decisions. Each entry keeps the evidence snapshot that was on
          screen when the decision was made.{' '}
          {rt.decisionPersistence === 'durable'
            ? 'Recorded durably in the decision_records log.'
            : 'Not signed in: decisions stay in this session only and are lost on reload.'}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3 text-xs">
        {rt.decisions.length === 0 ? (
          <p className="text-muted-foreground" data-testid="dsx-decision-log-empty">
            No decision has been recorded in this session.
          </p>
        ) : (
          rt.decisions.map((d) => <DecisionRecordView key={d.decision_id} decision={d} />)
        )}
      </CardContent>
    </Card>
  );
}

export function PlannedScenarioNotice() {
  const planned = SCENARIO_CATALOGUE.filter((s) => s.state !== 'operational');
  if (planned.length === 0) return null;
  return (
    <div className="space-y-2">
      {planned.map((s) => <PlannedState key={s.id} title={s.label} reason={s.reason} />)}
    </div>
  );
}