/**
 * Renderer identification for the hardware GPU acceptance harness.
 *
 * A software rasteriser must never be reported as a GPU, and a browser that
 * hides the renderer string must be reported as unavailable rather than
 * guessed at.
 */

export type RendererClassification = 'hardware' | 'software' | 'unavailable';

export interface RendererReport {
  classification: RendererClassification;
  webglVersion: 'webgl2' | 'webgl1' | 'none';
  webgl2Available: boolean;
  vendor: string | null;
  renderer: string | null;
  unmaskedAvailable: boolean;
  browser: string;
  operatingSystem: string;
  canvasResolution: { width: number; height: number } | null;
  devicePixelRatio: number;
  qualityProfile: string;
  highPerformanceRequested: boolean;
  note: string;
}

const SOFTWARE_MARKERS = [
  'swiftshader',
  'llvmpipe',
  'software',
  'softwarerasterizer',
  'mesa offscreen',
  'basic render driver',
  'angle (google, vulkan 1.3.0 (swiftshader',
];

export function classifyRenderer(renderer: string | null): RendererClassification {
  if (!renderer || !renderer.trim()) return 'unavailable';
  const value = renderer.toLowerCase();
  return SOFTWARE_MARKERS.some((marker) => value.includes(marker)) ? 'software' : 'hardware';
}

function detectBrowser(ua: string): string {
  if (/edg\//i.test(ua)) return 'Microsoft Edge';
  if (/chrome\//i.test(ua) && !/chromium/i.test(ua)) return 'Google Chrome';
  if (/chromium/i.test(ua)) return 'Chromium';
  if (/firefox\//i.test(ua)) return 'Mozilla Firefox';
  if (/safari\//i.test(ua)) return 'Safari';
  return 'Unknown browser';
}

function detectOs(ua: string): string {
  if (/windows nt/i.test(ua)) return 'Windows';
  if (/mac os x/i.test(ua)) return 'macOS';
  if (/android/i.test(ua)) return 'Android';
  if (/(iphone|ipad|ipod)/i.test(ua)) return 'iOS';
  if (/linux/i.test(ua)) return 'Linux';
  return 'Unknown operating system';
}

export function probeRenderer(options: {
  canvas?: HTMLCanvasElement | null;
  qualityProfile: string;
  devicePixelRatio?: number;
}): RendererReport {
  const ua = typeof navigator === 'undefined' ? '' : navigator.userAgent;
  const base = {
    browser: detectBrowser(ua),
    operatingSystem: detectOs(ua),
    qualityProfile: options.qualityProfile,
    highPerformanceRequested: true,
    devicePixelRatio:
      options.devicePixelRatio ?? (typeof window === 'undefined' ? 1 : window.devicePixelRatio),
    canvasResolution: options.canvas
      ? { width: options.canvas.width, height: options.canvas.height }
      : null,
  };

  if (typeof document === 'undefined') {
    return {
      ...base,
      classification: 'unavailable',
      webglVersion: 'none',
      webgl2Available: false,
      vendor: null,
      renderer: null,
      unmaskedAvailable: false,
      note: 'Renderer unavailable: not running in a browser.',
    };
  }

  const probe = document.createElement('canvas');
  const attributes: WebGLContextAttributes = { powerPreference: 'high-performance' };
  const gl2 = probe.getContext('webgl2', attributes) as WebGL2RenderingContext | null;
  const gl = (gl2 ??
    probe.getContext('webgl', attributes) ??
    probe.getContext('experimental-webgl', attributes)) as WebGLRenderingContext | null;

  if (!gl) {
    return {
      ...base,
      classification: 'unavailable',
      webglVersion: 'none',
      webgl2Available: false,
      vendor: null,
      renderer: null,
      unmaskedAvailable: false,
      note: 'Renderer unavailable: no WebGL context could be created.',
    };
  }

  const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
  const renderer = debugInfo
    ? String(gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) ?? '')
    : null;
  const vendor = debugInfo ? String(gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL) ?? '') : null;
  const classification = debugInfo ? classifyRenderer(renderer) : 'unavailable';

  return {
    ...base,
    classification,
    webglVersion: gl2 ? 'webgl2' : 'webgl1',
    webgl2Available: !!gl2,
    vendor: vendor || null,
    renderer: renderer || null,
    unmaskedAvailable: !!debugInfo,
    note:
      classification === 'hardware'
        ? 'Hardware renderer confirmed.'
        : classification === 'software'
          ? 'Software renderer detected. Diagnostic measurements are allowed; a GPU-verified verdict is not.'
          : 'Renderer unavailable: browser privacy controls hide the GPU identity. No GPU identity is inferred.',
  };
}