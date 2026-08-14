/**
 * Acceptance evaluation. Network limitations are reported separately from
 * rendering limitations, and a software renderer can never produce a
 * GPU-verified verdict.
 */

import type { DeliveryReport } from './delivery';
import type { FrameStats, SceneCounters, StabilityReport, TimingBreakdown } from './benchmark';
import type { RendererReport } from './renderer';
import { THRESHOLDS, type AssetExpectation } from './spec';

export type AcceptanceResult = 'pass' | 'warning' | 'fail' | 'invalid';

export type Verdict =
  | 'AURA_NVIDIA_RACK_GPU_VALIDATION_PASSED'
  | 'AURA_NVIDIA_RACK_GPU_VALIDATION_PASSED_WITH_WARNINGS'
  | 'AURA_NVIDIA_RACK_GPU_VALIDATION_AWAITING_ADMIN_RUN'
  | 'AURA_NVIDIA_RACK_GPU_VALIDATION_FAILED'
  | 'AURA_NVIDIA_RACK_GPU_VALIDATION_BLOCKED';

export type FindingCategory = 'network' | 'rendering' | 'geometry' | 'environment';

export interface Finding {
  category: FindingCategory;
  severity: 'fail' | 'warning' | 'info';
  message: string;
}

export interface SceneIntegrity {
  /** Number of mounted instances of the scenario asset. Must be exactly 1. */
  assetInstanceCount: number;
  /** True when procedural rack geometry mounted behind the approved GLB. */
  proceduralFallbackMounted: boolean;
  /** Measured world bounds of the mounted asset. */
  measuredBounds: { x: number; y: number; z: number } | null;
  measuredMinY: number | null;
  /** Reviewer-confirmed absence of overlap / floating / clipping / light collision. */
  visualClearanceConfirmed: boolean;
}

export interface AcceptanceInput {
  expected: AssetExpectation;
  renderer: RendererReport;
  delivery: DeliveryReport;
  frames: FrameStats;
  counters: SceneCounters;
  timings: TimingBreakdown;
  stability: StabilityReport;
  integrity: SceneIntegrity;
}

export interface AcceptanceEvaluation {
  result: AcceptanceResult;
  verdict: Verdict;
  findings: Finding[];
  gpuVerified: boolean;
}

const BOUNDS_TOLERANCE_M = 0.002;

export function evaluateAcceptance(input: AcceptanceInput): AcceptanceEvaluation {
  const { expected, renderer, delivery, frames, counters, timings, stability, integrity } = input;
  const findings: Finding[] = [];
  const near = (a: number, b: number) => Math.abs(a - b) <= BOUNDS_TOLERANCE_M;

  // --- Network / delivery -------------------------------------------------
  for (const message of delivery.findings) {
    findings.push({ category: 'network', severity: delivery.valid ? 'warning' : 'fail', message });
  }
  if (delivery.valid && (delivery.transferMs ?? 0) > THRESHOLDS.warnColdTransferMs) {
    findings.push({
      category: 'network',
      severity: 'warning',
      message: `Cold CDN transfer took ${delivery.transferMs} ms (warning above ${THRESHOLDS.warnColdTransferMs} ms).`,
    });
  }

  // --- Environment --------------------------------------------------------
  if (renderer.classification === 'software') {
    findings.push({
      category: 'environment',
      severity: 'fail',
      message:
        'Software renderer detected. Measurements are diagnostic only and cannot receive a GPU-verified verdict.',
    });
  } else if (renderer.classification === 'unavailable') {
    findings.push({
      category: 'environment',
      severity: 'fail',
      message: 'Renderer unavailable: the GPU identity is hidden, so hardware cannot be confirmed.',
    });
  }
  if (!renderer.webgl2Available) {
    findings.push({
      category: 'environment',
      severity: 'fail',
      message: 'WebGL2 is unavailable in this browser.',
    });
  }

  // --- Geometry / derivative identity ------------------------------------
  if (delivery.sha256 && delivery.sha256 !== expected.checksum) {
    findings.push({
      category: 'geometry',
      severity: 'fail',
      message: `Wrong derivative: delivered checksum ${delivery.sha256} is not the approved ${expected.checksum}.`,
    });
  }
  if (expected.supersededChecksums.includes(delivery.sha256 ?? '')) {
    findings.push({
      category: 'geometry',
      severity: 'fail',
      message: 'Superseded operations build delivered. That build is audit history only.',
    });
  }
  if (counters.renderedTriangles !== expected.triangleCount) {
    findings.push({
      category: 'geometry',
      severity: 'fail',
      message: `Triangle delta: rendered ${counters.renderedTriangles}, approved derivative is ${expected.triangleCount}.`,
    });
  }
  const drawCallDelta = Math.abs(counters.assetDrawCalls - expected.assetDrawCalls);
  if (drawCallDelta > THRESHOLDS.maxDrawCallDelta) {
    findings.push({
      category: 'geometry',
      severity: 'fail',
      message: `Asset draw-call delta ${drawCallDelta} exceeds the allowed ${THRESHOLDS.maxDrawCallDelta} (measured ${counters.assetDrawCalls}, expected ${expected.assetDrawCalls}).`,
    });
  }
  if (integrity.assetInstanceCount !== 1) {
    findings.push({
      category: 'geometry',
      severity: 'fail',
      message: `Expected exactly one scenario asset instance, found ${integrity.assetInstanceCount}.`,
    });
  }
  if (integrity.proceduralFallbackMounted) {
    findings.push({
      category: 'geometry',
      severity: 'fail',
      message: 'Procedural rack geometry mounted at the same position as the approved GLB.',
    });
  }
  if (integrity.measuredBounds) {
    const b = integrity.measuredBounds;
    if (!near(b.x, expected.bounds.x) || !near(b.y, expected.bounds.y) || !near(b.z, expected.bounds.z)) {
      findings.push({
        category: 'geometry',
        severity: 'fail',
        message: `Incorrect bounds: measured ${b.x} x ${b.y} x ${b.z} m, expected ${expected.bounds.x} x ${expected.bounds.y} x ${expected.bounds.z} m.`,
      });
    }
  }
  if (integrity.measuredMinY !== null && !near(integrity.measuredMinY, expected.minY)) {
    findings.push({
      category: 'geometry',
      severity: 'fail',
      message: `Floor contact incorrect: minY ${integrity.measuredMinY}, expected ${expected.minY}.`,
    });
  }
  if (!integrity.visualClearanceConfirmed) {
    findings.push({
      category: 'geometry',
      severity: 'warning',
      message:
        'Visual clearance (overlap, floating, clipping, lighting collision) has not been confirmed by the administrator.',
    });
  }

  // --- Rendering ----------------------------------------------------------
  if (stability.contextLossEvents > 0) {
    findings.push({
      category: 'rendering',
      severity: 'fail',
      message: `WebGL context loss occurred ${stability.contextLossEvents} time(s).`,
    });
  }
  if (frames.averageFps < THRESHOLDS.warnAverageFpsFloor) {
    findings.push({
      category: 'rendering',
      severity: 'fail',
      message: `Average FPS ${frames.averageFps} is below the ${THRESHOLDS.warnAverageFpsFloor} FPS failure floor.`,
    });
  } else if (frames.averageFps < THRESHOLDS.passAverageFps) {
    findings.push({
      category: 'rendering',
      severity: 'warning',
      message: `Average FPS ${frames.averageFps} is between ${THRESHOLDS.warnAverageFpsFloor} and ${THRESHOLDS.passAverageFps - 1}.`,
    });
  }
  if (frames.onePercentLowFps < THRESHOLDS.passOnePercentLowFps) {
    findings.push({
      category: 'rendering',
      severity: 'warning',
      message: `1% low ${frames.onePercentLowFps} FPS is below ${THRESHOLDS.passOnePercentLowFps} FPS.`,
    });
  }
  if (stability.longTasks.longestMs > THRESHOLDS.maxMainThreadStallMs) {
    findings.push({
      category: 'rendering',
      severity: 'fail',
      message: `Main-thread stall of ${stability.longTasks.longestMs} ms after initial loading exceeds ${THRESHOLDS.maxMainThreadStallMs} ms.`,
    });
  }
  if ((timings.parseMs ?? 0) > THRESHOLDS.warnParseMs) {
    findings.push({
      category: 'rendering',
      severity: 'warning',
      message: `GLB parse took ${timings.parseMs} ms (warning above ${THRESHOLDS.warnParseMs} ms).`,
    });
  }
  if ((timings.mountMs ?? 0) > THRESHOLDS.warnMountMs) {
    findings.push({
      category: 'rendering',
      severity: 'warning',
      message: `Scene mount took ${timings.mountMs} ms (warning above ${THRESHOLDS.warnMountMs} ms).`,
    });
  }

  // --- Verdict ------------------------------------------------------------
  const hardware = renderer.classification === 'hardware';
  if (!delivery.valid) {
    return {
      result: 'invalid',
      verdict: 'AURA_NVIDIA_RACK_GPU_VALIDATION_BLOCKED',
      findings,
      gpuVerified: false,
    };
  }
  const failed = findings.some((f) => f.severity === 'fail');
  if (failed) {
    return {
      result: 'fail',
      verdict: hardware
        ? 'AURA_NVIDIA_RACK_GPU_VALIDATION_FAILED'
        : 'AURA_NVIDIA_RACK_GPU_VALIDATION_BLOCKED',
      findings,
      gpuVerified: false,
    };
  }
  const warned = findings.some((f) => f.severity === 'warning');
  return {
    result: warned ? 'warning' : 'pass',
    verdict: warned
      ? 'AURA_NVIDIA_RACK_GPU_VALIDATION_PASSED_WITH_WARNINGS'
      : 'AURA_NVIDIA_RACK_GPU_VALIDATION_PASSED',
    findings,
    gpuVerified: true,
  };
}