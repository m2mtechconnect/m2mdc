/**
 * WebGL renderer classification for the GPU CI matrix.
 *
 * Playwright on a plain CI runner falls back to SwiftShader (software
 * rasterisation), where a real WebGL canvas can legitimately be absent.
 * Tests that need hardware rendering must be able to tell the two apart so
 * the matrix can report "software-rendering limitation" separately from a
 * genuine product failure.
 */

import type { Page, TestInfo } from '@playwright/test';

export type RendererClass = 'hardware' | 'software' | 'unavailable';

export interface RendererProbe {
  classification: RendererClass;
  vendor: string | null;
  renderer: string | null;
}

const SOFTWARE_MARKERS = [
  'swiftshader',
  'llvmpipe',
  'softwarerasterizer',
  'software rasterizer',
  'mesa offscreen',
  'google inc. (google)',
];

export function classifyRenderer(renderer: string | null): RendererClass {
  if (!renderer) return 'unavailable';
  const normalized = renderer.toLowerCase();
  return SOFTWARE_MARKERS.some((marker) => normalized.includes(marker)) ? 'software' : 'hardware';
}

/** Probes the live browser for its WebGL renderer string. */
export async function probeRenderer(page: Page): Promise<RendererProbe> {
  const raw = await page.evaluate(() => {
    try {
      const canvas = document.createElement('canvas');
      const gl = (canvas.getContext('webgl2') ||
        canvas.getContext('webgl')) as WebGLRenderingContext | null;
      if (!gl) return null;
      const ext = gl.getExtension('WEBGL_debug_renderer_info');
      return {
        vendor: String(ext ? gl.getParameter(ext.UNMASKED_VENDOR_WEBGL) : gl.getParameter(gl.VENDOR)),
        renderer: String(
          ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER),
        ),
      };
    } catch {
      return null;
    }
  });

  return {
    vendor: raw?.vendor ?? null,
    renderer: raw?.renderer ?? null,
    classification: classifyRenderer(raw?.renderer ?? null),
  };
}

/**
 * Records the renderer on the test so the matrix reporter can separate real
 * failures from software-rendering limitations.
 *
 * `AURA_GPU_REQUIRED=1` marks the job as one that expects hardware WebGL.
 */
export function annotateRenderer(testInfo: TestInfo, probe: RendererProbe): void {
  testInfo.annotations.push({
    type: 'webgl-renderer',
    description: `${probe.classification}: ${probe.renderer ?? 'none'} (${probe.vendor ?? 'unknown vendor'})`,
  });
  if (probe.classification !== 'hardware') {
    testInfo.annotations.push({
      type: 'software-rendering-limitation',
      description:
        'No hardware WebGL context in this environment; 3D canvas assertions are advisory here.',
    });
  }
}

export const gpuRequired = process.env.AURA_GPU_REQUIRED === '1';
