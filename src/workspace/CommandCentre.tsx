/**
 * Data Centre Command Centre (route `/` and `/dashboard`).
 *
 * Stage 6B separation of concerns:
 *   Command Centre  - read-only operational overview of the modelled facility
 *   Blueprint       - the facility model, hierarchy and configuration
 *   Simulation      - scenario execution, comparison and review
 *
 * This surface authors nothing. Every action is a deep link into the
 * Blueprint or the Simulation workspace.
 */
import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Activity, ArrowRight, Boxes, ClipboardCheck, PlayCircle } from 'lucide-react';
import { KPI_DESCRIPTORS, deriveKpis, formatKpi, formatPower, useFacilityModel } from './facilityModel';
import { useWorkspaceStore } from './workspaceStore';

const SUMMARY_KPIS = ['pue', 'itLoadKw', 'capacityHeadroom', 'thermalStability', 'carbonIntensity', 'sovereigntyScore'] as const;

export default function CommandCentre() {
  const { facility, assets, isFallback } = useFacilityModel();
  const overrides = useWorkspaceStore((s) => s.overrides);
  const runs = useWorkspaceStore((s) => s.runs);

  const kpis = deriveKpis(facility, overrides);
  const latestRun = runs[0] ?? null;
  const pendingDecisions = runs.reduce(
    (total, run) =>
      total + run.recommendations.filter((r) => (run.decisions[r.id] ?? 'pending') === 'pending').length,
    0,
  );
  const rackCount = assets.filter((a) => a.kind === 'rack').length;
  const blueprintHref = `/blueprint/${facility.id || 'default'}`;

  useEffect(() => {
    document.title = `${facility.name} | AURA command centre`;
  }, [facility.name]);

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-4" data-testid="command-centre">
      <header className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-foreground">{facility.name}</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            {facility.city} · {facility.tier} · {formatPower(facility.capacityKw)} modelled capacity · {rackCount} racks
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {isFallback && (
            <Badge variant="outline" className="text-[11px]">Reference facility model</Badge>
          )}
          <Button asChild variant="outline" size="sm">
            <Link to={blueprintHref}>
              <Boxes className="mr-1.5 h-4 w-4" aria-hidden />
              Open blueprint
            </Link>
          </Button>
          <Button asChild size="sm">
            <Link to="/simulation">
              <PlayCircle className="mr-1.5 h-4 w-4" aria-hidden />
              Open simulation
            </Link>
          </Button>
        </div>
      </header>

      <section aria-label="Modelled facility indicators" className="mb-6">
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
          {SUMMARY_KPIS.map((key) => {
            const descriptor = KPI_DESCRIPTORS[key];
            const value = latestRun ? latestRun.result[key] : kpis[key];
            return (
              <div key={key} className="rounded-lg border border-border bg-card px-3 py-2.5" data-testid={`command-kpi-${key}`}>
                <p className="text-[11px] uppercase tracking-wide text-muted-foreground">{descriptor.label}</p>
                <p className="mt-1 text-lg font-semibold tabular-nums text-foreground">{formatKpi(key, value)}</p>
              </div>
            );
          })}
        </div>
        <p className="mt-2 text-[11px] text-muted-foreground">
          Values are derived from the modelled configuration{latestRun ? ` and run ${latestRun.id}` : ''}. They are not measured facility data.
        </p>
      </section>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Activity className="h-4 w-4 text-muted-foreground" aria-hidden />
              Recent simulation runs
            </CardTitle>
          </CardHeader>
          <CardContent>
            {runs.length === 0 ? (
              <div className="rounded-md border border-dashed border-border px-4 py-6 text-center">
                <p className="text-sm text-muted-foreground">
                  No scenario has been run against this configuration yet.
                </p>
                <Button asChild size="sm" className="mt-3">
                  <Link to="/simulation">
                    Run a scenario
                    <ArrowRight className="ml-1.5 h-4 w-4" aria-hidden />
                  </Link>
                </Button>
              </div>
            ) : (
              <ul className="divide-y divide-border">
                {runs.slice(0, 5).map((run) => {
                  const pending = run.recommendations.filter(
                    (r) => (run.decisions[r.id] ?? 'pending') === 'pending',
                  ).length;
                  return (
                    <li key={run.id} className="flex flex-wrap items-center gap-2 py-2">
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-foreground">{run.scenarioLabel}</p>
                        <p className="text-[11px] text-muted-foreground">
                          Run {run.id} · {new Date(run.completedAt).toLocaleString()}
                        </p>
                      </div>
                      <Badge variant={pending > 0 ? 'secondary' : 'outline'} className="text-[11px]">
                        {pending > 0 ? `${pending} to review` : 'Reviewed'}
                      </Badge>
                      <Button asChild size="sm" variant="ghost" className="h-7 px-2 text-xs">
                        <Link to="/simulation">Open</Link>
                      </Button>
                    </li>
                  );
                })}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <ClipboardCheck className="h-4 w-4 text-muted-foreground" aria-hidden />
              Where to go next
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <NextStep
              to={blueprintHref}
              title="Blueprint"
              description="Inspect the facility model, asset hierarchy and configured setpoints."
            />
            <NextStep
              to="/simulation"
              title="Simulation"
              description="Run a scenario, compare runs and record decisions."
            />
            <NextStep
              to="/intelligence"
              title="Telemetry and analytics"
              description="Review modelled trends across thermal, power and carbon domains."
            />
            {pendingDecisions > 0 && (
              <p className="rounded-md bg-muted px-3 py-2 text-[12px] text-muted-foreground">
                {pendingDecisions} recommendation{pendingDecisions === 1 ? '' : 's'} awaiting review in the simulation workspace.
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function NextStep({ to, title, description }: { to: string; title: string; description: string }) {
  return (
    <Link
      to={to}
      className="block rounded-md border border-border px-3 py-2 transition-colors hover:border-primary/50 hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <span className="flex items-center justify-between text-sm font-medium text-foreground">
        {title}
        <ArrowRight className="h-4 w-4 text-muted-foreground" aria-hidden />
      </span>
      <span className="mt-0.5 block text-[12px] text-muted-foreground">{description}</span>
    </Link>
  );
}
