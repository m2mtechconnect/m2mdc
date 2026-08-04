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
import { Slider } from '@/components/ui/slider';
import { Textarea } from '@/components/ui/textarea';
import { Play, Pause, RotateCcw } from 'lucide-react';
import { useWorkspace } from '@/dsx/runtime/EvidenceBetaContext';
import { SCENARIO_CATALOGUE } from '@/dsx/workspaces/availability';
import { TIMELINE_IDS, type TimelineId } from '@/dsx/fixtures/timelines';
import { PHYSICAL_CONTROL_ENABLED } from '@/dsx/contracts/recommendation';
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

export function RecommendationList() {
  const { rt } = useWorkspace();
  const [rationale, setRationale] = useState<Record<string, string>>({});
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
      {rt.scenario.recommendations.map((r) => {
        const decision = byRec[r.recommendation_id];
        return (
          <Card key={r.recommendation_id} data-testid={`dsx-recommendation-${r.severity}`}>
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

              {decision ? (
                <p data-testid="dsx-decision-recorded" className="rounded-sm border border-border bg-muted/40 p-2">
                  Decision <strong>{decision.outcome}</strong> by {decision.approver} at {decision.decided_at}.
                  Execution status: {decision.execution_status.replace(/_/g, ' ')}. AURA performed no action.
                </p>
              ) : (
                <div className="space-y-2">
                  <Label className="text-xs" htmlFor={`rationale-${r.recommendation_id}`}>
                    Decision rationale (required)
                  </Label>
                  <Textarea
                    id={`rationale-${r.recommendation_id}`}
                    value={rationale[r.recommendation_id] ?? ''}
                    onChange={(e) => setRationale((p) => ({ ...p, [r.recommendation_id]: e.target.value }))}
                    rows={2}
                  />
                  <div className="flex flex-wrap gap-2">
                    {(['approved', 'rejected', 'escalated'] as const).map((outcome) => (
                      <Button
                        key={outcome}
                        size="sm"
                        variant="outline"
                        disabled={!(rationale[r.recommendation_id] ?? '').trim()}
                        data-testid={`dsx-decide-${outcome}`}
                        onClick={() =>
                          rt.recordDecision(
                            r.recommendation_id,
                            outcome,
                            rationale[r.recommendation_id],
                            'internal operator',
                          )
                        }
                      >
                        Record {outcome}
                      </Button>
                    ))}
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    Recording a decision writes an audit entry only. Physical control dispatch is{' '}
                    {PHYSICAL_CONTROL_ENABLED ? 'enabled' : 'disabled'} in this build.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
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