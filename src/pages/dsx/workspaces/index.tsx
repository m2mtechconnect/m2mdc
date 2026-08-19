/**
 * The eleven DSX-aligned operator workspaces.
 *
 * Every workspace answers one operational question, renders only calculated
 * values through <MetricTile>, and states plainly when a capability cannot
 * be assessed. No workspace fabricates a value or a health claim.
 */
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { MetricGrid } from '@/components/dsx/MetricTile';
import { ConstraintStack } from '@/components/dsx/ConstraintStack';
import { RackMap, RACK_OVERLAYS, type RackOverlay } from '@/components/dsx/RackMap';
import { TrendStrip, type TrendSeries } from '@/components/dsx/TrendStrip';
import { EvidenceQualityBar } from '@/components/dsx/EvidenceQualityBar';
import { CanonicalEvidencePanel } from '@/components/dsx/CanonicalEvidencePanel';
import { FIXTURE_DEMONSTRATION_NOTICE } from '@/dsx/runtime/evidenceFixturePolicy';
import { ExceptionList } from '@/components/dsx/ExceptionList';
import { MissingSourceState } from '@/components/dsx/MissingSourceState';
import { PowerOneLine } from '@/components/dsx/PowerOneLine';
import { CoolingLoopDiagram } from '@/components/dsx/CoolingLoopDiagram';
import { useRunSeries } from '@/dsx/runtime/useRunSeries';
import { ScenarioControls, RecommendationList, DecisionLog, PlannedScenarioNotice } from '@/components/dsx/ScenarioPanel';
import { CapabilityNotice, UnavailableState, ConnectionState } from '@/components/dsx/StateBadges';
import { useWorkspace } from '@/dsx/runtime/EvidenceBetaContext';
import { capability } from '@/dsx/workspaces/availability';
import {
  ALL_RACK_IDENTITIES, OPENUSD_UNAVAILABLE, buildHierarchy, childrenOf, coolingChain, coolingTrace,
  declaredBuildings, dependentRacks, electricalChain, electricalTrace, type HierarchyNode,
} from '@/dsx/workspaces/facilityGraph';
import { DESIGN_INLET_LIMIT_C } from '@/dsx/metrics/computeKpis';
import { EVIDENCE_BETA_SEED, EVIDENCE_BETA_VERSION } from '@/dsx/fixtures/evidenceBetaFacility';
import { LIVE_DISABLED_REASON } from '@/dsx/adapters/liveDisabledAdapter';
import {
  BoundaryVerdict, EvidenceBoundaryTable, RequiredInputList,
} from '@/components/dsx/EvidenceBoundary';
import {
  carbonAssertions, financialAssertions, sovereigntyAssertions,
} from '@/dsx/workspaces/evidenceBoundary';

function Section({ title, description, children }: { title: string; description?: string; children: React.ReactNode }) {
  return (
    <section className="space-y-3 border-t border-border/60 pt-6 first:border-t-0 first:pt-0">
      <div className="flex gap-3">
        <span aria-hidden className="mt-1 h-4 w-1 shrink-0 rounded-full bg-primary" />
        <div className="min-w-0 space-y-0.5">
          <h2 className="text-[15px] font-semibold leading-tight tracking-tight">{title}</h2>
          {description && <p className="max-w-3xl text-xs leading-relaxed text-muted-foreground">{description}</p>}
        </div>
      </div>
      {children}
    </section>
  );
}

function AssetSelectButton({ auraId, sourceId, name }: { auraId: string; sourceId: string; name: string }) {
  const { selectAsset, selectedAssetId } = useWorkspace();
  return (
    <Button
      size="sm"
      variant={selectedAssetId === auraId ? 'default' : 'ghost'}
      onClick={() => selectAsset(auraId)}
      data-testid={`dsx-select-asset-${sourceId}`}
      data-aura-id={auraId}
    >
      {name}
    </Button>
  );
}

/**
 * Rack map with an overlay selector. Overlay choice is view state for this
 * panel only; every cell value is read from the accepted observation set.
 */
function RackMapPanel({ defaultOverlay = 'thermal' }: { defaultOverlay?: RackOverlay }) {
  const [overlay, setOverlay] = useState<RackOverlay>(defaultOverlay);
  return (
    <div className="space-y-3" data-testid="dsx-rack-map-panel">
      {/* Segmented control: this switches the view of one map, it is not
          page navigation. The legend lives inside <RackMap>. */}
      <div
        className="inline-flex flex-wrap overflow-hidden rounded-md border border-border"
        role="group"
        aria-label="Rack map overlay"
      >
        {RACK_OVERLAYS.map((o) => (
          <Button
            key={o.id}
            size="sm"
            variant={overlay === o.id ? 'default' : 'ghost'}
            aria-pressed={overlay === o.id}
            onClick={() => setOverlay(o.id)}
            data-testid={`dsx-rack-overlay-${o.id}`}
            className="rounded-none border-0 text-xs"
          >
            {o.label}
          </Button>
        ))}
      </div>
      <RackMap overlay={overlay} />
    </div>
  );
}

/** Observation-step trends recomputed from the same KPI pipeline as the tiles. */
function useTrendSeries(ids: Array<'max_inlet_c' | 'it_load_kw' | 'cooling_load_kw' | 'pue'>): TrendSeries[] {
  const { rt } = useWorkspace();
  const points = useRunSeries(rt);
  const defs: Record<string, { label: string; unit: string; digits: number }> = {
    max_inlet_c: { label: 'Max rack inlet', unit: 'degC', digits: 2 },
    it_load_kw: { label: 'IT load', unit: 'kW', digits: 2 },
    cooling_load_kw: { label: 'Cooling load', unit: 'kW', digits: 2 },
    pue: { label: 'PUE', unit: 'ratio', digits: 3 },
  };
  return ids.map((id) => ({
    id,
    label: defs[id].label,
    unit: defs[id].unit,
    digits: defs[id].digits,
    points: points.map((p) => p[id]),
  }));
}

/* 1 - Facility overview: what is the state of the facility right now? */
export function OverviewWorkspace() {
  const { rt } = useWorkspace();
  const trends = useTrendSeries(['pue', 'it_load_kw', 'cooling_load_kw', 'max_inlet_c']);
  return (
    <div className="space-y-6">
      {/* The page h1 already names this view, so the KPI grid leads with the
          question it answers instead of repeating the title. */}
      <p className="max-w-3xl text-xs text-muted-foreground">
        What is the operational state of the facility at this observation step, and which
        constraint binds first?
      </p>
      <MetricGrid
        ids={['pue', 'facility_load', 'it_load', 'cooling_load', 'max_rack_inlet', 'thermal_headroom', 'power_capacity_utilisation', 'data_quality']}
        metrics={rt.bundle.metrics}
      />
      <Section title="Trend across this run" description="Each point is recomputed from the accepted observations at that step. A step without an accepted observation is drawn as a gap.">
        <TrendStrip series={trends} />
      </Section>
      <Section title="Data hall" description="Logical rack layout declared by the facility record. A rack with no accepted observation is never shown as healthy.">
        <RackMapPanel />
      </Section>
      {/* Exceptions and the constraint stack listed the same domains twice.
          The constraint stack is the single ranked list. */}
      <ConstraintStack />
      <Section title="Scenario" description="Baseline is step 0 of the same seeded fixture.">
        <ScenarioControls />
      </Section>
    </div>
  );
}

/* 2 - Thermal */
export function ThermalWorkspace() {
  const { rt, selectAsset } = useWorkspace();
  const trends = useTrendSeries(['max_inlet_c', 'cooling_load_kw']);
  const ranked = [...rt.bundle.racks].sort((a, b) => (b.inlet_c ?? -Infinity) - (a.inlet_c ?? -Infinity));
  return (
    <div className="space-y-6">
      <Section
        title="Thermal state"
        description={`Which racks are closest to the ${DESIGN_INLET_LIMIT_C} degC design inlet limit, and what supplies their cooling?`}
      >
        <MetricGrid ids={['max_rack_inlet', 'thermal_headroom', 'cooling_load']} metrics={rt.bundle.metrics} columns="sm:grid-cols-3" />
      </Section>

      <Section title="Thermal trend" description="Maximum measured rack inlet and cooling draw at each observation step of this run.">
        <TrendStrip series={trends} className="sm:grid-cols-2 xl:grid-cols-2" />
      </Section>

      <Section title="Rack map" description="Inlet band per rack, from the measured value only.">
        <RackMapPanel defaultOverlay="thermal" />
      </Section>

      <Section title="Rack inlet queue" description="Ranked by measured inlet temperature. A rack without an observation is never ranked as cool.">
        <Table data-testid="dsx-thermal-queue">
          <TableHeader>
            <TableRow>
              <TableHead>Rack</TableHead>
              <TableHead>Inlet (degC)</TableHead>
              <TableHead>Headroom (degC)</TableHead>
              <TableHead>IT load (kW)</TableHead>
              <TableHead>Observed at</TableHead>
              <TableHead>Evidence</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {ranked.map((r) => (
              <TableRow key={r.aura_asset_id} data-testid={`dsx-rack-${r.source_asset_id}`}>
                <TableCell>
                  <AssetSelectButton auraId={r.aura_asset_id} sourceId={r.source_asset_id} name={r.name} />
                </TableCell>
                <TableCell className="font-mono">{r.inlet_c === null ? 'Unavailable' : r.inlet_c.toFixed(2)}</TableCell>
                <TableCell className="font-mono">
                  {r.inlet_c === null ? 'Unavailable' : (DESIGN_INLET_LIMIT_C - r.inlet_c).toFixed(2)}
                </TableCell>
                <TableCell className="font-mono">{r.it_power_kw === null ? 'Unavailable' : r.it_power_kw.toFixed(2)}</TableCell>
                <TableCell className="font-mono text-xs">{r.observed_at ?? 'none'}</TableCell>
                <TableCell className="font-mono text-[11px]">{r.inlet_event_id ?? 'none'}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Section>

      <Section title="Cooling dependency of the hottest rack">
        {rt.bundle.hotspot ? (
          <ol className="space-y-1 text-sm" data-testid="dsx-thermal-trace">
            {coolingTrace(rt.bundle.hotspot.source_asset_id).map((h) => (
              <li key={h.identity.stable_asset_id}>
                <button
                  type="button"
                  className="rounded-sm underline underline-offset-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  onClick={() => selectAsset(h.identity.stable_asset_id)}
                >
                  {h.role}: {h.identity.name}
                </button>
              </li>
            ))}
          </ol>
        ) : (
          <UnavailableState reason="No rack inlet observation was accepted in this window, so no hotspot can be identified." />
        )}
      </Section>
    </div>
  );
}

/* 3 - Power */
export function PowerWorkspace() {
  const { rt } = useWorkspace();
  return (
    <div className="space-y-6">
      <Section title="Power state" description="How much of the site's rated capacity is committed, and what depends on each supply device?">
        <MetricGrid ids={['facility_load', 'it_load', 'power_capacity_utilisation']} metrics={rt.bundle.metrics} columns="sm:grid-cols-3" />
      </Section>

      <Section title="Single-line view" description="Stages declared by the facility record. A stage without metering is labelled as uninstrumented rather than estimated.">
        <PowerOneLine />
      </Section>

      <Section title="Rack power map" description="Per-rack draw against rack rating, from metered rack power only.">
        <RackMapPanel defaultOverlay="power" />
      </Section>

      <Section title="Electrical supply chain" description="Derived from declared connection points in the facility fixture.">
        <ul className="space-y-2" data-testid="dsx-electrical-chain">
          {electricalChain().map((a) => {
            const dependents = dependentRacks(a.source_asset_id);
            return (
              <li key={a.aura_asset_id} className="rounded-md border border-border/60 p-3 text-sm">
                <div className="flex flex-wrap items-center gap-2">
                  <AssetSelectButton auraId={a.aura_asset_id} sourceId={a.source_asset_id} name={a.name} />
                  <Badge variant="outline" className="text-[11px]">{a.asset_class}</Badge>
                  <Badge variant="outline" className="text-[11px]">{dependents.length} dependent rack(s)</Badge>
                </div>
                <p className="pt-1 text-xs text-muted-foreground">
                  {dependents.length ? `Loss of supply affects: ${dependents.map((d) => d.name).join(', ')}.`
                    : 'No dependent rack is declared for this device in the fixture.'}
                </p>
              </li>
            );
          })}
        </ul>
      </Section>

      <Section title="Branch-level power">
        <UnavailableState
          reason="Branch-circuit and per-PDU metering is not instrumented in this facility source, so per-branch load cannot be calculated."
          missingInputs={['branch_circuit_power', 'ups_output_power']}
          testId="dsx-power-branch-unavailable"
        />
      </Section>

      <Section title="Electrical trace for rack 1">
        <ol className="space-y-1 text-sm" data-testid="dsx-electrical-trace">
          {electricalTrace('RACK-01').map((h) => (
            <li key={h.identity.stable_asset_id}>{h.role}: {h.identity.name}</li>
          ))}
        </ol>
      </Section>
    </div>
  );
}

/* 4 - Cooling */
export function CoolingWorkspace() {
  const { rt } = useWorkspace();
  const coolingTrends = useTrendSeries(['cooling_load_kw', 'pue']);
  return (
    <div className="space-y-6">
      <Section title="Cooling state" description="How much electrical energy is cooling consuming, and which racks does each loop serve?">
        <MetricGrid ids={['cooling_load', 'pue', 'thermal_headroom']} metrics={rt.bundle.metrics} columns="sm:grid-cols-3" />
      </Section>

      <Section title="Loop diagram" description="Each cooling unit with the racks it serves and their measured inlet temperatures.">
        <CoolingLoopDiagram />
      </Section>

      <Section title="Cooling trend" description="Cooling draw and PUE at each observation step of this run.">
        <TrendStrip series={coolingTrends} className="sm:grid-cols-2 xl:grid-cols-2" />
      </Section>

      <Section title="Cooling loops">
        <ul className="space-y-2" data-testid="dsx-cooling-chain">
          {coolingChain().map((a) => {
            const dependents = dependentRacks(a.source_asset_id);
            return (
              <li key={a.aura_asset_id} className="rounded-md border border-border/60 p-3 text-sm">
                <div className="flex flex-wrap items-center gap-2">
                  <AssetSelectButton auraId={a.aura_asset_id} sourceId={a.source_asset_id} name={a.name} />
                  <Badge variant="outline" className="text-[11px]">{a.asset_class}</Badge>
                  <Badge variant="outline" className="text-[11px]">{dependents.length} served rack(s)</Badge>
                </div>
              </li>
            );
          })}
        </ul>
      </Section>

      <Section title="Hydraulic state">
        <UnavailableState
          reason="Coolant supply temperature, flow rate and differential pressure are not instrumented, so loop efficiency and approach temperature cannot be calculated."
          missingInputs={['coolant_supply_temp', 'coolant_flow_rate', 'differential_pressure']}
          testId="dsx-cooling-hydraulic-unavailable"
        />
      </Section>
    </div>
  );
}

/* 5 - Network fabric */
export function NetworkWorkspace() {
  return (
    <div className="space-y-6">
      <Section title="Fabric state" description="Which fabric links constrain workload placement?">
        <MissingSourceState
          capability={capability('compute_fabric')}
          unlocks="link utilisation, oversubscription and placement constraints for the declared fabric"
          testId="dsx-network-missing-source"
        />
      </Section>
      <Section title="What would make this workspace operational">
        <ul className="list-disc pl-5 text-sm text-muted-foreground">
          <li>A switch and link telemetry source published through the DSX Exchange.</li>
          <li>An approved asset mapping for every switch and link, with OpenUSD prim paths.</li>
          <li>A fabric model verified by tests before any topology or utilisation is displayed.</li>
        </ul>
      </Section>
    </div>
  );
}

/* 6 - Facility registry and topology */
function HierarchyList({ nodes, depth = 0 }: { nodes: HierarchyNode[]; depth?: number }) {
  return (
    <ul className={depth === 0 ? 'space-y-1' : 'space-y-1 border-l border-border/60 pl-4'}>
      {nodes.map((n) => (
        <li key={n.asset.aura_asset_id}>
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <AssetSelectButton auraId={n.asset.aura_asset_id} sourceId={n.asset.source_asset_id} name={n.asset.name} />
            <Badge variant="outline" className="text-[11px]">{n.asset.asset_class}</Badge>
          </div>
          {n.children.length > 0 && <HierarchyList nodes={n.children} depth={depth + 1} />}
        </li>
      ))}
    </ul>
  );
}

export function FacilityWorkspace() {
  const { rt, selectedAsset } = useWorkspace();
  const unapproved = ALL_RACK_IDENTITIES.filter((a) => a.mapping_approval !== 'approved');
  return (
    <div className="space-y-6">
      <Section title="Registry health" description="Every asset carries a stable AURA identity. Display names are never identity.">
        <MetricGrid ids={['mapping_coverage', 'data_quality', 'telemetry_freshness']} metrics={rt.bundle.metrics} columns="sm:grid-cols-3" />
      </Section>

      <Section
        title="Inside this building"
        description="Contents of the declared building. Only one building is declared in the connected facility record, so no related-building list is shown."
      >
        <Card>
          <CardContent className="space-y-3 p-4">
            {declaredBuildings().map((b) => (
              <div key={b.stable_asset_id} data-testid="dsx-building-contents">
                <div className="flex flex-wrap items-center gap-2 pb-1">
                  <AssetSelectButton auraId={b.stable_asset_id} sourceId={b.source_asset_id} name={b.name} />
                  <Badge variant="outline" className="text-[11px]">
                    {childrenOf(b.stable_asset_id).length} direct child asset(s)
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground">
                  Contains: {childrenOf(b.stable_asset_id).map((c) => c.name).join(', ') || 'no child asset is declared'}.
                </p>
              </div>
            ))}
          </CardContent>
        </Card>
      </Section>

      <Section title="Asset hierarchy">
        <Card><CardContent className="p-4"><HierarchyList nodes={buildHierarchy()} /></CardContent></Card>
      </Section>

      <Section title="Evidence coverage by rack" description="Which declared racks are actually reporting an accepted observation at this step.">
        <RackMapPanel defaultOverlay="evidence" />
      </Section>

      <Section title="Selected asset">
        {selectedAsset ? (
          <Card data-testid="dsx-selected-asset">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">{selectedAsset.name}</CardTitle>
              <CardDescription className="font-mono text-xs">{selectedAsset.stable_asset_id}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-1 text-xs">
              <p>Source id: <span className="font-mono">{selectedAsset.source_asset_id}</span></p>
              <p>Asset class: {selectedAsset.asset_class}</p>
              <p>Mapping approval: {selectedAsset.mapping_approval}</p>
              <p>OpenUSD prim: <span className="font-mono">{selectedAsset.openusd_prim_path ?? OPENUSD_UNAVAILABLE}</span></p>
            </CardContent>
          </Card>
        ) : (
          <p className="text-sm text-muted-foreground">Select an asset in any workspace to inspect its identity here.</p>
        )}
      </Section>

      <Section title="Mapping exceptions">
        {unapproved.length === 0 ? (
          <p className="text-sm text-muted-foreground">Every rack mapping is approved in this fixture.</p>
        ) : (
          <ul className="list-disc pl-5 text-sm" data-testid="dsx-mapping-exceptions">
            {unapproved.map((a) => (
              <li key={a.stable_asset_id}>
                {a.name} - mapping {a.mapping_approval}; {OPENUSD_UNAVAILABLE}.
              </li>
            ))}
          </ul>
        )}
      </Section>

      <Section title="Spatial twin">
        <UnavailableState
          title="3D facility view unavailable"
          reason="No OpenUSD stage is served to this build. The facility is presented as an identity-accurate hierarchy and dependency list instead of an approximate 3D scene."
          testId="dsx-topology-fallback"
        />
      </Section>
    </div>
  );
}

/* 7 - Workload */
export function WorkloadWorkspace() {
  return (
    <div className="space-y-6">
      <Section title="Exposure summary" description="Which workloads are exposed by the current facility constraint?">
        <MissingSourceState
          capability={capability('workload_scheduler')}
          unlocks="attribution of facility constraints to named jobs, tenants and GPU allocations"
          testId="dsx-workload-missing-source"
        />
      </Section>
      <p className="text-sm text-muted-foreground">
        Facility constraints cannot be attributed to workloads until a scheduler source is connected.
        AURA will not infer workload impact from rack power alone.
      </p>
    </div>
  );
}

/* 8 - Sovereignty */
export function SovereigntyWorkspace() {
  const { rt } = useWorkspace();
  const assertions = sovereigntyAssertions(rt.bundle, rt.snapshot);
  return (
    <div className="space-y-6">
      <Section
        title="Evidence boundary"
        description="Which sovereignty claims can this build actually evidence, and which cannot be made at all?"
      >
        <BoundaryVerdict assertions={assertions} domain="sovereignty" />
      </Section>

      <Section
        title="Declared claims"
        description="Each claim is either backed by a named source or reported as not evidenced. Nothing is inferred."
      >
        <EvidenceBoundaryTable assertions={assertions} domain="sovereignty" />
      </Section>

      <Section title="Attestation and residency">
        <CapabilityNotice capability={capability('residency_evidence')} />
        <CapabilityNotice capability={capability('node_attestation')} />
      </Section>

      <Section title="Standing statement">
        <UnavailableState
          title="Sovereignty status unverified"
          reason={`No residency, jurisdiction, custody or attestation claim is made by this build. Data mode is ${rt.snapshot.data_mode} and calibration is uncalibrated, so nothing here may be used as a compliance artefact.`}
          testId="dsx-sovereignty-claim"
        />
      </Section>

      <Section title="What would close this boundary">
        <RequiredInputList assertions={assertions} domain="sovereignty" />
      </Section>
    </div>
  );
}

/* 9 - Carbon */
export function CarbonWorkspace() {
  const { rt } = useWorkspace();
  const assertions = carbonAssertions(rt.bundle);
  const energyTrends = useTrendSeries(['pue', 'it_load_kw', 'cooling_load_kw']);
  return (
    <div className="space-y-6">
      <Section
        title="Evidence boundary"
        description="What can be stated about emissions and water from the sources that are actually connected?"
      >
        <BoundaryVerdict assertions={assertions} domain="carbon" />
      </Section>

      <Section
        title="Measured energy drivers"
        description="These are metered quantities, not emissions. An emissions figure requires an intensity source."
      >
        <MetricGrid ids={['facility_load', 'it_load', 'cooling_load', 'pue']} metrics={rt.bundle.metrics} />
      </Section>

      <Section title="Energy driver trend" description="Metered quantities across this run. No emissions figure is derived from them.">
        <TrendStrip series={energyTrends} className="sm:grid-cols-2 xl:grid-cols-3" />
      </Section>

      <Section title="Sustainability ratios">
        <MetricGrid ids={['wue', 'cue']} metrics={rt.bundle.metrics} columns="sm:grid-cols-2" />
        <MissingSourceState
          capability={capability('grid_carbon_intensity')}
          unlocks="carbon usage effectiveness and a reportable emissions total"
        />
        <MissingSourceState
          capability={capability('water_metering')}
          unlocks="water usage effectiveness and consumption reporting"
        />
      </Section>

      <Section title="Declared claims">
        <EvidenceBoundaryTable assertions={assertions} domain="carbon" />
      </Section>

      <Section title="Reporting boundary">
        <UnavailableState
          title="No emissions figure is produced"
          reason="Power is metered instantaneously in kW; emissions reporting requires metered energy over a billing interval and a grid intensity factor. AURA will not convert an instantaneous draw into a reported emissions total."
          missingInputs={['facility_energy_kwh', 'it_energy_kwh', 'meter_interval', 'grid_intensity_g_per_kwh']}
          testId="dsx-carbon-reporting-unavailable"
        />
      </Section>

      <Section title="What would close this boundary">
        <RequiredInputList assertions={assertions} domain="carbon" />
      </Section>
    </div>
  );
}

/* 10 - Financial */
export function FinancialWorkspace() {
  const { rt } = useWorkspace();
  const assertions = financialAssertions(rt.bundle);
  return (
    <div className="space-y-6">
      <Section
        title="Evidence boundary"
        description="Which cost drivers are measured, and why no monetary figure is displayed?"
      >
        <BoundaryVerdict assertions={assertions} domain="financial" />
      </Section>

      <Section
        title="Measured cost drivers"
        description="These are the physical quantities a cost would be priced against. They are not costs."
      >
        <MetricGrid
          ids={['facility_load', 'it_load', 'power_capacity_utilisation']}
          metrics={rt.bundle.metrics}
          columns="sm:grid-cols-3"
        />
      </Section>

      <Section title="Declared claims">
        <EvidenceBoundaryTable assertions={assertions} domain="financial" />
      </Section>

      <Section title="Monetary values">
        <UnavailableState
          title="No cost, tariff or penalty figure is displayed"
          reason="Energy price, demand-charge schedule, contract terms and the cost ledger are not connected. Any monetary number shown here would be invented, so none is produced, including for advisory recommendations."
          missingInputs={['energy_price_per_kwh', 'demand_charge_per_kw', 'capex_records', 'opex_records', 'sla_terms']}
          testId="dsx-financial-monetary-unavailable"
        />
        <div className="pt-3">
          <CapabilityNotice capability={capability('energy_tariff')} />
        </div>
        <div className="pt-3">
          <CapabilityNotice capability={capability('cost_ledger')} />
        </div>
      </Section>

      <Section title="What would close this boundary">
        <RequiredInputList assertions={assertions} domain="financial" />
      </Section>
    </div>
  );
}

/* 11 - Evidence, audit and decisions */
export function EvidenceWorkspace() {
  const { rt } = useWorkspace();
  return (
    <div className="space-y-6">
      <Section
        title="Production evidence"
        description="Persisted run records visible to this account. This section never renders fixture data."
      >
        <CanonicalEvidencePanel />
      </Section>

      <Section
        title="Demonstration workspace (labelled fixture)"
        description="Everything below is a seeded Evidence Beta demonstration fixture, not production evidence. It cannot be approved as an authoritative decision."
      >
        <p className="text-xs text-muted-foreground" data-testid="evidence-fixture-label">
          {FIXTURE_DEMONSTRATION_NOTICE}
        </p>
      </Section>

      <Section title="Evidence quality" description="Accepted against quarantined observations for this window. A quarantined record never contributes to a decision.">
        <EvidenceQualityBar accepted={rt.snapshot.accepted.length} rejected={rt.snapshot.rejected.length} />
      </Section>

      <Section title="Open exceptions" description="The constraint exceptions a decision would be taken against.">
        <ExceptionList />
      </Section>

      <Section title="Decisions" description="Recommendations are advisory. Every decision is recorded; nothing is dispatched.">
        <RecommendationList />
      </Section>

      <Section title="Decision log" description="Append-only audit of approvals, rejections and escalations with evidence snapshots.">
        <DecisionLog />
      </Section>

      <Section title="Quarantined observations" description="A rejected record never contributes to a KPI.">
        {rt.snapshot.rejected.length === 0 ? (
          <p className="text-sm text-muted-foreground">No observation was quarantined in this window.</p>
        ) : (
          <Table data-testid="dsx-quarantine">
            <TableHeader>
              <TableRow>
                <TableHead>Reason</TableHead>
                <TableHead>Source asset</TableHead>
                <TableHead>Observed at</TableHead>
                <TableHead>Detail</TableHead>
                <TableHead>Payload hash</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rt.snapshot.rejected.map((r, i) => (
                <TableRow key={`${r.payload_hash}-${i}`}>
                  <TableCell className="font-mono text-xs">{r.reason}</TableCell>
                  <TableCell className="font-mono text-xs">{r.source_asset_id}</TableCell>
                  <TableCell className="font-mono text-xs">{r.observed_at ?? 'none'}</TableCell>
                  <TableCell className="text-xs">{r.detail}</TableCell>
                  <TableCell className="font-mono text-[11px]">{r.payload_hash.slice(0, 16)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Section>

      <Section title="Source and run identity">
        <Card>
          <CardContent className="space-y-1 p-4 text-xs">
            <p>Source: {rt.source.description}</p>
            <p>Run id: <span className="font-mono">{rt.snapshot.run_id ?? 'not applicable'}</span></p>
            <p>Fixture version {EVIDENCE_BETA_VERSION}, seed {EVIDENCE_BETA_SEED}.</p>
            <p>Accepted observations this window: {rt.snapshot.accepted.length}</p>
            <div className="flex flex-wrap gap-2 pt-2">
              <ConnectionState state={rt.snapshot.connection_state} label="Source" />
              <ConnectionState state="unavailable" label="DSX Exchange" />
            </div>
            <p className="pt-2 text-muted-foreground">{LIVE_DISABLED_REASON}</p>
          </CardContent>
        </Card>
      </Section>

      <Section title="Planned scenarios" description="Listed so that absence is explicit. A planned scenario produces no results.">
        <PlannedScenarioNotice />
      </Section>

      <p className="text-xs text-muted-foreground">
        Full traceability for any displayed value is available from its metric tile. See also the{' '}
        <Link className="underline underline-offset-4" to="/dsx/evidence-beta">facility overview</Link>.
      </p>
    </div>
  );
}
/* 12 - Simulations: seeded scenarios and the decisions they produce */
export function SimulationsWorkspace() {
  const { rt } = useWorkspace();
  return (
    <div className="space-y-6">
      <Section
        title="Scenario control"
        description="Every scenario is a seeded, deterministic replay of the Evidence Beta fixture. No scenario writes to any physical system."
      >
        <ScenarioControls />
      </Section>

      <Section title="Scenario result" description="The constraint stack below is the outcome of the current step, not a forecast.">
        <ConstraintStack />
      </Section>

      <Section title="Recommendations from this run" description="Advisory only. Each one requires a recorded human decision.">
        <RecommendationList />
      </Section>

      <Section title="Decisions recorded in this run">
        <DecisionLog />
      </Section>

      <Section title="Run identity">
        <Card>
          <CardContent className="space-y-1 p-4 text-xs">
            <p>Scenario: {rt.timeline.replace(/_/g, ' ')}</p>
            <p>Observation step: {rt.tick} of {rt.maxTick}</p>
            <p>Fixture version {EVIDENCE_BETA_VERSION}, seed {EVIDENCE_BETA_SEED}.</p>
            <p>Source: {rt.source.description}</p>
          </CardContent>
        </Card>
      </Section>

      <Section title="Planned scenarios" description="Listed so that absence is explicit. A planned scenario produces no results.">
        <PlannedScenarioNotice />
      </Section>
    </div>
  );
}
