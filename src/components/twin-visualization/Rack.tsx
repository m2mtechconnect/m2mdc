/**
 * Rack Component
 * 3D representation of a single server rack
 */

import { useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import * as THREE from 'three';
import type { RackVisual } from './types';
import { getThermalColor, getUtilizationColor } from './types';

interface RackProps {
  rack: RackVisual;
  showThermal: boolean;
  onClick?: (rackId: string) => void;
}

export function Rack({ rack, showThermal, onClick }: RackProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const [hovered, setHovered] = useState(false);
  
  // Pulse animation for affected racks
  useFrame((state) => {
    if (meshRef.current && rack.isAffected) {
      const scale = 1 + Math.sin(state.clock.elapsedTime * 4) * 0.03;
      meshRef.current.scale.setScalar(scale);
    }
  });

  const color = showThermal 
    ? getThermalColor(rack.thermalCelsius)
    : getUtilizationColor(rack.utilizationPercent);

  const height = (rack.heightU / 42) * 2; // Normalize to ~2 units height

  return (
    <group position={rack.position}>
      <mesh
        ref={meshRef}
        onClick={() => onClick?.(rack.id)}
        onPointerOver={() => setHovered(true)}
        onPointerOut={() => setHovered(false)}
      >
        <boxGeometry args={[0.8, height, 1]} />
        <meshStandardMaterial 
          color={color}
          emissive={rack.isAffected ? '#ff4444' : (hovered ? '#ffffff' : '#000000')}
          emissiveIntensity={rack.isAffected ? 0.3 : (hovered ? 0.1 : 0)}
          metalness={0.3}
          roughness={0.7}
        />
      </mesh>
      
      {/* Rack frame outline */}
      <lineSegments position={[0, height / 2, 0]}>
        <edgesGeometry args={[new THREE.BoxGeometry(0.82, height, 1.02)]} />
        <lineBasicMaterial color={rack.isCritical ? '#ef4444' : '#6b7280'} />
      </lineSegments>

      {/* Status indicator LED */}
      <mesh position={[0.35, height - 0.1, 0.52]}>
        <sphereGeometry args={[0.03, 8, 8]} />
        <meshBasicMaterial color={rack.isCritical ? '#ef4444' : '#22c55e'} />
      </mesh>

      {/* Hover tooltip */}
      {hovered && (
        <Html position={[0, height + 0.5, 0]} center distanceFactor={8}>
          <div className="bg-background/95 backdrop-blur-sm border border-border rounded-lg p-3 shadow-lg min-w-[160px] text-sm">
            <div className="font-semibold text-foreground mb-2">{rack.name}</div>
            <div className="space-y-1 text-muted-foreground">
              <div className="flex justify-between">
                <span>Utilization:</span>
                <span className="font-medium text-foreground">{rack.utilizationPercent.toFixed(0)}%</span>
              </div>
              <div className="flex justify-between">
                <span>Power:</span>
                <span className="font-medium text-foreground">{rack.powerKw.toFixed(1)} kW</span>
              </div>
              <div className="flex justify-between">
                <span>Temp:</span>
                <span className="font-medium text-foreground">{rack.thermalCelsius.toFixed(1)}°C</span>
              </div>
              {rack.isCritical && (
                <div className="text-destructive font-medium mt-1">⚠ Critical Status</div>
              )}
            </div>
          </div>
        </Html>
      )}
    </group>
  );
}
