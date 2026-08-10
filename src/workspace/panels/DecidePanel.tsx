import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { SIGNAL_BASIS, SIGNAL_RULES } from '@/capabilities/recommendationSignal';
import { useActiveRun, useWorkspaceStore } from '../workspaceStore';
import type { DecisionState } from '../scenarioEngine';

const DECISIONS: Array<{ value: DecisionState; label: string }> = [
  { value: 'accepted', label: 'Accept' },
  { value: 'rejected', label: 'Reject' },
  { value: 'deferred', label: 'Defer' },
];

export function DecidePanel() {
  const run = useActiveRun();
  const recordDecision = useWorkspaceStore((s) => s.recordDecision);
  const setTool = useWorkspaceStore((s) => s.setTool);

  if (!run) {
    return (
      <div className="space-y-3">
        <p className="text-xs text-muted-foreground">
          No active simulation run, so there are no recommendations to decide on.
        </p>
        <Button size="sm" onClick={() => setTool('simulate')}>
          Run a scenario
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-xs text-muted-foreground">
        Recommendations for run {run.id}. Decisions are recorded against this run and stay with its evidence.
      </p>

      <ul className="space-y-2">
        {run.recommendations.map((rec) => {
          const decision = run.decisions[rec.id] ?? 'pending';
          return (
            <li key={rec.id} className="rounded-md border border-border p-3">
              <div className="mb-1 flex items-start justify-between gap-2">
                <h4 className="text-xs font-semibold text-foreground">{rec.title}</h4>
                <Badge variant="outline" className="shrink-0 text-[10px]">
                  {rec.signal}
                </Badge>
              </div>
              <p className="mb-2 text-[11px] text-muted-foreground">{rec.rationale}</p>
              <div className="flex flex-wrap items-center gap-1.5">
                {DECISIONS.map((option) => (
                  <Button
                    key={option.value}
                    size="sm"
                    variant={decision === option.value ? 'secondary' : 'outline'}
                    aria-pressed={decision === option.value}
                    className="h-7 px-2.5 text-[11px]"
                    onClick={() => recordDecision(run.id, rec.id, option.value)}
                  >
                    {option.label}
                  </Button>
                ))}
                <span
                  className={cn(
                    'ml-auto text-[10px] uppercase tracking-wide',
                    decision === 'pending' ? 'text-muted-foreground' : 'text-foreground',
                  )}
                >
                  {decision}
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