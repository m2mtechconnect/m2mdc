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
import { deriveKpis, formatKpi, formatPower, useFacilityModel, type KpiKey } from './facilityModel';
import { evidenceHrefForKpi } from './kpiDrilldown';
import { useWorkspaceStore } from './workspaceStore';
import { useSeededRunFixtures } from './runFixtures';
import { interpretKpi, type KpiInterpretation } from './dashboard/kpiInterpretation';
import { buildAttentionQueue } from './dashboard/attentionQueue';
import { ActionCenter } from './dashboard/ActionCenter';
import { FacilityHighlights } from './dashboard/FacilityHighlights';
import { FacilityCanvas, type CanvasOverlayId } from './dashboard/FacilityCanvas';
import { RecentSimulations } from './dashboard/RecentSimulations';
import { ContextRail } from './dashboard/ContextRail';

/** Primary highlights cells, in scanning order. */
const PRIMARY_KPIS: KpiKey[] = ['pue', 'itLoadKw', 'capacityHeadroom', 'sovereigntyScore'];
/** Secondary indicators, surfaced through evidence rather than the strip. */
const SECONDARY_KPIS: KpiKey[] = ['thermalStability', 'carbonIntensity'];
const SUMMARY_KPIS: KpiKey[] = [...PRIMARY_KPIS, ...SECONDARY_KPIS];

export default function CommandCentre() {
  useSeededRunFixtures();
  const { facility, assets, isFallback, naming, modelNotes } = useFacilityModel();
  const overrides = useWorkspaceStore((s) => s.overrides);
  const runs = useWorkspaceStore((s) => s.runs);
  const [overlay, setOverlay] = useState<CanvasOverlayId>('thermal');
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

  const selectedAsset = selectedAssetId ? assets.find((a) => a.id === selectedAssetId) ?? null : null;

  useEffect(() => {
    document.title = `${facility.name} | AURA command centre`;
  }, [facility.name]);

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
      <li>
        Secondary indicators (thermal stability, carbon intensity) are available in Evidence rather than the
        highlights strip.
      </li>
      <li>Results cannot be validated against a physical facility in this environment.</li>
    </ul>
  );

  return (
    <div className="aura-workspace-theme min-w-0 bg-background py-5" data-testid="command-centre">
      <div className="dashboard-shell min-w-0">
        {/* 1. Facility highlights: identity, state, one primary action, indicators. */}
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
          assumptions={assumptions}
        />

        {/* 2. Primary workspace and 320px contextual rail. */}
        <div className="dashboard-grid mt-5">
          <div className="dashboard-main space-y-5">
            <ActionCenter items={attentionItems} />

            <FacilityCanvas
              facility={facility}
              overlay={overlay}
              onOverlayChange={setOverlay}
              selectedAssetId={selectedAssetId}
              onSelect={setSelectedAssetId}
              selectedAsset={selectedAsset}
              rackCount={rackCount}
              blueprintHref={blueprintHref}
            />

            <RecentSimulations runs={runs} facilityId={facility.id} />
          </div>

          <aside className="dashboard-rail" aria-label="Facility context">
            <ContextRail
              calculatedAt={calculatedAt}
              kpis={interpretations}
              blueprintHref={blueprintHref}
              evidenceHref={evidenceHref}
            />
          </aside>
        </div>
      </div>
    </div>
  );
}
