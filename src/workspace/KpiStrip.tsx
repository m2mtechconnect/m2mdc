/**
 * Single KPI strip for the workspace. This is the only place workspace KPIs
 * are rendered, so the values shown here are the values used everywhere else.
 */
import { ArrowDown, ArrowUp, Minus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { KPI_DESCRIPTORS, deriveKpis, formatKpi, type KpiKey, type FacilityDefinition, type ConfigOverrides } from './facilityModel';
import { deltaDirection } from './scenarioEngine';
import { ROLE_VIEWS, useActiveRun, useWorkspaceStore } from './workspaceStore';
import { useTwinOverlaySafe, type TwinOverlay } from '@/context/TwinOverlayContext';

interface Props {
  facility: FacilityDefinition;
  overrides: ConfigOverrides;
}

export function KpiStrip({ facility, overrides }: Props) {
  const roleView = useWorkspaceStore((s) => s.roleView);
  const openEvidence = useWorkspaceStore((s) => s.openEvidence);
  const run = useActiveRun();
  const { setOverlay, activeOverlay } = useTwinOverlaySafe();

  const modelled = deriveKpis(facility, overrides);
  const keys = ROLE_VIEWS[roleView].kpis;

  return (
    <div
      className="flex w-full gap-2 overflow-x-auto border-t border-border bg-card/80 px-2 py-2 backdrop-blur"
      role="group"
      aria-label="Modelled key performance indicators"
      data-testid="workspace-kpi-strip"
    >
      {keys.map((key) => {
        const descriptor = KPI_DESCRIPTORS[key];
        const value = run ? run.result[key] : modelled[key];
        const delta = run ? run.result[key] - run.baseline[key] : 0;
        const direction = deltaDirection(key, delta);
        const selected = activeOverlay === (descriptor.overlay as TwinOverlay);

        return (
          <button
            key={key}
            type="button"
            data-testid={`workspace-kpi-${key}`}
            onClick={() => {
              setOverlay(descriptor.overlay as TwinOverlay);
              openEvidence(key);
            }}
            className={cn(
              'min-w-[9.5rem] flex-1 rounded-md border px-3 py-2 text-left transition-colors',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1',
              selected ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50 hover:bg-muted/60',
            )}
            aria-label={`${descriptor.label}: ${formatKpi(key, value)}. Open evidence.`}
          >
            <span className="block text-[11px] uppercase tracking-wide text-muted-foreground">
              {descriptor.label}
            </span>
            <span className="mt-0.5 flex items-baseline gap-2">
              <span className="text-lg font-semibold tabular-nums text-foreground">
                {formatKpi(key, value)}
              </span>
              {run && (
                <span
                  className={cn(
                    'inline-flex items-center gap-0.5 text-[11px] font-medium tabular-nums',
                    direction === 'better' && 'text-success',
                    direction === 'worse' && 'text-destructive',
                    direction === 'flat' && 'text-muted-foreground',
                  )}
                >
                  {direction === 'better' && <ArrowDown className="h-3 w-3" aria-hidden />}
                  {direction === 'worse' && <ArrowUp className="h-3 w-3" aria-hidden />}
                  {direction === 'flat' && <Minus className="h-3 w-3" aria-hidden />}
                  {delta > 0 ? '+' : ''}
                  {delta.toFixed(descriptor.precision)}
                </span>
              )}
            </span>
          </button>
        );
      })}
    </div>
  );
}

export type { KpiKey };