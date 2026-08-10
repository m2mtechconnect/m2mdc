import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, PlayCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { WORKSPACE_SCENARIOS } from '../scenarioEngine';
import { useActiveRun, useWorkspaceStore } from '../workspaceStore';
import type { FacilityDefinition } from '../facilityModel';

interface Props {
  facility: FacilityDefinition;
}

export function SimulatePanel({ facility }: Props) {
  const scenarioId = useWorkspaceStore((s) => s.scenarioId);
  const setScenario = useWorkspaceStore((s) => s.setScenario);
  const runScenario = useWorkspaceStore((s) => s.runScenario);
  const isRunning = useWorkspaceStore((s) => s.isRunning);
  const run = useActiveRun();

  return (
    <div className="space-y-4">
      <p className="text-xs text-muted-foreground">
        Scenarios run against the current modelled configuration. Results are simulated outputs, not measurements.
      </p>

      <div role="radiogroup" aria-label="Scenario" className="space-y-1.5">
        {WORKSPACE_SCENARIOS.map((scenario) => (
          <button
            key={scenario.id}
            type="button"
            role="radio"
            aria-checked={scenarioId === scenario.id}
            onClick={() => setScenario(scenario.id)}
            className={cn(
              'w-full rounded-md border px-3 py-2 text-left transition-colors',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1',
              scenarioId === scenario.id ? 'border-primary bg-primary/5' : 'border-border hover:bg-muted',
            )}
          >
            <span className="block text-xs font-medium text-foreground">{scenario.label}</span>
            <span className="mt-0.5 block text-[11px] text-muted-foreground">{scenario.description}</span>
          </button>
        ))}
      </div>

      <Button
        className="w-full"
        size="sm"
        disabled={isRunning}
        data-testid="workspace-run-scenario"
        onClick={() => void runScenario(facility)}
      >
        {isRunning ? <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden /> : <PlayCircle className="mr-2 h-4 w-4" aria-hidden />}
        {isRunning ? 'Running scenario' : 'Run scenario'}
      </Button>

      {run && (
        <div className="rounded-md border border-border p-3">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-xs font-medium text-foreground">{run.scenarioLabel}</span>
            <Badge variant="outline" className="text-[10px]">
              {run.id}
            </Badge>
          </div>
          <ol className="space-y-1.5">
            {run.events.map((event, i) => (
              <li key={`${event.atMinute}-${i}`} className="flex gap-2 text-[11px]">
                <span className="w-12 shrink-0 tabular-nums text-muted-foreground">+{event.atMinute}m</span>
                <span
                  className={cn(
                    'shrink-0 font-medium',
                    event.severity === 'critical' && 'text-destructive',
                    event.severity === 'warning' && 'text-warning',
                    event.severity === 'info' && 'text-muted-foreground',
                  )}
                >
                  {event.subsystem}
                </span>
                <span className="text-foreground">{event.message}</span>
              </li>
            ))}
          </ol>
        </div>
      )}
    </div>
  );
}