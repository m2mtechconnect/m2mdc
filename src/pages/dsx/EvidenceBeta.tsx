/**
 * AURA DC — DSX-Compatible Evidence Beta workspace.
 *
 * Seven workspaces over one deterministic, contract-validated source.
 * No live connectivity, no closed-loop control, no fabricated values.
 */
import { useMemo, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Textarea } from '@/components/ui/textarea';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Play, Pause, RotateCcw, ShieldAlert } from 'lucide-react';
import { DsxModeBanner } from '@/components/dsx/DsxModeBanner';
import { DsxMetricTile } from '@/components/dsx/DsxMetricTile';
import { useEvidenceBeta } from '@/dsx/runtime/useEvidenceBeta';
import { freshnessFor } from '@/dsx/modes';
import { TIMELINE_IDS } from '@/dsx/fixtures/timelines';
import { DESIGN_INLET_LIMIT_C } from '@/dsx/metrics/computeKpis';
import { PHYSICAL_CONTROL_ENABLED } from '@/dsx/contracts/recommendation';
import { LIVE_DISABLED_REASON } from '@/dsx/adapters/liveDisabledAdapter';
import { EVIDENCE_BETA_VERSION, EVIDENCE_BETA_SEED } from '@/dsx/fixtures/evidenceBetaFacility';

const OVERVIEW_KPIS = ['pue', 'facility_load', 'it_load', 'cooling_load', 'max_rack_inlet', 'thermal_headroom'];
const SUSTAINABILITY_KPIS = ['wue', 'cue', 'power_capacity_utilisation'];
const QUALITY_KPIS = ['data_quality', 'mapping_coverage', 'telemetry_freshness'];

export default function EvidenceBeta() {
  const rt = useEvidenceBeta();
  const [rationale, setRationale] = useState<Record<string, string>>({});
  const freshness = freshnessFor(rt.snapshot.last_observed_at, Date.parse(rt.nowIso));

  const decisionByRec = useMemo(
    () => Object.fromEntries(rt.decisions.map((d) => [d.recommendation_id, d])),
    [rt.decisions],
  );

  return (
    <div className="space-y-6 p-6">
      <Helmet>
        <title>DSX Evidence Beta | AURA Data Centre Twin</title>
        <meta
          name="description"
          content="Deterministic, contract-validated DSX-compatible evidence workspace for the AURA data centre digital twin."
        />
      </Helmet>

      <header className="space-y-2">
        <h1 className="text-2xl font-bold">DSX-Compatible Evidence Beta</h1>
        <p className="max-w-3xl text-sm text-muted-foreground">
          A deterministic operational evidence surface built on the AURA DSX contracts. All readings
          are simulated or replayed, uncalibrated, and advisory only. AURA issues no control commands.
        </p>
        <DsxModeBanner
          mode={rt.snapshot.data_mode}
          freshness={freshness}
          lastObservedAt={rt.snapshot.last_observed_at}
          runId={rt.snapshot.run_id}
        />
      </header>

      <Card>
        <CardContent className="flex flex-wrap items-end gap-4 p-4">
          <div className="space-y-1">
            <Label htmlFor="dsx-timeline">Scenario</Label>
            <div className="flex gap-2" id="dsx-timeline">
              {TIMELINE_IDS.map((t) => (
                <Button
                  key={t}
                  size="sm"
                  variant={rt.timeline === t ? 'default' : 'outline'}
                  onClick={() => rt.setTimeline(t)}
                >
                  {t.replace('_', ' ')}
                </Button>
              ))}
            </div>
          </div>
          <div className="min-w-[220px] flex-1 space-y-1">
            <Label htmlFor="dsx-tick">Tick {rt.tick} of {rt.maxTick}</Label>
            <Slider
              id="dsx-tick"
              min={0}
              max={rt.maxTick}
              step={1}
              value={[rt.tick]}
              onValueChange={([v]) => rt.setTick(v)}
            />
          </div>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={() => rt.setPlaying(!rt.playing)}>
              {rt.playing ? <Pause className="mr-1 h-4 w-4" /> : <Play className="mr-1 h-4 w-4" />}
              {rt.playing ? 'Pause' : 'Run'}
            </Button>
            <Button size="sm" variant="outline" onClick={rt.reset}>
              <RotateCcw className="mr-1 h-4 w-4" /> Reset
            </Button>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="overview">
        <TabsList className="flex-wrap">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="thermal">Thermal</TabsTrigger>
          <TabsTrigger value="assets">Assets and mapping</TabsTrigger>
          <TabsTrigger value="scenario">Scenario</TabsTrigger>
          <TabsTrigger value="decisions">Recommendations</TabsTrigger>
          <TabsTrigger value="audit">Data quality and audit</TabsTrigger>
          <TabsTrigger value="limitations">Connectivity and limitations</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4 pt-4">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {OVERVIEW_KPIS.map((k) => (
              <DsxMetricTile key={k} id={k} metric={rt.bundle.metrics[k]} />
            ))}
          </div>
          <h2 className="pt-2 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            Sustainability and capacity
          </h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {SUSTAINABILITY_KPIS.map((k) => (
              <DsxMetricTile key={k} id={k} metric={rt.bundle.metrics[k]} />
            ))}
          </div>
        </TabsContent>

        <TabsContent value="thermal" className="pt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Rack inlet readings</CardTitle>
              <CardDescription>
                Design inlet limit {DESIGN_INLET_LIMIT_C} degC. Racks with no observation in the current
                window show Unavailable rather than a substituted value.
              </CardDescription>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Rack</TableHead>
                    <TableHead>USD prim path</TableHead>
                    <TableHead className="text-right">Inlet (degC)</TableHead>
                    <TableHead className="text-right">IT power (kW)</TableHead>
                    <TableHead>Last observed</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rt.bundle.racks.map((r) => (
                    <TableRow key={r.aura_asset_id} data-testid={`dsx-rack-${r.source_asset_id}`}>
                      <TableCell className="font-medium">{r.name}</TableCell>
                      <TableCell className="font-mono text-xs">{r.usd_prim_path}</TableCell>
                      <TableCell className="text-right font-mono">
                        {r.inlet_c === null
                          ? <span className="italic text-muted-foreground">Unavailable</span>
                          : r.inlet_c.toFixed(2)}
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        {r.it_power_kw === null
                          ? <span className="italic text-muted-foreground">Unavailable</span>
                          : r.it_power_kw.toFixed(2)}
                      </TableCell>
                      <TableCell className="font-mono text-xs">{r.observed_at ?? 'none'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="assets" className="pt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Asset registry and mapping governance</CardTitle>
              <CardDescription>
                Fixture version {EVIDENCE_BETA_VERSION}, seed {EVIDENCE_BETA_SEED}. Unapproved mappings
                are quarantined at ingestion rather than silently accepted.
              </CardDescription>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Source asset</TableHead>
                    <TableHead>Class</TableHead>
                    <TableHead>USD prim path</TableHead>
                    <TableHead>Mapping approval</TableHead>
                    <TableHead>Evidence</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rt.snapshot.mappings.map((m) => (
                    <TableRow key={m.mapping_id}>
                      <TableCell className="font-mono text-xs">{m.source_asset_id}</TableCell>
                      <TableCell>{m.asset_class}</TableCell>
                      <TableCell className="font-mono text-xs">{m.usd_prim_path}</TableCell>
                      <TableCell>
                        <Badge variant={m.approval_status === 'approved' ? 'secondary' : 'outline'}>
                          {m.approval_status}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-mono text-xs">{m.evidence_ref}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="scenario" className="space-y-4 pt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Cooling degradation scenario</CardTitle>
              <CardDescription>
                Phase: {rt.scenario.phase.replace('_', ' ')}. Thermal headroom{' '}
                {rt.scenario.headroom_c === null ? 'Unavailable' : `${rt.scenario.headroom_c.toFixed(2)} degC`}.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {['cooling_load', 'max_rack_inlet', 'thermal_headroom'].map((k) => (
                <DsxMetricTile key={k} id={`scenario-${k}`} metric={rt.bundle.metrics[k]} />
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="decisions" className="space-y-4 pt-4">
          <div className="flex items-center gap-2 rounded-md border border-border bg-muted/60 px-4 py-2 text-xs">
            <ShieldAlert className="h-4 w-4" aria-hidden />
            Physical control dispatch is {PHYSICAL_CONTROL_ENABLED ? 'enabled' : 'disabled'}. Every action
            below is executed manually by a human operator outside AURA.
          </div>
          {rt.scenario.recommendations.length === 0 && (
            <p className="text-sm text-muted-foreground">
              No recommendation is open at this tick.
            </p>
          )}
          {rt.scenario.recommendations.map((rec) => {
            const decision = decisionByRec[rec.recommendation_id];
            return (
              <Card key={rec.recommendation_id} data-testid="dsx-recommendation">
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">{rec.severity}</Badge>
                    <CardTitle className="text-base">{rec.text}</CardTitle>
                  </div>
                  <CardDescription>{rec.expected_effect}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                  <p><span className="font-medium">Proposed action: </span>{rec.proposed_action}</p>
                  <p className="text-xs text-muted-foreground">
                    Evidence: {rec.evidence.event_ids.length} event(s); metrics{' '}
                    {rec.evidence.metric_names.join(', ')}; run {rec.evidence.simulation_run_id ?? 'n/a'}.
                  </p>
                  <ul className="list-disc pl-5 text-xs text-muted-foreground">
                    {rec.limitations.map((l) => <li key={l}>{l}</li>)}
                  </ul>
                  {decision ? (
                    <p className="text-xs" data-testid="dsx-decision-record">
                      Decision {decision.outcome} by {decision.approver} at {decision.decided_at}; execution{' '}
                      {decision.execution_status.replace(/_/g, ' ')}. Rationale: {decision.rationale}
                    </p>
                  ) : (
                    <div className="space-y-2">
                      <Label htmlFor={`rationale-${rec.recommendation_id}`}>Decision rationale (required)</Label>
                      <Textarea
                        id={`rationale-${rec.recommendation_id}`}
                        value={rationale[rec.recommendation_id] ?? ''}
                        onChange={(e) =>
                          setRationale((p) => ({ ...p, [rec.recommendation_id]: e.target.value }))
                        }
                      />
                      <div className="flex gap-2">
                        {(['approved', 'rejected', 'escalated'] as const).map((outcome) => (
                          <Button
                            key={outcome}
                            size="sm"
                            variant={outcome === 'approved' ? 'default' : 'outline'}
                            disabled={!(rationale[rec.recommendation_id] ?? '').trim()}
                            onClick={() =>
                              rt.recordDecision(
                                rec.recommendation_id,
                                outcome,
                                rationale[rec.recommendation_id],
                                'current operator',
                              )
                            }
                          >
                            {outcome}
                          </Button>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </TabsContent>

        <TabsContent value="audit" className="space-y-4 pt-4">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {QUALITY_KPIS.map((k) => (
              <DsxMetricTile key={k} id={k} metric={rt.bundle.metrics[k]} />
            ))}
          </div>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Quarantined observations</CardTitle>
              <CardDescription>
                Rejected records are preserved with a reason and payload hash. They are never coerced
                into a value.
              </CardDescription>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              <Table>
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
                  {rt.snapshot.rejected.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={5} className="text-sm text-muted-foreground">
                        No observation has been quarantined in this window.
                      </TableCell>
                    </TableRow>
                  )}
                  {rt.snapshot.rejected.map((r) => (
                    <TableRow key={`${r.payload_hash}-${r.reason}`} data-testid="dsx-quarantine-row">
                      <TableCell><Badge variant="outline">{r.reason}</Badge></TableCell>
                      <TableCell className="font-mono text-xs">{r.source_asset_id}</TableCell>
                      <TableCell className="font-mono text-xs">{r.observed_at ?? 'unknown'}</TableCell>
                      <TableCell className="text-xs">{r.detail}</TableCell>
                      <TableCell className="font-mono text-xs">{r.payload_hash}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="limitations" className="space-y-4 pt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Connectivity</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <p data-testid="dsx-live-disabled">{LIVE_DISABLED_REASON}</p>
              <p className="text-muted-foreground">Active source: {rt.source.description}</p>
              <p className="text-muted-foreground">Connection state: {rt.snapshot.connection_state}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Stated limitations</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
                <li>All values are simulated or replayed; none are measurements of a physical facility.</li>
                <li>Thermal and power models are uncalibrated and unvalidated against field data.</li>
                <li>No NVIDIA certification, validation or production readiness is claimed.</li>
                <li>AURA performs no closed-loop control of cooling, power or workloads.</li>
                <li>Recommendations are advisory and require a recorded human decision.</li>
              </ul>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}