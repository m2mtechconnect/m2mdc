/**
 * NVIDIA Reference Facility - hardware visual acceptance harness.
 *
 * Route: /admin/reference-facility-validation (admin/owner only)
 *
 * Runs against the real twin route in an embedded 1920x1080 frame. Every
 * number shown comes from the live scene: renderer counters, frame samples and
 * the runtime coverage store. Human judgement is recorded explicitly and never
 * inferred.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { toast } from 'sonner';
import { AlertTriangle, CheckCircle2, Play, Save, XCircle } from 'lucide-react';
import { useRBAC } from '@/contexts/RBACContext';
import { isAssetAdmin } from '@/auth/assetAdmin';
import { supabase } from '@/integrations/supabase/client';
import type { Json } from '@/integrations/supabase/types';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import { getBuildFingerprint } from '@/lib/buildFingerprint';
import { getManifestVersion } from '@/components/twin-visualization/assetRegistry';
import type { RoleCoverage } from '@/components/twin-visualization/runtimeCoverageStore';
import { probeRenderer, type RendererReport } from '@/validation/gpuAcceptance/renderer';
import {
  createLongTaskRecorder,
  summariseFrames,
  type FrameStats,
  type StabilityReport,
} from '@/validation/gpuAcceptance/benchmark';
import {
  FACILITY_BENCHMARK,
  FACILITY_BENCHMARK_MS,
  GUIDED_VIEWS,
  REFERENCE_FACILITY_ID,
  REFERENCE_FACILITY_ROUTE,
  VISUAL_CHECKS,
  reconcileReferenceFacility,
  type CheckVerdict,
  type FacilityReconciliation,
} from '@/validation/referenceFacility/spec';
import {
  FACILITY_MEMORY_NOTE,
  downloadFacilityJson,
  downloadFacilityReport,
  evaluateFacilityRun,
  type FacilityRunPayload,
  type HumanVerdict,
} from '@/validation/referenceFacility/report';

type FrameWindow = Window & {
  __auraRuntimeCoverage?: () => { token: string; roles: Record<string, RoleCoverage> };
  __auraSceneBridge?: {
    getStats: () => {
      drawCalls: number;
      triangles: number;
      geometries: number;
      textures: number;
      canvas: { width: number; height: number };
      devicePixelRatio: number;
      rendererVendor: string | null;
      rendererName: string | null;
      webgl2: boolean;
    } | null;
    startSampling: () => void;
    stopSampling: () => number[];
  };
  __auraTwinCamera?: (preset: string) => void;
};

const HARNESS_URL = `${REFERENCE_FACILITY_ROUTE}&harness=1`;
const EMPTY_COVERAGE: Record<string, RoleCoverage> = {};

const VERDICT_OPTIONS: CheckVerdict[] = ['pass', 'fail', 'na'];
const VERDICT_LABEL: Record<CheckVerdict, string> = {
  pass: 'Pass',
  fail: 'Fail',
  na: 'Not applicable',
};

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export default function ReferenceFacilityValidation() {
  const { role, roles, loading } = useRBAC();
  const frameRef = useRef<HTMLIFrameElement>(null);
  const build = useMemo(() => getBuildFingerprint(), []);

  const [renderer, setRenderer] = useState<RendererReport | null>(null);
  const [coverage, setCoverage] = useState<Record<string, RoleCoverage>>(EMPTY_COVERAGE);
  const [running, setRunning] = useState(false);
  // The harness twin is heavy and its request is aborted if the operator
  // navigates away before a run starts. It is mounted on demand only.
  const [harnessMounted, setHarnessMounted] = useState(false);
  const [progress, setProgress] = useState(0);
  const [phase, setPhase] = useState<string>('Idle');
  const [frames, setFrames] = useState<FrameStats | null>(null);
  const [segmentFps, setSegmentFps] = useState<Array<{ id: string; label: string; averageFps: number }>>([]);
  const [stability, setStability] = useState<StabilityReport | null>(null);
  const [sceneStats, setSceneStats] = useState<ReturnType<NonNullable<FrameWindow['__auraSceneBridge']>['getStats']>>(null);
  const [viewVerdicts, setViewVerdicts] = useState<Record<string, HumanVerdict>>({});
  const [checkVerdicts, setCheckVerdicts] = useState<Record<string, HumanVerdict>>({});
  const [savedId, setSavedId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Renderer identity of this session. A software rasteriser can never produce
  // a hardware verdict, so it is surfaced before anything else.
  useEffect(() => {
    setRenderer(probeRenderer({ qualityProfile: FACILITY_BENCHMARK.qualityProfile }));
  }, []);

  // Live runtime coverage read from the embedded twin, never from the manifest.
  useEffect(() => {
    const timer = window.setInterval(() => {
      const win = frameRef.current?.contentWindow as FrameWindow | null;
      const report = win?.__auraRuntimeCoverage?.();
      if (report) setCoverage(report.roles);
      const stats = win?.__auraSceneBridge?.getStats?.() ?? null;
      if (stats) setSceneStats(stats);
    }, 1_000);
    return () => window.clearInterval(timer);
  }, []);

  const reconciliation: FacilityReconciliation = useMemo(
    () => reconcileReferenceFacility(coverage),
    [coverage],
  );

  const isAdmin = isAssetAdmin(role, roles);
  const hardware = renderer?.classification === 'hardware';
  const canRun = isAdmin && !!renderer && !running;

  const runBenchmark = useCallback(async () => {
    const win = frameRef.current?.contentWindow as FrameWindow | null;
    const bridge = win?.__auraSceneBridge;
    if (!win || !bridge) {
      toast.error('The embedded twin has not published its scene bridge yet. Wait for the scene to mount.');
      return;
    }
    setHarnessMounted(true);
    setRunning(true);
    setSavedId(null);
    setSegmentFps([]);
    const longTasks = createLongTaskRecorder();
    let contextLoss = 0;
    const canvas = win.document.querySelector('canvas');
    const onLost = () => {
      contextLoss += 1;
    };
    canvas?.addEventListener('webglcontextlost', onLost);

    const total = FACILITY_BENCHMARK_MS;
    let elapsed = 0;

    setPhase('Stabilising');
    win.__auraTwinCamera?.('fitFacility');
    await delay(FACILITY_BENCHMARK.stabilizationMs);
    elapsed += FACILITY_BENCHMARK.stabilizationMs;
    setProgress(Math.round((elapsed / total) * 100));

    const allFrames: number[] = [];
    const perSegment: Array<{ id: string; label: string; averageFps: number }> = [];

    for (const segment of FACILITY_BENCHMARK.segments) {
      setPhase(segment.label);
      win.__auraTwinCamera?.(segment.preset);
      bridge.startSampling();
      await delay(segment.durationMs);
      const samples = bridge.stopSampling();
      allFrames.push(...samples);
      perSegment.push({
        id: segment.id,
        label: segment.label,
        averageFps: summariseFrames(samples).averageFps,
      });
      elapsed += segment.durationMs;
      setProgress(Math.round((elapsed / total) * 100));
    }

    canvas?.removeEventListener('webglcontextlost', onLost);
    const tasks = longTasks.stop();
    setFrames(summariseFrames(allFrames));
    setSegmentFps(perSegment);
    setStability({
      longTasks: tasks,
      webglWarnings: [],
      contextLossEvents: contextLoss,
    });
    setSceneStats(bridge.getStats());
    setPhase('Complete');
    setRunning(false);
  }, []);

  const setVerdict = (
    kind: 'view' | 'check',
    id: string,
    label: string,
    patch: Partial<HumanVerdict>,
  ) => {
    const apply = (prev: Record<string, HumanVerdict>) => ({
      ...prev,
      [id]: { id, label, verdict: prev[id]?.verdict ?? 'na', note: prev[id]?.note, ...patch },
    });
    if (kind === 'view') setViewVerdicts(apply);
    else setCheckVerdicts(apply);
  };

  const payload: FacilityRunPayload | null = useMemo(() => {
    if (!renderer || !frames || !stability) return null;
    const guidedViews = GUIDED_VIEWS.map<HumanVerdict>(
      (v) => viewVerdicts[v.id] ?? { id: v.id, label: v.label, verdict: 'na' },
    );
    const visualChecks = VISUAL_CHECKS.map<HumanVerdict>(
      (c) => checkVerdicts[c.id] ?? { id: c.id, label: c.label, verdict: 'na' },
    );
    const outcome = evaluateFacilityRun({
      renderer,
      frames,
      stability,
      reconciliation,
      guidedViews,
      visualChecks,
    });
    return {
      facilityId: REFERENCE_FACILITY_ID,
      route: REFERENCE_FACILITY_ROUTE,
      manifestVersion: getManifestVersion(),
      appVersion: build.appVersion,
      buildId: build.buildId,
      validatedAt: new Date().toISOString(),
      renderer,
      benchmarkConfig: FACILITY_BENCHMARK,
      reconciliation,
      performance: {
        frames,
        perSegmentAverageFps: segmentFps,
        sceneDrawCalls: sceneStats?.drawCalls ?? 0,
        sceneTriangles: sceneStats?.triangles ?? 0,
        geometries: sceneStats?.geometries ?? 0,
        textures: sceneStats?.textures ?? 0,
        canvas: sceneStats?.canvas ?? null,
        devicePixelRatio: sceneStats?.devicePixelRatio ?? null,
        stability,
        memoryNote: FACILITY_MEMORY_NOTE,
      },
      guidedViews,
      visualChecks,
      ...outcome,
    };
  }, [renderer, frames, stability, reconciliation, viewVerdicts, checkVerdicts, segmentFps, sceneStats, build]);

  const save = useCallback(async () => {
    if (!payload) return;
    setSaving(true);
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) {
      setSaving(false);
      toast.error('Sign in again before saving evidence.');
      return;
    }
    const { data, error } = await supabase
      .from('asset_gpu_validation_runs')
      .insert([
        {
          asset_id: payload.facilityId,
          asset_checksum: `manifest-v${payload.manifestVersion}`,
          scenario_id: payload.route,
          manifest_version: payload.manifestVersion,
          app_version: `${payload.appVersion} (${payload.buildId})`,
          validated_at: payload.validatedAt,
          validated_by: auth.user.id,
          renderer: payload.renderer as unknown as Json,
          benchmark_config: payload.benchmarkConfig as unknown as Json,
          delivery: payload.reconciliation as unknown as Json,
          performance: payload.performance as unknown as Json,
          acceptance_result: payload.result,
          verdict: payload.verdict,
          findings: payload.findings as unknown as Json,
          screenshot_references: [...payload.guidedViews, ...payload.visualChecks] as unknown as Json,
        },
      ])
      .select('id')
      .single();
    setSaving(false);
    if (error) {
      toast.error(`Could not save validation: ${error.message}`);
      return;
    }
    setSavedId(data.id);
    toast.success('Reference facility validation saved.');
  }, [payload]);

  if (loading) return <div className="p-6 text-sm text-muted-foreground">Loading...</div>;
  if (!isAdmin) return <Navigate to="/dashboard" replace />;

  return (
    <div className="space-y-6 p-6" data-testid="reference-facility-validation">
      <header className="space-y-2">
        <h1 className="text-xl font-semibold">NVIDIA Reference Facility - hardware visual acceptance</h1>
        <p className="max-w-3xl text-sm text-muted-foreground">
          Runs against the live twin route below. Measurements come from the mounted scene; the
          visual verdicts are yours. This scene mixes NVIDIA OpenUSD-derived equipment with AURA
          procedural architecture, and the report records which is which.
        </p>
        <div className="flex flex-wrap gap-2 text-xs">
          <Badge variant="outline">Build {build.buildId}</Badge>
          <Badge variant="outline">Manifest v{getManifestVersion()}</Badge>
          <Badge variant={hardware ? 'default' : 'destructive'}>
            {renderer
              ? hardware
                ? `Hardware: ${renderer.renderer ?? 'GPU'}`
                : renderer.classification === 'software'
                  ? 'Software renderer - no GPU verdict possible'
                  : 'Renderer unavailable - no GPU verdict possible'
              : 'Probing renderer...'}
          </Badge>
        </div>
      </header>

      {!hardware && renderer && (
        <Card className="flex items-start gap-3 border-destructive/40 p-4 text-sm">
          <AlertTriangle className="mt-0.5 h-4 w-4 text-destructive" />
          <div>
            This session is not hardware accelerated. Open this page in Chrome or Edge on a
            GPU-equipped computer, outside a virtual machine or remote session. A run started here
            can only ever record a failed hardware verdict.
          </div>
        </Card>
      )}

      <Card className="space-y-3 p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-sm font-semibold">1. Live reference facility (1920x1080)</h2>
          <div className="flex items-center gap-2">
            <Button size="sm" onClick={runBenchmark} disabled={!canRun}>
              <Play className="mr-1.5 h-3.5 w-3.5" />
              {running ? 'Running...' : 'Run benchmark'}
            </Button>
          </div>
        </div>
        {running && (
          <div className="space-y-1">
            <Progress value={progress} />
            <p className="text-xs text-muted-foreground">{phase}</p>
          </div>
        )}
        <div className="overflow-hidden rounded-md border border-border bg-muted/30">
          <div className="relative w-full" style={{ paddingTop: `${(1080 / 1920) * 100}%` }}>
            {harnessMounted ? (
              <iframe
                ref={frameRef}
                title="NVIDIA Reference Facility"
                src={HARNESS_URL}
                loading="lazy"
                width={1920}
                height={1080}
                className="absolute left-0 top-0 origin-top-left border-0"
                style={{ transform: 'scale(0.5)', width: 1920, height: 1080 }}
              />
            ) : (
              <p className="absolute inset-0 flex items-center justify-center px-6 text-center text-sm text-muted-foreground">
                The reference facility loads when a validation run is started.
              </p>
            )}
          </div>
        </div>
        <p className="text-xs text-muted-foreground">
          The frame renders at 1920x1080 and is scaled for display only; the canvas resolution used
          for measurement is reported below.
        </p>
      </Card>

      <Card className="space-y-3 p-4">
        <h2 className="text-sm font-semibold">2. Asset reconciliation (live runtime evidence)</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="text-muted-foreground">
              <tr>
                <th className="py-1 pr-3">Role</th>
                <th className="py-1 pr-3">Published</th>
                <th className="py-1 pr-3">Expected derivative</th>
                <th className="py-1 pr-3">Mounted derivative</th>
                <th className="py-1 pr-3">Objects</th>
                <th className="py-1">Verdict</th>
              </tr>
            </thead>
            <tbody>
              {reconciliation.rows.map((row) => (
                <tr key={row.role} className="border-t border-border/60">
                  <td className="py-1.5 pr-3">{row.label}</td>
                  <td className="py-1.5 pr-3">{row.publishedAssets}</td>
                  <td className="py-1.5 pr-3 font-mono">{row.expectedAssetId ?? 'none'}</td>
                  <td className="py-1.5 pr-3 font-mono">{row.mountedAssetId ?? 'none'}</td>
                  <td className="py-1.5 pr-3">{row.mountedObjects}</td>
                  <td className="py-1.5">
                    <Badge variant={row.verdict === 'openusd-derived' ? 'default' : 'secondary'}>
                      {row.verdict}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-xs text-muted-foreground">
          {reconciliation.rolesDerived}/{reconciliation.rolesExpected} published roles mounted from
          OpenUSD-derived geometry - {reconciliation.mountedObjects} objects across{' '}
          {reconciliation.uniqueDerivatives} derivatives. Published manifest rows not requested by
          this view: {reconciliation.unusedPublishedAssets.length}.
        </p>
      </Card>

      <Card className="space-y-2 p-4">
        <h2 className="text-sm font-semibold">3. Measured performance</h2>
        {frames ? (
          <div className="grid gap-3 text-xs sm:grid-cols-2 lg:grid-cols-4">
            <Metric label="Average FPS" value={String(frames.averageFps)} />
            <Metric label="1% low FPS" value={String(frames.onePercentLowFps)} />
            <Metric label="Frame time p95 (ms)" value={String(frames.p95FrameTimeMs)} />
            <Metric label="Frame time p99 (ms)" value={String(frames.p99FrameTimeMs)} />
            <Metric label="Scene draw calls" value={String(sceneStats?.drawCalls ?? 0)} />
            <Metric label="Rendered triangles" value={String(sceneStats?.triangles ?? 0)} />
            <Metric
              label="Canvas"
              value={sceneStats ? `${sceneStats.canvas.width}x${sceneStats.canvas.height} @ DPR ${sceneStats.devicePixelRatio}` : 'unknown'}
            />
            <Metric
              label="Longest main-thread task"
              value={stability ? `${stability.longTasks.longestMs} ms` : 'n/a'}
            />
          </div>
        ) : (
          <p className="text-xs text-muted-foreground">No benchmark has been run in this session.</p>
        )}
        {segmentFps.length > 0 && (
          <ul className="text-xs text-muted-foreground">
            {segmentFps.map((s) => (
              <li key={s.id}>
                {s.label}: {s.averageFps} FPS average
              </li>
            ))}
          </ul>
        )}
        <p className="text-xs text-muted-foreground">{FACILITY_MEMORY_NOTE}</p>
      </Card>

      <Card className="space-y-3 p-4">
        <h2 className="text-sm font-semibold">4. Guided visual inspection</h2>
        {GUIDED_VIEWS.map((view) => (
          <VerdictRow
            key={view.id}
            label={view.label}
            hint={view.instruction}
            action={
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  const win = frameRef.current?.contentWindow as FrameWindow | null;
                  win?.__auraTwinCamera?.(view.preset);
                }}
              >
                Go to view
              </Button>
            }
            verdict={viewVerdicts[view.id]?.verdict ?? 'na'}
            note={viewVerdicts[view.id]?.note ?? ''}
            onVerdict={(v) => setVerdict('view', view.id, view.label, { verdict: v })}
            onNote={(note) => setVerdict('view', view.id, view.label, { note })}
          />
        ))}
      </Card>

      <Card className="space-y-3 p-4">
        <h2 className="text-sm font-semibold">5. Visual realism criteria</h2>
        {VISUAL_CHECKS.map((check) => (
          <VerdictRow
            key={check.id}
            label={check.label}
            verdict={checkVerdicts[check.id]?.verdict ?? 'na'}
            note={checkVerdicts[check.id]?.note ?? ''}
            onVerdict={(v) => setVerdict('check', check.id, check.label, { verdict: v })}
            onNote={(note) => setVerdict('check', check.id, check.label, { note })}
          />
        ))}
      </Card>

      <Card className="space-y-3 p-4">
        <h2 className="text-sm font-semibold">6. Verdict and evidence</h2>
        {!payload ? (
          <p className="text-xs text-muted-foreground">
            Run the benchmark to produce a verdict. Visual verdicts alone cannot complete a run.
          </p>
        ) : (
          <>
            <div className="flex items-center gap-2">
              {payload.result === 'pass' ? (
                <CheckCircle2 className="h-4 w-4 text-primary" />
              ) : payload.result === 'fail' ? (
                <XCircle className="h-4 w-4 text-destructive" />
              ) : (
                <AlertTriangle className="h-4 w-4 text-muted-foreground" />
              )}
              <span className="font-mono text-sm">{payload.verdict}</span>
            </div>
            <ul className="list-disc space-y-1 pl-5 text-xs text-muted-foreground">
              {payload.findings.length ? (
                payload.findings.map((f) => <li key={f}>{f}</li>)
              ) : (
                <li>No findings.</li>
              )}
            </ul>
            <div className="flex flex-wrap gap-2">
              <Button size="sm" onClick={save} disabled={saving}>
                <Save className="mr-1.5 h-3.5 w-3.5" />
                {saving ? 'Saving...' : 'Save validation'}
              </Button>
              <Button size="sm" variant="outline" onClick={() => downloadFacilityJson(payload)}>
                Export validation JSON
              </Button>
              <Button size="sm" variant="outline" onClick={() => downloadFacilityReport(payload)}>
                Download acceptance report
              </Button>
            </div>
            {savedId && (
              <p className="font-mono text-xs text-muted-foreground">Saved run: {savedId}</p>
            )}
          </>
        )}
      </Card>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-border p-2">
      <div className="text-muted-foreground">{label}</div>
      <div className="font-mono text-sm">{value}</div>
    </div>
  );
}

function VerdictRow({
  label,
  hint,
  action,
  verdict,
  note,
  onVerdict,
  onNote,
}: {
  label: string;
  hint?: string;
  action?: React.ReactNode;
  verdict: CheckVerdict;
  note: string;
  onVerdict: (v: CheckVerdict) => void;
  onNote: (note: string) => void;
}) {
  return (
    <div className="space-y-2 rounded-md border border-border p-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="max-w-2xl">
          <div className="text-sm">{label}</div>
          {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
        </div>
        <div className="flex items-center gap-2">
          {action}
          <div className="flex gap-1">
            {VERDICT_OPTIONS.map((option) => (
              <Button
                key={option}
                size="sm"
                variant={verdict === option ? 'default' : 'outline'}
                onClick={() => onVerdict(option)}
              >
                {VERDICT_LABEL[option]}
              </Button>
            ))}
          </div>
        </div>
      </div>
      <Textarea
        value={note}
        onChange={(e) => onNote(e.target.value)}
        placeholder="Optional note"
        className="min-h-[2.25rem] text-xs"
        rows={1}
      />
    </div>
  );
}
