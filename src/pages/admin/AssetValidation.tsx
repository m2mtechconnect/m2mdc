/**
 * Administrator-operated hardware GPU acceptance harness.
 *
 * Route: /admin/asset-validation/:assetId
 *
 * Nothing runs automatically: no background telemetry, no auto-benchmark and
 * no persistence. The administrator starts the run, reviews the results
 * locally, and only then chooses to save them.
 */

import { useCallback, useMemo, useState } from 'react';
import { Navigate, useParams } from 'react-router-dom';
import { AlertTriangle, CheckCircle2, Download, Loader2, Play, Save, XCircle } from 'lucide-react';
import { useRBAC } from '@/contexts/RBACContext';
import { isAssetAdmin } from '@/auth/assetAdmin';
import { supabase } from '@/integrations/supabase/client';
import type { Json } from '@/integrations/supabase/types';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import { BENCHMARK_CONFIG, VALIDATION_ASSET_ID, buildAssetExpectation } from '@/validation/gpuAcceptance/spec';
import { probeRenderer, type RendererReport } from '@/validation/gpuAcceptance/renderer';
import { verifyDelivery, type DeliveryReport } from '@/validation/gpuAcceptance/delivery';
import {
  runPreflight,
  SOFTWARE_RENDERER_GUIDANCE,
  type PreflightReport,
} from '@/validation/gpuAcceptance/preflight';
import { evaluateAcceptance, type AcceptanceEvaluation } from '@/validation/gpuAcceptance/acceptance';
import {
  BenchmarkScene,
  type BenchmarkOutcome,
  type BenchmarkPhase,
} from '@/validation/gpuAcceptance/BenchmarkScene';
import {
  MEMORY_NOTE,
  downloadAcceptanceReport,
  downloadJson,
  type ScreenshotReference,
  type ValidationRunPayload,
} from '@/validation/gpuAcceptance/report';

const SCREENSHOT_CHECKLIST: ScreenshotReference[] = [
  { id: 'facility-overview', label: 'Facility overview with the simulated asset', captured: false },
  { id: 'front-view', label: 'Rack front', captured: false },
  { id: 'rear-cooler-door', label: 'Rear cooler-door view', captured: false },
  { id: 'clearance-left', label: 'Left clearance', captured: false },
  { id: 'clearance-right', label: 'Right clearance', captured: false },
  { id: 'riser-elevated', label: 'Elevated chilled-water-riser view', captured: false },
  { id: 'riser-luminaire-clearance', label: 'Riser-to-luminaire clearance', captured: false },
  { id: 'provenance-banner', label: 'Provenance and simulated-scenario banner', captured: false },
  { id: 'renderer-evidence', label: 'Hardware renderer evidence', captured: false },
  { id: 'performance-panel', label: 'Final results panel', captured: false },
  { id: 'lighting-beams', label: 'Overhead lighting visible, obstructing structural beams removed', captured: false },
];

const PHASE_LABEL: Record<BenchmarkPhase, string> = {
  idle: 'Not started',
  stabilising: 'Stabilising scene (5 s)',
  front: 'Front hold',
  rear: 'Rear cooler-door hold',
  elevated: 'Elevated riser hold',
  complete: 'Complete',
};

export default function AssetValidation() {
  const { role, roles, loading } = useRBAC();
  const { assetId: routeAssetId } = useParams();
  const assetId = routeAssetId ?? VALIDATION_ASSET_ID;
  const expected = useMemo(() => buildAssetExpectation(assetId), [assetId]);

  const [phase, setPhase] = useState<BenchmarkPhase>('idle');
  const [running, setRunning] = useState(false);
  const [renderer, setRenderer] = useState<RendererReport | null>(null);
  const [delivery, setDelivery] = useState<DeliveryReport | null>(null);
  const [outcome, setOutcome] = useState<BenchmarkOutcome | null>(null);
  const [acceptance, setAcceptance] = useState<AcceptanceEvaluation | null>(null);
  const [clearanceConfirmed, setClearanceConfirmed] = useState(false);
  const [screenshots, setScreenshots] = useState(SCREENSHOT_CHECKLIST);
  const [saving, setSaving] = useState(false);
  const [savedId, setSavedId] = useState<string | null>(null);
  const [preflight, setPreflight] = useState<PreflightReport | null>(null);
  const [preflighting, setPreflighting] = useState(false);

  const [pendingContext, setPendingContext] = useState<{
    rendererReport: RendererReport;
    deliveryReport: DeliveryReport;
  } | null>(null);

  const finalise = useCallback(
    (result: BenchmarkOutcome, rendererReport: RendererReport, deliveryReport: DeliveryReport) => {
      if (!expected) return;
      setOutcome(result);
      setAcceptance(
        evaluateAcceptance({
          expected,
          renderer: { ...rendererReport, canvasResolution: result.canvas
            ? { width: result.canvas.width, height: result.canvas.height }
            : rendererReport.canvasResolution },
          delivery: deliveryReport,
          frames: result.frames,
          counters: result.counters,
          timings: result.timings,
          stability: result.stability,
          integrity: { ...result.integrity, visualClearanceConfirmed: clearanceConfirmed },
        }),
      );
      setRunning(false);
    },
    [expected, clearanceConfirmed],
  );

  const start = useCallback(async () => {
    if (!expected || !preflight?.canStart) return;
    setSavedId(null);
    setOutcome(null);
    setAcceptance(null);
    const rendererReport = probeRenderer({
      qualityProfile: BENCHMARK_CONFIG.qualityProfile,
      devicePixelRatio: BENCHMARK_CONFIG.devicePixelRatioCap,
    });
    setRenderer(rendererReport);
    const deliveryReport = await verifyDelivery(expected);
    setDelivery(deliveryReport);
    setPhase('stabilising');
    setRunning(true);

    // Hand the two reports to the completion handler through a closure so the
    // evaluation always uses the values captured for this run.
    setPendingContext({ rendererReport, deliveryReport });
  }, [expected, preflight]);

  const checkPreflight = useCallback(async () => {
    if (!expected) return;
    setPreflighting(true);
    const report = await runPreflight({ expected, isAdmin: isAssetAdmin(role, roles) });
    setPreflight(report);
    setRenderer(report.renderer);
    setDelivery(report.delivery);
    setPreflighting(false);
  }, [expected, role, roles]);

  const payload: ValidationRunPayload | null = useMemo(() => {
    if (!expected || !renderer || !delivery || !outcome || !acceptance) return null;
    return {
      assetId: expected.assetId,
      assetChecksum: expected.checksum,
      scenarioId: BENCHMARK_CONFIG.scenarioId,
      manifestVersion: expected.manifestVersion,
      appVersion: import.meta.env.VITE_BUILD_VERSION ?? 'unknown',
      validatedAt: new Date().toISOString(),
      renderer,
      benchmarkConfig: BENCHMARK_CONFIG,
      delivery,
      performance: {
        frames: outcome.frames,
        counters: outcome.counters,
        timings: outcome.timings,
        stability: outcome.stability,
        integrity: { ...outcome.integrity, visualClearanceConfirmed: clearanceConfirmed },
        memoryNote: MEMORY_NOTE,
      },
      acceptance,
      screenshots,
      capabilityMap: expected.addressableParts,
    };
  }, [expected, renderer, delivery, outcome, acceptance, clearanceConfirmed, screenshots]);

  const save = useCallback(async () => {
    if (!payload) return;
    setSaving(true);
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) {
      setSaving(false);
      toast.error('No authenticated administrator session.');
      return;
    }
    const { data, error } = await supabase
      .from('asset_gpu_validation_runs')
      .insert([{
        asset_id: payload.assetId,
        asset_checksum: payload.assetChecksum,
        scenario_id: payload.scenarioId,
        manifest_version: payload.manifestVersion,
        app_version: payload.appVersion,
        validated_at: payload.validatedAt,
        validated_by: auth.user.id,
        renderer: payload.renderer as unknown as Json,
        benchmark_config: payload.benchmarkConfig as unknown as Json,
        delivery: payload.delivery as unknown as Json,
        performance: payload.performance as unknown as Json,
        acceptance_result: payload.acceptance.result,
        verdict: payload.acceptance.verdict,
        findings: payload.acceptance.findings as unknown as Json,
        screenshot_references: payload.screenshots as unknown as Json,
      }])
      .select('id')
      .single();
    setSaving(false);
    if (error) {
      toast.error(`Could not save validation: ${error.message}`);
      return;
    }
    setSavedId(data.id);
    toast.success('Validation run saved.');
  }, [payload]);

  if (loading) return <div className="p-6 text-sm text-muted-foreground">Loading...</div>;
  if (!isAssetAdmin(role, roles)) return <Navigate to="/dashboard" replace />;
  if (!expected) {
    return (
      <div className="p-6">
        <Card className="p-6 text-sm">
          No approved derivative is registered for <span className="font-mono">{assetId}</span>.
        </Card>
      </div>
    );
  }

  const verdict =
    acceptance?.verdict ?? 'AURA_NVIDIA_RACK_GPU_VALIDATION_AWAITING_ADMIN_RUN';

  return (
    <div className="space-y-6 p-6" data-testid="asset-gpu-validation">
      <header className="space-y-2">
        <h1 className="text-xl font-semibold">Hardware GPU acceptance - {expected.assetId}</h1>
        <p className="max-w-3xl text-sm text-muted-foreground">
          Administrator-operated validation of the approved operations derivative against the
          published delivery path. Nothing is measured or stored until you start the run, and
          nothing is persisted until you save it. Private USD source URLs are never exposed here.
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="secondary" data-testid="gpu-validation-verdict">{verdict}</Badge>
          <Badge variant="outline">Scenario {BENCHMARK_CONFIG.scenarioId}</Badge>
          <Badge variant="outline">Manifest v{expected.manifestVersion}</Badge>
        </div>
      </header>

      <section className="grid gap-4 lg:grid-cols-3">
        <Card className="p-4 lg:col-span-1">
          <h2 className="mb-3 text-sm font-semibold">Expected derivative</h2>
          <dl className="space-y-1 text-[12px]">
            <Row label="Checksum" value={expected.checksum} />
            <Row label="Triangles" value={expected.triangleCount.toLocaleString()} />
            <Row label="Asset draw calls" value={String(expected.assetDrawCalls)} />
            <Row
              label="Bounds (m)"
              value={`${expected.bounds.x} x ${expected.bounds.y} x ${expected.bounds.z}`}
            />
            <Row label="Floor contact" value={`minY = ${expected.minY}`} />
            <Row label="Front orientation" value={expected.frontAxis} />
            <Row label="Textures" value={String(expected.textureCount)} />
            <Row label="Converted materials" value={String(expected.convertedMaterialCount)} />
            <Row label="Published bytes" value={expected.derivativeBytes.toLocaleString()} />
          </dl>
        </Card>

        <Card className="p-4 lg:col-span-2">
          <h2 className="mb-3 text-sm font-semibold">Capability map (from validation evidence)</h2>
          <ul className="space-y-1 text-[12px]">
            {expected.addressableParts.map((part) => (
              <li key={part.id} className="flex gap-2">
                {part.addressable ? (
                  <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-500" />
                ) : (
                  <XCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                )}
                <span>
                  <span className="font-medium">{part.label}</span>{' '}
                  {part.addressable ? 'addressable' : 'not independently addressable'}
                  {part.reason ? ` - ${part.reason}` : ''}
                </span>
              </li>
            ))}
          </ul>
        </Card>
      </section>

      <section className="space-y-3">
        <div className="flex flex-wrap items-center gap-3">
          <Button onClick={start} disabled={running} data-testid="start-validation">
            {running ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Play className="mr-2 h-4 w-4" />}
            Start validation
          </Button>
          <span className="text-xs text-muted-foreground">Phase: {PHASE_LABEL[phase]}</span>
          <span className="text-xs text-muted-foreground">
            {BENCHMARK_CONFIG.viewport.width} x {BENCHMARK_CONFIG.viewport.height}, DPR cap{' '}
            {BENCHMARK_CONFIG.devicePixelRatioCap}, {BENCHMARK_CONFIG.qualityProfile} profile
          </span>
        </div>

        {renderer && (
          <Card className="p-4" data-testid="renderer-evidence">
            <h2 className="mb-2 text-sm font-semibold">Renderer</h2>
            {renderer.classification !== 'hardware' && (
              <p className="mb-2 flex items-start gap-2 text-[12px] text-amber-600">
                <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                {renderer.classification === 'software'
                  ? 'Software renderer detected'
                  : 'Renderer unavailable'}{' '}
                - {renderer.note}
              </p>
            )}
            <dl className="grid gap-1 text-[12px] sm:grid-cols-2">
              <Row label="WebGL" value={renderer.webglVersion} />
              <Row label="WebGL2" value={renderer.webgl2Available ? 'available' : 'unavailable'} />
              <Row label="GPU vendor" value={renderer.vendor ?? 'unavailable'} />
              <Row label="GPU renderer" value={renderer.renderer ?? 'unavailable'} />
              <Row label="Browser" value={renderer.browser} />
              <Row label="Operating system" value={renderer.operatingSystem} />
              <Row
                label="Canvas"
                value={
                  renderer.canvasResolution
                    ? `${renderer.canvasResolution.width} x ${renderer.canvasResolution.height}`
                    : 'pending'
                }
              />
              <Row label="Device pixel ratio" value={String(renderer.devicePixelRatio)} />
              <Row label="Quality profile" value={renderer.qualityProfile} />
            </dl>
          </Card>
        )}

        {delivery && (
          <Card className="p-4" data-testid="delivery-evidence">
            <h2 className="mb-2 text-sm font-semibold">Delivery (production-equivalent path)</h2>
            <dl className="grid gap-1 text-[12px] sm:grid-cols-2">
              <Row label="Host" value={delivery.host} />
              <Row label="HTTP status" value={String(delivery.status ?? 'n/a')} />
              <Row label="MIME type" value={delivery.mimeType ?? 'n/a'} />
              <Row label="Content-Length" value={String(delivery.contentLength ?? 'n/a')} />
              <Row label="Downloaded bytes" value={String(delivery.downloadedBytes ?? 'n/a')} />
              <Row label="SHA-256" value={delivery.sha256 ?? 'n/a'} />
              <Row label="CDN delivery path" value={delivery.viaCdnPath ? 'yes' : 'no'} />
              <Row
                label="Development-host copy"
                value={delivery.developmentHostCopy ? 'yes - run invalid' : 'no'}
              />
              <Row label="Transfer" value={`${delivery.transferMs ?? 'n/a'} ms`} />
              <Row label="Delivery valid" value={delivery.valid ? 'yes' : 'no'} />
            </dl>
          </Card>
        )}

        <BenchmarkScene
          expected={expected}
          running={running}
          transferMs={delivery?.transferMs ?? null}
          onPhase={setPhase}
          onComplete={(result) => {
            if (pendingContext) {
              finalise(result, pendingContext.rendererReport, pendingContext.deliveryReport);
            }
          }}
        />
        <p className="text-[12px] text-muted-foreground">
          Screenshots are taken with the browser or platform capture mechanism once each camera
          hold has settled. `preserveDrawingBuffer` stays disabled so it cannot distort the
          measurement.
        </p>
      </section>

      {outcome && acceptance && (
        <section className="grid gap-4 lg:grid-cols-2">
          <Card className="p-4" data-testid="performance-panel">
            <h2 className="mb-2 text-sm font-semibold">Performance results</h2>
            <dl className="grid gap-1 text-[12px] sm:grid-cols-2">
              <Row label="Average FPS" value={String(outcome.frames.averageFps)} />
              <Row label="1% low FPS" value={String(outcome.frames.onePercentLowFps)} />
              <Row label="Median frame time" value={`${outcome.frames.medianFrameTimeMs} ms`} />
              <Row label="p95 frame time" value={`${outcome.frames.p95FrameTimeMs} ms`} />
              <Row label="p99 frame time" value={`${outcome.frames.p99FrameTimeMs} ms`} />
              <Row label="Total draw calls" value={String(outcome.counters.totalDrawCalls)} />
              <Row label="Asset draw calls" value={String(outcome.counters.assetDrawCalls)} />
              <Row label="Rendered triangles" value={outcome.counters.renderedTriangles.toLocaleString()} />
              <Row label="Geometries" value={String(outcome.counters.geometryCount)} />
              <Row label="Renderer textures" value={String(outcome.counters.rendererTextureCount)} />
              <Row
                label="Geometry memory"
                value={`${outcome.counters.estimatedGeometryMemoryMb} MB (estimated)`}
              />
              <Row label="CDN transfer" value={`${outcome.timings.cdnTransferMs ?? 'n/a'} ms`} />
              <Row label="First asset frame" value={`${outcome.timings.firstAssetFrameMs ?? 'n/a'} ms`} />
              <Row
                label="Long tasks"
                value={`${outcome.stability.longTasks.count} (longest ${outcome.stability.longTasks.longestMs} ms)`}
              />
              <Row label="WebGL warnings" value={String(outcome.stability.webglWarnings.length)} />
              <Row label="Context loss" value={String(outcome.stability.contextLossEvents)} />
              <Row label="Asset instances" value={String(outcome.integrity.assetInstanceCount)} />
              <Row
                label="Procedural behind GLB"
                value={outcome.integrity.proceduralFallbackMounted ? 'yes' : 'no'}
              />
              <Row
                label="Measured bounds"
                value={
                  outcome.integrity.measuredBounds
                    ? `${outcome.integrity.measuredBounds.x} x ${outcome.integrity.measuredBounds.y} x ${outcome.integrity.measuredBounds.z} m`
                    : 'n/a'
                }
              />
              <Row label="Measured minY" value={String(outcome.integrity.measuredMinY ?? 'n/a')} />
            </dl>
            <p className="mt-2 text-[11px] text-muted-foreground">{MEMORY_NOTE}</p>
          </Card>

          <Card className="p-4" data-testid="acceptance-panel">
            <h2 className="mb-2 text-sm font-semibold">Acceptance</h2>
            <p className="mb-2 font-mono text-[12px]">{acceptance.verdict}</p>
            {(['network', 'rendering', 'geometry', 'environment'] as const).map((category) => {
              const items = acceptance.findings.filter((f) => f.category === category);
              return (
                <div key={category} className="mb-2">
                  <h3 className="text-[12px] font-medium capitalize">{category} findings</h3>
                  {items.length === 0 ? (
                    <p className="text-[12px] text-muted-foreground">None</p>
                  ) : (
                    <ul className="list-disc pl-4 text-[12px]">
                      {items.map((f, index) => (
                        <li key={index}>
                          <span className="uppercase">{f.severity}</span> - {f.message}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              );
            })}
          </Card>
        </section>
      )}

      <section className="grid gap-4 lg:grid-cols-2">
        <Card className="p-4">
          <h2 className="mb-2 text-sm font-semibold">Visual acceptance captures</h2>
          <ul className="space-y-1.5 text-[12px]">
            {screenshots.map((shot) => (
              <li key={shot.id} className="flex items-center gap-2">
                <Checkbox
                  id={shot.id}
                  checked={shot.captured}
                  onCheckedChange={(checked) =>
                    setScreenshots((prev) =>
                      prev.map((s) => (s.id === shot.id ? { ...s, captured: checked === true } : s)),
                    )
                  }
                />
                <label htmlFor={shot.id}>{shot.label}</label>
              </li>
            ))}
          </ul>
          <div className="mt-3 flex items-center gap-2 text-[12px]">
            <Checkbox
              id="clearance"
              checked={clearanceConfirmed}
              onCheckedChange={(checked) => setClearanceConfirmed(checked === true)}
            />
            <label htmlFor="clearance">
              No geometry overlap, floating, clipping or lighting collision observed
            </label>
          </div>
        </Card>

        <Card className="p-4">
          <h2 className="mb-2 text-sm font-semibold">Evidence</h2>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" disabled={!payload} onClick={() => payload && downloadJson(payload)}>
              <Download className="mr-2 h-4 w-4" /> Export validation JSON
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={!payload}
              onClick={() => payload && downloadAcceptanceReport(payload)}
            >
              <Download className="mr-2 h-4 w-4" /> Download acceptance report
            </Button>
            <Button size="sm" disabled={!payload || saving} onClick={save} data-testid="save-validation">
              {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
              Save validation
            </Button>
          </div>
          {savedId && (
            <p className="mt-2 text-[12px] text-muted-foreground">
              Saved run <span className="font-mono">{savedId}</span>.
            </p>
          )}
          <p className="mt-3 text-[11px] text-muted-foreground">
            Saving records the asset, checksum, scenario, renderer, benchmark configuration,
            performance results, acceptance result, screenshot references, manifest version and
            application version against your administrator account. No IP address or additional
            hardware fingerprinting is stored.
          </p>
        </Card>
      </section>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-2">
      <dt className="w-40 shrink-0 text-muted-foreground">{label}</dt>
      <dd className="min-w-0 break-all font-mono">{value}</dd>
    </div>
  );
}