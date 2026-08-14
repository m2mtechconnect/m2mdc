/**
 * Validation JSON + human-readable acceptance report.
 *
 * No IP addresses and no hardware fingerprinting beyond the renderer strings
 * needed for the acceptance decision are recorded.
 */

import type { AcceptanceEvaluation, SceneIntegrity } from './acceptance';
import type { FrameStats, SceneCounters, StabilityReport, TimingBreakdown } from './benchmark';
import type { DeliveryReport } from './delivery';
import type { RendererReport } from './renderer';
import { BENCHMARK_CONFIG, type AssetExpectation } from './spec';

export interface ScreenshotReference {
  id: string;
  label: string;
  captured: boolean;
  note?: string;
}

export interface ValidationRunPayload {
  assetId: string;
  assetChecksum: string;
  scenarioId: string;
  manifestVersion: number;
  appVersion: string;
  validatedAt: string;
  renderer: RendererReport;
  benchmarkConfig: typeof BENCHMARK_CONFIG;
  delivery: DeliveryReport;
  performance: {
    frames: FrameStats;
    counters: SceneCounters;
    timings: TimingBreakdown;
    stability: StabilityReport;
    integrity: SceneIntegrity;
    memoryNote: string;
  };
  acceptance: AcceptanceEvaluation;
  screenshots: ScreenshotReference[];
  capabilityMap: AssetExpectation['addressableParts'];
}

export const MEMORY_NOTE =
  'GPU memory consumption is not measurable from WebGL. Only a calculated geometry/material memory estimate is reported (estimated, never measured).';

export function downloadJson(payload: ValidationRunPayload): void {
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  triggerDownload(blob, `gpu-validation-${payload.assetId}-${payload.validatedAt}.json`);
}

export function buildAcceptanceReport(payload: ValidationRunPayload): string {
  const { renderer, performance: perf, acceptance, delivery, benchmarkConfig } = payload;
  const lines = [
    '# AURA hardware GPU acceptance report',
    '',
    `Asset: ${payload.assetId}`,
    `Checksum: ${payload.assetChecksum}`,
    `Scenario: ${payload.scenarioId}`,
    `Manifest version: ${payload.manifestVersion}`,
    `Application version: ${payload.appVersion}`,
    `Validated at: ${payload.validatedAt}`,
    '',
    '## Verdict',
    `${acceptance.verdict} (${acceptance.result})`,
    '',
    '## Renderer',
    `Classification: ${renderer.classification}`,
    `WebGL: ${renderer.webglVersion} (WebGL2 available: ${renderer.webgl2Available})`,
    `Vendor: ${renderer.vendor ?? 'unavailable'}`,
    `Renderer: ${renderer.renderer ?? 'unavailable'}`,
    `Browser: ${renderer.browser} on ${renderer.operatingSystem}`,
    `Canvas: ${renderer.canvasResolution ? `${renderer.canvasResolution.width}x${renderer.canvasResolution.height}` : 'unknown'} @ DPR ${renderer.devicePixelRatio}`,
    `Quality profile: ${renderer.qualityProfile}`,
    '',
    '## Delivery',
    `URL host: ${delivery.host}`,
    `Status: ${delivery.status ?? 'n/a'} | MIME: ${delivery.mimeType ?? 'n/a'}`,
    `Bytes: ${delivery.downloadedBytes ?? 'n/a'} | SHA-256: ${delivery.sha256 ?? 'n/a'}`,
    `CDN path: ${delivery.viaCdnPath} | Development-host copy: ${delivery.developmentHostCopy}`,
    `Delivery valid: ${delivery.valid}`,
    '',
    '## Benchmark configuration',
    `${benchmarkConfig.viewport.width}x${benchmarkConfig.viewport.height}, DPR cap ${benchmarkConfig.devicePixelRatioCap}, ${benchmarkConfig.qualityProfile} profile`,
    `Stabilisation ${benchmarkConfig.stabilizationMs} ms, orbit ${benchmarkConfig.orbitMs} ms, holds: ${benchmarkConfig.holds.join(', ')}`,
    '',
    '## Performance',
    `Average FPS: ${perf.frames.averageFps} | 1% low: ${perf.frames.onePercentLowFps}`,
    `Frame time median/p95/p99 ms: ${perf.frames.medianFrameTimeMs} / ${perf.frames.p95FrameTimeMs} / ${perf.frames.p99FrameTimeMs}`,
    `Draw calls total/asset: ${perf.counters.totalDrawCalls} / ${perf.counters.assetDrawCalls}`,
    `Rendered triangles: ${perf.counters.renderedTriangles} | Geometries: ${perf.counters.geometryCount} | Renderer textures: ${perf.counters.rendererTextureCount}`,
    `Estimated geometry/material memory: ${perf.counters.estimatedGeometryMemoryMb} MB (estimated)`,
    `CDN transfer / parse / mount / first asset frame / warm mount ms: ${perf.timings.cdnTransferMs} / ${perf.timings.parseMs} / ${perf.timings.mountMs} / ${perf.timings.firstAssetFrameMs} / ${perf.timings.warmCacheMountMs}`,
    `Long tasks: ${perf.stability.longTasks.count} (longest ${perf.stability.longTasks.longestMs} ms) | Context loss: ${perf.stability.contextLossEvents}`,
    `WebGL warnings: ${perf.stability.webglWarnings.length}`,
    perf.memoryNote,
    '',
    '## Capability map (from validation evidence)',
    ...payload.capabilityMap.map(
      (p) => `- ${p.label}: ${p.addressable ? 'addressable' : `not independently addressable${p.reason ? ` - ${p.reason}` : ''}`}`,
    ),
    '',
    '## Findings',
    ...(acceptance.findings.length
      ? acceptance.findings.map((f) => `- [${f.severity}] (${f.category}) ${f.message}`)
      : ['- None']),
    '',
    '## Visual acceptance captures',
    ...payload.screenshots.map((s) => `- ${s.label}: ${s.captured ? 'captured' : 'not captured'}`),
    '',
  ];
  return lines.join('\n');
}

export function downloadAcceptanceReport(payload: ValidationRunPayload): void {
  const blob = new Blob([buildAcceptanceReport(payload)], { type: 'text/markdown' });
  triggerDownload(blob, `gpu-acceptance-${payload.assetId}-${payload.validatedAt}.md`);
}

function triggerDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename.replace(/[:]/g, '-');
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}