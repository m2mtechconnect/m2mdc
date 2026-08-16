/**
 * Runtime binder for the AURA-authored material presentation policy.
 *
 * Applies `materialPolicy` values to the materials of a loaded GLB derivative.
 * Materials are shared: every mesh resolving to the same class/band/state gets
 * the same three.js material instance, so material count stays bounded no
 * matter how many servers or cabinets are placed.
 */

import { MeshStandardMaterial, type Material, type Mesh, type Object3D } from 'three';
import type { DistanceBand, SemanticRole } from './assetRegistry';
import { materialCacheKey, resolveMaterialSpec } from './materialPolicy';

const SHARED = new Map<string, MeshStandardMaterial>();

function sharedMaterial(spec: ReturnType<typeof resolveMaterialSpec>): MeshStandardMaterial {
  const key = materialCacheKey(spec);
  const existing = SHARED.get(key);
  if (existing) return existing;
  const material = new MeshStandardMaterial({
    color: spec.color,
    roughness: spec.roughness,
    metalness: spec.metalness,
  });
  material.envMapIntensity = spec.envMapIntensity;
  material.emissive.setHex(spec.emissive ?? 0x000000);
  material.emissiveIntensity = spec.emissiveIntensity ?? 0;
  material.userData.auraMaterialClass = spec.materialClass;
  material.userData.auraAuthored = true;
  SHARED.set(key, material);
  return material;
}

/** Number of distinct AURA-authored materials currently shared in the scene. */
export function sharedMaterialCount() {
  return SHARED.size;
}

export function applyMaterialPolicy(
  root: Object3D,
  options: { role: SemanticRole; band: DistanceBand; hasStateEvidence?: boolean; stateEmissive?: number },
) {
  root.traverse((object) => {
    const mesh = object as Mesh;
    if (!mesh.isMesh) return;
    const list: Material[] = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
    const replaced = list.map((existing) => {
      const name = existing?.name || mesh.name;
      const spec = resolveMaterialSpec({
        role: options.role,
        name,
        band: options.band,
        hasStateEvidence: options.hasStateEvidence,
        stateEmissive: options.stateEmissive,
      });
      return sharedMaterial(spec);
    });
    mesh.material = Array.isArray(mesh.material) ? replaced : replaced[0];
  });
}
