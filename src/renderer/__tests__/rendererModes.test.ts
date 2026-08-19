/**
 * AURA_ARCHITECTURE_CONSOLIDATION_AND_NVIDIA_ALIGNMENT - Phase 5 guard.
 */
import { describe, expect, it } from 'vitest';
import {
  RENDERER_MODES,
  getRendererMode,
  resolveRendererModeId,
  resolveKitStreamState,
  resolveRendererMode,
} from '../rendererModes';

describe('renderer interface modes', () => {
  it('is keyed to the four modes mandated by the hybrid runtime ADR', () => {
    expect(RENDERER_MODES.map((m) => m.id)).toEqual([
      'browser-preview',
      'kit-stream-nvcf',
      'kit-stream-self-managed',
      'unavailable',
    ]);
  });

  it('resolves legacy identifiers instead of throwing', () => {
    expect(resolveRendererModeId('aura-web-runtime').id).toBe('browser-preview');
    expect(resolveRendererModeId('aura-2d-fallback').id).toBe('unavailable');
    expect(resolveRendererModeId('nvidia-kit-stream').id).toBe('kit-stream-nvcf');
  });

  it('has unique ids and a stated blocker for every unimplemented mode', () => {
    const ids = RENDERER_MODES.map((m) => m.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const mode of RENDERER_MODES) {
      if (mode.blockedReason === null) expect(mode.implementation).toBeTruthy();
      else expect(mode.blockedReason.length).toBeGreaterThan(20);
    }
  });

  it('never labels an AURA renderer with an NVIDIA product name', () => {
    for (const mode of RENDERER_MODES.filter((m) => !m.nvidiaRuntime)) {
      expect(mode.label).not.toMatch(/omniverse|rtx|nvidia/i);
    }
  });

  it('holds the NVIDIA Kit stream unavailable with a reason in this build', () => {
    const kit = resolveKitStreamState();
    expect(kit.mode.id).toBe('kit-stream-nvcf');
    expect(kit.availability).toBe('unavailable');
    expect(kit.reason.length).toBeGreaterThan(20);
  });

  it('resolves to the AURA browser preview when WebGL2 works', () => {
    const state = resolveRendererMode({ webgl2Available: true });
    expect(state.mode.id).toBe('browser-preview');
    expect(state.mode.nvidiaRuntime).toBe(false);
    expect(state.availability).toBe('active');
  });

  it('falls back to the 2D plan view without WebGL2 or after a mount failure', () => {
    expect(resolveRendererMode({ webgl2Available: false }).mode.id).toBe('unavailable');
    const failed = resolveRendererMode({ webgl2Available: true, canvasFailed: true });
    expect(failed.mode.id).toBe('unavailable');
    expect(failed.availability).toBe('fallback');
  });

  it('throws on an unknown mode rather than inventing one', () => {
    // @ts-expect-error - guarding the runtime path
    expect(() => getRendererMode('kit-rtx-live')).toThrow();
  });
});