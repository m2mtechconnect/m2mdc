/**
 * Preflight gate for the administrator-operated hardware GPU acceptance run.
 *
 * Every condition that could invalidate a hardware verdict is checked BEFORE
 * "Start validation" is enabled. A software rasteriser can never be allowed to
 * produce a GPU-verified result, so it is reported as Blocked.
 */

import { getAsset, resolveByChecksum, resolveRuntimeAsset } from '@/components/twin-visualization/assetRegistry';
import { verifyDelivery, type DeliveryReport } from './delivery';
import { probeRenderer, type RendererReport } from './renderer';
import { BENCHMARK_CONFIG, type AssetExpectation } from './spec';

export type PreflightStatus = 'pass' | 'warning' | 'blocked';

export interface PreflightCheck {
  id: string;
  label: string;
  status: PreflightStatus;
  detail: string;
}

export interface PreflightReport {
  checks: PreflightCheck[];
  canStart: boolean;
  softwareRendering: boolean;
  renderer: RendererReport;
  delivery: DeliveryReport;
}

export const SOFTWARE_RENDERER_GUIDANCE =
  'Hardware acceleration is unavailable. Open this page locally in Chrome or Edge on a GPU-equipped computer. Do not use a virtual machine or Remote Desktop session.';

export interface PreflightInput {
  isAdmin: boolean;
  renderer: RendererReport;
  delivery: DeliveryReport;
  expected: AssetExpectation;
  viewport: { width: number; height: number };
  /** Checksum recorded on the active manifest entry. */
  manifestChecksum: string | null;
  /** True when at least one superseded checksum still resolves (must be false). */
  supersededResolves: boolean;
}

export function evaluatePreflight(input: PreflightInput): Omit<PreflightReport, 'renderer' | 'delivery'> {
  const { isAdmin, renderer, delivery, expected, viewport } = input;
  const checks: PreflightCheck[] = [];

  checks.push({
    id: 'admin',
    label: 'Signed in as an administrator or owner',
    status: isAdmin ? 'pass' : 'blocked',
    detail: isAdmin ? 'Administrator session confirmed.' : 'Admin or owner role required.',
  });

  checks.push({
    id: 'webgl2',
    label: 'Browser supports WebGL2',
    status: renderer.webgl2Available ? 'pass' : 'blocked',
    detail: renderer.webgl2Available
      ? 'WebGL2 context created.'
      : 'No WebGL2 context. Use a current Chrome or Edge build on a GPU-equipped computer.',
  });

  const softwareRendering = renderer.classification === 'software';
  checks.push({
    id: 'hardware-acceleration',
    label: 'WebGL is hardware accelerated',
    status: renderer.classification === 'hardware' ? 'pass' : 'blocked',
    detail:
      renderer.classification === 'hardware'
        ? `${renderer.renderer ?? 'GPU'} (${renderer.vendor ?? 'unknown vendor'}).`
        : softwareRendering
          ? SOFTWARE_RENDERER_GUIDANCE
          : 'Renderer unavailable: browser privacy controls hide the GPU identity. No GPU identity is inferred and no GPU-verified verdict can be issued.',
  });

  checks.push({
    id: 'not-software-renderer',
    label: 'Renderer is not SwiftShader, llvmpipe or another software renderer',
    status: softwareRendering ? 'blocked' : renderer.classification === 'hardware' ? 'pass' : 'warning',
    detail: softwareRendering
      ? `Software rasteriser detected: ${renderer.renderer ?? 'unknown'}.`
      : renderer.classification === 'hardware'
        ? 'No software rasteriser identifiers present.'
        : 'Renderer string hidden, so a software rasteriser cannot be ruled out.',
  });

  const viewportOk =
    viewport.width >= BENCHMARK_CONFIG.viewport.width && viewport.height >= BENCHMARK_CONFIG.viewport.height;
  checks.push({
    id: 'viewport',
    label: `Viewport can run the standardized ${BENCHMARK_CONFIG.viewport.width}x${BENCHMARK_CONFIG.viewport.height}, DPR 1 test`,
    status: viewportOk ? 'pass' : 'warning',
    detail: viewportOk
      ? `Browser viewport ${viewport.width}x${viewport.height}.`
      : `Browser viewport ${viewport.width}x${viewport.height} is smaller than the benchmark surface; the run is downscaled and comparability is reduced.`,
  });

  checks.push({
    id: 'cdn',
    label: 'Production CDN derivative is reachable',
    status: delivery.valid ? 'pass' : delivery.status === 200 ? 'warning' : 'blocked',
    detail: delivery.valid
      ? `HTTP ${delivery.status}, ${delivery.downloadedBytes} bytes, checksum verified from the delivery path.`
      : delivery.findings.join(' ') || 'Delivery could not be verified.',
  });

  const checksumAgrees = input.manifestChecksum === expected.checksum;
  checks.push({
    id: 'checksum-agreement',
    label: 'Expected checksum and active manifest record agree',
    status: checksumAgrees ? 'pass' : 'blocked',
    detail: checksumAgrees
      ? expected.checksum
      : `Manifest records ${input.manifestChecksum ?? 'no checksum'}, expected ${expected.checksum}.`,
  });

  checks.push({
    id: 'superseded-blocked',
    label: 'Superseded derivative cannot resolve',
    status: input.supersededResolves ? 'blocked' : 'pass',
    detail: input.supersededResolves
      ? 'A superseded build still resolves through the runtime registry.'
      : `${expected.supersededChecksums.length} superseded checksum(s) retained for audit history only; none resolve or mount.`,
  });

  return {
    checks,
    canStart: checks.every((c) => c.status !== 'blocked'),
    softwareRendering,
  };
}

/** Gathers live evidence and evaluates the preflight gate. */
export async function runPreflight(options: {
  isAdmin: boolean;
  expected: AssetExpectation;
}): Promise<PreflightReport> {
  const renderer = probeRenderer({
    qualityProfile: BENCHMARK_CONFIG.qualityProfile,
    devicePixelRatio: BENCHMARK_CONFIG.devicePixelRatioCap,
  });
  const delivery = await verifyDelivery(options.expected);
  const entry = getAsset(options.expected.assetId);
  const supersededResolves = options.expected.supersededChecksums.some(
    (checksum) => resolveByChecksum(checksum) !== null || resolveRuntimeAsset(options.expected.assetId, {
      expectedChecksum: checksum,
    }).glbUrl !== null,
  );

  const evaluation = evaluatePreflight({
    isAdmin: options.isAdmin,
    renderer,
    delivery,
    expected: options.expected,
    viewport: {
      width: typeof window === 'undefined' ? 0 : window.innerWidth,
      height: typeof window === 'undefined' ? 0 : window.innerHeight,
    },
    manifestChecksum: entry?.checksum ?? null,
    supersededResolves,
  });

  return { ...evaluation, renderer, delivery };
}
