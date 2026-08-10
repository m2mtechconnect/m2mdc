import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { KPI_DESCRIPTORS, formatKpi, type KpiKey } from '../facilityModel';
import { deltaDirection } from '../scenarioEngine';
import { ROLE_VIEWS, useWorkspaceStore } from '../workspaceStore';

export function ComparePanel() {
  const runs = useWorkspaceStore((s) => s.runs);
  const compareRunIds = useWorkspaceStore((s) => s.compareRunIds);
  const toggleCompareRun = useWorkspaceStore((s) => s.toggleCompareRun);
  const setActiveRun = useWorkspaceStore((s) => s.setActiveRun);
  const activeRunId = useWorkspaceStore((s) => s.activeRunId);
  const roleView = useWorkspaceStore((s) => s.roleView);
  const setTool = useWorkspaceStore((s) => s.setTool);

  if (runs.length === 0) {
    return (
      <div className="space-y-3">
        <p className="text-xs text-muted-foreground">
          No simulation run has been recorded yet, so there is nothing to compare.
        </p>
        <Button size="sm" onClick={() => setTool('simulate')}>
          Run a scenario
        </Button>
      </div>
    );
  }

  const selected = compareRunIds.map((id) => runs.find((r) => r.id === id)).filter(Boolean);
  const keys = ROLE_VIEWS[roleView].kpis;

  return (
    <div className="space-y-4">
      <div>
        <p className="mb-1.5 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
          Runs (select up to two)
        </p>
        <ul className="space-y-1">
          {runs.map((run) => (
            <li key={run.id} className="flex items-center gap-1.5">
              <button
                type="button"
                aria-pressed={compareRunIds.includes(run.id)}
                onClick={() => toggleCompareRun(run.id)}
                className={cn(
                  'flex-1 rounded-md border px-2.5 py-1.5 text-left text-xs transition-colors',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1',
                  compareRunIds.includes(run.id) ? 'border-primary bg-primary/5' : 'border-border hover:bg-muted',
                )}
              >
                <span className="font-medium text-foreground">{run.scenarioLabel}</span>
                <span className="ml-2 text-[10px] text-muted-foreground">{run.id}</span>
              </button>
              <Button
                size="sm"
                variant={activeRunId === run.id ? 'secondary' : 'ghost'}
                className="h-7 px-2 text-[11px]"
                onClick={() => setActiveRun(run.id)}
              >
                {activeRunId === run.id ? 'Active' : 'Set active'}
              </Button>
            </li>
          ))}
        </ul>
      </div>

      <div className="overflow-x-auto rounded-md border border-border">
        <table className="w-full text-xs">
          <caption className="sr-only">Modelled KPI comparison across selected simulation runs</caption>
          <thead>
            <tr className="border-b border-border bg-muted/50">
              <th scope="col" className="px-2.5 py-1.5 text-left font-medium text-muted-foreground">
                KPI
              </th>
              {selected.map((run) => (
                <th key={run!.id} scope="col" className="px-2.5 py-1.5 text-right font-medium text-muted-foreground">
                  {run!.id}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {keys.map((key: KpiKey) => (
              <tr key={key} className="border-b border-border last:border-0">
                <th scope="row" className="px-2.5 py-1.5 text-left font-normal text-muted-foreground">
                  {KPI_DESCRIPTORS[key].label}
                </th>
                {selected.map((run) => {
                  const delta = run!.result[key] - run!.baseline[key];
                  const dir = deltaDirection(key, delta);
                  return (
                    <td key={run!.id} className="px-2.5 py-1.5 text-right tabular-nums">
                      <span className="font-medium text-foreground">{formatKpi(key, run!.result[key])}</span>
                      <span
                        className={cn(
                          'ml-1.5 text-[10px]',
                          dir === 'better' && 'text-success',
                          dir === 'worse' && 'text-destructive',
                          dir === 'flat' && 'text-muted-foreground',
                        )}
                      >
                        {delta > 0 ? '+' : ''}
                        {delta.toFixed(KPI_DESCRIPTORS[key].precision)}
                      </span>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between">
        <Badge variant="outline" className="text-[10px]">
          Simulated results only
        </Badge>
        <Button size="sm" onClick={() => setTool('decide')}>
          Continue to decide
        </Button>
      </div>
    </div>
  );
}