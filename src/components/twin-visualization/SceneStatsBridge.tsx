/**
 * SceneStatsBridge
 *
 * Publishes measured renderer counters and a frame-time sampler from inside
 * the live twin canvas so an administrator-operated validation harness can
 * read real evidence instead of estimates. Nothing here changes what renders.
 */

import { useEffect } from 'react';
import { useFrame, useThree } from '@react-three/fiber';

export interface SceneStatsSnapshot {
  drawCalls: number;
  triangles: number;
  geometries: number;
  textures: number;
  programs: number;
  canvas: { width: number; height: number };
  devicePixelRatio: number;
  rendererVendor: string | null;
  rendererName: string | null;
  webgl2: boolean;
}

interface SamplerState {
  active: boolean;
  frameTimesMs: number[];
}

const sampler: SamplerState = { active: false, frameTimesMs: [] };
let snapshot: SceneStatsSnapshot | null = null;

declare global {
  interface Window {
    __auraSceneBridge?: {
      getStats: () => SceneStatsSnapshot | null;
      startSampling: () => void;
      stopSampling: () => number[];
    };
  }
}

if (typeof window !== 'undefined') {
  window.__auraSceneBridge = {
    getStats: () => snapshot,
    startSampling: () => {
      sampler.frameTimesMs = [];
      sampler.active = true;
    },
    stopSampling: () => {
      sampler.active = false;
      return [...sampler.frameTimesMs];
    },
  };
}

export function SceneStatsBridge() {
  const { gl } = useThree();

  useEffect(() => {
    const context = gl.getContext();
    const debug = context.getExtension('WEBGL_debug_renderer_info');
    const vendor = debug
      ? String(context.getParameter(debug.UNMASKED_VENDOR_WEBGL) ?? '')
      : String(context.getParameter(context.VENDOR) ?? '');
    const name = debug
      ? String(context.getParameter(debug.UNMASKED_RENDERER_WEBGL) ?? '')
      : String(context.getParameter(context.RENDERER) ?? '');
    snapshot = {
      drawCalls: 0,
      triangles: 0,
      geometries: 0,
      textures: 0,
      programs: 0,
      canvas: { width: gl.domElement.width, height: gl.domElement.height },
      devicePixelRatio: gl.getPixelRatio(),
      rendererVendor: vendor || null,
      rendererName: name || null,
      webgl2: typeof WebGL2RenderingContext !== 'undefined' && context instanceof WebGL2RenderingContext,
    };
    return () => {
      snapshot = null;
    };
  }, [gl]);

  useFrame((_, delta) => {
    if (sampler.active) {
      const ms = delta * 1000;
      if (Number.isFinite(ms) && ms > 0) sampler.frameTimesMs.push(ms);
    }
    if (!snapshot) return;
    const info = gl.info;
    snapshot.drawCalls = info.render.calls;
    snapshot.triangles = info.render.triangles;
    snapshot.geometries = info.memory.geometries;
    snapshot.textures = info.memory.textures;
    snapshot.programs = info.programs?.length ?? 0;
    snapshot.canvas = { width: gl.domElement.width, height: gl.domElement.height };
    snapshot.devicePixelRatio = gl.getPixelRatio();
  });

  return null;
}
