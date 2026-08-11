import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Loader2, PlayCircle, Lock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { WORKSPACE_SCENARIOS } from '../scenarioEngine';
import { useActiveRun, useWorkspaceStore } from '../workspaceStore';
import { useSimulationPermissions } from '@/simulation/handoff';
import { CLASSIFICATION_LABEL } from '@/lib/provenance/twinFieldProvenance';
import type { FacilityDefinition } from '../facilityModel';

interface Props {
  facility: FacilityDefinition;
}

/**
 * Simulation is the canonical owner of scenario configuration, assumptions and
 * run execution. A run is created here and nowhere else, and only after an
 * explicit review of the inputs.
 */
export function SimulatePanel({ facility }: Props) {
  const scenarioId = useWorkspaceStore((s) => s.scenarioId);
  const setScenario = useWorkspaceStore((s) => s.setScenario);
  const runScenario = useWorkspaceStore((s) => s.runScenario);
  const isRunning = useWorkspaceStore((s) => s.isRunning);
  const handoff = useWorkspaceStore((s) => s.handoff);
  const reviewed = useWorkspaceStore((s) => s.assumptionsReviewed);
  const setReviewed = useWorkspaceStore((s) => s.setAssumptionsReviewed);
  const run = useActiveRun();
  const { canConfigureSimulation, canExecuteSimulation } = useSimulationPermissions();

  const scenario = WORKSPACE_SCENARIOS.find((s) => s.id === scenarioId);
  const blockedReason = !canExecuteSimulation
    ? 'Your role cannot execute simulations. Ask an administrator for run permission.'
    : !scenario
      ? 'Select a scenario before running.'
      : !reviewed
        ? 'Review the run inputs below to enable execution.'
        : null;

  return (
    <div className="space-y-4">
      <p className="text-xs text-muted-foreground">
        Scenarios run against the current modelled configuration. Results are simulated outputs, not measurements.
      </p>

      {/* Draft configuration handed over from Blueprint. No run exists yet. */}
      <div className="rounded-md border border-border bg-muted/30 p-3" data-testid="simulation-draft-state">
        <div className="mb-1 flex items-center justify-between gap-2">
          <span className="text-xs font-medium text-foreground">Draft configuration</span>
          <Badge variant="outline" className="text-[10px]">
            {run ? 'Last run available' : 'Run state: Not started'}
          </Badge>
        </div>
        <dl className="grid grid-cols-[7rem_minmax(0,1fr)] gap-x-2 gap-y-0.5 text-[11px]">
          <dt className="text-muted-foreground">Blueprint</dt>
          <dd className="truncate text-foreground">{handoff?.blueprintId ?? 'Active facility model'}</dd>
          <dt className="text-muted-foreground">Version</dt>
          <dd className="truncate text-foreground">{handoff?.versionId ?? 'Unavailable'}</dd>
          <dt className="text-muted-foreground">Facility</dt>
          <dd className="truncate text-foreground">{facility.name}</dd>
          <dt className="text-muted-foreground">Configuration</dt>
          <dd className="text-foreground">{reviewed ? 'Ready for review' : 'Incomplete'}</dd>
        </dl>
      </div>

      <div role="radiogroup" aria-label="Scenario" className="space-y-1.5">
        {WORKSPACE_SCENARIOS.map((s) => (
          <button
            key={s.id}
            type="button"
            role="radio"
            aria-checked={scenarioId === s.id}
            disabled={!canConfigureSimulation}
            onClick={() => setScenario(s.id)}
            className={cn(
              'w-full rounded-md border px-3 py-2 text-left transition-colors',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1',
              'disabled:cursor-not-allowed disabled:opacity-60',
              scenarioId === s.id ? 'border-primary bg-primary/5' : 'border-border hover:bg-muted',
            )}
          >
            <span className="block text-xs font-medium text-foreground">{s.label}</span>
            <span className="mt-0.5 block text-[11px] text-muted-foreground">{s.description}</span>
          </button>
        ))}
      </div>

      {/* Explicit input review. Every value below is a modelled assumption. */}
      <div className="rounded-md border border-border p-3">
        <p className="mb-1.5 text-xs font-medium text-foreground">Review run inputs</p>
        <ul className="mb-2 space-y-0.5 text-[11px] text-muted-foreground">
          <li>Blueprint version: {handoff?.versionId ?? 'Unavailable'}</li>
          <li>Scenario: {scenario?.label ?? 'None selected'}</li>
          <li>Solver / model: Deterministic rule model ({CLASSIFICATION_LABEL['modeled-assumption']})</li>
          <li>Fidelity: Reduced-order, minute resolution</li>
          <li>Time horizon: {scenario ? `${scenario.durationMinutes} minutes` : 'Unavailable'}</li>
          <li>Input source: Synthetic modelled inputs, no live telemetry</li>
          <li>Limitations: Outputs are simulated and carry no measurement evidence</li>
        </ul>
        <label className="flex items-start gap-2 text-[11px] text-foreground">
          <Checkbox
            checked={reviewed}
            disabled={!canConfigureSimulation}
            onCheckedChange={(v) => setReviewed(v === true)}
            data-testid="simulation-review-inputs"
            aria-label="I have reviewed the run inputs"
          />
          <span>I have reviewed the blueprint version, scenario, assumptions and data state.</span>
        </label>
      </div>

      <Button
        className="w-full"
        size="sm"
        disabled={isRunning || blockedReason !== null}
        data-testid="workspace-run-scenario"
        onClick={() => void runScenario(facility)}
      >
        {isRunning ? <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden /> : <PlayCircle className="mr-2 h-4 w-4" aria-hidden />}
        {isRunning ? 'Running simulation' : 'Run simulation'}
      </Button>

      {blockedReason && (
        <p className="flex items-start gap-1.5 text-[11px] text-muted-foreground" data-testid="simulation-blocked-reason">
          <Lock className="mt-0.5 h-3 w-3 shrink-0" aria-hidden />
          {blockedReason}
        </p>
      )}

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
