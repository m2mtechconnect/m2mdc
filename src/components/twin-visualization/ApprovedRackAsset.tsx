/**
 * ApprovedRackAsset
 *
 * Single runtime entry point for rack geometry. It asks the asset registry for
 * an approved, validated GLB derivative of the OpenUSD rack master:
 *
 *  - derivative resolved  -> the imported GLB is mounted (shared geometry and
 *    materials across every rack instance, one network request per derivative).
 *  - derivative rejected  -> the documented procedural cabinet renders and the
 *    reason is reported honestly through `onResolution`.
 *
 * AURA remains the operational data source in both cases: rack id, row,
 * position, simulation state, overlay state and selection are owned by AURA and
 * passed through unchanged.
 */

import type { Mesh, MeshStandardMaterial } from 'three';
import { Component, Suspense, useEffect, useMemo, type ReactNode } from 'react';
import { useGLTF, Clone } from '@react-three/drei';
import { Rack, type RackDetailLevel } from './Rack';
import type { RackVisual } from './types';
import {
  RACK_ASSET_ID,
  resolveRuntimeAsset,
  type RuntimeAssetResolution,
} from './assetRegistry';
import { CANARY_RACK_ASSET_ID } from './canaryRollout';

interface ApprovedRackAssetProps {
  rack: RackVisual;
  showThermal: boolean;
  onClick?: (rackId: string) => void;
  detailed?: boolean;
  detailLevel?: RackDetailLevel;
  selected?: boolean;
  overlayColor?: string | null;
  /** Registry asset id to resolve for this instance (canary rollout aware). */
  assetId?: string;
  /** Force the procedural preview (used by the low quality profile). */
  preferFallback?: boolean;
  onResolution?: (resolution: RuntimeAssetResolution) => void;
}

function ImportedRack({
  url,
  rack,
  selected,
  onClick,
}: {
  url: string;
  rack: RackVisual;
  selected?: boolean;
  onClick?: (rackId: string) => void;
}) {
  const { scene } = useGLTF(url);

  /**
   * The USD pack's MDL materials do not survive glTF conversion, so the
   * derivative arrives as a single untextured metal. Apply physically
   * reasonable powder-coated-steel values so the cabinet reads correctly under
   * facility lighting. These are AURA-authored values, not the original MDL
   * library.
   */
  useEffect(() => {
    scene.traverse((object) => {
      const mesh = object as Mesh;
      if (!mesh.isMesh) return;
      const material = mesh.material as MeshStandardMaterial | MeshStandardMaterial[];
      for (const m of Array.isArray(material) ? material : [material]) {
        if (!m || m.userData.auraTuned) continue;
        m.metalness = 0.55;
        m.roughness = 0.52;
        m.envMapIntensity = 0.55;
        m.color?.setHex(0x6b7280);
        m.userData.auraTuned = true;
        m.needsUpdate = true;
      }
    });
  }, [scene]);

  return (
    <group
      position={rack.position}
      name={`ApprovedRackAsset:${rack.id}`}
      userData={{ rackId: rack.id, row: rack.rowId, source: 'imported-glb' }}
      onClick={(event) => {
        event.stopPropagation();
        onClick?.(rack.id);
      }}
    >
      {/* Clone reuses the loaded geometry and materials for every instance. */}
      <Clone object={scene} castShadow receiveShadow />
      {selected && (
        <mesh position={[0, 1.02, 0]}>
          <boxGeometry args={[0.68, 2.06, 1.26]} />
          <meshBasicMaterial color="#FFCC00" wireframe transparent opacity={0.45} />
        </mesh>
      )}
    </group>
  );
}

/**
 * If an approved derivative fails at runtime (network, decode, driver), the
 * rack silently rolls back to procedural geometry instead of taking the canvas
 * down with it.
 */
class DerivativeBoundary extends Component<
  { children: ReactNode; fallback: ReactNode },
  { failed: boolean }
> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}

export function ApprovedRackAsset(props: ApprovedRackAssetProps) {
  const assetId = props.assetId ?? RACK_ASSET_ID;
  const resolution = useMemo(
    () => resolveRuntimeAsset(assetId, { preferFallback: props.preferFallback }),
    [assetId, props.preferFallback],
  );

  useEffect(() => {
    props.onResolution?.(resolution);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resolution]);

  if (resolution.glbUrl) {
    const procedural = (
      <Rack
        rack={props.rack}
        showThermal={props.showThermal}
        onClick={props.onClick}
        detailed={props.detailed}
        detailLevel={props.detailLevel}
        selected={props.selected}
        overlayColor={props.overlayColor ?? null}
      />
    );
    return (
      <DerivativeBoundary fallback={procedural}>
        <Suspense fallback={procedural}>
          <ImportedRack
            url={resolution.glbUrl}
            rack={props.rack}
            selected={props.selected}
            onClick={props.onClick}
          />
        </Suspense>
      </DerivativeBoundary>
    );
  }

  return (
    <Rack
      rack={props.rack}
      showThermal={props.showThermal}
      onClick={props.onClick}
      detailed={props.detailed}
      detailLevel={props.detailLevel}
      selected={props.selected}
      overlayColor={props.overlayColor ?? null}
    />
  );
}

/** Preload the approved derivative once, when one exists. */
export function preloadApprovedRackAsset() {
  for (const id of [RACK_ASSET_ID, CANARY_RACK_ASSET_ID]) {
    const { glbUrl } = resolveRuntimeAsset(id);
    if (glbUrl) useGLTF.preload(glbUrl);
  }
}

preloadApprovedRackAsset();
