/**
 * Shared physically based materials for the AURA data-centre twin.
 *
 * All facility geometry draws from this cache so that:
 *  - materials are authored once (glTF metallic-roughness convention),
 *  - GPU material/program count stays bounded,
 *  - telemetry state is NEVER baked into a physical material (overlays are
 *    rendered as separate meshes, see `overlayMaterial`).
 */

import * as THREE from 'three';

export type SurfaceId =
  | 'powderCoatedSteel'
  | 'darkRackDoor'
  | 'perforatedMetal'
  | 'brushedMetal'
  | 'galvanizedTray'
  | 'glass'
  | 'rubberCable'
  | 'plasticConnector'
  | 'paintedPipe'
  | 'concrete'
  | 'raisedFloorTile';

interface SurfaceSpec {
  color: number;
  metalness: number;
  roughness: number;
  opacity?: number;
  transparent?: boolean;
}

/**
 * Restrained industrial surface definitions. Values are chosen to stay
 * readable under neutral 4000-5000K lighting: no mirror-like surfaces, no
 * crushed blacks, no decorative colours.
 */
const SURFACES: Record<SurfaceId, SurfaceSpec> = {
  powderCoatedSteel: { color: 0x8e949c, metalness: 0.35, roughness: 0.62 },
  darkRackDoor: { color: 0x2b2f36, metalness: 0.45, roughness: 0.55 },
  perforatedMetal: { color: 0x3a3f47, metalness: 0.55, roughness: 0.48 },
  brushedMetal: { color: 0xb2b7bd, metalness: 0.78, roughness: 0.36 },
  galvanizedTray: { color: 0x9aa1a8, metalness: 0.7, roughness: 0.45 },
  glass: { color: 0xaebfcc, metalness: 0.1, roughness: 0.08, opacity: 0.18, transparent: true },
  rubberCable: { color: 0x1f2329, metalness: 0.0, roughness: 0.9 },
  plasticConnector: { color: 0x4a5058, metalness: 0.0, roughness: 0.7 },
  paintedPipe: { color: 0x5c6b7a, metalness: 0.3, roughness: 0.55 },
  concrete: { color: 0x6f7378, metalness: 0.0, roughness: 0.95 },
  raisedFloorTile: { color: 0x51565c, metalness: 0.15, roughness: 0.8 },
};

const cache = new Map<string, THREE.Material>();

/** Get (and memoise) a shared standard material for an industrial surface. */
export function surfaceMaterial(id: SurfaceId): THREE.MeshStandardMaterial {
  const existing = cache.get(id);
  if (existing) return existing as THREE.MeshStandardMaterial;

  const spec = SURFACES[id];
  const material = new THREE.MeshStandardMaterial({
    color: new THREE.Color(spec.color),
    metalness: spec.metalness,
    roughness: spec.roughness,
    transparent: spec.transparent ?? false,
    opacity: spec.opacity ?? 1,
    side: spec.transparent ? THREE.DoubleSide : THREE.FrontSide,
  });
  material.name = `aura/${id}`;
  cache.set(id, material);
  return material;
}

/**
 * Emissive material for status LEDs. Kept intentionally small and dim so the
 * scene does not turn into a light show. Colour here is hardware state
 * (link/health LEDs), not telemetry overlay data.
 */
export function ledMaterial(hex: string): THREE.MeshBasicMaterial {
  const key = `led:${hex}`;
  const existing = cache.get(key);
  if (existing) return existing as THREE.MeshBasicMaterial;
  const material = new THREE.MeshBasicMaterial({ color: new THREE.Color(hex) });
  material.name = `aura/led/${hex}`;
  cache.set(key, material);
  return material;
}

/**
 * Overlay material: a separate, additive-free translucent layer rendered on a
 * dedicated mesh in front of the equipment. The underlying PBR material is
 * never modified, so clearing an overlay always restores the physical look.
 */
export function overlayMaterial(hex: string, opacity: number): THREE.MeshBasicMaterial {
  const key = `overlay:${hex}:${opacity.toFixed(2)}`;
  const existing = cache.get(key);
  if (existing) return existing as THREE.MeshBasicMaterial;
  const material = new THREE.MeshBasicMaterial({
    color: new THREE.Color(hex),
    transparent: true,
    opacity,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
  material.name = `aura/overlay/${hex}`;
  cache.set(key, material);
  return material;
}

/** Distinct "no evidence" hatch colour - visibly different from a zero value. */
export const MISSING_EVIDENCE_COLOR = '#6b7280';

/** Dispose every cached material (call on facility switch / unmount teardown). */
export function disposeMaterialCache() {
  cache.forEach((m) => m.dispose());
  cache.clear();
}