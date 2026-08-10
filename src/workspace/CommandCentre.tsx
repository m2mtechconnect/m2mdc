/**
 * Data Centre Command Centre (route `/` and `/dashboard`).
 *
 * Stage 7D structure - the default surface fits inside two viewport heights:
 *   Screen 1 (Decisions)  - facility header, four KPI highlights, the three
 *                           highest-priority action items, status snapshot.
 *   Screen 2 (Exploration)- facility visualisation with Rack Quick View, and
 *                           the latest three simulation runs.
 *
 * Everything else is progressive disclosure: quick views and drawers, never
 * inline expansion, so opening detail cannot grow the document.
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { deriveKpis, formatKpi, formatPower, useFacilityModel, type KpiKey } from './facilityModel';
import { evidenceHrefForKpi } from './kpiDrilldown';
import { useWorkspaceStore } from './workspaceStore';
import { useSeededRunFixtures } from './runFixtures';
import { interpretKpi, type KpiInterpretation } from './dashboard/kpiInterpretation';
import { buildAttentionQueue, type AttentionItem } from './dashboard/attentionQueue';
import { ActionCenter } from './dashboard/ActionCenter';
import { FacilityHighlights } from './dashboard/FacilityHighlights';
import { FacilityCanvas, type CanvasOverlayId } from './dashboard/FacilityCanvas';
import { RecentSimulations } from './dashboard/RecentSimulations';
import { StatusSnapshot, buildSnapshotRows } from './dashboard/StatusSnapshot';
import { MetricQuickView } from './dashboard/MetricQuickView';
import { buildRackGrid } from './dashboard/rackModel';

/** Primary highlights cells, in scanning order. */
const PRIMARY_KPIS: KpiKey[] = ['pue', 'itLoadKw', 'capacityHeadroom', 'sovereigntyScore'];
/** Secondary indicators, surfaced through evidence rather than the strip. */
const SECONDARY_KPIS: KpiKey[] = ['thermalStability', 'carbonIntensity'];
const SUMMARY_KPIS: KpiKey[] = [...PRIMARY_KPIS, ...SECONDARY_KPIS];

/** Session memory for the active analytical layer. */
const LAYER_STORAGE_KEY = 'aura.dashboard.layer';

export default function CommandCentre() {
  useSeededRunFixtures();
  const { facility, assets, isFallback, naming, modelNotes } = useFacilityModel();
  const overrides = useWorkspaceStore((s) => s.overrides);
  const runs = useWorkspaceStore((s) => s.runs);
  const [searchParams, setSearchParams] = useSearchParams();

  const [overlay, setOverlay] = useState<CanvasOverlayId>(() => {
    const stored = typeof window !== 'undefined' ? window.sessionStorage.getItem(LAYER_STORAGE_KEY) : null;
    return (stored as CanvasOverlayId) || 'thermal';
  });
  useEffect(() => {
    window.sessionStorage.setItem(LAYER_STORAGE_KEY, overlay);
  }, [overlay]);

  const [metricKpi, setMetricKpi] = useState<KpiInterpretation | null>(null);
  const [centerNonce, setCenterNonce] = useState(0);

  const grid = useMemo(() => buildRackGrid(facility), [facility]);

  /** Rack selection lives in the URL, so Back restores the previous state. */
  const rackParam = searchParams.get('rack');
  const selectedRackId = useMemo(() => {
    if (!rackParam) return null;
    return grid.byCode.get(rackParam.toUpperCase())?.id ?? grid.byId.get(rackParam)?.id ?? null;
  }, [rackParam, grid]);

  const setSelectedRack = useCallback(
    (rackId: string | null) => {
      const next = new URLSearchParams(searchParams);
      if (rackId) {
        const rack = grid.byId.get(rackId);
        if (!rack) return;
        next.set('rack', rack.code);
      } else {
        next.delete('rack');
      }
      setSearchParams(next, { replace: !rackId && !rackParam });
    },
    [searchParams, setSearchParams, grid, rackParam],
  );

  const kpis = deriveKpis(facility, overrides);
  const latestRun = runs[0] ?? null;
  const pendingDecisions = runs.reduce(
    (total, run) =>
      total + run.recommendations.filter((r) => (run.decisions[r.id] ?? 'pending') === 'pending').length,
    0,
  );
  const rackCount = assets.filter((a) => a.kind === 'rack').length;
  const blueprintHref = `/blueprint/${facility.id || 'default'}`;
  const evidenceHref = '/dsx/evidence-beta';
  const simulationHref = `/simulation?twin=${encodeURIComponent(facility.id || 'default')}`;
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
        derivedAt: new Date().toISOString(),
        latestRunAt: latestRun ? new Date(latestRun.completedAt).toISOString() : null,
      }),
    [facility, interpretations, pendingDecisions, runs.length, latestRun, isFallback, modelNotes, blueprintHref],
  );

  const primaryKpis = useMemo(
    () => interpretations.filter((k) => (PRIMARY_KPIS as string[]).includes(k.key)),
    [interpretations],
  );

  const evidenceNeedingReview = interpretations.filter(
    (k) => k.state === 'watch' || k.state === 'constraint',
  ).length;

  useEffect(() => {
    document.title = `${facility.name} | AURA command centre`;
  }, [facility.name]);

  /** Issue Quick View -> facility visualisation, correct layer, first affected rack. */
  const inspectAffectedRacks = useCallback(
    (item: AttentionItem) => {
      const layer: CanvasOverlayId =
        item.id.includes('pue') || item.id.includes('thermal')
          ? 'thermal'
          : item.id.includes('itLoad') || item.id.includes('power')
            ? 'power'
            : item.id.includes('carbon')
              ? 'carbon'
              : 'workload';
      setOverlay(layer);
      const affected =
        grid.racks.find((rack) => rack.state === 'constraint') ??
        grid.racks.find((rack) => rack.state === 'watch') ??
        grid.racks[0];
      if (affected) setSelectedRack(affected.id);
      const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
      document
        .querySelector('[data-testid="facility-canvas"]')
        ?.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
      setCenterNonce((n) => n + 1);
    },
    [grid, setSelectedRack],
  );

  const assumptions = (
    <ul className="space-y-1.5 text-[13px] leading-relaxed text-muted-foreground">
      <li>Operating mode: SIMULATED. Inputs are synthetic design values, not measured telemetry.</li>
      <li>Calculation source: deterministic in-application scenario engine.</li>
      <li>
        Baseline provenance:{' '}
        {latestRun
          ? `run ${latestRun.id} (${new Date(latestRun.completedAt).toLocaleString()})`
          : 'modelled configuration baseline, no run recorded'}
        .
      </li>
      <li>
        Design capacity: {formatPower(facility.capacityKw)} · modelled IT load{' '}
        {formatKpi('itLoadKw', effectiveKpis.itLoadKw)}.
      </li>
      <li>
        {rackCount} of an estimated {facility.designRackEstimate} racks are represented individually.
      </li>
      {naming.isDerivedName && (
        <li>Display name derived from facility attributes (stored name: {naming.storedName ?? 'empty'}).</li>
      )}
      {modelNotes.map((note) => (
        <li key={note}>{note}</li>
      ))}
      <li>OpenUSD stage: NOT VALIDATED · SimReady assets: 0 VALIDATED · Production readiness: NO-GO.</li>
      <li>Results cannot be validated against a physical facility in this environment.</li>
    </ul>
  );

  return (
    <div className="aura-workspace-theme min-w-0 bg-background py-4" data-testid="command-centre">
      <div className="dashboard-shell min-w-0 space-y-4">
        {/* Screen 1 - decisions. */}
        <FacilityHighlights
          facilityName={facility.name}
          location={facility.city}
          tier={facility.tier}
          calculatedAt={calculatedAt}
          isFallback={isFallback}
          simulationHref={simulationHref}
          blueprintHref={blueprintHref}
          evidenceHref={evidenceHref}
          kpis={primaryKpis}
          evidenceHrefForKpi={(kpi: KpiInterpretation) => evidenceHrefForKpi(kpi.key)}
          onSelectKpi={setMetricKpi}
          assumptions={assumptions}
        />

        <div className="dashboard-grid">
          <div className="dashboard-main">
            <ActionCenter items={attentionItems} onInspectRacks={inspectAffectedRacks} />
          </div>
          <aside className="dashboard-rail" aria-label="Facility status">
            <StatusSnapshot rows={buildSnapshotRows(evidenceNeedingReview)} evidenceHref={evidenceHref} />
          </aside>
        </div>

        {/* Screen 2 - facility exploration. */}
        <FacilityCanvas
          facility={facility}
          grid={grid}
          overlay={overlay}
          onOverlayChange={setOverlay}
          selectedRackId={selectedRackId}
          onSelectRack={setSelectedRack}
          rackCount={rackCount}
          blueprintHref={blueprintHref}
          calculatedAt={calculatedAt}
          centerNonce={centerNonce}
        />

        <RecentSimulations runs={runs} facilityId={facility.id} />
      </div>

      <MetricQuickView
        kpi={metricKpi}
        facilityId={facility.id}
        calculatedAt={calculatedAt}
        onClose={() => setMetricKpi(null)}
      />
    </div>
  );
}
