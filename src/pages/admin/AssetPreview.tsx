/**
 * Admin Asset Preview
 *
 * Mount target for approved 3D derivatives that have no compatible rack in the
 * current facility dataset. The NVIDIA-derived 42U liquid-cooled rack requires
 * a rack with declared liquid cooling, rear-door heat exchanger and
 * chilled-water connectivity; until such a rack exists, it is previewed here
 * and explicitly labelled as unassigned.
 */

import { Suspense, useMemo } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera, Grid, Environment } from '@react-three/drei';
import { Navigate } from 'react-router-dom';
import { useRBAC } from '@/contexts/RBACContext';
import { ApprovedRackAsset } from '@/components/twin-visualization/ApprovedRackAsset';
import { AssetProvenanceBadge } from '@/components/twin-visualization/AssetProvenancePanel';
import { CANARY_RACK_ASSET_ID } from '@/components/twin-visualization/canaryRollout';

/** Merged-by-material derivative: same geometry, 5 draw calls instead of 546. */
const OPS_ASSET_ID = `${CANARY_RACK_ASSET_ID}.ops`;
import { resolveRuntimeAsset } from '@/components/twin-visualization/assetRegistry';
import type { RackVisual } from '@/components/twin-visualization/types';

const PREVIEW_RACK: RackVisual = {
  id: 'admin-preview-rack',
  name: 'NVIDIA 42U liquid-cooled rack',
  rowId: 'preview',
  position: [0, 0, 0],
  heightU: 42,
  utilizationPercent: 0,
  powerKw: 0,
  thermalCelsius: 22,
  isCritical: false,
  isAffected: false,
  cooling: {
    liquidCooled: true,
    rearDoorHeatExchanger: true,
    chilledWaterConnected: true,
  },
};

/** Dev-only probe: exposes the live scene for automated visual validation. */
function SceneProbe() {
  const state = useThree();
  if (import.meta.env.DEV && typeof window !== 'undefined') {
    (window as unknown as Record<string, unknown>).__AURA_PREVIEW_SCENE__ = state;
  }
  return null;
}

export default function AssetPreview() {
  const { role, roles, loading } = useRBAC();
  const isAdmin = [role, ...roles].some(
    (r) => r === 'admin' || r === 'owner' || r === 'developer',
  );
  const useOps =
    typeof window !== 'undefined' &&
    new URLSearchParams(window.location.search).get('derivative') === 'ops';
  const assetId = useOps ? OPS_ASSET_ID : CANARY_RACK_ASSET_ID;
  const resolution = useMemo(() => resolveRuntimeAsset(assetId), [assetId]);

  if (loading) return <div className="p-6 text-sm text-muted-foreground">Loading...</div>;
  if (!isAdmin) return <Navigate to="/dashboard" replace />;

  return (
    <div className="space-y-4 p-6">
      <header className="space-y-1">
        <h1 className="text-xl font-semibold">Admin asset preview</h1>
        <p className="text-sm text-muted-foreground" data-testid="asset-preview-label">
          NVIDIA liquid-cooled rack canary - not assigned to facility. NVIDIA
          OpenUSD-derived geometry; 0 converted textures.{' '}
          {useOps
            ? 'Operations derivative (merged by material, 5 draw calls).'
            : 'Validated visual derivative (546 draw calls).'}
        </p>
      </header>

      <div
        className="relative h-[70vh] overflow-hidden rounded-lg border border-border bg-slate-950"
        data-testid="asset-preview-canvas"
        data-runtime-geometry={resolution.glbUrl ? 'approved-glb' : 'procedural'}
        data-asset-id={assetId}
      >
        <Canvas shadows dpr={[1, 2]} gl={{ antialias: true }}>
          <PerspectiveCamera makeDefault position={[3.2, 2.4, 4.2]} fov={40} />
          <OrbitControls target={[0, 1.6, 0]} enableDamping />
          <ambientLight intensity={0.45} />
          <directionalLight position={[4, 6, 4]} intensity={1.1} castShadow />
          <directionalLight position={[-4, 3, -4]} intensity={0.4} />
          <Grid args={[20, 20]} cellColor="#334155" sectionColor="#475569" infiniteGrid fadeDistance={26} />
          <Environment preset="warehouse" />
          <SceneProbe />
          <Suspense fallback={null}>
            <ApprovedRackAsset
              rack={PREVIEW_RACK}
              assetId={assetId}
              showThermal={false}
              detailed
            />
          </Suspense>
        </Canvas>
        <AssetProvenanceBadge assetId={assetId} />
      </div>
    </div>
  );
}
