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

import { Component, useEffect, useMemo, type ReactNode } from 'react';
import { Clone } from '@react-three/drei';
import { loadDerivative, useDerivativeGltf } from './useDerivativeGltf';
import { applyMaterialPolicy } from './applyMaterialPolicy';
import { useRealismMode } from './hooks/useRealismMode';
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
  /** Runtime loader failure after a derivative resolved (network/decode). */
  onDerivativeFailure?: (reason: string) => void;
  /**
   * Runtime mount evidence for this cabinet. `mounted` is true only once the
   * approved derivative is actually in the scene graph.
   */
  onRuntimeState?: (state: { mounted: boolean; assetId: string; url: string | null }) => void;
}

function ImportedRack({
  url,
  rack,
  selected,
  onClick,
  fallback,
  onFailure,
  onRuntimeState,
}: {
  url: string;
  rack: RackVisual;
  selected?: boolean;
  onClick?: (rackId: string) => void;
  /** Procedural cabinet shown while the derivative loads or if it fails. */
  fallback: ReactNode;
  onFailure?: (reason: string) => void;
  onRuntimeState?: (mounted: boolean) => void;
}) {
  const { scene, status, error } = useDerivativeGltf(url);

  useEffect(() => {
    if (status === 'failed' && error) onFailure?.(error);
  }, [status, error, onFailure]);

  useEffect(() => {
    onRuntimeState?.(scene != null && status === 'ready');
  }, [scene, status, onRuntimeState]);

  /**
   * The USD pack's MDL materials do not survive glTF conversion, so the
   * derivative arrives as a single untextured metal. The shared AURA-authored
   * presentation policy separates painted cabinet steel from rails, handles
   * and faceplates so the cabinet reads correctly under facility lighting.
   * These are AURA-authored values, not the original MDL library.
   */
  useEffect(() => {
    if (!scene) return;
    applyMaterialPolicy(scene, {
      role: 'rack-core-reference',
      band: selected ? 'selected' : 'nearby',
      mode: realismMode,
    });
  }, [scene, selected, realismMode]);

  if (!scene) return <>{fallback}</>;
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
  { children: ReactNode; fallback: ReactNode; onFailure?: (reason: string) => void },
  { failed: boolean }
> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error: Error) {
    this.props.onFailure?.(error.message || 'The approved derivative failed to load at runtime.');
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

  // No approved derivative resolved: the procedural cabinet is what mounts.
  useEffect(() => {
    if (!resolution.glbUrl) props.onRuntimeState?.({ mounted: false, assetId, url: null });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resolution.glbUrl, assetId]);

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
      <DerivativeBoundary fallback={procedural} onFailure={props.onDerivativeFailure}>
        <ImportedRack
          url={resolution.glbUrl}
          rack={props.rack}
          selected={props.selected}
          onClick={props.onClick}
          fallback={procedural}
          onFailure={props.onDerivativeFailure}
          onRuntimeState={(mounted) =>
            props.onRuntimeState?.({ mounted, assetId, url: resolution.glbUrl })
          }
        />
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
    if (glbUrl) void loadDerivative(glbUrl).catch(() => undefined);
  }
}

preloadApprovedRackAsset();
