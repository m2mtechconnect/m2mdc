/** Stage 7B - Lightning related-list treatment for recorded simulation runs. */
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

  return (
    <section
      aria-labelledby="runs-heading"
      data-testid="recent-simulations"
      className="min-w-0 rounded-lg border border-border bg-card"
    >
      <div className="min-w-0 border-b border-border p-4">
        <h2 id="runs-heading" className="text-[18px] font-semibold leading-tight text-foreground">
          Recent simulations
        </h2>
        <p className="mt-0.5 text-[13px] text-muted-foreground">
          Deterministic scenario runs against the current design baseline.
        </p>
      </div>

      <div className="min-w-0 p-4">
        {runs.length === 0 ? (
          <div className="flex min-w-0 items-start gap-4 rounded-md bg-muted/40 p-5">
            <span
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-[hsl(var(--info)/0.12)]"
              aria-hidden
            >
              <FlaskConical className="h-[22px] w-[22px] text-[hsl(var(--info))]" strokeWidth={1.75} />
            </span>
            <div className="min-w-0">
              <p className="text-[15px] font-semibold text-foreground">No simulation runs yet</p>
              <p className="mt-1 text-[13px] leading-relaxed text-muted-foreground">
                Test a power, cooling or capacity change against the current design baseline.
              </p>
              <Button asChild size="sm" className="mt-3 h-9 text-[13px] font-semibold max-sm:h-11">
                <Link to={simulationHref}>
                  <Play className="mr-1.5 h-4 w-4" strokeWidth={2} aria-hidden />
                  Create simulation
                </Link>
              </Button>
            </div>
          </div>
        ) : (
          <ul className="min-w-0 divide-y divide-border">
            {runs.slice(0, 5).map((run) => {
              const pending = run.recommendations.filter(
                (r) => (run.decisions[r.id] ?? 'pending') === 'pending',
              ).length;
              return (
                <li key={run.id} className="flex min-w-0 flex-wrap items-center gap-2 py-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex min-w-0 items-center gap-2 text-[15px] font-medium text-foreground">
                      <span className="truncate">{run.scenarioLabel}</span>
                      {isFixtureRun(run) && (
                        <Badge variant="outline" className="shrink-0 text-[12px]">Seeded fixture</Badge>
                      )}
                    </div>
                    <p className="truncate text-[13px] tabular-nums text-muted-foreground">
                      Run {run.id} · PUE {formatKpi('pue', run.result.pue)} · Headroom{' '}
                      {formatKpi('capacityHeadroom', run.result.capacityHeadroom)} ·{' '}
                      {new Date(run.completedAt).toLocaleString()}
                    </p>
                  </div>
                  <Badge variant={pending > 0 ? 'secondary' : 'outline'} className="text-[12px]">
                    {pending > 0 ? `${pending} to review` : 'Reviewed'}
                  </Badge>
                  <Button asChild size="sm" variant="outline" className="h-9 text-[13px] max-sm:h-11">
                    <Link to={`/simulation?run=${encodeURIComponent(run.id)}`}>View result</Link>
                  </Button>
                </li>
              );
            })}
          </ul>
        )}

        {runs.length > 1 && (
          <Button asChild size="sm" variant="outline" className="mt-3 h-9 text-[13px] max-sm:h-11">
            <Link
              to={`/simulation?compare=${runs
                .slice(0, 2)
                .map((r) => encodeURIComponent(r.id))
                .join(',')}`}
            >
              Compare runs
              <ArrowRight className="ml-1.5 h-4 w-4" strokeWidth={1.75} aria-hidden />
            </Link>
          </Button>
        )}
      </div>
    </section>
  );
}
