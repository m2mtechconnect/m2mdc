import { describe, expect, it } from 'vitest';
import { evaluatePreflight, SOFTWARE_RENDERER_GUIDANCE } from '../preflight';
import { buildAssetExpectation, VALIDATION_ASSET_ID } from '../spec';
import type { RendererReport } from '../renderer';
import type { DeliveryReport } from '../delivery';

const expected = buildAssetExpectation(VALIDATION_ASSET_ID)!;

const hardwareRenderer: RendererReport = {
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
};

const validDelivery: DeliveryReport = {
  requestedUrl: expected.glbUrl,
  resolvedUrl: `https://example.com${expected.glbUrl}`,
  host: 'example.com',
  status: 200,
  ok: true,
  mimeType: 'model/gltf-binary',
  contentLength: expected.derivativeBytes,
  downloadedBytes: expected.derivativeBytes,
  sha256: expected.checksum,
  checksumMatches: true,
  viaCdnPath: true,
  developmentHostCopy: false,
  transferMs: 900,
  valid: true,
  findings: [],
};

const base = {
  isAdmin: true,
  renderer: hardwareRenderer,
  delivery: validDelivery,
  expected,
  viewport: { width: 1920, height: 1200 },
  manifestChecksum: expected.checksum,
  supersededResolves: false,
};

describe('GPU validation preflight', () => {
  it('allows the run when every condition is met', () => {
    const report = evaluatePreflight(base);
    expect(report.canStart).toBe(true);
    expect(report.softwareRendering).toBe(false);
    expect(report.checks.every((c) => c.status === 'pass')).toBe(true);
  });

  it('blocks a software rasteriser with the hardware guidance message', () => {
    const report = evaluatePreflight({
      ...base,
      renderer: { ...hardwareRenderer, classification: 'software', renderer: 'Google SwiftShader' },
    });
    expect(report.canStart).toBe(false);
    expect(report.softwareRendering).toBe(true);
    expect(report.checks.find((c) => c.id === 'hardware-acceleration')?.detail).toBe(
      SOFTWARE_RENDERER_GUIDANCE,
    );
  });

  it('blocks a non-admin, missing WebGL2, checksum disagreement and a resolvable superseded build', () => {
    expect(evaluatePreflight({ ...base, isAdmin: false }).canStart).toBe(false);
    expect(
      evaluatePreflight({
        ...base,
        renderer: { ...hardwareRenderer, webgl2Available: false, webglVersion: 'webgl1' },
      }).canStart,
    ).toBe(false);
    expect(evaluatePreflight({ ...base, manifestChecksum: 'sha256:deadbeef' }).canStart).toBe(false);
    expect(evaluatePreflight({ ...base, supersededResolves: true }).canStart).toBe(false);
  });

  it('warns rather than blocks on a small viewport', () => {
    const report = evaluatePreflight({ ...base, viewport: { width: 1280, height: 800 } });
    expect(report.canStart).toBe(true);
    expect(report.checks.find((c) => c.id === 'viewport')?.status).toBe('warning');
  });

  it('blocks when the CDN derivative is unreachable', () => {
    const report = evaluatePreflight({
      ...base,
      delivery: { ...validDelivery, status: 404, ok: false, valid: false, findings: ['HTTP status 404, expected 200.'] },
    });
    expect(report.canStart).toBe(false);
  });
});
