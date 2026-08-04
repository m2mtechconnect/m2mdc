/**
 * The eleven DSX-aligned operator workspaces.
 *
 * Every workspace answers one operational question, renders only calculated
 * values through <MetricTile>, and states plainly when a capability cannot
 * be assessed. No workspace fabricates a value or a health claim.
 */
import { Link } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { MetricTile, MetricGrid } from '@/components/dsx/MetricTile';
import { ConstraintStack } from '@/components/dsx/ConstraintStack';
import { ScenarioControls, RecommendationList, PlannedScenarioNotice } from '@/components/dsx/ScenarioPanel';
import { CapabilityNotice, UnavailableState, ConnectionState } from '@/components/dsx/StateBadges';
import { useWorkspace } from '@/dsx/runtime/EvidenceBetaContext';
import { capability } from '@/dsx/workspaces/availability';
import {
  ALL_RACK_IDENTITIES, OPENUSD_UNAVAILABLE, buildHierarchy, coolingChain, coolingTrace,
  dependentRacks, electricalChain, electricalTrace, identityBySourceId, type HierarchyNode,
} from '@/dsx/workspaces/facilityGraph';
import { DESIGN_INLET_LIMIT_C } from '@/dsx/metrics/computeKpis';
import { EVIDENCE_BETA_SEED, EVIDENCE_BETA_VERSION } from '@/dsx/fixtures/evidenceBetaFacility';
import { LIVE_DISABLED_REASON } from '@/dsx/adapters/liveDisabledAdapter';

function Section({ title, description, children }: { title: string; description?: string; children: React.ReactNode }) {
  return (
    <section className="space-y-3">
      <div>
        <h2 className="text-base font-semibold">{title}</h2>
        {description && <p className="max-w-3xl text-xs text-muted-foreground">{description}</p>}
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
    >
      {name}
    </Button>
  );
}

/* 1 — Facility overview: what is the state of the facility right now? */
export function OverviewWorkspace() {
  const { rt } = useWorkspace();
  return (
    <div className="space-y-6">
      <Section
        title="Facility overview"
        description="What is the operational state of the facility at this observation step, and which constraint binds first?"
      >
        <MetricGrid
          ids={['pue', 'facility_load', 'it_load', 'cooling_load', 'max_rack_inlet', 'thermal_headroom', 'power_capacity_utilisation', 'data_quality']}
          metrics={rt.bundle.metrics}
        />
      </Section>
      <ConstraintStack />
      <Section title="Scenario" description="Baseline is step 0 of the same seeded fixture.">
        <ScenarioControls />
      </Section>
    </div>
  );
}

/* 2 — Thermal */
export function ThermalWorkspace() {
  const { rt, selectAsset } = useWorkspace();
  const ranked = [...rt.bundle.racks].sort((a, b) => (b.inlet_c ?? -Infinity) - (a.inlet_c ?? -Infinity));
  return (
    <div className="space-y-6">
      <Section
        title="Thermal"
        description={`Which racks are closest to the ${DESIGN_INLET_LIMIT_C} degC design inlet limit, and what supplies their cooling?`}
      >
        <MetricGrid ids={['max_rack_inlet', 'thermal_headroom', 'cooling_load']} metrics={rt.bundle.metrics} columns="sm:grid-cols-3" />
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

/* 3 — Power */
export function PowerWorkspace() {
  const { rt } = useWorkspace();
  return (
    <div className="space-y-6">
      <Section title="Power" description="How much of the site's rated capacity is committed, and what depends on each supply device?">
        <MetricGrid ids={['facility_load', 'it_load', 'power_capacity_utilisation']} metrics={rt.bundle.metrics} columns="sm:grid-cols-3" />
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

/* 4 — Cooling */
export function CoolingWorkspace() {
  const { rt } = useWorkspace();
  return (
    <div className="space-y-6">
      <Section title="Cooling" description="How much electrical energy is cooling consuming, and which racks does each loop serve?">
        <MetricGrid ids={['cooling_load', 'pue', 'thermal_headroom']} metrics={rt.bundle.metrics} columns="sm:grid-cols-3" />
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

/* 5 — Network fabric */
export function NetworkWorkspace() {
  return (
    <div className="space-y-6">
      <Section title="Compute fabric" description="Which fabric links constrain workload placement?">
        <CapabilityNotice capability={capability('compute_fabric')} />
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

/* 6 — Facility registry and topology */
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
      <Section title="Facility registry" description="Every asset carries a stable AURA identity. Display names are never identity.">
        <MetricGrid ids={['mapping_coverage', 'data_quality', 'telemetry_freshness']} metrics={rt.bundle.metrics} columns="sm:grid-cols-3" />
      </Section>

      <Section title="Asset hierarchy">
        <Card><CardContent className="p-4"><HierarchyList nodes={buildHierarchy()} /></CardContent></Card>
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
                {a.name} — mapping {a.mapping_approval}; {OPENUSD_UNAVAILABLE}.
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

/* 7 — Workload */
export function WorkloadWorkspace() {
  return (
    <div className="space-y-6">
      <Section title="Workload exposure" description="Which workloads are exposed by the current facility constraint?">
        <CapabilityNotice capability={capability('workload_scheduler')} />
        <CapabilityNotice capability={capability('gpu_inventory')} />
      </Section>
      <p className="text-sm text-muted-foreground">
        Facility constraints cannot be attributed to workloads until a scheduler source is connected.
        AURA will not infer workload impact from rack power alone.
      </p>
    </div>
  );
}

/* 8 — Sovereignty */
export function SovereigntyWorkspace() {
  return (
    <div className="space-y-6">
      <Section title="Sovereignty" description="Where does this workload run, and can that be evidenced?">
        <CapabilityNotice capability={capability('residency_evidence')} />
      </Section>
      <p className="text-sm text-muted-foreground" data-testid="dsx-sovereignty-claim">
        Sovereignty status is unverified. No residency, jurisdiction or attestation claim is made by this build.
      </p>
    </div>
  );
}

/* 9 — Carbon */
export function CarbonWorkspace() {
  const { rt } = useWorkspace();
  return (
    <div className="space-y-6">
      <Section title="Carbon and water" description="What are the emissions and water consequences of the current operating state?">
        <MetricGrid ids={['wue', 'cue']} metrics={rt.bundle.metrics} columns="sm:grid-cols-2" />
        <CapabilityNotice capability={capability('grid_carbon_intensity')} />
        <CapabilityNotice capability={capability('water_metering')} />
      </Section>
    </div>
  );
}

/* 10 — Financial */
export function FinancialWorkspace() {
  return (
    <div className="space-y-6">
      <Section title="Financial exposure" description="What does the current operating state cost, and what is at risk?">
        <CapabilityNotice capability={capability('cost_ledger')} />
      </Section>
      <p className="text-sm text-muted-foreground">
        No cost, tariff or penalty figure is displayed. Energy price and contract terms are not connected,
        so any financial number would be invented.
      </p>
    </div>
  );
}

/* 11 — Evidence, audit and decisions */
export function EvidenceWorkspace() {
  const { rt } = useWorkspace();
  return (
    <div className="space-y-6">
      <Section title="Decisions" description="Recommendations are advisory. Every decision is recorded; nothing is dispatched.">
        <RecommendationList />
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