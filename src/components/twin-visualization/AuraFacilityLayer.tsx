/**
 * AuraFacilityLayer
 *
 * Mounts the AURA-authored OpenUSD facility derivatives: raised-floor tiles,
 * perforated airflow tiles, data-hall luminaires, structural columns and the
 * parametric facility shell.
 *
 * Rules enforced here, identical to the NVIDIA equipment layer:
 *  - only assets the registry resolves as approved and runtime eligible mount;
 *  - one GLB fetch per derivative, shared by every placement through
 *    InstancedMesh, so a 1,300-tile floor stays within a few draw calls;
 *  - what mounted is reported to the runtime coverage store, and the family
 *    state is published so DataHall suppresses only the procedural geometry
 *    that a derivative actually replaced;
 *  - these assets are AURA-authored generic geometry. They carry no vendor
 *    identity, no SimReady certification and no NVIDIA authorship.
 */

import { Component, useEffect, useLayoutEffect, useMemo, useRef, type ReactNode } from 'react';
import * as THREE from 'three';
import { useDerivativeGltf } from './useDerivativeGltf';
import {
  getAsset,
  resolveRoleAssetForBand,
  resolveRuntimeAsset,
  type AssetManifestEntry,
  type DistanceBand,
  type QualityLevel,
  type SemanticRole,
} from './assetRegistry';
import { useRuntimeCoverageStore, type RoleCoverage } from './runtimeCoverageStore';
import { useFacilityDerivativeStore, type FacilityFamily } from './facilityDerivativeStore';
import type { RowVisual } from './types';
import type { InfrastructureLevel } from './infrastructureLevel';
import type { HallBounds, ShellMode } from './DataHall';

export interface Placement {
  position: [number, number, number];
  rotationY?: number;
  scale?: [number, number, number];
}

interface FamilyMount {
  family: FacilityFamily;
  role: SemanticRole;
  entry: AssetManifestEntry;
  url: string;
  placements: Placement[];
  /** Node names to keep; every other mesh in the derivative is skipped. */
  includeNodes?: string[];
}

type PendingCoverage = Omit<
  RoleCoverage,
  'mountedObjects' | 'glbInstances' | 'triangles' | 'drawCalls' | 'state'
>;

const WALL_CLEARANCE = 2.0;
const TILE = 0.6;
/** Tile top face sits exactly on the y = 0 rack contact plane. */
const TILE_THICKNESS = 0.035;
const CEILING = 4.2;

/**
 * Grid of tile centres covering the hall, split into standard tiles and the
 * perforated supply tiles that sit in the cold aisles.
 */
export function tileGrid(
  bounds: HallBounds,
  rows: RowVisual[],
): { standard: Placement[]; perforated: Placement[] } {
  const minX = bounds.minX - WALL_CLEARANCE;
  const maxX = bounds.maxX + WALL_CLEARANCE;
  const minZ = bounds.minZ - WALL_CLEARANCE;
  const maxZ = bounds.maxZ + WALL_CLEARANCE;
  const cols = Math.max(1, Math.round((maxX - minX) / TILE));
  const depth = Math.max(1, Math.round((maxZ - minZ) / TILE));
  const coldZ = rows.filter((r) => !r.isHotAisle).map((r) => r.position[2] + 1.4);

  const standard: Placement[] = [];
  const perforated: Placement[] = [];
  for (let ix = 0; ix < cols; ix += 1) {
    const x = minX + TILE / 2 + ix * TILE;
    for (let iz = 0; iz < depth; iz += 1) {
      const z = minZ + TILE / 2 + iz * TILE;
      const supply = coldZ.some((cz) => Math.abs(cz - z) <= TILE / 2);
      (supply ? perforated : standard).push({ position: [x, -TILE_THICKNESS, z] });
    }
  }
  return { standard, perforated };
}

/**
 * One derivative, many placements, drawn as InstancedMesh per source mesh so a
 * full tile floor costs one draw call per material rather than one per tile.
 */
function InstancedFamily({
  mount,
  token,
  coverage,
}: {
  mount: FamilyMount;
  token: string;
  coverage: PendingCoverage;
}) {
  const load = useDerivativeGltf(mount.url);
  const scene = load.scene;
  const groupRef = useRef<THREE.Group>(null);
  const report = useRuntimeCoverageStore((s) => s.reportRole);
  const setFamily = useFacilityDerivativeStore((s) => s.setFamily);
  const count = mount.placements.length;

  // Source meshes, with their transform inside the derivative preserved.
  const sources = useMemo(() => {
    if (!scene) return [];
    scene.updateMatrixWorld(true);
    const out: Array<{ name: string; geometry: THREE.BufferGeometry; material: THREE.Material; local: THREE.Matrix4 }> = [];
    scene.traverse((object) => {
      const mesh = object as THREE.Mesh;
      if (!mesh.isMesh) return;
      const name = mesh.name || (mesh.parent?.name ?? '');
      if (mount.includeNodes && !mount.includeNodes.some((n) => name.endsWith(n))) return;
      const material = Array.isArray(mesh.material) ? mesh.material[0] : mesh.material;
      out.push({ name, geometry: mesh.geometry, material, local: mesh.matrixWorld.clone() });
    });
    return out;
  }, [scene, mount.includeNodes]);

  useLayoutEffect(() => {
    const group = groupRef.current;
    if (!group || sources.length === 0) return;
    const placement = new THREE.Matrix4();
    const quaternion = new THREE.Quaternion();
    const combined = new THREE.Matrix4();
    group.children.forEach((child) => {
      const instanced = child as THREE.InstancedMesh;
      if (!instanced.isInstancedMesh) return;
      const local = instanced.userData.localMatrix as THREE.Matrix4;
      mount.placements.forEach((p, i) => {
        quaternion.setFromEuler(new THREE.Euler(0, p.rotationY ?? 0, 0));
        placement.compose(
          new THREE.Vector3(...p.position),
          quaternion,
          new THREE.Vector3(...(p.scale ?? [1, 1, 1])),
        );
        combined.multiplyMatrices(placement, local);
        instanced.setMatrixAt(i, combined);
      });
      instanced.instanceMatrix.needsUpdate = true;
      instanced.computeBoundingSphere();
    });
  }, [sources, mount.placements]);

  useEffect(() => {
    if (load.status === 'loading') {
      setFamily(mount.family, 'loading');
      report(token, {
        ...coverage,
        state: 'preparing',
        mountedObjects: 0,
        glbInstances: 0,
        triangles: 0,
        drawCalls: 0,
        detail: `Loading AURA-authored derivative ${mount.url}`,
      });
      return;
    }
    if (load.status === 'failed' || sources.length === 0) {
      setFamily(mount.family, 'fallback');
      report(token, {
        ...coverage,
        state: 'procedural-fallback',
        mountedObjects: 0,
        glbInstances: 0,
        triangles: 0,
        drawCalls: 0,
        proceduralObjects: count,
        detail:
          load.status === 'failed'
            ? `AURA derivative failed to load, procedural geometry retained: ${load.error}`
            : 'AURA derivative contained no usable mesh, procedural geometry retained.',
      });
      return;
    }
    setFamily(mount.family, 'mounted');
    report(token, {
      ...coverage,
      state: 'openusd-derived',
      mountedObjects: count,
      glbInstances: count * sources.length,
      triangles: (mount.entry.triangleCount ?? 0) * count,
      drawCalls: sources.length,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, count, sources.length, mount.entry.assetId, load.status, load.error]);

  // A family that unmounts must stop claiming a mount.
  useEffect(() => () => setFamily(mount.family, 'idle'), [setFamily, mount.family]);

  if (sources.length === 0 || count === 0) return null;
  return (
    <group
      ref={groupRef}
      name={`AuraFacility:${mount.family}`}
      userData={{ role: mount.role, assetId: mount.entry.assetId, source: 'aura-openusd-derived' }}
    >
      {sources.map((source, i) => (
        <instancedMesh
          key={`${mount.entry.assetId}-${source.name}-${i}`}
          args={[source.geometry, source.material, count]}
          castShadow
          receiveShadow
          userData={{ localMatrix: source.local, assetId: mount.entry.assetId }}
        />
      ))}
    </group>
  );
}

/** A derivative that throws during mount must report, never blank the hall. */
class FamilyBoundary extends Component<
  { token: string; family: FacilityFamily; coverage: PendingCoverage; children: ReactNode },
  { error: string | null }
> {
  state = { error: null as string | null };

  static getDerivedStateFromError(error: unknown) {
    return { error: error instanceof Error ? error.message : String(error) };
  }

  componentDidCatch(error: unknown) {
    const { token, coverage, family } = this.props;
    useFacilityDerivativeStore.getState().setFamily(family, 'fallback');
    useRuntimeCoverageStore.getState().reportRole(token, {
      ...coverage,
      state: 'procedural-fallback',
      mountedObjects: 0,
      glbInstances: 0,
      triangles: 0,
      drawCalls: 0,
      detail: `AURA derivative failed to mount: ${error instanceof Error ? error.message : String(error)}`,
    });
  }

  render() {
    if (this.state.error) return null;
    return this.props.children;
  }
}

interface Props {
  bounds: HallBounds;
  rows: RowVisual[];
  /** Overhead and structural detail level; `off` hides luminaires and columns. */
  infrastructure: InfrastructureLevel;
  /** Resolved shell selection driving the shell variant. */
  shellMode: ShellMode;
  band?: DistanceBand;
}

const FAMILY_ROLE: Record<FacilityFamily, SemanticRole> = {
  'raised-floor-tile': 'raised-floor-tile',
  'perforated-floor-tile': 'perforated-floor-tile',
  'data-hall-luminaire': 'data-hall-luminaire',
  'structural-column': 'structural-column',
  'facility-shell': 'facility-shell',
};

export function AuraFacilityLayer({ bounds, rows, infrastructure, shellMode, band = 'nearby' }: Props) {
  const showInfrastructure = infrastructure !== 'off';
  const token = useMemo(
    () => `aura-facility:${rows.length}:${infrastructure}:${shellMode}:${band}`,
    [rows.length, infrastructure, shellMode, band],
  );

  const mounts = useMemo<FamilyMount[]>(() => {
    const out: FamilyMount[] = [];
    const push = (family: FacilityFamily, placements: Placement[], includeNodes?: string[]) => {
      if (placements.length === 0) return;
      const role = FAMILY_ROLE[family];
      const entry = resolveRoleAssetForBand(role, band)?.entry ?? null;
      if (!entry) return;
      const url = resolveRuntimeAsset(entry.assetId).glbUrl;
      if (!url) return;
      out.push({ family, role, entry, url, placements, includeNodes });
    };

    const { standard, perforated } = tileGrid(bounds, rows);
    push('raised-floor-tile', standard);
    push('perforated-floor-tile', perforated);

    if (showInfrastructure) {
      // Luminaires hang between rows so they never collide with the tray runs
      // at 4.35 m or the busway at 4.6 m.
      const cx = (bounds.minX + bounds.maxX) / 2;
      const luminaires: Placement[] = [];
      rows.forEach((row, i) => {
        if (i === rows.length - 1) return;
        const z = (row.position[2] + rows[i + 1].position[2]) / 2;
        [-1, 1].forEach((side) => {
          luminaires.push({ position: [cx + side * 2.4, 3.9, z] });
        });
      });
      push('data-hall-luminaire', luminaires);

      // Structural columns hug the perimeter, clear of the rack rows.
      const columns: Placement[] = [];
      const minX = bounds.minX - WALL_CLEARANCE + 0.6;
      const maxX = bounds.maxX + WALL_CLEARANCE - 0.6;
      const minZ = bounds.minZ - WALL_CLEARANCE + 0.6;
      const maxZ = bounds.maxZ + WALL_CLEARANCE - 0.6;
      const spans = Math.max(1, Math.round((maxZ - minZ) / 6));
      for (let i = 0; i <= spans; i += 1) {
        const z = minZ + ((maxZ - minZ) / spans) * i;
        columns.push({ position: [minX, 0, z] });
        columns.push({ position: [maxX, 0, z] });
      }
      push('structural-column', columns);
    }

    if (shellMode !== 'off') {
      // The shell master is authored at 26.2 x 18.2 m. It is scaled to the
      // live hall so the derivative always encloses the actual facility.
      const width = bounds.maxX - bounds.minX + WALL_CLEARANCE * 2;
      const depth = bounds.maxZ - bounds.minZ + WALL_CLEARANCE * 2;
      out.length; // keep ordering explicit
      push(
        'facility-shell',
        [
          {
            position: [(bounds.minX + bounds.maxX) / 2, 0, (bounds.minZ + bounds.maxZ) / 2],
            scale: [width / 26.2, CEILING / 4.2, depth / 18.2],
          },
        ],
        // 'cutaway' matches the USD shellMode variant: camera-facing walls out.
        shellMode === 'cutaway' ? ['North', 'West'] : undefined,
      );
    }

    return out;
  }, [bounds, rows, showInfrastructure, shellMode, band]);

  const setFamily = useFacilityDerivativeStore((s) => s.setFamily);
  const report = useRuntimeCoverageStore((s) => s.reportRole);

  // Families with no resolvable derivative keep procedural geometry and say so.
  useEffect(() => {
    const resolved = new Set(mounts.map((m) => m.family));
    (Object.keys(FAMILY_ROLE) as FacilityFamily[]).forEach((family) => {
      if (resolved.has(family)) return;
      setFamily(family, 'fallback');
      const entry = resolveRoleAssetForBand(FAMILY_ROLE[family], band)?.entry ?? null;
      report(token, {
        role: FAMILY_ROLE[family],
        state: entry ? 'procedural-fallback' : 'not-represented',
        assetId: entry?.assetId ?? null,
        quality: (entry?.qualityLevel as QualityLevel) ?? null,
        mountedObjects: 0,
        glbInstances: 0,
        derivativeUrl: null,
        proceduralObjects: 0,
        triangles: 0,
        drawCalls: 0,
        detail: entry
          ? 'Not placed in this view; procedural geometry retained.'
          : 'No approved AURA-authored derivative resolved.',
      });
    });
  }, [mounts, token, band, report, setFamily]);

  return (
    <group name="AuraFacilityLayer" userData={{ classification: 'aura-openusd-derived-facility' }}>
      {mounts.map((mount) => {
        const coverage: PendingCoverage = {
          role: mount.role,
          assetId: mount.entry.assetId,
          quality: (mount.entry.qualityLevel as QualityLevel) ?? null,
          derivativeUrl: mount.url,
          proceduralObjects: 0,
          detail: getAsset(mount.entry.assetId)?.displayName,
        };
        return (
          <FamilyBoundary
            key={mount.family}
            token={token}
            family={mount.family}
            coverage={coverage}
          >
            <InstancedFamily mount={mount} token={token} coverage={coverage} />
          </FamilyBoundary>
        );
      })}
    </group>
  );
}