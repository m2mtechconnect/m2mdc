/**
 * WebGL capability detection for the Live Twin Preview.
 *
 * Runs before mounting <Canvas /> so unsupported / degraded environments
 * show an informative fallback instead of a black rectangle.
 */

export type WebGLCapabilityStatus =
  | 'ok'                 // WebGL2 with a real GPU renderer
  | 'webgl1-only'        // WebGL1 available, WebGL2 missing (drei/three want WebGL2)
  | 'software'           // SwiftShader / llvmpipe / ANGLE software fallback
  | 'blocklisted'        // browser blocked GPU (e.g. driver flagged)
  | 'unsupported'        // no WebGL context at all
  | 'unknown';           // detection failed defensively

export interface WebGLCapabilityReport {
  status: WebGLCapabilityStatus;
  renderer?: string;
  vendor?: string;
  reason: string;
}

const SOFTWARE_RENDERER_HINTS = [
  'swiftshader',
  'llvmpipe',
  'software',
  'basic render driver',
  'microsoft basic render',
  'google swiftshader',
];

function readRendererInfo(gl: WebGLRenderingContext | WebGL2RenderingContext) {
  try {
    const dbg = gl.getExtension('WEBGL_debug_renderer_info');
    if (dbg) {
      return {
        renderer: String(gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL) || ''),
        vendor: String(gl.getParameter(dbg.UNMASKED_VENDOR_WEBGL) || ''),
      };
    }
  } catch {
    /* ignore - some browsers block the extension */
  }
  return {
    renderer: String(gl.getParameter(gl.RENDERER) || ''),
    vendor: String(gl.getParameter(gl.VENDOR) || ''),
  };
}

function isSoftwareRenderer(renderer: string) {
  const r = renderer.toLowerCase();
  return SOFTWARE_RENDERER_HINTS.some((hint) => r.includes(hint));
}

/**
 * Probe WebGL support without mounting a react-three-fiber scene.
 * Uses an offscreen canvas so nothing is added to the DOM.
 */
export function detectWebGLCapability(): WebGLCapabilityReport {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return { status: 'unknown', reason: 'Not running in a browser.' };
  }

  let canvas: HTMLCanvasElement;
  try {
    canvas = document.createElement('canvas');
  } catch {
    return { status: 'unknown', reason: 'Could not create a probe canvas.' };
  }

  const contextOptions: WebGLContextAttributes = {
    failIfMajorPerformanceCaveat: false, // detect software first, then decide
    powerPreference: 'high-performance',
  };

  const gl2 = canvas.getContext('webgl2', contextOptions) as WebGL2RenderingContext | null;
  if (gl2) {
    const { renderer, vendor } = readRendererInfo(gl2);
    if (isSoftwareRenderer(renderer) || isSoftwareRenderer(vendor)) {
      return {
        status: 'software',
        renderer,
        vendor,
        reason:
          'Your browser is rendering WebGL in software (no GPU acceleration), which would make the 3D twin unusable.',
      };
    }
    return {
      status: 'ok',
      renderer,
      vendor,
      reason: 'WebGL2 available.',
    };
  }

  // No WebGL2 - check if any WebGL exists so we can give a better message.
  const gl1 = (canvas.getContext('webgl', contextOptions) ||
    canvas.getContext('experimental-webgl', contextOptions)) as WebGLRenderingContext | null;

  if (gl1) {
    const { renderer, vendor } = readRendererInfo(gl1);
    if (isSoftwareRenderer(renderer) || isSoftwareRenderer(vendor)) {
      return {
        status: 'software',
        renderer,
        vendor,
        reason:
          'Your browser is rendering WebGL in software (no GPU acceleration), which would make the 3D twin unusable.',
      };
    }
    return {
      status: 'webgl1-only',
      renderer,
      vendor,
      reason:
        'Your browser only supports WebGL 1. The interactive twin requires WebGL 2.',
    };
  }

  // Nothing at all - could be disabled by policy, blocked driver, or genuinely unsupported.
  const ua = (typeof navigator !== 'undefined' ? navigator.userAgent : '').toLowerCase();
  const looksLikeBlocklist =
    ua.includes('chrome') || ua.includes('edg') || ua.includes('firefox');

  return {
    status: looksLikeBlocklist ? 'blocklisted' : 'unsupported',
    reason: looksLikeBlocklist
      ? 'Your browser has WebGL disabled or your GPU driver is blocklisted.'
      : 'This browser does not support WebGL.',
  };
}