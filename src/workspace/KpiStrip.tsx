/**
 * Single KPI strip for the workspace. This is the only place workspace KPIs
 * are rendered, so the values shown here are the values used everywhere else.
 */
import { ArrowDown, ArrowUp, Minus } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { KPI_DESCRIPTORS, deriveKpis, formatKpi, type KpiKey, type FacilityDefinition, type ConfigOverrides } from './facilityModel';
import { deltaDirection } from './scenarioEngine';
import { ROLE_VIEWS, useActiveRun, useWorkspaceStore } from './workspaceStore';
import { useTwinOverlaySafe, type TwinOverlay } from '@/context/TwinOverlayContext';
import { useDesignScenario } from './useDesignScenario';
import { useCanvasFocusStore } from './canvasFocusStore';

interface Props {
  facility: FacilityDefinition;
  overrides: ConfigOverrides;
}

export function KpiStrip({ facility, overrides }: Props) {
  const roleView = useWorkspaceStore((s) => s.roleView);
  const openEvidence = useWorkspaceStore((s) => s.openEvidence);
  const run = useActiveRun();
  const { setOverlay, activeOverlay } = useTwinOverlaySafe();
  // A proposed design has no engineering inputs, so no KPI can be calculated
  // for it. Showing the baseline numbers next to it would be misleading.
  const designActive = useDesignScenario().active;
  // The evidence tooltip opens upward over the model canvas. Announce it so
  // the canvas legend yields its zone instead of being covered.
  const setKpiTooltipOpen = useCanvasFocusStore((s) => s.setKpiTooltipOpen);

  const modelled = deriveKpis(facility, overrides);
  const keys = ROLE_VIEWS[roleView].kpis;

  return (
    <TooltipProvider delayDuration={200}>
      <div
        className="v2-mono flex w-full min-w-0 shrink-0 gap-2 overflow-x-auto border-t border-[hsl(var(--v2-line))] bg-[hsl(var(--v2-canvas-deep))] px-2 py-2"
        role="group"
        aria-label="Modelled key performance indicators"
        data-testid="workspace-kpi-strip"
        data-kpi-state={designActive ? 'not-calculated' : 'modelled'}
      >
      {keys.map((key) => {
        const descriptor = KPI_DESCRIPTORS[key];
        const value = run ? run.result[key] : modelled[key];
        const delta = run && !designActive ? run.result[key] - run.baseline[key] : 0;
        const displayValue = designActive ? 'Not calculated' : formatKpi(key, value);
        const direction = deltaDirection(key, delta);
        const deltaText = delta.toFixed(descriptor.precision);
        const noChange = Number(deltaText) === 0;
        const selected = activeOverlay === (descriptor.overlay as TwinOverlay);

        return (
          <Tooltip key={key} onOpenChange={setKpiTooltipOpen}>
            <TooltipTrigger asChild>
          <button
            key={key}
            type="button"
            data-testid={`workspace-kpi-${key}`}
            onClick={() => {
              setOverlay(descriptor.overlay as TwinOverlay);
              openEvidence(key);
            }}
            className={cn(
              'min-w-[10rem] flex-1 shrink-0 rounded-md border px-3 py-2 text-left transition-colors',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1',
              selected
                ? 'border-primary bg-primary/10'
                : 'border-[hsl(var(--v2-line))] bg-[hsl(var(--v2-panel))] hover:border-primary/50 hover:bg-[hsl(var(--v2-panel-elevated))]',
            )}
            aria-label={`${descriptor.label}: ${displayValue}.${
              run && !designActive ? ` ${noChange ? 'No change' : `Change ${deltaText}, ${direction}`}.` : ''
            } Open evidence.`}
          >
            <span className="v2-label block truncate">
              {descriptor.label}
            </span>
            <span className="mt-0.5 flex flex-wrap items-baseline gap-x-2">
              <span
                className={cn(
                  'font-semibold tabular-nums',
                  'v2-mono',
                  designActive ? 'text-sm text-muted-foreground' : 'v2-metric v2-metric-compact text-foreground',
                )}
              >
                {displayValue}
              </span>
              {run && !designActive && (
                <span
                  className={cn(
                    'inline-flex items-center gap-0.5 whitespace-nowrap text-xs font-medium tabular-nums',
                    direction === 'better' && 'text-success',
                    direction === 'worse' && 'text-destructive',
                    direction === 'flat' && 'text-muted-foreground',
                  )}
                >
                  {noChange ? (
                    <>
                      <Minus className="h-3 w-3" aria-hidden />
                      No change
                    </>
                  ) : (
                    <>
                      {direction === 'better' && <ArrowDown className="h-3 w-3" aria-hidden />}
                      {direction === 'worse' && <ArrowUp className="h-3 w-3" aria-hidden />}
                      {direction === 'flat' && <Minus className="h-3 w-3" aria-hidden />}
                      {delta > 0 ? '+' : ''}
                      {deltaText}
                    </>
                  )}
                </span>
              )}
            </span>
          </button>
            </TooltipTrigger>
            <TooltipContent
              side="top"
              align="start"
              sideOffset={8}
              collisionPadding={12}
              className="max-w-xs text-xs"
            >
              <p className="font-medium">{descriptor.label}</p>
              <p className="mt-0.5 text-muted-foreground">
                {designActive
                  ? 'Not calculated for a proposed design: engineering inputs are incomplete.'
                  : descriptor.derivation}
              </p>
              <p className="mt-1 text-muted-foreground">Select to open the evidence record.</p>
            </TooltipContent>
          </Tooltip>
        );
      })}
      </div>
    </TooltipProvider>
  );
}

export type { KpiKey };