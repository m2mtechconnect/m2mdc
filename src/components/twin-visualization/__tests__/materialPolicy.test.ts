import { describe, it, expect } from 'vitest';
import {
  BAND_PRESENTATION,
  MATERIAL_LIBRARY,
  classifyMaterial,
  materialCacheKey,
  resolveMaterialSpec,
} from '../materialPolicy';

describe('AURA material presentation policy', () => {
  it('separates painted steel, bare metal and plastic physically', () => {
    const steel = MATERIAL_LIBRARY['painted-steel'];
    const metal = MATERIAL_LIBRARY['bare-metal'];
    const plastic = MATERIAL_LIBRARY['plastic-composite'];
    expect(metal.metalness).toBeGreaterThan(steel.metalness);
    expect(plastic.metalness).toBeLessThan(0.1);
    expect(plastic.roughness).toBeGreaterThan(metal.roughness);
  });

  it('never authors a mirror or a pure black surface', () => {
    for (const spec of Object.values(MATERIAL_LIBRARY)) {
      expect(spec.roughness).toBeGreaterThan(0.1);
      expect(spec.color).toBeGreaterThan(0x000000);
      expect(spec.envMapIntensity).toBeLessThanOrEqual(1);
    }
  });

  it('classifies by authored name before falling back to the role default', () => {
    expect(classifyMaterial('server-1u', 'Rail_Left')).toBe('bare-metal');
    expect(classifyMaterial('server-1u', 'Status_LED_01')).toBe('status-led');
    expect(classifyMaterial('server-1u', null)).toBe('faceplate');
    expect(classifyMaterial('rack-core-reference', 'Door_Front')).toBe('painted-steel');
    expect(classifyMaterial('cable-tray', 'Cable_Bundle_A')).toBe('cable');
  });

  it('suppresses LED emissive at overview and restores it when selected', () => {
    const overview = resolveMaterialSpec({ role: 'server-1u', name: 'LED', band: 'overview', hasStateEvidence: true });
    const selected = resolveMaterialSpec({ role: 'server-1u', name: 'LED', band: 'selected', hasStateEvidence: true });
    expect(overview.emissiveIntensity).toBe(0);
    expect(selected.emissiveIntensity).toBeGreaterThan(0);
  });

  it('renders a neutral LED when no state evidence exists', () => {
    const noEvidence = resolveMaterialSpec({ role: 'server-1u', name: 'LED', band: 'selected' });
    expect(noEvidence.emissive).toBe(0x000000);
    expect(noEvidence.emissiveIntensity).toBe(0);
  });

  it('never gives a farther band richer presentation than a nearer band', () => {
    const order = ['overview', 'nearby', 'selected'] as const;
    for (let i = 1; i < order.length; i += 1) {
      expect(BAND_PRESENTATION[order[i]].emissiveScale).toBeGreaterThanOrEqual(
        BAND_PRESENTATION[order[i - 1]].emissiveScale,
      );
      expect(BAND_PRESENTATION[order[i]].envScale).toBeGreaterThanOrEqual(
        BAND_PRESENTATION[order[i - 1]].envScale,
      );
    }
  });

  it('shares one cache key across identical materials so materials cannot explode', () => {
    const a = resolveMaterialSpec({ role: 'server-1u', name: 'Faceplate_A', band: 'nearby' });
    const b = resolveMaterialSpec({ role: 'server-2u', name: 'Faceplate_B', band: 'nearby' });
    expect(materialCacheKey(a)).toBe(materialCacheKey(b));
    const far = resolveMaterialSpec({ role: 'server-1u', name: 'Faceplate_A', band: 'overview' });
    expect(materialCacheKey(far)).not.toBe(materialCacheKey(a));
  });
});
