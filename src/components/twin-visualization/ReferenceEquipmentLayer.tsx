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

import { Suspense, useEffect, useMemo } from 'react';
import { useGLTF, Clone } from '@react-three/drei';
import type { Mesh, MeshStandardMaterial } from 'three';
import {
  getAsset,
  listAssetsForRole,
  resolveRuntimeAsset,
  type AssetManifestEntry,
  type QualityLevel,
  type SemanticRole,
} from './assetRegistry';
import { useRuntimeCoverageStore, type RoleCoverage } from './runtimeCoverageStore';
import type { RackVisual, RowVisual } from './types';

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

/** Cheapest published derivative of the same source, by measured triangles. */
function cheapest(role: SemanticRole): AssetManifestEntry | null {
  const candidates = listAssetsForRole(role);
  if (candidates.length === 0) return null;
  return [...candidates].sort(
    (a, b) => (a.triangleCount ?? Infinity) - (b.triangleCount ?? Infinity),
  )[0];
}

/** Operations derivative when published, otherwise the cheapest one. */
function nearest(role: SemanticRole): AssetManifestEntry | null {
  const candidates = listAssetsForRole(role);
  const ops = candidates.find((a) => a.qualityLevel === 'operations');
  return ops ?? cheapest(role);
}

function InstancedRole({
  mount,
  token,
  coverage,
}: {
  mount: RoleMount;
  token: string;
  coverage: Omit<RoleCoverage, 'mountedObjects' | 'triangles' | 'drawCalls' | 'state'>;
}) {
  const { scene } = useGLTF(mount.url);
  const report = useRuntimeCoverageStore((s) => s.reportRole);

  useEffect(() => {
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
    report(token, {
      ...coverage,
      state: 'openusd-derived',
      mountedObjects: count,
      triangles: (mount.entry.triangleCount ?? 0) * count,
      drawCalls: (mount.entry.drawCallBudget ?? 1) * count,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, count, mount.entry.assetId]);

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
  /** Overhead trays and busway detail, off in rack-inspection views. */
  showInfrastructure: boolean;
  /** Rack index limit for detailed in-rack equipment (performance bound). */
  detailBudget?: number;
}

export function ReferenceEquipmentLayer({
  racks,
  rows,
  bounds,
  showInfrastructure,
  detailBudget = 8,
}: Props) {
  const token = useMemo(
    () => `${racks.length}:${rows.length}:${showInfrastructure ? 'infra' : 'clean'}`,
    [racks.length, rows.length, showInfrastructure],
  );
  const reset = useRuntimeCoverageStore((s) => s.resetCoverage);
  const report = useRuntimeCoverageStore((s) => s.reportRole);

  useEffect(() => reset(token), [token, reset]);

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

    push('server-1u', nearest('server-1u'), server1u);
    push('server-2u', nearest('server-2u'), server2u);
    push('network-switch', cheapest('network-switch'), switches);
    push('rack-pdu', nearest('rack-pdu'), pdus);
    push('blanking-panel', nearest('blanking-panel'), blanks);

    // Overhead cable trays following each row, raised clear of row labels.
    if (showInfrastructure) {
      const trays: Placement[] = [];
      const span = bounds.maxX - bounds.minX;
      const segments = Math.max(1, Math.round(span / 3));
      rows.forEach((row) => {
        for (let i = 0; i < segments; i += 1) {
          trays.push({ position: [bounds.minX + 1.5 + i * 3, 4.55, row.position[2]] });
        }
      });
      push('cable-tray', nearest('cable-tray'), trays);
    }

    // Separate reference liquid-cooling area along the hall edge.
    const dcp: Placement[] = [0, 1, 2].map((i) => ({
      position: [bounds.minX - 2.4, 0, bounds.minZ + 1.6 + i * 1.6],
      rotationY: Math.PI / 2,
    }));
    push('liquid-cooling-equipment', nearest('liquid-cooling-equipment'), dcp);

    return out;
  }, [racks, rows, bounds, showInfrastructure, detailBudget]);

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
        proceduralObjects: 0,
        triangles: 0,
        drawCalls: 0,
        detail,
      });
    }
  }, [mounts, token, report, showInfrastructure]);

  return (
    <group name="ReferenceEquipmentLayer">
      {mounts.map((mount) => (
        <Suspense key={mount.entry.assetId} fallback={null}>
          <InstancedRole
            mount={mount}
            token={token}
            coverage={{
              role: mount.role,
              assetId: mount.entry.assetId,
              quality: (mount.entry.qualityLevel as QualityLevel) ?? null,
              proceduralObjects: 0,
              detail: getAsset(mount.entry.assetId)?.displayName,
            }}
          />
        </Suspense>
      ))}
    </group>
  );
}