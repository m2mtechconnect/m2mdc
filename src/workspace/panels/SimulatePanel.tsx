import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Check, Loader2, PlayCircle, Lock, AlertTriangle, Snowflake, XCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { WORKSPACE_SCENARIOS } from '../scenarioEngine';
import { useActiveRun, useWorkspaceStore } from '../workspaceStore';
import { useSimulationPermissions } from '@/simulation/handoff';
import { CLASSIFICATION_LABEL } from '@/lib/provenance/twinFieldProvenance';
import { DESIGN_SCENARIOS } from '@/components/twin-visualization/designScenario';
import { useDesignScenario } from '../useDesignScenario';
import { stepLabel } from '../useWorkflowStep';
import type { WorkspaceTool } from '../workspaceStore';
import type { FacilityDefinition } from '../facilityModel';

interface Props {
  facility: FacilityDefinition;
}

/** Identifier used to associate the disabled button with its explanation. */
export const RUN_BLOCKED_DESCRIPTION_ID = 'simulation-run-blocked-reason';

export interface RunGate {
  blockedReason: string | null;
  /** Specific missing or invalid inputs, listed for the operator. */
  missingInputs: string[];
  /** Step that fixes the blocker, when one exists. */
  fixStep: WorkspaceTool | null;
}

/**
 * Shared run gate. Execution rules are unchanged: a run requires the execute
 * permission, a selected scenario and an explicit input review. The gate now
 * also reports *what* is missing and *where* to fix it - it never relaxes a
 * predicate to enable the button.
 */
function useRunGate() {
  const scenarioId = useWorkspaceStore((s) => s.scenarioId);
  const reviewed = useWorkspaceStore((s) => s.assumptionsReviewed);
  const isRunning = useWorkspaceStore((s) => s.isRunning);
  const setTool = useWorkspaceStore((s) => s.setTool);
  const { canConfigureSimulation, canExecuteSimulation } = useSimulationPermissions();
  const scenario = WORKSPACE_SCENARIOS.find((s) => s.id === scenarioId);
  // A proposed design has no complete engineering inputs, so it can never be
  // executed as an operational run.
  const design = useDesignScenario();

  let blockedReason: string | null = null;
  let missingInputs: string[] = [];
  let fixStep: WorkspaceTool | null = null;

  if (design.active) {
    blockedReason = 'Run simulation is unavailable for a proposed design: engineering inputs are incomplete.';
    missingInputs = (design.scenario?.engineeringInputs ?? []).map((i) => `${i.label} (${i.unit}): not provided`);
    missingInputs.push('Chilled-water loop connection: unverified');
    fixStep = 'simulate';
  } else if (!canExecuteSimulation) {
    blockedReason = 'Your role cannot execute simulations. Ask an administrator for the run permission.';
    missingInputs = ['Permission deployment.execute: not granted to your role'];
  } else if (!scenario) {
    blockedReason = 'Select an operational scenario before running.';
    missingInputs = ['Operational scenario: none selected'];
    fixStep = 'simulate';
  } else if (!reviewed) {
    blockedReason = 'Review the run inputs to enable execution.';
    missingInputs = ['Run-input review: not confirmed'];
    fixStep = 'simulate';
  }

  return {
    scenario,
    scenarioId,
    reviewed,
    isRunning,
    blockedReason,
    missingInputs,
    fixStep,
    setTool,
    canConfigureSimulation,
    design,
  };
}

/**
 * Visible, screen-reader-addressable explanation of a disabled run. Colour or
 * a disabled style is never the only signal.
 */
export function RunBlockedExplanation({
  blockedReason,
  missingInputs,
  fixStep,
  onFix,
}: RunGate & { onFix?: (step: WorkspaceTool) => void }) {
  if (!blockedReason) return null;
  return (
    <div
      id={RUN_BLOCKED_DESCRIPTION_ID}
      role="status"
      aria-live="polite"
      data-testid="simulation-blocked-reason"
      className="rounded-md border border-border bg-muted/40 p-2.5 text-xs text-foreground"
    >
      <p className="flex items-start gap-1.5 font-medium">
        <Lock className="mt-0.5 h-3 w-3 shrink-0" aria-hidden />
        {blockedReason}
      </p>
      {missingInputs.length > 0 && (
        <ul className="mt-1.5 space-y-0.5 pl-5 text-muted-foreground" data-testid="simulation-missing-inputs">
          {missingInputs.map((item) => (
            <li key={item}>- {item}</li>
          ))}
        </ul>
      )}
      {fixStep && onFix && (
        <Button
          variant="outline"
          size="sm"
          className="mt-2 h-7 text-xs"
          data-testid="simulation-fix-step"
          onClick={() => onFix(fixStep)}
        >
          Go to {stepLabel(fixStep)}
        </Button>
      )}
    </div>
  );
}

/**
 * Sticky footer action for the simulate step. Same execution semantics as
 * before: it calls the one store action that creates a run record.
 */
export function SimulateFooterAction({ facility }: Props) {
  const runScenario = useWorkspaceStore((s) => s.runScenario);
  const { isRunning, blockedReason, missingInputs } = useRunGate();

  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          <span className="block w-full">
            <Button
              className="h-9 w-full"
              size="sm"
              disabled={isRunning || blockedReason !== null}
              aria-describedby={blockedReason ? RUN_BLOCKED_DESCRIPTION_ID : undefined}
              data-testid="workspace-run-scenario"
              onClick={() => void runScenario(facility)}
            >
              {isRunning ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />
              ) : (
                <PlayCircle className="mr-2 h-4 w-4" aria-hidden />
              )}
              {isRunning ? 'Running simulation' : 'Run simulation'}
            </Button>
            {blockedReason && (
              <span className="sr-only" data-testid="run-disabled-reason-sr">
                {blockedReason} {missingInputs.join('. ')}
              </span>
            )}
          </span>
        </TooltipTrigger>
        {blockedReason && (
          <TooltipContent side="top" className="max-w-xs text-xs">
            {blockedReason}
          </TooltipContent>
        )}
      </Tooltip>
    </TooltipProvider>
  );
}

/**
 * Simulation is the canonical owner of scenario configuration, assumptions and
 * run execution. A run is created here and nowhere else, and only after an
 * explicit review of the inputs.
 */
export function SimulatePanel({ facility }: Props) {
  const setScenario = useWorkspaceStore((s) => s.setScenario);
  const handoff = useWorkspaceStore((s) => s.handoff);
  const setReviewed = useWorkspaceStore((s) => s.setAssumptionsReviewed);
  const run = useActiveRun();
  const { scenario, scenarioId, reviewed, blockedReason, canConfigureSimulation, design } = useRunGate();
  const mode: 'operational' | 'design' = design.active ? 'design' : 'operational';

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
        <dl className="grid grid-cols-[7rem_minmax(0,1fr)] gap-x-2 gap-y-0.5 text-xs">
          <dt className="text-muted-foreground">Blueprint</dt>
          <dd className="truncate text-foreground" title={handoff?.blueprintId ?? undefined}>
            {handoff?.blueprintId ?? 'Active facility model'}
          </dd>
          <dt className="text-muted-foreground">Version</dt>
          <dd className="truncate text-foreground">{handoff?.versionId ?? 'Unavailable'}</dd>
          <dt className="text-muted-foreground">Facility</dt>
          <dd className="truncate text-foreground">{facility.name}</dd>
          <dt className="text-muted-foreground">Configuration</dt>
          <dd className="text-foreground">{reviewed ? 'Ready for review' : 'Incomplete'}</dd>
        </dl>
      </div>

      {/* Operational scenarios and proposed designs are different kinds of
          thing and are never mixed in one list. */}
      <div>
        <div
          role="tablist"
          aria-label="Scenario type"
          className="mb-2 grid grid-cols-2 gap-1 rounded-md border border-border bg-muted/40 p-1"
        >
          {([
            ['operational', 'Operational scenarios', 'scenario-tab-operational'],
            ['design', 'Proposed designs', 'scenario-tab-design'],
          ] as const).map(([id, label, testid]) => (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={mode === id}
              data-testid={testid}
              onClick={() => design.selectDesign(id === 'design' ? DESIGN_SCENARIOS[0].id : null)}
              className={cn(
                'rounded px-2 py-1.5 text-xs font-medium transition-colors',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                mode === id ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground',
              )}
            >
              {label}
            </button>
          ))}
        </div>

        {mode === 'design' ? (
          <div className="space-y-2" data-testid="proposed-design-list">
            <p className="text-xs text-muted-foreground">
              A proposed design is a simulated overlay on the as-built facility. It is not commissioned, carries no
              telemetry and cannot be run.
            </p>
            {DESIGN_SCENARIOS.map((d) => {
              const selected = design.scenario?.id === d.id;
              return (
                <button
                  key={d.id}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  data-testid={`proposed-design-${d.id}`}
                  onClick={() => design.selectDesign(d.id)}
                  className={cn(
                    'flex w-full min-w-0 items-start gap-2.5 rounded-md border p-3 text-left transition-colors',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                    selected ? 'border-accent bg-accent/10' : 'border-border hover:bg-muted',
                  )}
                >
                  <Snowflake className="mt-0.5 h-4 w-4 shrink-0 text-accent" aria-hidden />
                  <span className="min-w-0 flex-1">
                    <span className="flex flex-wrap items-center gap-1.5">
                      <span className="text-sm font-semibold text-foreground">{d.summary}</span>
                      <Badge variant="outline" className="text-[10px]">SIMULATED</Badge>
                      {selected && <Check className="h-3.5 w-3.5 text-accent" aria-label="Selected" />}
                    </span>
                    <span className="mt-1 block text-xs text-muted-foreground [overflow-wrap:anywhere]">{d.id}</span>
                    <ul className="mt-1.5 space-y-0.5 text-xs text-muted-foreground">
                      {d.highlights.map((h) => (
                        <li key={h}>- {h}</li>
                      ))}
                    </ul>
                  </span>
                </button>
              );
            })}
            <Button
              variant="outline"
              size="sm"
              className="h-8 w-full text-xs"
              data-testid="return-to-baseline-operations"
              onClick={() => design.selectDesign(null)}
            >
              Return to baseline operations
            </Button>
          </div>
        ) : (
        <div role="radiogroup" aria-label="Operational scenario" className="divide-y divide-border rounded-md border border-border">
          {WORKSPACE_SCENARIOS.map((s) => {
            const selected = scenarioId === s.id;
            return (
              <button
                key={s.id}
                type="button"
                role="radio"
                aria-checked={selected}
                disabled={!canConfigureSimulation}
                onClick={() => setScenario(s.id)}
                className={cn(
                  'flex w-full min-w-0 items-start gap-2.5 px-3 py-2.5 text-left transition-colors first:rounded-t-md last:rounded-b-md',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring',
                  'disabled:cursor-not-allowed disabled:opacity-60',
                  selected ? 'bg-primary/10' : 'hover:bg-muted',
                )}
              >
                <span
                  aria-hidden
                  className={cn(
                    'mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border',
                    selected ? 'border-primary bg-primary text-primary-foreground' : 'border-muted-foreground/50',
                  )}
                >
                  {selected && <Check className="h-3 w-3" />}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-1.5">
                    <span className={cn('truncate text-sm', selected ? 'font-semibold text-foreground' : 'font-medium text-foreground')}>
                      {s.label}
                    </span>
                    {!canConfigureSimulation && (
                      <AlertTriangle className="h-3 w-3 shrink-0 text-warning" aria-label="Read only" />
                    )}
                  </span>
                  <span className="mt-0.5 block text-xs text-muted-foreground [overflow-wrap:anywhere]">
                    {s.description}
                  </span>
                </span>
              </button>
            );
          })}
        </div>
        )}
      </div>

      {/* Explicit input review. Every value below is a modelled assumption. */}
      {mode === 'design' ? (
        <div className="rounded-md border border-border p-3" data-testid="design-inputs-incomplete">
          <p className="mb-1.5 text-xs font-medium text-foreground">Engineering inputs</p>
          <ul className="space-y-0.5 text-xs text-muted-foreground">
            {design.scenario?.engineeringInputs.map((i) => (
              <li key={i.key}>
                {i.label} ({i.unit}): Not provided
              </li>
            ))}
          </ul>
          <p className="mt-1.5 text-xs text-muted-foreground">
            Chilled-water loop connection: unverified. No run can be executed until these inputs exist.
          </p>
        </div>
      ) : (
      <div className="rounded-md border border-border p-3">
        <p className="mb-1.5 text-xs font-medium text-foreground">Review run inputs</p>
        <ul className="mb-2 space-y-0.5 text-xs text-muted-foreground [overflow-wrap:anywhere]">
          <li>Blueprint version: {handoff?.versionId ?? 'Unavailable'}</li>
          <li>Scenario: {scenario?.label ?? 'None selected'}</li>
          <li>Solver / model: Deterministic rule model ({CLASSIFICATION_LABEL['modeled-assumption']})</li>
          <li>Fidelity: Reduced-order, minute resolution</li>
          <li>Time horizon: {scenario ? `${scenario.durationMinutes} minutes` : 'Unavailable'}</li>
          <li>Input source: Synthetic modelled inputs, no live telemetry</li>
          <li>Limitations: Outputs are simulated and carry no measurement evidence</li>
        </ul>
        <label className="flex items-start gap-2 text-xs text-foreground">
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
      )}

      {blockedReason && (
        <p className="flex items-start gap-1.5 text-xs text-muted-foreground" data-testid="simulation-blocked-reason">
          <Lock className="mt-0.5 h-3 w-3 shrink-0" aria-hidden />
          {blockedReason}
        </p>
      )}

      {run && (
        <div className="rounded-md border border-border p-3">
          <div className="mb-2 flex items-center justify-between gap-2">
            <span className="min-w-0 truncate text-xs font-medium text-foreground">{run.scenarioLabel}</span>
            <Badge variant="outline" className="max-w-[10rem] shrink-0 truncate text-xs" title={run.id}>
              {run.id}
            </Badge>
          </div>
          <ol className="space-y-1.5">
            {run.events.map((event, i) => (
              <li key={`${event.atMinute}-${i}`} className="flex gap-2 text-xs">
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
                <span className="min-w-0 text-foreground [overflow-wrap:anywhere]">{event.message}</span>
              </li>
            ))}
          </ol>
        </div>
      )}
    </div>
  );
}
