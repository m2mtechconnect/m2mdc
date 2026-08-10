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
import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ArrowRight, Boxes, ChevronDown, FileText, PlayCircle } from 'lucide-react';
import { deriveKpis, formatKpi, formatPower, useFacilityModel, type KpiKey } from './facilityModel';
import { blueprintHrefForKpi, evidenceHrefForKpi } from './kpiDrilldown';
import { FacilityFloorPlan } from './FacilityFloorPlan';
import { useWorkspaceStore } from './workspaceStore';
import { isFixtureRun, useSeededRunFixtures } from './runFixtures';
import { interpretKpi } from './dashboard/kpiInterpretation';
import { buildAttentionQueue } from './dashboard/attentionQueue';
import { AttentionQueueSection } from './dashboard/AttentionQueue';
import { KpiCard } from './dashboard/KpiCard';

const READINESS: Array<{ label: string; state: string; to: string }> = [
  { label: 'Facility telemetry', state: 'Not connected', to: '/integrations' },
  { label: 'NVIDIA runtime', state: 'Not available', to: '/settings/integrations/nvidia-dsx' },
  { label: 'OpenUSD stage', state: 'Not validated', to: '/settings/integrations/nvidia-dsx' },
  { label: 'SimReady assets', state: '0 validated', to: '/settings/integrations/nvidia-dsx' },
  { label: 'Production readiness', state: 'No-Go', to: '/settings/integrations/nvidia-dsx' },
];

const SUMMARY_KPIS: KpiKey[] = [
  'pue',
  'itLoadKw',
  'capacityHeadroom',
  'thermalStability',
  'carbonIntensity',
  'sovereigntyScore',
];

const OVERLAYS = [
  { id: 'thermal', label: 'Thermal' },
  { id: 'power', label: 'Power' },
  { id: 'workload', label: 'Capacity' },
  { id: 'carbon', label: 'Carbon' },
] as const;

export default function CommandCentre() {
  useSeededRunFixtures();
  const { facility, assets, isFallback, naming, modelNotes } = useFacilityModel();
  const overrides = useWorkspaceStore((s) => s.overrides);
  const runs = useWorkspaceStore((s) => s.runs);
  const [overlay, setOverlay] = useState<string>('thermal');
  const [selectedAssetId, setSelectedAssetId] = useState<string | null>(null);

  const kpis = deriveKpis(facility, overrides);
  const latestRun = runs[0] ?? null;
  const pendingDecisions = runs.reduce(
    (total, run) =>
      total + run.recommendations.filter((r) => (run.decisions[r.id] ?? 'pending') === 'pending').length,
    0,
  );
  const rackCount = assets.filter((a) => a.kind === 'rack').length;
  const blueprintHref = `/blueprint/${facility.id || 'default'}`;
  const calculatedAt = latestRun
    ? new Date(latestRun.completedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  const effectiveKpis = useMemo(
    () => (latestRun ? { ...kpis, ...latestRun.result } : kpis),
    [kpis, latestRun],
  );

  const interpretations = useMemo(
    () => SUMMARY_KPIS.map((key) => interpretKpi(key, effectiveKpis, facility)),
    [effectiveKpis, facility],
  );

  const attentionItems = useMemo(
    () =>
      buildAttentionQueue({
        facility,
        interpretations,
        pendingDecisions,
        runCount: runs.length,
        latestRunId: latestRun?.id ?? null,
        isFallback,
        modelNotes,
        blueprintHref,
      }),
    [facility, interpretations, pendingDecisions, runs.length, latestRun, isFallback, modelNotes, blueprintHref],
  );

  const selectedAsset = selectedAssetId ? assets.find((a) => a.id === selectedAssetId) ?? null : null;

  useEffect(() => {
    document.title = `${facility.name} | AURA command centre`;
  }, [facility.name]);

  return (
    <div className="mx-auto w-full min-w-0 max-w-[1680px] px-4 py-4" data-testid="command-centre">
      {/* 1. Compact facility header - context, not a hero. */}
      <header className="mb-4 min-w-0 border-b border-border pb-3">
        <nav aria-label="Facility context" className="mb-1 truncate text-[11px] text-muted-foreground">
          {naming.breadcrumb.join(' / ')}
        </nav>
        <div className="flex min-w-0 flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <h1 className="break-words text-xl font-semibold text-foreground">{facility.name}</h1>
            <p className="mt-0.5 break-words text-sm text-muted-foreground">
              {facility.city} · {facility.tier} design · Simulated design baseline · Last calculated {calculatedAt}
            </p>
          </div>
          <div className="flex min-w-0 flex-wrap items-center gap-2">
            {isFallback && <Badge variant="outline" className="text-[11px]">Reference model</Badge>}
            <Button asChild variant="outline" size="sm">
              <Link to={blueprintHref}>
                <Boxes className="mr-1.5 h-4 w-4" aria-hidden />
                Open Blueprint
              </Link>
            </Button>
            <Button asChild size="sm">
              <Link to={`/simulation?twin=${encodeURIComponent(facility.id || 'default')}`}>
                <PlayCircle className="mr-1.5 h-4 w-4" aria-hidden />
                Start simulation
              </Link>
            </Button>
            <Button asChild variant="ghost" size="sm">
              <Link to="/dsx/evidence-beta">
                <FileText className="mr-1.5 h-4 w-4" aria-hidden />
                View Evidence
              </Link>
            </Button>
          </div>
        </div>

        {/* Model assumptions: technical detail stays behind a disclosure. */}
        <Collapsible className="mt-2 min-w-0">
          <CollapsibleTrigger className="inline-flex items-center gap-1.5 rounded-sm text-xs text-muted-foreground underline-offset-2 hover:text-foreground hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
            <ChevronDown className="h-3.5 w-3.5" aria-hidden />
            Model assumptions
          </CollapsibleTrigger>
          <CollapsibleContent className="mt-2 min-w-0 rounded-md border border-border bg-muted/40 p-3">
            <ul className="space-y-1.5 text-xs leading-relaxed text-muted-foreground">
              <li>Operating mode: SIMULATED. Inputs are synthetic design values, not measured telemetry.</li>
              <li>Calculation source: deterministic in-application scenario engine.</li>
              <li>
                Baseline provenance:{' '}
                {latestRun
                  ? `run ${latestRun.id} (${new Date(latestRun.completedAt).toLocaleString()})`
                  : 'modelled configuration baseline, no run recorded'}
                .
              </li>
              <li>Design capacity: {formatPower(facility.capacityKw)} · modelled IT load {formatKpi('itLoadKw', effectiveKpis.itLoadKw)}.</li>
              <li>{rackCount} of an estimated {facility.designRackEstimate} racks are represented individually.</li>
              {naming.isDerivedName && (
                <li>Display name derived from facility attributes (stored name: {naming.storedName ?? 'empty'}).</li>
              )}
              {modelNotes.map((note) => (
                <li key={note}>{note}</li>
              ))}
              <li>Results cannot be validated against a physical facility in this environment.</li>
            </ul>
          </CollapsibleContent>
        </Collapsible>
      </header>

      {/* 2. Attention queue - the primary section. */}
      <div className="mb-5 min-w-0">
        <AttentionQueueSection items={attentionItems} />
      </div>

      {/* 3. Interpretable KPI grid. */}
      <section aria-labelledby="kpi-heading" className="mb-5 min-w-0">
        <h2 id="kpi-heading" className="mb-2 text-sm font-semibold text-foreground">
          Modelled indicators
        </h2>
        <div className="grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-6">
          {interpretations.map((kpi) => (
            <KpiCard
              key={kpi.key}
              kpi={kpi}
              calculatedAt={calculatedAt}
              blueprintHref={blueprintHrefForKpi(facility.id, kpi.key)}
              evidenceHref={evidenceHrefForKpi(kpi.key)}
            />
          ))}
        </div>
      </section>

      {/* 4. Facility visualisation as an operational surface. */}
      <section aria-labelledby="facility-visual-heading" className="mb-5 min-w-0 rounded-lg border border-border bg-card">
        <div className="flex min-w-0 flex-wrap items-center justify-between gap-2 border-b border-border p-3">
          <h2 id="facility-visual-heading" className="text-sm font-semibold text-foreground">
            Facility visualisation
          </h2>
          <div className="flex min-w-0 flex-wrap items-center gap-1.5" role="group" aria-label="Visualisation layer">
            {OVERLAYS.map((layer) => (
              <Button
                key={layer.id}
                size="sm"
                variant={overlay === layer.id ? 'secondary' : 'ghost'}
                aria-pressed={overlay === layer.id}
                className="h-8 px-2.5 text-xs"
                onClick={() => setOverlay(layer.id)}
              >
                {layer.label}
              </Button>
            ))}
            <Button asChild size="sm" variant="outline" className="h-8 text-xs">
              <Link to={`${blueprintHref}?tab=model&layer=${overlay}`}>Open in Blueprint</Link>
            </Button>
          </div>
        </div>

        <div className="min-w-0 overflow-hidden">
          <div className="h-[260px] w-full overflow-hidden bg-background sm:h-[340px]">
            <FacilityFloorPlan
              facility={facility}
              overlay={overlay}
              selectedAssetId={selectedAssetId}
              onSelect={setSelectedAssetId}
            />
          </div>
        </div>

        <div className="min-w-0 border-t border-border p-3">
          <p className="break-words text-xs text-muted-foreground">
            Design visualisation · {rackCount} of approximately {facility.designRackEstimate} racks represented ·
            Procedural model, not a validated OpenUSD stage.
          </p>
          {selectedAsset && (
            <p className="mt-1.5 break-words text-xs text-foreground">
              Selected: <span className="font-medium">{selectedAsset.name}</span> ({selectedAsset.kind})
            </p>
          )}
        </div>
      </section>

      <div className="grid min-w-0 gap-4 lg:grid-cols-3">
        {/* 5. Recent simulations. */}
        <section aria-labelledby="runs-heading" className="min-w-0 rounded-lg border border-border bg-card p-3 lg:col-span-2">
          <h2 id="runs-heading" className="mb-2 text-sm font-semibold text-foreground">
            Recent simulations
          </h2>
          {runs.length === 0 ? (
            <div className="min-w-0 rounded-md border border-dashed border-border p-3">
              <p className="text-sm font-medium text-foreground">No simulation runs yet</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Test a power, cooling or capacity change against the current design baseline.
              </p>
              <Button asChild size="sm" className="mt-2.5">
                <Link to={`/simulation?twin=${encodeURIComponent(facility.id || 'default')}`}>
                  Create first simulation
                  <ArrowRight className="ml-1.5 h-4 w-4" aria-hidden />
                </Link>
              </Button>
            </div>
          ) : (
            <ul className="min-w-0 divide-y divide-border">
              {runs.slice(0, 5).map((run) => {
                const pending = run.recommendations.filter(
                  (r) => (run.decisions[r.id] ?? 'pending') === 'pending',
                ).length;
                return (
                  <li key={run.id} className="flex min-w-0 flex-wrap items-center gap-2 py-2">
                    <div className="min-w-0 flex-1">
                      <div className="flex min-w-0 items-center gap-2 text-sm font-medium text-foreground">
                        <span className="truncate">{run.scenarioLabel}</span>
                        {isFixtureRun(run) && (
                          <Badge variant="outline" className="shrink-0 text-[10px]">Seeded fixture</Badge>
                        )}
                      </div>
                      <p className="truncate text-[11px] tabular-nums text-muted-foreground">
                        Run {run.id} · PUE {formatKpi('pue', run.result.pue)} · Headroom{' '}
                        {formatKpi('capacityHeadroom', run.result.capacityHeadroom)} ·{' '}
                        {new Date(run.completedAt).toLocaleString()}
                      </p>
                    </div>
                    <Badge variant={pending > 0 ? 'secondary' : 'outline'} className="text-[11px]">
                      {pending > 0 ? `${pending} to review` : 'Reviewed'}
                    </Badge>
                    <Button asChild size="sm" variant="ghost" className="h-8 px-2 text-xs">
                      <Link to={`/simulation?run=${encodeURIComponent(run.id)}`}>View result</Link>
                    </Button>
                  </li>
                );
              })}
            </ul>
          )}
          {runs.length > 1 && (
            <Button asChild size="sm" variant="outline" className="mt-2 text-xs">
              <Link
                to={`/simulation?compare=${runs
                  .slice(0, 2)
                  .map((r) => encodeURIComponent(r.id))
                  .join(',')}`}
              >
                Compare runs
              </Link>
            </Button>
          )}
        </section>

        {/* 6. Integration readiness summary. */}
        <section aria-labelledby="readiness-heading" className="min-w-0 rounded-lg border border-border bg-card p-3">
          <h2 id="readiness-heading" className="mb-2 text-sm font-semibold text-foreground">
            Integration readiness
          </h2>
          <ul className="min-w-0 space-y-1">
            {READINESS.map((item) => (
              <li key={item.label} className="min-w-0">
                <Link
                  to={item.to}
                  className="flex min-w-0 items-center justify-between gap-2 rounded-sm px-1 py-1.5 text-sm hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <span className="min-w-0 truncate text-muted-foreground">{item.label}</span>
                  <span className="shrink-0 rounded-sm border border-border px-1.5 py-0.5 text-[11px] text-muted-foreground">
                    {item.state}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
}
