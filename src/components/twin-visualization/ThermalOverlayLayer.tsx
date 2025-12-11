/**
 * ThermalOverlayLayer Component
 * Renders semi-transparent colored zones based on temperature
 */

import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { ThermalZoneVisual } from './types';
import { getThermalColor } from './types';

interface ThermalOverlayLayerProps {
  zones: ThermalZoneVisual[];
  visible: boolean;
}

function ThermalZone({ zone }: { zone: ThermalZoneVisual }) {
  const meshRef = useRef<THREE.Mesh>(null);
  
  useFrame((state) => {
    if (meshRef.current && zone.hotspot) {
      // Pulse effect for hotspots
      const opacity = 0.3 + Math.sin(state.clock.elapsedTime * 2) * 0.1;
      (meshRef.current.material as THREE.MeshBasicMaterial).opacity = opacity;
    }
  });

  const color = getThermalColor(zone.avgCelsius);

  return (
    <mesh
      ref={meshRef}
      position={[zone.position[0] + zone.size[0] / 2, 0.02, zone.position[2] + zone.size[1] / 2]}
      rotation={[-Math.PI / 2, 0, 0]}
    >
      <planeGeometry args={[zone.size[0], zone.size[1]]} />
      <meshBasicMaterial 
        color={color}
        transparent
        opacity={zone.hotspot ? 0.4 : 0.25}
        side={THREE.DoubleSide}
      />
    </mesh>
  );
}

export function ThermalOverlayLayer({ zones, visible }: ThermalOverlayLayerProps) {
  if (!visible) return null;

  return (
    <group>
      {zones.map((zone) => (
        <ThermalZone key={zone.id} zone={zone} />
      ))}
    </group>
  );
}
