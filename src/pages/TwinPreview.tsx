/**
 * Omniverse Scene Page
 * AURA Twin Preview. Application-rendered preview of the AURA data centre
 * model. No NVIDIA Omniverse runtime, OpenUSD stage or live scene is used.
 * Shows WebRTC stream viewport, live Kit metrics, simulation controls,
 * camera presets, and rack health panel — all powered by the Kit REST API.
 */

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Thermometer, Zap, Cpu, Leaf, Activity, Server,
  Camera, Play, Pause, RotateCcw, Eye, Bot, Route,
  Lightbulb, AlertTriangle, Gauge, HardDrive
} from 'lucide-react';
import { OmniverseStreamViewer } from '@/components/twin-visualization/OmniverseStreamViewer';
import { useOmniverseKit } from '@/hooks/useOmniverseKit';
import { ProvenanceBadge } from '@/components/provenance/ProvenanceBadge';
import { resolveRendererMode } from '@/renderer/rendererModes';
import { kitMetric, targetMetric, notAssessedMetric, type KitMetricContext } from '@/lib/provenance/kitMetrics';
import type { ProvenancedMetric } from '@/lib/provenance/types';
import {
  setCameraPreset,
  triggerScenario,
  resetSimulation,
  pauseSimulation,
  resumeSimulation,
  startDroneTour,
  stopDroneTour,
  toggleBotPov,
  setLightPreset,
  sendBotToRack,
  focusRack,
} from '@/integrations/omniverseKit/client';

// Phase display labels
const PHASE_LABELS: Record<string, { label: string; color: string }> = {
  steady: { label: 'Steady', color: 'bg-green-500/10 text-green-500 border-green-500/30' },
  anomaly: { label: 'Anomaly', color: 'bg-red-500/10 text-red-500 border-red-500/30' },
  cascade: { label: 'Cascade', color: 'bg-orange-500/10 text-orange-500 border-orange-500/30' },
  dispatch: { label: 'Dispatch', color: 'bg-blue-500/10 text-blue-500 border-blue-500/30' },
  resolution: { label: 'Resolution', color: 'bg-cyan-500/10 text-cyan-500 border-cyan-500/30' },
  cooldown: { label: 'Cooldown', color: 'bg-purple-500/10 text-purple-500 border-purple-500/30' },
};

const CAMERA_PRESETS = [
  { id: 'overview', label: 'Overview', icon: Eye },
  { id: 'east', label: 'East' },
  { id: 'west', label: 'West' },
  { id: 'north', label: 'North' },
  { id: 'south', label: 'South' },
  { id: 'top_down', label: 'Top Down' },
  { id: 'cinematic', label: 'Cinematic' },
  { id: 'closeup', label: 'Closeup' },
  { id: 'aisle_east', label: 'Aisle East' },
  { id: 'aisle_west', label: 'Aisle West' },
];

const SCENARIOS = [
  { id: 'thermal', label: 'Thermal Anomaly', icon: Thermometer, color: 'text-red-400' },
  { id: 'power_failure', label: 'Power Failure', icon: Zap, color: 'text-amber-400' },
  { id: 'cdu_failure', label: 'CDU Failure', icon: Gauge, color: 'text-orange-400' },
];

const LIGHT_PRESETS = ['normal', 'emergency', 'night', 'maintenance', 'blackout'];

/**
 * MetricCard — Phase 1A.1 item 4: renders a ProvenancedMetric alongside a
 * ProvenanceBadge. When the metric is `unavailable`, we show "N/A" instead
 * of a fabricated number, and the badge explains why.
 *
 * Accessible-name contract:
 *   - The badge's `aria-label` includes "Provenance: <label>. Source: …" so
 *     screen readers announce provenance per KPI.
 *   - A stable `data-testid="metric-<slug>"` wraps each card so tests can
 *     assert value+badge pairing.
 */
function MetricCard({
  label,
  metric,
  formatter,
  unit,
  icon: Icon,
  status = 'normal',
  testId,
}: {
  label: string;
  metric: ProvenancedMetric<number>;
  formatter: (v: number) => string;
  unit?: string;
  icon: React.ElementType;
  status?: 'normal' | 'warning' | 'critical';
  testId: string;
}) {
  const statusColor = status === 'critical' ? 'text-red-400' : status === 'warning' ? 'text-amber-400' : 'text-emerald-400';
  const display = metric.value === null ? 'N/A' : formatter(metric.value);
  return (
    <div
      className="flex items-center gap-3 p-3 rounded-lg bg-card border"
      data-testid={`metric-${testId}`}
      data-provenance={metric.provenance}
    >
      <div className={`p-2 rounded-lg bg-accent/10 ${statusColor}`}>
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <p className="text-xs text-muted-foreground truncate" id={`metric-label-${testId}`}>{label}</p>
          <ProvenanceBadge
            compact
            className="shrink-0"
            meta={{
              provenance: metric.provenance,
              source: metric.sourceName ?? 'unknown',
              at: metric.sourceTimestamp ? new Date(metric.sourceTimestamp) : undefined,
              stale: metric.isStale,
              note: metric.description ?? metric.derivation,
            }}
          />
        </div>
        <p
          aria-labelledby={`metric-label-${testId}`}
          className={`text-lg font-bold font-mono ${metric.value === null ? 'text-muted-foreground' : statusColor}`}
        >
          {display}{unit && metric.value !== null && <span className="text-xs text-muted-foreground ml-1">{unit}</span>}
        </p>
      </div>
    </div>
  );
}

export default function TwinPreview() {
  const kit = useOmniverseKit();
  // Phase 5 — single source of truth for what is actually drawing this view.
  const rendererState = resolveRendererMode({ webgl2Available: true });
  const [activeTab, setActiveTab] = useState('metrics');

  const phase = kit.phase ? PHASE_LABELS[kit.phase] || { label: kit.phase, color: '' } : null;

  // Every KPI card below reads from this single provenance context so the
  // badge cannot drift from the true Kit connection state.
  const ctx: KitMetricContext = {
    connectionState: kit.connectionState,
    provenance: kit.provenance,
    observedAt: new Date(),
  };
  const pueMetric        = kitMetric(kit.raw?.pue, ctx, { description: 'Power Usage Effectiveness' });
  const gpuUtilMetric    = kitMetric(kit.raw?.gpu_utilization_pct, ctx, { description: 'GPU utilization %' });
  const avgTempMetric    = kitMetric(kit.raw ? kit.avgTemp : undefined, ctx, { description: 'Mean rack outlet temp' });
  const totalPowerMetric = kitMetric(kit.raw?.total_power_kw, ctx, { description: 'Total facility power (kW)' });
  const coolingEffMetric = kitMetric(kit.raw?.cooling_efficiency, ctx, { description: 'Cooling efficiency index' });
  const tokensPerWatt    = kitMetric(kit.raw?.tokens_per_watt, ctx, { description: 'Workload efficiency' });
  const pueTarget        = targetMetric(1.30, 'kpi-config', 'PUE target (lower is better)');
  const sovereignty      = notAssessedMetric<string>('sovereignty-engine', 'Sovereignty assessment not wired in this build');

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto py-4 px-4 space-y-4">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <Server className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">AURA Twin Preview</h1>
              <p className="text-sm text-muted-foreground font-mono">
                {rendererState.mode.label} • {kit.rackCount} racks • Simulated scene
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {/* Phase 5 — renderer identity comes from the renderer mode
                registry, so this surface cannot describe itself as an
                Omniverse session while AURA draws the pixels. */}
            <Badge
              variant="outline"
              className="bg-slate-500/10 text-muted-foreground"
              title={rendererState.reason}
            >
              Renderer: {rendererState.mode.label}
            </Badge>
            {/* Phase 1A.1 — the badge reflects the validated REST connection
                state, not just fetch success. `connected` requires a schema-
                valid payload; `unavailable` covers both unreachable and
                schema-mismatched responses. */}
            {kit.connectionState === 'connected' && (
              <Badge variant="outline" className="bg-green-500/10 text-green-500 border-green-500/30">
                <span className="relative flex h-2 w-2 mr-2">
                  <span className="animate-ping absolute h-full w-full rounded-full bg-green-400 opacity-75" />
                  <span className="relative h-2 w-2 rounded-full bg-green-500" />
                </span>
                Kit connected · validated
              </Badge>
            )}
            {kit.connectionState === 'connecting' && (
              <Badge variant="outline" className="bg-amber-500/10 text-amber-500">Connecting…</Badge>
            )}
            {kit.connectionState === 'disabled' && (
              <Badge variant="outline" className="bg-slate-500/10 text-slate-500">Kit disabled</Badge>
            )}
            {kit.connectionState === 'unavailable' && kit.validationIssues.length > 0 && (
              <Badge variant="outline" className="bg-rose-500/10 text-rose-500" title={`${kit.validationIssues.length} schema issue(s)`}>
                Kit response invalid
              </Badge>
            )}
            {kit.connectionState === 'unavailable' && kit.validationIssues.length === 0 && (
              <Badge variant="outline" className="bg-rose-500/10 text-rose-500">Kit unavailable</Badge>
            )}
            {kit.connectionState === 'demo' && (
              <Badge variant="outline" className="bg-amber-500/10 text-amber-600">Local demonstration</Badge>
            )}
            {kit.connectionState === 'degraded' && (
              <Badge variant="outline" className="bg-orange-500/10 text-orange-500">Kit degraded</Badge>
            )}
            {phase && (
              <Badge variant="outline" className={phase.color}>{phase.label}</Badge>
            )}
            <Badge variant="outline" className="font-mono text-xs">
              {new Date().toLocaleTimeString()}
            </Badge>
          </div>
        </div>

        {/* Main Layout: Stream + Sidebar */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-4">

          {/* WebRTC Stream Viewport */}
          <div className="space-y-3">
            <OmniverseStreamViewer className="h-[550px]" />

            {/* Camera Presets Bar */}
            <Card>
              <CardContent className="p-2">
                <div className="flex items-center gap-1 flex-wrap">
                  <Camera className="h-4 w-4 text-muted-foreground mr-1" />
                  {CAMERA_PRESETS.map(preset => (
                    <Button
                      key={preset.id}
                      variant="ghost"
                      size="sm"
                      className="h-7 px-2 text-xs"
                      onClick={() => setCameraPreset(preset.id)}
                    >
                      {preset.label}
                    </Button>
                  ))}
                  <div className="h-4 w-px bg-border mx-1" />
                  <Button variant="ghost" size="sm" className="h-7 px-2 text-xs gap-1" onClick={() => startDroneTour()}>
                    <Route className="h-3 w-3" /> Drone Tour
                  </Button>
                  <Button variant="ghost" size="sm" className="h-7 px-2 text-xs gap-1" onClick={() => toggleBotPov()}>
                    <Bot className="h-3 w-3" /> Bot POV
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-4">
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid grid-cols-3 w-full">
                <TabsTrigger value="metrics" className="text-xs">Metrics</TabsTrigger>
                <TabsTrigger value="simulate" className="text-xs">Simulate</TabsTrigger>
                <TabsTrigger value="racks" className="text-xs">Racks</TabsTrigger>
              </TabsList>

              {/* Metrics Tab */}
              <TabsContent value="metrics" className="space-y-3 mt-3">
                <div className="grid grid-cols-2 gap-2">
                  <MetricCard testId="pue" label="PUE" metric={pueMetric} formatter={v => v.toFixed(2)} icon={Zap}
                    status={(pueMetric.value ?? 0) > 1.5 ? 'warning' : 'normal'} />
                  <MetricCard testId="gpu-util" label="GPU Utilization" metric={gpuUtilMetric} formatter={v => v.toFixed(0)} unit="%" icon={Cpu}
                    status={(gpuUtilMetric.value ?? 0) > 90 ? 'warning' : 'normal'} />
                  <MetricCard testId="avg-temp" label="Avg Temperature" metric={avgTempMetric} formatter={v => v.toFixed(1)} unit="°C" icon={Thermometer}
                    status={(avgTempMetric.value ?? 0) > 35 ? 'critical' : (avgTempMetric.value ?? 0) > 28 ? 'warning' : 'normal'} />
                  <MetricCard testId="total-power" label="Total Power" metric={totalPowerMetric} formatter={v => v.toFixed(0)} unit="kW" icon={Zap} />
                  <MetricCard testId="cooling-eff" label="Cooling Eff." metric={coolingEffMetric} formatter={v => (v * 100).toFixed(0)} unit="%" icon={Leaf} />
                  <MetricCard testId="tokens-per-watt" label="Tokens/Watt" metric={tokensPerWatt} formatter={v => v.toFixed(2)} icon={Cpu} />
                </div>
                {/* Targets & unassessed KPIs — distinct provenance surfaces. */}
                <div className="grid grid-cols-2 gap-2">
                  <MetricCard testId="pue-target" label="Target PUE" metric={pueTarget} formatter={v => `<${v.toFixed(2)}`} icon={Gauge} />
                  <div
                    className="flex items-center justify-between gap-3 p-3 rounded-lg bg-card border"
                    data-testid="metric-sovereignty"
                    data-provenance={sovereignty.provenance}
                  >
                    <div className="min-w-0">
                      <p className="text-xs text-muted-foreground truncate" id="metric-label-sovereignty">Sovereignty assessment</p>
                      <p aria-labelledby="metric-label-sovereignty" className="text-sm text-muted-foreground italic">Not assessed</p>
                    </div>
                    <ProvenanceBadge
                      compact
                      meta={{ provenance: 'unavailable', source: sovereignty.sourceName ?? 'unknown', note: sovereignty.description }}
                    />
                  </div>
                </div>

                {/* DDN Storage */}
                {kit.ddnRacks.length > 0 && (
                  <Card>
                    <CardHeader className="py-2 px-3">
                      <CardTitle className="text-xs flex items-center gap-2">
                        <HardDrive className="h-3 w-3" /> DDN Storage Telemetry
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="px-3 pb-3">
                      <div className="grid grid-cols-3 gap-2 text-center">
                        <div>
                          <p className="text-lg font-bold font-mono text-primary">{kit.storageTotalIopsK.toFixed(1)}</p>
                          <p className="text-[10px] text-muted-foreground">IOPS (K)</p>
                        </div>
                        <div>
                          <p className="text-lg font-bold font-mono text-primary">{kit.storageTotalThroughputGbps.toFixed(0)}</p>
                          <p className="text-[10px] text-muted-foreground">GB/s</p>
                        </div>
                        <div>
                          <p className="text-lg font-bold font-mono text-primary">{kit.storageAvgLatencyUs.toFixed(0)}</p>
                          <p className="text-[10px] text-muted-foreground">Latency (µs)</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Alerts */}
                {kit.alertCount > 0 && (
                  <Card className="border-destructive/30 bg-destructive/5">
                    <CardContent className="p-3">
                      <div className="flex items-center gap-2 text-destructive mb-2">
                        <AlertTriangle className="h-4 w-4" />
                        <span className="text-sm font-medium">{kit.alertCount} Active Alerts</span>
                      </div>
                      <div className="space-y-1">
                        {kit.criticalRacks.map(r => (
                          <div key={r.path} className="flex items-center justify-between text-xs">
                            <span className="text-destructive font-mono">{r.path.split('/').pop()}</span>
                            <span className="text-destructive font-bold">{r.temp}°C</span>
                          </div>
                        ))}
                        {kit.offlineRacks.map(r => (
                          <div key={r.path} className="flex items-center justify-between text-xs">
                            <span className="text-amber-400 font-mono">{r.path.split('/').pop()}</span>
                            <span className="text-amber-400">OFFLINE</span>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Lighting */}
                <Card>
                  <CardHeader className="py-2 px-3">
                    <CardTitle className="text-xs flex items-center gap-2">
                      <Lightbulb className="h-3 w-3" /> Lighting
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="px-3 pb-3">
                    <div className="flex gap-1 flex-wrap">
                      {LIGHT_PRESETS.map(preset => (
                        <Button key={preset} variant="outline" size="sm" className="h-6 px-2 text-[10px] capitalize"
                          onClick={() => setLightPreset(preset)}>
                          {preset}
                        </Button>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Simulate Tab */}
              <TabsContent value="simulate" className="space-y-3 mt-3">
                <Card>
                  <CardHeader className="py-2 px-3">
                    <CardTitle className="text-xs">Trigger Scenario</CardTitle>
                  </CardHeader>
                  <CardContent className="px-3 pb-3 space-y-2">
                    {SCENARIOS.map(s => (
                      <Button key={s.id} variant="outline" className="w-full justify-start gap-2 h-9"
                        onClick={() => triggerScenario(s.id as any)}>
                        <s.icon className={`h-4 w-4 ${s.color}`} />
                        <span className="text-sm">{s.label}</span>
                      </Button>
                    ))}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="py-2 px-3">
                    <CardTitle className="text-xs">Controls</CardTitle>
                  </CardHeader>
                  <CardContent className="px-3 pb-3">
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" className="flex-1 gap-1" onClick={() => pauseSimulation()}>
                        <Pause className="h-3 w-3" /> Pause
                      </Button>
                      <Button variant="outline" size="sm" className="flex-1 gap-1" onClick={() => resumeSimulation()}>
                        <Play className="h-3 w-3" /> Resume
                      </Button>
                      <Button variant="outline" size="sm" className="flex-1 gap-1" onClick={() => resetSimulation()}>
                        <RotateCcw className="h-3 w-3" /> Reset
                      </Button>
                    </div>
                    {phase && (
                      <div className="mt-3 text-center">
                        <p className="text-xs text-muted-foreground">Current Phase</p>
                        <Badge variant="outline" className={`mt-1 ${phase.color}`}>{phase.label}</Badge>
                        <p className="text-xs text-muted-foreground mt-1">Scenario: {kit.scenario}</p>
                      </div>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="py-2 px-3">
                    <CardTitle className="text-xs">Scene Controls</CardTitle>
                  </CardHeader>
                  <CardContent className="px-3 pb-3">
                    <div className="grid grid-cols-2 gap-1">
                      <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => startDroneTour()}>Start Tour</Button>
                      <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => stopDroneTour()}>Stop Tour</Button>
                      <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => toggleBotPov()}>Bot POV</Button>
                      <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => setCameraPreset('overview')}>Reset Camera</Button>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Racks Tab */}
              <TabsContent value="racks" className="space-y-2 mt-3">
                <div className="text-xs text-muted-foreground mb-2">
                  {kit.rackCount} racks • Click to focus camera
                </div>
                <div className="space-y-1 max-h-[500px] overflow-y-auto pr-1">
                  {kit.racks.map(rack => {
                    const name = rack.path.split('/').pop() || '';
                    const statusColor =
                      rack.status === 'critical' ? 'border-red-500/50 bg-red-500/5' :
                      rack.status === 'warning' ? 'border-amber-500/50 bg-amber-500/5' :
                      rack.status === 'offline' ? 'border-gray-500/50 bg-gray-500/5' :
                      'border-border';
                    return (
                      <button
                        key={rack.path}
                        className={`w-full flex items-center justify-between p-2 rounded-lg border text-left transition-colors hover:bg-accent/10 ${statusColor}`}
                        onClick={() => focusRack(name)}
                      >
                        <div className="flex items-center gap-2">
                          <div className={`h-2 w-2 rounded-full ${
                            rack.status === 'critical' ? 'bg-red-500' :
                            rack.status === 'warning' ? 'bg-amber-500' :
                            rack.status === 'offline' ? 'bg-gray-500' :
                            'bg-green-500'
                          }`} />
                          <span className="text-xs font-mono font-medium">{name}</span>
                          <Badge variant="outline" className="text-[9px] h-4 px-1">
                            {rack.type === 'ddn_a3i' ? 'DDN A3I' : rack.type === 'ddn_exascaler' ? 'DDN EXA' : 'Compute'}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className={`text-xs font-mono ${
                            rack.temp > 50 ? 'text-red-400' : rack.temp > 35 ? 'text-amber-400' : 'text-muted-foreground'
                          }`}>{rack.temp}°C</span>
                          {rack.iops !== undefined && (
                            <span className="text-[10px] text-muted-foreground">{rack.iops} IOPS</span>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>
    </div>
  );
}
