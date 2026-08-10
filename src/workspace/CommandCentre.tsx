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
import { Activity, AlertTriangle, ArrowRight, Boxes, ClipboardCheck, FileText, PlayCircle, Plug } from 'lucide-react';
import { KPI_DESCRIPTORS, deriveKpis, formatKpi, formatPower, useFacilityModel, type KpiKey } from './facilityModel';
import { blueprintHrefForKpi, evidenceHrefForKpi, layerLabelForKpi } from './kpiDrilldown';
import { FacilityFloorPlan } from './FacilityFloorPlan';
import { useWorkspaceStore } from './workspaceStore';
import { isFixtureRun, useSeededRunFixtures } from './runFixtures';

const READINESS: Array<{ label: string; state: string }> = [
  { label: 'NVIDIA Omniverse DSX', state: 'Not deployed' },
  { label: 'DSX Exchange', state: 'Not integrated' },
  { label: 'OpenUSD stage', state: 'Not deployed' },
  { label: 'SimReady assets', state: 'Not validated' },
  { label: 'NVIDIA runtime', state: 'Not deployed' },
  { label: 'Live facility telemetry', state: 'Not connected' },
];

const SUMMARY_KPIS = ['pue', 'itLoadKw', 'capacityHeadroom', 'thermalStability', 'carbonIntensity', 'sovereigntyScore'] as const;

export default function CommandCentre() {
  useSeededRunFixtures();
  const { facility, assets, isFallback, naming } = useFacilityModel();
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
          <nav aria-label="Facility context" className="mb-1 text-[11px] text-muted-foreground">
            {naming.breadcrumb.join(' / ')}
          </nav>
          <h1 className="text-xl font-semibold text-foreground">{facility.name}</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            {naming.classification} · {formatPower(facility.capacityKw)} modelled capacity · {rackCount} racks
          </p>
          {naming.isDerivedName && (
            <p className="mt-0.5 text-[11px] text-muted-foreground">
              Display name derived from facility attributes (stored name: {naming.storedName ?? 'empty'}).
            </p>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {isFallback && (
            <Badge variant="outline" className="text-[11px]">Reference facility model</Badge>
          )}
          <Button asChild variant="outline" size="sm">
            <Link to={blueprintHref}>
              <Boxes className="mr-1.5 h-4 w-4" aria-hidden />
              View blueprint
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
              <KpiTile
                key={key}
                kpiKey={key}
                label={descriptor.label}
                value={formatKpi(key, value)}
                facilityId={facility.id}
              />
            );
          })}
        </div>
        <p className="mt-2 text-[11px] text-muted-foreground">
          Values are derived from the modelled configuration{latestRun ? ` and run ${latestRun.id}` : ''}. They are not measured facility data.
          Select an indicator to open its Blueprint layer, or Evidence for its provenance.
        </p>
      </section>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Boxes className="h-4 w-4 text-muted-foreground" aria-hidden />
              Facility overview
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <div className="space-y-1.5 text-sm">
              <p className="font-medium text-foreground">{facility.name}</p>
              <p className="text-muted-foreground">{facility.tier} · {facility.city}</p>
              <p className="text-muted-foreground">Design capacity: {formatPower(facility.capacityKw)}</p>
              <p className="text-muted-foreground">Modelled IT load: {formatKpi('itLoadKw', kpis.itLoadKw)}</p>
              <p className="text-muted-foreground">{rackCount} racks across {facility.rowCount} rows</p>
              <p className="text-[11px] text-muted-foreground">
                Application-rendered simulated facility. Not an NVIDIA DSX, Omniverse, OpenUSD or SimReady model.
              </p>
              <div className="flex flex-wrap gap-2 pt-1">
                <Button asChild size="sm" variant="outline">
                  <Link to={blueprintHref}>View blueprint</Link>
                </Button>
                <Button asChild size="sm" variant="ghost">
                  <Link to={`${blueprintHref}?tab=model`}>View assets</Link>
                </Button>
              </div>
            </div>
            <div
              aria-hidden
              className="pointer-events-none hidden max-h-56 overflow-hidden rounded-md border border-border bg-background md:block"
            >
              <FacilityFloorPlan facility={facility} overlay="thermal" selectedAssetId={null} onSelect={() => {}} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <AlertTriangle className="h-4 w-4 text-muted-foreground" aria-hidden />
              Attention and review
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <AttentionItem
              label={`${pendingDecisions} recommendation${pendingDecisions === 1 ? '' : 's'} awaiting review`}
              detail="Recorded in the simulation workspace"
              to={
                latestRun
                  ? `/simulation?run=${encodeURIComponent(latestRun.id)}&review=pending`
                  : '/simulation?review=pending'
              }
            />
            <AttentionItem
              label="Live facility telemetry unavailable"
              detail="All indicators are simulated model outputs"
              to="/dsx/evidence-beta/evidence?focus=data-mode"
            />
            {isFallback && (
              <AttentionItem
                label="Reference facility model in use"
                detail="No saved blueprint was loaded for this account"
                to={`${blueprintHref}?tab=model&layer=thermal`}
              />
            )}
          </CardContent>
        </Card>

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
                        <div className="flex items-center gap-2 truncate text-sm font-medium text-foreground">
                          <span className="truncate">{run.scenarioLabel}</span>
                          {isFixtureRun(run) && (
                            <Badge variant="outline" className="shrink-0 text-[10px]">Seeded fixture</Badge>
                          )}
                        </div>
                        <p className="text-[11px] text-muted-foreground">
                          Run {run.id} · {new Date(run.completedAt).toLocaleString()}
                        </p>
                      </div>
                      <Badge variant={pending > 0 ? 'secondary' : 'outline'} className="text-[11px]">
                        {pending > 0 ? `${pending} to review` : 'Reviewed'}
                      </Badge>
                      <Button asChild size="sm" variant="ghost" className="h-7 px-2 text-xs">
                        <Link to={`/simulation?run=${encodeURIComponent(run.id)}`}>View result</Link>
                      </Button>
                    </li>
                  );
                })}
              </ul>
            )}
            {runs.length > 1 && (
              <div className="mt-3 flex flex-wrap gap-2">
                <Button asChild size="sm" variant="outline">
                  <Link
                    to={`/simulation?compare=${runs
                      .slice(0, 2)
                      .map((r) => encodeURIComponent(r.id))
                      .join(',')}`}
                  >
                    Compare runs
                  </Link>
                </Button>
                <Button asChild size="sm" variant="ghost">
                  <Link to="/simulation">Open simulation</Link>
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Plug className="h-4 w-4 text-muted-foreground" aria-hidden />
              Integration readiness
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <ul className="space-y-1.5 text-sm">
              {READINESS.map((item) => (
                <li key={item.label} className="flex items-center justify-between gap-2">
                  <span className="text-muted-foreground">{item.label}</span>
                  <Badge variant="outline" className="text-[11px]">{item.state}</Badge>
                </li>
              ))}
            </ul>
            <Button asChild size="sm" variant="outline" className="mt-1 w-full">
              <Link to="/settings/integrations/nvidia-dsx">Review NVIDIA DSX readiness</Link>
            </Button>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <FileText className="h-4 w-4 text-muted-foreground" aria-hidden />
              Evidence and provenance
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            <p>Calculation source: deterministic in-application scenario engine.</p>
            <p>Input classification: synthetic configuration inputs, no measured telemetry.</p>
            <p>
              Baseline provenance: {latestRun ? `run ${latestRun.id} (${new Date(latestRun.completedAt).toLocaleString()})` : 'modelled configuration baseline, no run recorded'}.
            </p>
            <p>Known limitation: results cannot be validated against a physical facility in this environment.</p>
            <Button asChild size="sm" variant="outline">
              <Link to="/dsx/evidence-beta">View evidence</Link>
            </Button>
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

function AttentionItem({ label, detail, to }: { label: string; detail: string; to: string }) {
  return (
    <Link
      to={to}
      className="block rounded-md border border-border px-3 py-2 transition-colors hover:border-primary/50 hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <span className="block text-[13px] font-medium text-foreground">{label}</span>
      <span className="mt-0.5 block text-[11px] text-muted-foreground">{detail}</span>
    </Link>
  );
}

/**
 * A KPI tile is a drilldown, not a readout: the value opens the Blueprint
 * layer the metric is derived from, and a secondary link opens the Evidence
 * workspace that documents its provenance.
 */
function KpiTile({
  kpiKey,
  label,
  value,
  facilityId,
}: {
  kpiKey: KpiKey;
  label: string;
  value: string;
  facilityId: string;
}) {
  return (
    <div
      className="rounded-lg border border-border bg-card transition-colors focus-within:border-primary/60 hover:border-primary/40"
      data-testid={`command-kpi-${kpiKey}`}
    >
      <Link
        to={blueprintHrefForKpi(facilityId, kpiKey)}
        className="block rounded-t-lg px-3 pt-2.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        data-testid={`command-kpi-${kpiKey}-blueprint`}
        aria-label={`${label}: open the ${layerLabelForKpi(kpiKey)} layer in Blueprint`}
      >
        <span className="block text-[11px] uppercase tracking-wide text-muted-foreground">{label}</span>
        <span className="mt-1 block text-lg font-semibold tabular-nums text-foreground">{value}</span>
      </Link>
      <div className="px-3 pb-2 pt-1">
        <Link
          to={evidenceHrefForKpi(kpiKey)}
          className="text-[11px] text-muted-foreground underline-offset-2 hover:text-foreground hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          data-testid={`command-kpi-${kpiKey}-evidence`}
          aria-label={`${label}: open evidence and provenance`}
        >
          Evidence
        </Link>
      </div>
    </div>
  );
}

function AttentionItemLegacyRemoved() {
  return (
    <Link
      to={to}
      className="block rounded-md border border-border px-3 py-2 transition-colors hover:border-primary/50 hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <span className="block text-[13px] font-medium text-foreground">{label}</span>
      <span className="mt-0.5 block text-[11px] text-muted-foreground">{detail}</span>
    </Link>
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
