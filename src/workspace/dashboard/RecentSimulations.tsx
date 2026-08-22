/** Stage 7D - compact related list for recorded simulation runs (latest three). */
import { Link } from 'react-router-dom';
import { RunProvenanceBadge } from '../RunProvenanceBadge';
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
      className="v2-panel min-w-0 overflow-hidden p-0"
    >
      <div className="flex min-w-0 flex-wrap items-center justify-between gap-2 border-b border-[hsl(var(--v2-line))] bg-[hsl(var(--v2-canvas-deep))]/70 px-4 py-2.5">
        <h2 id="runs-heading" className="v2-section-title">
          Recent simulations
        </h2>
        {runs.length > 0 && (
          <Button asChild size="sm" variant="outline" className="h-9 text-[14px] max-sm:h-11">
            <Link to={simulationHref} data-testid="view-all-simulations">
              View all simulations
              <ArrowRight className="ml-1.5 h-4 w-4" strokeWidth={1.75} aria-hidden />
            </Link>
          </Button>
        )}
      </div>

      <div className="min-w-0 px-4 py-1">
        {visible.length === 0 ? (
          <div className="flex min-w-0 flex-wrap items-center gap-3" data-testid="no-simulations-row">
            <FlaskConical className="h-[18px] w-[18px] shrink-0 text-[hsl(var(--info))]" strokeWidth={1.75} aria-hidden />
            <p className="min-w-0 flex-1 text-[14px] text-muted-foreground">
              <span className="font-semibold text-foreground">No simulation runs yet. </span>
              Test a modelled change against the current design baseline.
            </p>
            <Button asChild size="sm" className="h-9 text-[14px] font-semibold max-sm:h-11">
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
                  className={`flex min-w-0 flex-wrap items-center gap-2 rounded-md px-2 py-2.5 transition-colors hover:bg-[hsl(var(--v2-canvas-deep))]/60 ${runIndex === 2 ? 'max-sm:hidden' : ''}`}
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex min-w-0 items-center gap-2 text-[15px] font-semibold text-foreground">
                      <span className="truncate">{run.scenarioLabel}</span>
                      {isFixtureRun(run) && (
                        <Badge variant="outline" className="shrink-0 text-[12px]">Seeded fixture</Badge>
                      )}
                    </div>
                    <div className="flex min-w-0 flex-wrap items-center gap-1.5 text-[13px] tabular-nums text-muted-foreground">
                      <RunProvenanceBadge run={run} />
                      <span className="truncate">
                        Run {run.id} · PUE {formatKpi('pue', run.result.pue)} ·{' '}
                        {new Date(run.completedAt).toLocaleString()}
                      </span>
                    </div>
                  </div>
                  <Badge variant={pending > 0 ? 'secondary' : 'outline'} className="text-[12px]">
                    {pending > 0 ? `${pending} to review` : 'Reviewed'}
                  </Badge>
                  <Button asChild size="sm" variant="outline" className="h-9 text-[14px] max-sm:h-11">
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
