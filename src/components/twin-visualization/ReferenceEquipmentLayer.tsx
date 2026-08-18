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

import { Component, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import type { Group } from 'three';
import { Clone } from '@react-three/drei';
import { useDerivativeGltf } from './useDerivativeGltf';
import { applyMaterialPolicy } from './applyMaterialPolicy';
import { useRealismMode } from './hooks/useRealismMode';
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
import { useCoverageOwner } from './coverageSession';
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
  /** Camera band that selected this derivative; drives material presentation. */
  band: DistanceBand;
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
  sessionId,
  coverage,
}: {
  mount: RoleMount;
  sessionId: string;
  coverage: Omit<
    RoleCoverage,
    'mountedObjects' | 'glbInstances' | 'triangles' | 'drawCalls' | 'state'
  >;
}) {
  const load = useDerivativeGltf(mount.url);
  const scene = load.scene;
  const { reportRole: report } = useCoverageOwner(sessionId, `equipment:${mount.role}`);
  const realismMode = useRealismMode();
  const groupRef = useRef<Group>(null);
  // Attachment evidence: a parsed derivative is only "mounted" once its group
  // is actually attached under a live scene root. A 200 response is not proof.
  const [attached, setAttached] = useState<{ uuid: string; parentUuid: string } | null>(null);

  /**
   * NVIDIA OpenUSD-derived geometry with AURA-authored material, lighting and
   * visualization enhancements. MDL materials do not survive glTF conversion,
   * so the shared AURA presentation policy assigns physically separated
   * painted-steel / bare-metal / plastic / faceplate / cable / LED values.
   */
  useEffect(() => {
    if (!scene) return;
    applyMaterialPolicy(scene, { role: mount.role, band: mount.band, mode: realismMode });
  }, [scene, mount.role, mount.band, realismMode]);

  const count = mount.placements.length;

  useEffect(() => {
    if (!scene) {
      setAttached(null);
      return;
    }
    const group = groupRef.current;
    if (!group) {
      setAttached(null);
      return;
    }
    // Walk to the scene root; an orphaned group is never reported as mounted.
    let root = group.parent;
    while (root?.parent) root = root.parent;
    setAttached(root ? { uuid: group.uuid, parentUuid: root.uuid } : null);
    return () => setAttached(null);
  }, [scene, count]);

  useEffect(() => {
    if (load.status === 'loading') {
      report({
        ...coverage,
        state: 'preparing',
        mountedObjects: 0,
        glbInstances: 0,
        triangles: 0,
        drawCalls: 0,
        stage: 'requested',
        visible: false,
        detail: `Loading derivative ${mount.url}`,
      });
      return;
    }
    if (load.status === 'failed') {
      report({
        ...coverage,
        state: 'blocked',
        mountedObjects: 0,
        glbInstances: 0,
        triangles: 0,
        drawCalls: 0,
        stage: 'failed',
        visible: false,
        failureReason: load.error,
        detail: `Derivative failed to load: ${load.error}`,
      });
      return;
    }
    if (!attached) {
      report({
        ...coverage,
        state: 'preparing',
        mountedObjects: 0,
        glbInstances: 0,
        triangles: 0,
        drawCalls: 0,
        stage: 'parsed',
        visible: false,
        detail: 'Derivative parsed; awaiting attachment to the scene root.',
      });
      return;
    }
    report({
      ...coverage,
      state: 'openusd-derived',
      mountedObjects: count,
      glbInstances: count,
      triangles: (mount.entry.triangleCount ?? 0) * count,
      drawCalls: (mount.entry.drawCallBudget ?? 1) * count,
      stage: 'visible',
      visible: true,
      objectUuid: attached.uuid,
      parentUuid: attached.parentUuid,
      mountedAt: Date.now(),
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId, count, mount.entry.assetId, load.status, load.error, attached]);

  if (!scene) return null;
  return (
    <group ref={groupRef} name={`ReferenceEquipment:${mount.role}`}>
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
  /** Active coverage session; reports outside it are ignored by the store. */
  sessionId: string;
}

type PendingCoverage = Omit<
  RoleCoverage,
  'mountedObjects' | 'glbInstances' | 'triangles' | 'drawCalls' | 'state'
>;

/**
 * A derivative that fails to download or decode must say so in the coverage
 * report. Without this, a failed load is indistinguishable from an asset that
 * was never requested.
 */
class RoleLoadBoundary extends Component<
  { sessionId: string; coverage: PendingCoverage; children: ReactNode },
  { error: string | null }
> {
  state = { error: null as string | null };

  static getDerivedStateFromError(error: unknown) {
    return { error: error instanceof Error ? error.message : String(error) };
  }

  componentDidCatch(error: unknown) {
    const { sessionId, coverage } = this.props;
    const reason = error instanceof Error ? error.message : String(error);
    useRuntimeCoverageStore
      .getState()
      .reportRole(sessionId, `equipment:${coverage.role}`, {
        ...coverage,
        state: 'blocked',
        mountedObjects: 0,
        glbInstances: 0,
        triangles: 0,
        drawCalls: 0,
        stage: 'failed',
        visible: false,
        failureReason: reason,
        detail: `Derivative failed to load: ${reason}`,
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
  sessionId,
}: Props) {
  const showInfrastructure = infrastructure !== 'off';
  const { reportRole: report } = useCoverageOwner(sessionId, 'equipment');

  const mounts = useMemo<RoleMount[]>(() => {
    const out: RoleMount[] = [];
    const near = racks.slice(0, detailBudget);

    const push = (role: SemanticRole, entry: AssetManifestEntry | null, placements: Placement[]) => {
      if (!entry || placements.length === 0) return;
      const url = resolveRuntimeAsset(entry.assetId).glbUrl;
      if (!url) return;
      out.push({ role, entry, url, placements, band });
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
      report({
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
        stage: anyEntry ? 'fallback' : 'requested',
        visible: false,
        detail,
      });
    }
  }, [mounts, report, showInfrastructure]);

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
          <RoleLoadBoundary key={mount.entry.assetId} sessionId={sessionId} coverage={coverage}>
            <InstancedRole mount={mount} sessionId={sessionId} coverage={coverage} />
          </RoleLoadBoundary>
        );
      })}
    </group>
  );
}