/** Stage 7D - compact related list for recorded simulation runs (latest three). */
import { Link } from 'react-router-dom';
import { ArrowRight, FlaskConical, Play } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { formatKpi } from '../facilityModel';
import { isFixtureRun } from '../runFixtures';
import type { WorkspaceRun } from '../scenarioEngine';

interface Props {
  runs: WorkspaceRun[];
  facilityId: string;
}

export function RecentSimulations({ runs, facilityId }: Props) {
  const simulationHref = `/simulation?twin=${encodeURIComponent(facilityId || 'default')}`;
  const visible = runs.slice(0, 3);

  return (
    <section
      aria-labelledby="runs-heading"
      data-testid="recent-simulations"
      className="min-w-0 rounded-lg border border-border bg-card"
    >
      <div className="flex min-w-0 flex-wrap items-center justify-between gap-2 border-b border-border px-4 py-2">
        <h2 id="runs-heading" className="text-[16px] font-semibold leading-tight text-foreground">
          Recent simulations
        </h2>
        {runs.length > 0 && (
          <Button asChild size="sm" variant="outline" className="h-9 text-[13px] max-sm:h-11">
            <Link to={simulationHref} data-testid="view-all-simulations">
              View all simulations
              <ArrowRight className="ml-1.5 h-4 w-4" strokeWidth={1.75} aria-hidden />
            </Link>
          </Button>
        )}
      </div>

      <div className="min-w-0 px-4 py-2">
        {visible.length === 0 ? (
          <div className="flex min-w-0 flex-wrap items-center gap-3" data-testid="no-simulations-row">
            <FlaskConical className="h-[18px] w-[18px] shrink-0 text-[hsl(var(--info))]" strokeWidth={1.75} aria-hidden />
            <p className="min-w-0 flex-1 text-[13px] text-muted-foreground">
              <span className="font-semibold text-foreground">No simulation runs yet. </span>
              Test a modelled change against the current design baseline.
            </p>
            <Button asChild size="sm" className="h-9 text-[13px] font-semibold max-sm:h-11">
              <Link to={simulationHref}>
                <Play className="mr-1.5 h-4 w-4" strokeWidth={2} aria-hidden />
                Create simulation
              </Link>
            </Button>
          </div>
        ) : (
          <ul className="min-w-0 divide-y divide-border" data-testid="simulation-list">
            {visible.map((run, runIndex) => {
              const pending = run.recommendations.filter(
                (r) => (run.decisions[r.id] ?? 'pending') === 'pending',
              ).length;
              return (
                <li
                  key={run.id}
                  className={`flex min-w-0 flex-wrap items-center gap-2 py-2 ${runIndex === 2 ? 'max-sm:hidden' : ''}`}
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex min-w-0 items-center gap-2 text-[14px] font-medium text-foreground">
                      <span className="truncate">{run.scenarioLabel}</span>
                      {isFixtureRun(run) && (
                        <Badge variant="outline" className="shrink-0 text-[12px]">Seeded fixture</Badge>
                      )}
                    </div>
                    <p className="truncate text-[13px] tabular-nums text-muted-foreground">
                      Run {run.id} · PUE {formatKpi('pue', run.result.pue)} ·{' '}
                      {new Date(run.completedAt).toLocaleString()}
                    </p>
                  </div>
                  <Badge variant={pending > 0 ? 'secondary' : 'outline'} className="text-[12px]">
                    {pending > 0 ? `${pending} to review` : 'Reviewed'}
                  </Badge>
                  <Button asChild size="sm" variant="outline" className="h-9 text-[13px] max-sm:h-11">
                    <Link to={`/simulation?run=${encodeURIComponent(run.id)}`}>Open result</Link>
                  </Button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </section>
  );
}
