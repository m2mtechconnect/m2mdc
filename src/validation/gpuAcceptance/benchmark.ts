/**
 * Deterministic benchmark instrumentation.
 *
 * Frame sampling, long-task capture, WebGL warning capture and context-loss
 * detection. GPU memory consumption is NOT measurable from WebGL, so only a
 * calculated geometry/material estimate is produced and it is always labelled
 * as estimated.
 */

export interface FrameStats {
  averageFps: number;
  onePercentLowFps: number;
  medianFrameTimeMs: number;
  p95FrameTimeMs: number;
  p99FrameTimeMs: number;
  sampleCount: number;
}

export interface SceneCounters {
  totalDrawCalls: number;
  assetDrawCalls: number;
  renderedTriangles: number;
  geometryCount: number;
  rendererTextureCount: number;
  estimatedGeometryMemoryMb: number;
}

export interface TimingBreakdown {
  cdnTransferMs: number | null;
  parseMs: number | null;
  mountMs: number | null;
  firstAssetFrameMs: number | null;
  warmCacheMountMs: number | null;
}

export interface StabilityReport {
  longTasks: { count: number; longestMs: number };
  webglWarnings: string[];
  contextLossEvents: number;
}

function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0;
  const index = Math.min(sorted.length - 1, Math.max(0, Math.ceil((p / 100) * sorted.length) - 1));
  return sorted[index];
}

export function summariseFrames(frameTimesMs: number[]): FrameStats {
  const samples = frameTimesMs.filter((t) => Number.isFinite(t) && t > 0);
  if (samples.length === 0) {
    return {
      averageFps: 0,
      onePercentLowFps: 0,
      medianFrameTimeMs: 0,
      p95FrameTimeMs: 0,
      p99FrameTimeMs: 0,
      sampleCount: 0,
    };
  }
  const sorted = [...samples].sort((a, b) => a - b);
  const total = samples.reduce((sum, t) => sum + t, 0);
  // 1% low: mean FPS of the slowest 1% of frames, the standard definition.
  const lowCount = Math.max(1, Math.floor(samples.length * 0.01));
  const slowest = sorted.slice(-lowCount);
  const slowestMean = slowest.reduce((sum, t) => sum + t, 0) / slowest.length;

  return {
    averageFps: Number((1000 / (total / samples.length)).toFixed(2)),
    onePercentLowFps: Number((1000 / slowestMean).toFixed(2)),
    medianFrameTimeMs: Number(percentile(sorted, 50).toFixed(3)),
    p95FrameTimeMs: Number(percentile(sorted, 95).toFixed(3)),
    p99FrameTimeMs: Number(percentile(sorted, 99).toFixed(3)),
    sampleCount: samples.length,
  };
}

/** Observes long main-thread tasks for the duration of a run. */
export function createLongTaskRecorder() {
  const durations: number[] = [];
  let observer: PerformanceObserver | null = null;
  try {
    observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) durations.push(entry.duration);
    });
    observer.observe({ entryTypes: ['longtask'] });
  } catch {
    observer = null; // Not supported (Safari/Firefox) - reported as unavailable.
  }
  return {
    supported: observer !== null,
    stop(): { count: number; longestMs: number } {
      observer?.disconnect();
      return {
        count: durations.length,
        longestMs: durations.length ? Number(Math.max(...durations).toFixed(1)) : 0,
      };
    },
  };
}

/** Captures WebGL console warnings emitted while the benchmark runs. */
export function createWebglWarningRecorder() {
  const warnings: string[] = [];
  const originalWarn = console.warn;
  const originalError = console.error;
  const capture = (args: unknown[]) => {
    const text = args.map((a) => String(a)).join(' ');
    if (/webgl|three\.|gl_|shader|context/i.test(text)) warnings.push(text.slice(0, 400));
  };
  console.warn = (...args: unknown[]) => {
    capture(args);
    originalWarn(...args);
  };
  console.error = (...args: unknown[]) => {
    capture(args);
    originalError(...args);
  };
  return {
    stop(): string[] {
      console.warn = originalWarn;
      console.error = originalError;
      return warnings;
    },
  };
}

/**
 * Calculated geometry/material memory estimate. WebGL exposes no reliable
 * actual GPU memory figure, so this value is ESTIMATED, never measured.
 */
export function estimateGeometryMemoryMb(triangles: number, geometries: number): number {
  // 3 vertices per triangle; position+normal+uv ≈ 32 bytes/vertex, plus a
  // 4-byte index per vertex and a small per-geometry buffer overhead.
  const vertexBytes = triangles * 3 * 32;
  const indexBytes = triangles * 3 * 4;
  const overhead = geometries * 1024;
  return Number(((vertexBytes + indexBytes + overhead) / (1024 * 1024)).toFixed(2));
}