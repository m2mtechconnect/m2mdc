/**
 * ReferenceEquipmentLayer
 *
 * Mounts approved NVIDIA Data Center OpenUSD derivatives for the reference
 * facility: rack-mounted servers, switches, PDUs and blanking panels, overhead
 * cable trays and a separate reference liquid-cooling area.
 *
 * Rules enforced here:
 *  - only assets the registry resolves as approved and runtime eligible mount;
 *  - geometry is shared across placements (one GLB load per derivative);
 *  - operations derivatives are used nearby, the cheapest published derivative
 *    at distance (some pack LODs are heavier than their operations build, so
 *    the runtime picks by measured triangle count, never by class name);
 *  - what actually mounted is reported to the runtime coverage store. Nothing
 *    is claimed from the manifest alone.
 */

import { Component, Suspense, useEffect, useMemo, type ReactNode } from 'react';
import { useGLTF, Clone } from '@react-three/drei';
import type { Mesh, MeshStandardMaterial } from 'three';
import {
  getAsset,
  listAssetsForRole,
  resolveRoleAssetForBand,
  resolveRuntimeAsset,
  type AssetManifestEntry,
  type DistanceBand,
  type QualityLevel,
  type SemanticRole,
} from './assetRegistry';
import { useRuntimeCoverageStore, type RoleCoverage } from './runtimeCoverageStore';
import type { RackVisual, RowVisual } from './types';
import type { InfrastructureLevel } from './infrastructureLevel';

interface Placement {
  position: [number, number, number];
  rotationY?: number;
  scale?: number;
}

interface RoleMount {
  role: SemanticRole;
  entry: AssetManifestEntry;
  url: string;
  placements: Placement[];
}

/**
 * Derivative for a role at a camera band. The decision comes from the manifest
 * quality policy, never from filename or triangle inference.
 */
function forBand(role: SemanticRole, band: DistanceBand): AssetManifestEntry | null {
  return resolveRoleAssetForBand(role, band)?.entry ?? null;
}

function InstancedRole({
  mount,
  token,
  coverage,
}: {
  mount: RoleMount;
  token: string;
  coverage: Omit<
    RoleCoverage,
    'mountedObjects' | 'glbInstances' | 'triangles' | 'drawCalls' | 'state'
  >;
}) {
  const load = useDerivativeGltf(mount.url);
  const scene = load.scene;
  const report = useRuntimeCoverageStore((s) => s.reportRole);

  useEffect(() => {
    if (!scene) return;
    scene.traverse((object) => {
      const mesh = object as Mesh;
      if (!mesh.isMesh) return;
      const list = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
      for (const m of list as MeshStandardMaterial[]) {
        if (!m || m.userData.auraTuned) continue;
        m.metalness = 0.5;
        m.roughness = 0.55;
        m.envMapIntensity = 0.5;
        m.userData.auraTuned = true;
        m.needsUpdate = true;
      }
    });
  }, [scene]);

  const count = mount.placements.length;
  useEffect(() => {
    if (load.status === 'loading') {
      report(token, {
        ...coverage,
        state: 'preparing',
        mountedObjects: 0,
        glbInstances: 0,
        triangles: 0,
        drawCalls: 0,
        detail: `Loading derivative ${mount.url}`,
      });
      return;
    }
    if (load.status === 'failed') {
      report(token, {
        ...coverage,
        state: 'blocked',
        mountedObjects: 0,
        glbInstances: 0,
        triangles: 0,
        drawCalls: 0,
        detail: `Derivative failed to load: ${load.error}`,
      });
      return;
    }
    report(token, {
      ...coverage,
      state: 'openusd-derived',
      mountedObjects: count,
      glbInstances: count,
      triangles: (mount.entry.triangleCount ?? 0) * count,
      drawCalls: (mount.entry.drawCallBudget ?? 1) * count,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, count, mount.entry.assetId, load.status, load.error]);

  if (!scene) return null;
  return (
    <group name={`ReferenceEquipment:${mount.role}`}>
      {mount.placements.map((p, i) => (
        <group
          key={`${mount.entry.assetId}-${i}`}
          position={p.position}
          rotation={[0, p.rotationY ?? 0, 0]}
          scale={p.scale ?? 1}
          userData={{ role: mount.role, assetId: mount.entry.assetId, source: 'openusd-derived' }}
        >
          <Clone object={scene} castShadow receiveShadow />
        </group>
      ))}
    </group>
  );
}

interface Props {
  racks: RackVisual[];
  rows: RowVisual[];
  bounds: { minX: number; maxX: number; minZ: number; maxZ: number };
  /** Overhead trays, pipework and busway detail. */
  infrastructure: InfrastructureLevel;
  /** Camera distance band driving derivative selection. */
  band?: DistanceBand;
  /** Rack index limit for detailed in-rack equipment (performance bound). */
  detailBudget?: number;
}

type PendingCoverage = Omit<
  RoleCoverage,
  'mountedObjects' | 'glbInstances' | 'triangles' | 'drawCalls' | 'state'
>;

/**
 * Reports the honest interim state while a derivative is still downloading or
 * decoding, so a stalled load reads as "preparing" with its URL rather than
 * silently as an absent role.
 */
function PendingRole({
  token,
  coverage,
}: {
  token: string;
  coverage: PendingCoverage;
}) {
  const report = useRuntimeCoverageStore((s) => s.reportRole);
  useEffect(() => {
    report(token, {
      ...coverage,
      state: 'preparing',
      mountedObjects: 0,
      glbInstances: 0,
      triangles: 0,
      drawCalls: 0,
      detail: `Loading derivative ${coverage.derivativeUrl ?? ''}`.trim(),
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, coverage.assetId]);
  return null;
}

/**
 * A derivative that fails to download or decode must say so in the coverage
 * report. Without this, a failed load is indistinguishable from an asset that
 * was never requested.
 */
class RoleLoadBoundary extends Component<
  { token: string; coverage: PendingCoverage; children: ReactNode },
  { error: string | null }
> {
  state = { error: null as string | null };

  static getDerivedStateFromError(error: unknown) {
    return { error: error instanceof Error ? error.message : String(error) };
  }

  componentDidCatch(error: unknown) {
    const { token, coverage } = this.props;
    useRuntimeCoverageStore.getState().reportRole(token, {
      ...coverage,
      state: 'blocked',
      mountedObjects: 0,
      glbInstances: 0,
      triangles: 0,
      drawCalls: 0,
      detail: `Derivative failed to load: ${error instanceof Error ? error.message : String(error)}`,
    });
  }

  render() {
    if (this.state.error) return null;
    return this.props.children;
  }
}

export function ReferenceEquipmentLayer({
  racks,
  rows,
  bounds,
  infrastructure,
  band = 'nearby',
  detailBudget = 8,
}: Props) {
  const showInfrastructure = infrastructure !== 'off';
  const token = useMemo(
    () => `${racks.length}:${rows.length}:${infrastructure}:${band}`,
    [racks.length, rows.length, infrastructure, band],
  );
  const report = useRuntimeCoverageStore((s) => s.reportRole);

  const mounts = useMemo<RoleMount[]>(() => {
    const out: RoleMount[] = [];
    const near = racks.slice(0, detailBudget);

    const push = (role: SemanticRole, entry: AssetManifestEntry | null, placements: Placement[]) => {
      if (!entry || placements.length === 0) return;
      const url = resolveRuntimeAsset(entry.assetId).glbUrl;
      if (!url) return;
      out.push({ role, entry, url, placements });
    };

    // In-rack equipment: 1U servers, 2U servers, one switch, one PDU and
    // blanking panels, stacked up the front face of each nearby cabinet.
    const server1u: Placement[] = [];
    const server2u: Placement[] = [];
    const switches: Placement[] = [];
    const pdus: Placement[] = [];
    const blanks: Placement[] = [];
    near.forEach((rack) => {
      const [x, , z] = rack.position;
      for (let u = 0; u < 6; u += 1) {
        server1u.push({ position: [x, 0.34 + u * 0.09, z + 0.28] });
      }
      for (let u = 0; u < 3; u += 1) {
        server2u.push({ position: [x, 0.95 + u * 0.14, z - 0.02] });
      }
      switches.push({ position: [x, 1.48, z + 0.28] });
      pdus.push({ position: [x, 1.62, z + 0.28] });
      for (let u = 0; u < 4; u += 1) {
        blanks.push({ position: [x, 1.74 + u * 0.06, z + 0.3] });
      }
    });

    push('server-1u', forBand('server-1u', band), server1u);
    push('server-2u', forBand('server-2u', band), server2u);
    push('network-switch', forBand('network-switch', band), switches);
    push('rack-pdu', forBand('rack-pdu', band), pdus);
    push('blanking-panel', forBand('blanking-panel', band), blanks);

    // Overhead cable trays following each row, raised clear of row labels.
    if (showInfrastructure) {
      const trays: Placement[] = [];
      const span = bounds.maxX - bounds.minX;
      // Essential shows one tray run per row; Full adds a denser grid.
      const spacing = infrastructure === 'full' ? 2 : 3;
      const segments = Math.max(1, Math.round(span / spacing));
      rows.forEach((row) => {
        for (let i = 0; i < segments; i += 1) {
          trays.push({ position: [bounds.minX + 1.5 + i * spacing, 4.55, row.position[2]] });
        }
      });
      push('cable-tray', forBand('cable-tray', band), trays);
    }

    // Separate reference liquid-cooling area along the hall edge.
    const dcp: Placement[] = [0, 1, 2].map((i) => ({
      position: [bounds.minX - 2.4, 0, bounds.minZ + 1.6 + i * 1.6],
      rotationY: Math.PI / 2,
    }));
    push('liquid-cooling-equipment', forBand('liquid-cooling-equipment', band), dcp);

    return out;
  }, [racks, rows, bounds, showInfrastructure, infrastructure, band, detailBudget]);

  // Roles that could not mount are reported honestly, with the reason.
  useEffect(() => {
    const mounted = new Set(mounts.map((m) => m.role));
    const unresolved: Array<[SemanticRole, string]> = [
      ['cable-tray', showInfrastructure ? 'No approved derivative resolved.' : 'Hidden in this camera view.'],
      ['server-1u', 'No approved derivative resolved.'],
      ['server-2u', 'No approved derivative resolved.'],
      ['network-switch', 'No approved derivative resolved.'],
      ['rack-pdu', 'No approved derivative resolved.'],
      ['blanking-panel', 'No approved derivative resolved.'],
      ['liquid-cooling-equipment', 'No approved derivative resolved.'],
    ];
    for (const [role, detail] of unresolved) {
      if (mounted.has(role)) continue;
      const anyEntry = listAssetsForRole(role)[0] ?? null;
      report(token, {
        role,
        state: anyEntry ? 'procedural-fallback' : 'preparing',
        assetId: anyEntry?.assetId ?? null,
        quality: (anyEntry?.qualityLevel as QualityLevel) ?? null,
        mountedObjects: 0,
        glbInstances: 0,
        derivativeUrl: null,
        proceduralObjects: 0,
        triangles: 0,
        drawCalls: 0,
        detail,
      });
    }
  }, [mounts, token, report, showInfrastructure]);

  return (
    <group name="ReferenceEquipmentLayer">
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
          <RoleLoadBoundary key={mount.entry.assetId} token={token} coverage={coverage}>
            <Suspense fallback={<PendingRole token={token} coverage={coverage} />}>
              <InstancedRole mount={mount} token={token} coverage={coverage} />
            </Suspense>
          </RoleLoadBoundary>
        );
      })}
    </group>
  );
}