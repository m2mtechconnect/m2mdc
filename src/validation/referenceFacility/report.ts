/**
 * Reference facility visual-acceptance evidence.
 *
 * Only measured values and explicit human verdicts are recorded. GPU memory is
 * never claimed: WebGL exposes no reliable figure. Separate DSX blueprint
 * asset and rack-BOM gates prevent generic visual coverage from being promoted
 * as DSX reference-design completeness.
 */

import type { FrameStats, StabilityReport } from '@/validation/gpuAcceptance/benchmark';
import type { RendererReport } from '@/validation/gpuAcceptance/renderer';
import {
  FACILITY_BENCHMARK,
  FACILITY_THRESHOLDS,
  type CheckVerdict,
  type FacilityReconciliation,
} from './spec';

export interface HumanVerdict {
  id: string;
  label: string;
  verdict: CheckVerdict;
  note?: string;
}

export interface FacilityRunPayload {
  facilityId: string;
  route: string;
  manifestVersion: number;
  appVersion: string;
  buildId: string;
  validatedAt: string;
  renderer: RendererReport;
  benchmarkConfig: typeof FACILITY_BENCHMARK;
  reconciliation: FacilityReconciliation;
  performance: {
    frames: FrameStats;
    perSegmentAverageFps: Array<{ id: string; label: string; averageFps: number }>;
    sceneDrawCalls: number;
    sceneTriangles: number;
    geometries: number;
    textures: number;
    canvas: { width: number; height: number } | null;
    devicePixelRatio: number | null;
    stability: StabilityReport;
    memoryNote: string;
  };
  guidedViews: HumanVerdict[];
  visualChecks: HumanVerdict[];
  result: 'pass' | 'pass-with-limitations' | 'fail';
  verdict: string;
  findings: string[];
}

export const FACILITY_MEMORY_NOTE =
  'GPU memory consumption is not measurable from WebGL. No GPU memory figure is reported for this run.';

export function evaluateFacilityRun(input: {
  renderer: RendererReport;
  frames: FrameStats;
  stability: StabilityReport;
  reconciliation: FacilityReconciliation;
  guidedViews: HumanVerdict[];
  visualChecks: HumanVerdict[];
}): { result: FacilityRunPayload['result']; verdict: string; findings: string[] } {
  const findings: string[] = [];

  if (input.renderer.classification !== 'hardware') {
    return {
      result: 'fail',
      verdict: 'AURA_NVIDIA_REFERENCE_FACILITY_HARDWARE_VALIDATION_FAILED',
      findings: ['No hardware WebGL renderer: a GPU verdict cannot be issued from this session.'],
    };
  }

  const humanFailures = [...input.guidedViews, ...input.visualChecks].filter((v) => v.verdict === 'fail');
  humanFailures.forEach((v) => findings.push(`Visual failure: ${v.label}${v.note ? ` - ${v.note}` : ''}`));

  const blocked = input.reconciliation.rows.filter((r) => r.verdict === 'blocked');
  blocked.forEach((r) => findings.push(`Role blocked at runtime: ${r.label} - ${r.detail}`));

  const missing = input.reconciliation.rows.filter(
    (r) => r.publishedAssets > 0 && r.verdict !== 'openusd-derived',
  );
  missing.forEach((r) => findings.push(`Published role did not mount: ${r.label} (${r.verdict}).`));

  const dsxMissing = input.reconciliation.dsxAssetRows.filter(
    (row) => row.state !== 'runtime-eligible',
  );
  dsxMissing.forEach((row) =>
    findings.push(
      `DSX asset gate incomplete: ${row.requirement.label} (${row.state}); exact role ${row.requirement.semanticRole}.`,
    ),
  );

  const rackBomFailures = input.reconciliation.dsxRackBom.rows.filter(
    (row) => row.verdict !== 'pass',
  );
  rackBomFailures.forEach((row) =>
    findings.push(`DSX rack BOM incomplete: ${row.label} - ${row.detail}`),
  );

  if (input.frames.averageFps < FACILITY_THRESHOLDS.warnAverageFpsFloor) {
    findings.push(`Average FPS ${input.frames.averageFps} is below the ${FACILITY_THRESHOLDS.warnAverageFpsFloor} floor.`);
  } else if (input.frames.averageFps < FACILITY_THRESHOLDS.passAverageFps) {
    findings.push(`Average FPS ${input.frames.averageFps} is below the ${FACILITY_THRESHOLDS.passAverageFps} pass threshold.`);
  }
  if (input.frames.onePercentLowFps < FACILITY_THRESHOLDS.passOnePercentLowFps) {
    findings.push(`1% low FPS ${input.frames.onePercentLowFps} is below the ${FACILITY_THRESHOLDS.passOnePercentLowFps} pass threshold.`);
  }
  if (input.stability.longTasks.longestMs > FACILITY_THRESHOLDS.maxMainThreadStallMs) {
    findings.push(`Longest main-thread task ${input.stability.longTasks.longestMs} ms exceeds ${FACILITY_THRESHOLDS.maxMainThreadStallMs} ms.`);
  }
  if (input.stability.contextLossEvents > 0) {
    findings.push(`WebGL context was lost ${input.stability.contextLossEvents} time(s) during the run.`);
  }

  const visualHardFail =
    humanFailures.length > 0 ||
    blocked.length > 0 ||
    input.stability.contextLossEvents > 0 ||
    input.frames.averageFps < FACILITY_THRESHOLDS.warnAverageFpsFloor;

  if (visualHardFail) {
    return {
      result: 'fail',
      verdict: 'AURA_NVIDIA_REFERENCE_FACILITY_VISUAL_REMEDIATION_REQUIRED',
      findings,
    };
  }

  if (dsxMissing.length > 0) {
    return {
      result: 'fail',
      verdict: 'AURA_DSX_BLUEPRINT_ASSET_COVERAGE_INCOMPLETE',
      findings,
    };
  }

  if (rackBomFailures.length > 0) {
    return {
      result: 'fail',
      verdict: 'AURA_DSX_RACK_BOM_INCOMPLETE',
      findings,
    };
  }

  if (findings.length > 0) {
    return {
      result: 'pass-with-limitations',
      verdict: 'AURA_NVIDIA_REFERENCE_FACILITY_HARDWARE_VERIFIED_WITH_LIMITATIONS',
      findings,
    };
  }
  return {
    result: 'pass',
    verdict: 'AURA_NVIDIA_REFERENCE_FACILITY_HARDWARE_VISUAL_VERIFIED',
    findings,
  };
}

export function buildFacilityReport(payload: FacilityRunPayload): string {
  const { renderer, performance: perf, reconciliation } = payload;
  return [
    '# AURA NVIDIA Reference Facility - hardware visual acceptance report',
    '',
    `Facility: ${payload.facilityId}`,
    `Route: ${payload.route}`,
    `Build: ${payload.buildId} | Application version: ${payload.appVersion} | Manifest version: ${payload.manifestVersion}`,
    `Validated at: ${payload.validatedAt}`,
    '',
    '## Verdict',
    `${payload.verdict} (${payload.result})`,
    '',
    '## Renderer',
    `Classification: ${renderer.classification}`,
    `Vendor / renderer: ${renderer.vendor ?? 'unavailable'} / ${renderer.renderer ?? 'unavailable'}`,
    `Browser: ${renderer.browser} on ${renderer.operatingSystem}`,
    `Canvas: ${perf.canvas ? `${perf.canvas.width}x${perf.canvas.height}` : 'unknown'} @ DPR ${perf.devicePixelRatio ?? 'unknown'}`,
    '',
    '## Current reference-hall visual reconciliation',
    '| Role | Published | Expected derivative | Mounted derivative | Objects | Verdict |',
    '| --- | --- | --- | --- | --- | --- |',
    ...reconciliation.rows.map(
      (r) =>
        `| ${r.label} | ${r.publishedAssets} | ${r.expectedAssetId ?? 'none'} | ${r.mountedAssetId ?? 'none'} | ${r.mountedObjects} | ${r.verdict} |`,
    ),
    '',
    `Roles OpenUSD-derived: ${reconciliation.rolesDerived}/${reconciliation.rolesExpected}`,
    `Mounted objects: ${reconciliation.mountedObjects} across ${reconciliation.uniqueDerivatives} unique derivatives`,
    `Published but unused manifest rows: ${reconciliation.unusedPublishedAssets.length ? reconciliation.unusedPublishedAssets.join(', ') : 'none'}`,
    '',
    '## NVIDIA DSX blueprint asset gate',
    '| Requirement | Exact role | Layer | State | Matching assets |',
    '| --- | --- | --- | --- | --- |',
    ...reconciliation.dsxAssetRows.map(
      (row) =>
        `| ${row.requirement.label} | ${row.requirement.semanticRole} | ${row.requirement.layer} | ${row.state} | ${row.matchingAssetIds.length ? row.matchingAssetIds.join(', ') : 'none'} |`,
    ),
    '',
    `DSX exact-role coverage: ${reconciliation.dsxRuntimeEligible}/${reconciliation.dsxRequired}`,
    'Generic or legacy visual approximations never count toward this DSX gate.',
    '',
    `## DSX rack BOM (${reconciliation.dsxRackBom.rackCount} GPU rack target)`,
    '| Role | Per rack | Expected | Mounted | Runtime state | Verdict |',
    '| --- | ---: | ---: | ---: | --- | --- |',
    ...reconciliation.dsxRackBom.rows.map(
      (row) =>
        `| ${row.label} | ${row.requiredPerRack} | ${row.expectedObjects} | ${row.mountedObjects} | ${row.runtimeState} | ${row.verdict} |`,
    ),
    '',
    `DSX rack BOM objects: ${reconciliation.dsxRackBom.mountedObjects}/${reconciliation.dsxRackBom.expectedObjects}`,
    `DSX rack BOM complete: ${reconciliation.dsxRackBom.complete ? 'yes' : 'no'}`,
    '',
    '## Performance',
    `Average FPS: ${perf.frames.averageFps} | 1% low: ${perf.frames.onePercentLowFps}`,
    `Frame time median/p95/p99 ms: ${perf.frames.medianFrameTimeMs} / ${perf.frames.p95FrameTimeMs} / ${perf.frames.p99FrameTimeMs}`,
    ...perf.perSegmentAverageFps.map((s) => `- ${s.label}: ${s.averageFps} FPS average`),
    `Scene draw calls / triangles: ${perf.sceneDrawCalls} / ${perf.sceneTriangles}`,
    `Geometries / textures: ${perf.geometries} / ${perf.textures}`,
    `Long tasks: ${perf.stability.longTasks.count} (longest ${perf.stability.longTasks.longestMs} ms) | Context loss: ${perf.stability.contextLossEvents}`,
    perf.memoryNote,
    '',
    '## Guided views',
    ...payload.guidedViews.map((v) => `- ${v.label}: ${v.verdict}${v.note ? ` - ${v.note}` : ''}`),
    '',
    '## Visual realism checks',
    ...payload.visualChecks.map((v) => `- ${v.label}: ${v.verdict}${v.note ? ` - ${v.note}` : ''}`),
    '',
    '## Findings',
    ...(payload.findings.length ? payload.findings.map((f) => `- ${f}`) : ['- None']),
    '',
  ].join('\n');
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

export function downloadFacilityJson(payload: FacilityRunPayload): void {
  triggerDownload(
    new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' }),
    `reference-facility-validation-${payload.validatedAt}.json`,
  );
}

export function downloadFacilityReport(payload: FacilityRunPayload): void {
  triggerDownload(
    new Blob([buildFacilityReport(payload)], { type: 'text/markdown' }),
    `reference-facility-acceptance-${payload.validatedAt}.md`,
  );
}
