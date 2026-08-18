/**
 * Phase 3 - a viewport may only claim geometry it actually mounts.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { VIEWPORT_SURFACES, viewportDisclosure } from '../viewportRegistry';

const srcRoot = resolve(__dirname, '../..');
const read = (module: string) => readFileSync(resolve(srcRoot, module), 'utf8');

describe('viewport registry', () => {
  it('points at modules that exist', () => {
    for (const surface of VIEWPORT_SURFACES) {
      expect(existsSync(resolve(srcRoot, surface.module)), surface.module).toBe(true);
    }
  });

  it('declares a unique id per surface', () => {
    const ids = VIEWPORT_SURFACES.map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('only marks a surface three-webgl when it mounts DataCenter3DScene', () => {
    for (const surface of VIEWPORT_SURFACES) {
      const source = read(surface.module);
      const mountsScene = source.includes('DataCenter3DScene');
      expect(mountsScene, `${surface.id} renderer claim`).toBe(surface.renderer === 'three-webgl');
    }
  });

  it('never lets a 2D surface claim approved GLB geometry', () => {
    for (const surface of VIEWPORT_SURFACES) {
      if (surface.canMountApprovedGlb) expect(surface.renderer).toBe('three-webgl');
    }
  });

  it('never lets a surface disclose 3D or GLB geometry it cannot mount', () => {
    for (const surface of VIEWPORT_SURFACES) {
      if (surface.canMountApprovedGlb) continue;
      expect(surface.disclosure).not.toMatch(/\b3D\b/);
      expect(surface.disclosure).not.toMatch(/GLB|USD/i);
    }
  });

  it('sources the Command Centre disclosure from the registry, not a literal', () => {
    const source = read('workspace/dashboard/FacilityCanvas.tsx');
    expect(source).toContain('viewportDisclosure');
    expect(source).not.toContain('USD-derived GLB');
    expect(viewportDisclosure('command-centre-plan-card')).toBe(
      'Procedural 2D floor plan of the modelled design',
    );
  });
});
