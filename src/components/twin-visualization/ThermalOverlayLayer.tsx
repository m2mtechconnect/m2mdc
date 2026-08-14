/**
 * ThermalOverlayLayer Component
 *
 * Thermal is a readability layer, not a paint layer. Each zone renders as a
 * soft radial gradient laid just above the floor with additive blending and no
 * depth writes, so cabinets, aisles and floor markings stay legible underneath
 * instead of being flooded with flat colour.
 */

import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { ThermalZoneVisual } from './types';
import { getThermalColor } from './types';

interface ThermalOverlayLayerProps {
  zones: ThermalZoneVisual[];
  visible: boolean;
}

/** Soft-edged radial falloff, generated once and shared by every zone. */
function useFalloffTexture() {
  return useMemo(() => {
    const size = 128;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      const gradient = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
      gradient.addColorStop(0, 'rgba(255,255,255,1)');
      gradient.addColorStop(0.55, 'rgba(255,255,255,0.55)');
      gradient.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, size, size);
    }
    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;
    return texture;
  }, []);
}

/** Peak opacity per zone. Hotspots read hotter without becoming opaque. */
const BASE_OPACITY = 0.2;
const HOTSPOT_OPACITY = 0.32;

function ThermalZone({ zone, falloff }: { zone: ThermalZoneVisual; falloff: THREE.Texture }) {
  const meshRef = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    if (meshRef.current && zone.hotspot) {
      // Gentle breathing pulse: enough to draw the eye, never enough to hide
      // the equipment underneath.
      const opacity = HOTSPOT_OPACITY + Math.sin(state.clock.elapsedTime * 1.6) * 0.05;
      (meshRef.current.material as THREE.MeshBasicMaterial).opacity = opacity;
    }
  });

  const color = getThermalColor(zone.avgCelsius);

  return (
    <mesh
      ref={meshRef}
      position={[zone.position[0] + zone.size[0] / 2, 0.035, zone.position[2] + zone.size[1] / 2]}
      rotation={[-Math.PI / 2, 0, 0]}
      renderOrder={2}
    >
      <planeGeometry args={[zone.size[0], zone.size[1]]} />
      <meshBasicMaterial
        color={color}
        map={falloff}
        transparent
        opacity={zone.hotspot ? HOTSPOT_OPACITY : BASE_OPACITY}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
        side={THREE.DoubleSide}
        toneMapped={false}
      />
    </mesh>
  );
}

export function ThermalOverlayLayer({ zones, visible }: ThermalOverlayLayerProps) {
  const falloff = useFalloffTexture();
  if (!visible) return null;

  return (
    <group name="overlay:thermal">
      {zones.map((zone) => (
        <ThermalZone key={zone.id} zone={zone} falloff={falloff} />
      ))}
    </group>
  );
}
