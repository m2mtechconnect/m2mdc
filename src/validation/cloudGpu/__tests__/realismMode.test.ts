import { describe, expect, it, beforeEach } from 'vitest';
import {
  BASELINE_UNIFORM_SPEC,
  DEFAULT_REALISM_MODE,
  getRealismMode,
  parseRealismMode,
  readRealismModeFromSearch,
  setRealismMode,
} from '@/components/twin-visualization/realismMode';
import { CLOUD_GPU_BASELINE } from '../baselineSnapshot';
import { VALIDATION_VIEWS, CAPTURE_VIEWPORT, CAPTURE_DEVICE_PIXEL_RATIO, captureFileName } from '../views';
import { MATERIAL_LIBRARY } from '@/components/twin-visualization/materialPolicy';

describe('realism A/B lane', () => {
  beforeEach(() => setRealismMode(DEFAULT_REALISM_MODE));

  it('defaults to the video-informed presentation', () => {
    expect(getRealismMode()).toBe('video-informed');
  });

  it('only accepts the two documented modes', () => {
    expect(parseRealismMode('baseline')).toBe('baseline');
    expect(parseRealismMode('video-informed')).toBe('video-informed');
    expect(parseRealismMode('shiny')).toBeNull();
    expect(parseRealismMode(null)).toBeNull();
  });

  it('reads the validation query parameter', () => {
    expect(readRealismModeFromSearch('?realism=baseline')).toBe('baseline');
    expect(readRealismModeFromSearch('?twin=abc')).toBeNull();
  });

  it('keeps the baseline uniform tuning distinct from every policy class', () => {
    const classes = Object.values(MATERIAL_LIBRARY);
    const identical = classes.some(
      (spec) =>
        spec.color === BASELINE_UNIFORM_SPEC.color &&
        spec.roughness === BASELINE_UNIFORM_SPEC.roughness &&
        spec.metalness === BASELINE_UNIFORM_SPEC.metalness,
    );
    expect(identical).toBe(false);
  });
});

describe('protected cloud-GPU baseline', () => {
  it('pins the verified mount counts', () => {
    expect(CLOUD_GPU_BASELINE.nvidiaObjects).toBe(178);
    expect(CLOUD_GPU_BASELINE.auraFacilityObjects).toBe(916);
    expect(CLOUD_GPU_BASELINE.rackCabinets).toBe(40);
    expect(CLOUD_GPU_BASELINE.physicalFallbacks).toBe(0);
    expect(CLOUD_GPU_BASELINE.geometryModified).toBe(false);
  });

  it('pins one material class per documented family', () => {
    expect(Object.keys(MATERIAL_LIBRARY)).toHaveLength(CLOUD_GPU_BASELINE.materialClasses);
  });
});

describe('deterministic capture views', () => {
  it('covers the ten required views with unique ids', () => {
    expect(VALIDATION_VIEWS).toHaveLength(10);
    expect(new Set(VALIDATION_VIEWS.map((v) => v.id)).size).toBe(10);
  });

  it('captures both modes at an identical viewport and DPR', () => {
    expect(CAPTURE_VIEWPORT).toEqual({ width: 1920, height: 1080 });
    expect(CAPTURE_DEVICE_PIXEL_RATIO).toBe(1);
    expect(captureFileName('baseline', 'facility-overview')).toBe('facility-overview__baseline.png');
  });

  it('keeps physical views free of analytical overlays except the thermal view', () => {
    const withOverlays = VALIDATION_VIEWS.filter((v) => v.overlays.length > 0);
    expect(withOverlays.map((v) => v.id)).toEqual(['localized-thermal']);
  });
});