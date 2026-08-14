import { describe, expect, it } from 'vitest';
import { evaluateAcceptance, type AcceptanceInput } from '../acceptance';
import { buildAssetExpectation } from '../spec';
import { classifyRenderer } from '../renderer';

const expected = buildAssetExpectation()!;

function baseInput(overrides: Partial<AcceptanceInput> = {}): AcceptanceInput {
  return {
    expected,
    renderer: {
      classification: 'hardware',
      webglVersion: 'webgl2',
      webgl2Available: true,
      vendor: 'NVIDIA',
      renderer: 'NVIDIA GeForce RTX 4070',
      unmaskedAvailable: true,
      browser: 'Google Chrome',
      operatingSystem: 'Windows',
      canvasResolution: { width: 1920, height: 1080 },
      devicePixelRatio: 1,
      qualityProfile: 'balanced',
      highPerformanceRequested: true,
      note: 'Hardware renderer confirmed.',
    },
    delivery: {
      requestedUrl: expected.glbUrl,
      resolvedUrl: `https://example.test${expected.glbUrl}`,
      host: 'example.test',
      status: 200,
      ok: true,
      mimeType: 'model/gltf-binary',
      contentLength: expected.derivativeBytes,
      downloadedBytes: expected.derivativeBytes,
      sha256: expected.checksum,
      checksumMatches: true,
      viaCdnPath: true,
      developmentHostCopy: false,
      transferMs: 1200,
      valid: true,
      findings: [],
    },
    frames: {
      averageFps: 60,
      onePercentLowFps: 48,
      medianFrameTimeMs: 16.6,
      p95FrameTimeMs: 18,
      p99FrameTimeMs: 20,
      sampleCount: 900,
    },
    counters: {
      totalDrawCalls: 12,
      assetDrawCalls: expected.assetDrawCalls,
      renderedTriangles: expected.triangleCount,
      geometryCount: 8,
      rendererTextureCount: 3,
      estimatedGeometryMemoryMb: 13.7,
    },
    timings: {
      cdnTransferMs: 1200,
      parseMs: 800,
      mountMs: 900,
      firstAssetFrameMs: 1500,
      warmCacheMountMs: 400,
    },
    stability: { longTasks: { count: 2, longestMs: 120 }, webglWarnings: [], contextLossEvents: 0 },
    integrity: {
      assetInstanceCount: 1,
      proceduralFallbackMounted: false,
      measuredBounds: expected.bounds,
      measuredMinY: 0,
      visualClearanceConfirmed: true,
    },
    ...overrides,
  };
}

describe('evaluateAcceptance', () => {
  it('passes a clean hardware run', () => {
    const result = evaluateAcceptance(baseInput());
    expect(result.result).toBe('pass');
    expect(result.verdict).toBe('AURA_NVIDIA_RACK_GPU_VALIDATION_PASSED');
    expect(result.gpuVerified).toBe(true);
  });

  it('warns between 30 and 44 average FPS', () => {
    const result = evaluateAcceptance(
      baseInput({
        frames: { ...baseInput().frames, averageFps: 38 },
      }),
    );
    expect(result.result).toBe('warning');
    expect(result.verdict).toBe('AURA_NVIDIA_RACK_GPU_VALIDATION_PASSED_WITH_WARNINGS');
  });

  it('never GPU-verifies a software renderer', () => {
    const result = evaluateAcceptance(
      baseInput({
        renderer: { ...baseInput().renderer, classification: 'software', renderer: 'SwiftShader' },
      }),
    );
    expect(result.gpuVerified).toBe(false);
    expect(result.verdict).toBe('AURA_NVIDIA_RACK_GPU_VALIDATION_BLOCKED');
  });

  it('marks a development-host / non-CDN delivery invalid', () => {
    const result = evaluateAcceptance(
      baseInput({
        delivery: { ...baseInput().delivery, developmentHostCopy: true, valid: false },
      }),
    );
    expect(result.result).toBe('invalid');
    expect(result.verdict).toBe('AURA_NVIDIA_RACK_GPU_VALIDATION_BLOCKED');
  });

  it('fails on context loss, wrong triangles or procedural double-mount', () => {
    expect(
      evaluateAcceptance(
        baseInput({ stability: { ...baseInput().stability, contextLossEvents: 1 } }),
      ).result,
    ).toBe('fail');
    expect(
      evaluateAcceptance(
        baseInput({ counters: { ...baseInput().counters, renderedTriangles: 1000 } }),
      ).result,
    ).toBe('fail');
    expect(
      evaluateAcceptance(
        baseInput({
          integrity: { ...baseInput().integrity, proceduralFallbackMounted: true },
        }),
      ).result,
    ).toBe('fail');
  });

  it('classifies renderers honestly', () => {
    expect(classifyRenderer('ANGLE (Google, SwiftShader Device)')).toBe('software');
    expect(classifyRenderer('llvmpipe (LLVM 15)')).toBe('software');
    expect(classifyRenderer(null)).toBe('unavailable');
    expect(classifyRenderer('NVIDIA GeForce RTX 4090')).toBe('hardware');
  });
});