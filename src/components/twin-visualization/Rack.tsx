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
  const glowRef = useRef<THREE.Mesh>(null);
  const [hovered, setHovered] = useState(false);
  
  // Pulse animation for affected racks and subtle glow
  useFrame((state) => {
    if (meshRef.current && rack.isAffected) {
      const scale = 1 + Math.sin(state.clock.elapsedTime * 4) * 0.02;
      meshRef.current.scale.setScalar(scale);
    }
    // Subtle breathing glow effect for all racks
    if (glowRef.current) {
      const glowIntensity = 0.15 + Math.sin(state.clock.elapsedTime * 1.5 + rack.utilizationPercent * 0.1) * 0.05;
      (glowRef.current.material as THREE.MeshBasicMaterial).opacity = glowIntensity;
    }
  });

  const color = showThermal 
    ? getThermalColor(rack.thermalCelsius)
    : getUtilizationColor(rack.utilizationPercent);

  const height = (rack.heightU / 42) * 2.2; // Slightly taller racks

  return (
    <group position={rack.position}>
      {/* Main rack body */}
      <mesh
        ref={meshRef}
        position={[0, height / 2, 0]}
        onClick={() => onClick?.(rack.id)}
        onPointerOver={() => setHovered(true)}
        onPointerOut={() => setHovered(false)}
        castShadow
        receiveShadow
      >
        <boxGeometry args={[0.85, height, 1.1]} />
        <meshStandardMaterial 
          color={color}
          emissive={color}
          emissiveIntensity={rack.isAffected ? 0.4 : (hovered ? 0.25 : 0.15)}
          metalness={0.4}
          roughness={0.55}
        />
      </mesh>

      {/* Top glow for thermal effect */}
      <mesh 
        ref={glowRef}
        position={[0, height + 0.02, 0]} 
        rotation={[-Math.PI / 2, 0, 0]}
      >
        <planeGeometry args={[0.9, 1.15]} />
        <meshBasicMaterial 
          color={color} 
          transparent 
          opacity={0.2} 
          side={THREE.DoubleSide}
        />
      </mesh>
      
      {/* Rack frame outline - subtle dark edges */}
      <lineSegments position={[0, height / 2, 0]}>
        <edgesGeometry args={[new THREE.BoxGeometry(0.87, height, 1.12)]} />
        <lineBasicMaterial color={rack.isCritical ? '#ff3333' : '#334455'} linewidth={1} />
      </lineSegments>

      {/* Front panel detail lines */}
      {[0.2, 0.4, 0.6, 0.8].map((fraction) => (
        <mesh key={fraction} position={[0, height * fraction, 0.56]}>
          <boxGeometry args={[0.75, 0.02, 0.01]} />
          <meshBasicMaterial color="#1a2030" />
        </mesh>
      ))}

      {/* Status indicator LEDs */}
      <mesh position={[0.38, height * 0.95, 0.57]}>
        <sphereGeometry args={[0.025, 8, 8]} />
        <meshBasicMaterial color={rack.isCritical ? '#ff3333' : '#00ff66'} />
      </mesh>
      <mesh position={[0.32, height * 0.95, 0.57]}>
        <sphereGeometry args={[0.02, 8, 8]} />
        <meshBasicMaterial color={rack.utilizationPercent > 80 ? '#ffaa00' : '#0066ff'} />
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
