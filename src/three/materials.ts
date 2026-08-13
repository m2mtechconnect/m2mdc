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
import { disposeTextureCache, faceplateMap, floorTileMap, perforationAlpha } from './textures';

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
  | 'raisedFloorTile'
  | 'serverFaceplate'
  | 'blackPlastic'
  | 'safetyPaint'
  | 'wallPanel'
  | 'ceilingPanel'
  | 'copperBus'
  | 'chilledPipe'
  | 'blankingPanel';

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
  serverFaceplate: { color: 0x2a2e34, metalness: 0.5, roughness: 0.45 },
  blackPlastic: { color: 0x1b1e22, metalness: 0.0, roughness: 0.75 },
  safetyPaint: { color: 0xd8a72c, metalness: 0.0, roughness: 0.85 },
  wallPanel: { color: 0x9299a1, metalness: 0.05, roughness: 0.9 },
  ceilingPanel: { color: 0x767c84, metalness: 0.1, roughness: 0.88 },
  copperBus: { color: 0xa5713f, metalness: 0.85, roughness: 0.35 },
  chilledPipe: { color: 0x7f97ad, metalness: 0.6, roughness: 0.4 },
  blankingPanel: { color: 0x33373d, metalness: 0.2, roughness: 0.72 },
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

/**
 * Perforated door / mesh panel material. Uses a locally generated alpha map so
 * the door is genuinely see-through (readable as a mesh door, visually distinct
 * from the solid rack sides) rather than a flat grey rectangle.
 */
export function perforatedDoorMaterial(): THREE.MeshStandardMaterial {
  const key = 'perforatedDoor';
  const existing = cache.get(key);
  if (existing) return existing as THREE.MeshStandardMaterial;
  const material = new THREE.MeshStandardMaterial({
    color: new THREE.Color(0x24282e),
    metalness: 0.62,
    roughness: 0.42,
    alphaMap: perforationAlpha(9),
    transparent: true,
    alphaTest: 0.35,
    side: THREE.DoubleSide,
  });
  material.name = 'aura/perforatedDoor';
  cache.set(key, material);
  return material;
}

/** Server faceplate with vent / bay detail so 1U trays read at aisle distance. */
export function faceplateMaterial(): THREE.MeshStandardMaterial {
  const key = 'faceplateDetail';
  const existing = cache.get(key);
  if (existing) return existing as THREE.MeshStandardMaterial;
  const material = new THREE.MeshStandardMaterial({
    color: new THREE.Color(0xffffff),
    map: faceplateMap(),
    metalness: 0.45,
    roughness: 0.5,
  });
  material.name = 'aura/faceplateDetail';
  cache.set(key, material);
  return material;
}

/** Raised-floor tile material with 600 mm seams and stringer bolts. */
export function floorMaterial(repeat = 40): THREE.MeshStandardMaterial {
  const key = `floor:${repeat}`;
  const existing = cache.get(key);
  if (existing) return existing as THREE.MeshStandardMaterial;
  const material = new THREE.MeshStandardMaterial({
    color: new THREE.Color(0xffffff),
    map: floorTileMap(repeat),
    metalness: 0.12,
    roughness: 0.86,
  });
  material.name = 'aura/floorTiles';
  cache.set(key, material);
  return material;
}

/** Perforated cold-aisle floor tile (supply air grille). */
export function perforatedTileMaterial(): THREE.MeshStandardMaterial {
  const key = 'perforatedTile';
  const existing = cache.get(key);
  if (existing) return existing as THREE.MeshStandardMaterial;
  const material = new THREE.MeshStandardMaterial({
    color: new THREE.Color(0x3c4148),
    metalness: 0.55,
    roughness: 0.5,
    alphaMap: perforationAlpha(6),
    transparent: true,
    alphaTest: 0.3,
  });
  material.name = 'aura/perforatedTile';
  cache.set(key, material);
  return material;
}

/** Distinct "no evidence" hatch colour - visibly different from a zero value. */
export const MISSING_EVIDENCE_COLOR = '#6b7280';

/** Dispose every cached material (call on facility switch / unmount teardown). */
export function disposeMaterialCache() {
  cache.forEach((m) => m.dispose());
  cache.clear();
  disposeTextureCache();
}