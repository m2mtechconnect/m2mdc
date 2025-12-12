/**
 * SovereigntyOverlayLayer Component
 * Renders regional sovereignty boundaries and data residency zones
 */

import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { Html } from '@react-three/drei';

interface SovereigntyZone {
  id: string;
  label: string;
  position: [number, number, number];
  size: [number, number];
  complianceLevel: 'compliant' | 'warning' | 'violation';
  jurisdiction: string;
}

interface SovereigntyOverlayLayerProps {
  visible: boolean;
  zones?: SovereigntyZone[];
  rackCount?: number;
}

// Default sovereignty zones if not provided
const DEFAULT_ZONES: SovereigntyZone[] = [
  {
    id: 'ca-sovereign-1',
    label: 'Canadian Sovereign Zone',
    position: [0, 0, 0],
    size: [20, 15],
    complianceLevel: 'compliant',
    jurisdiction: 'Canada (PIPEDA)',
  },
];

function SovereigntyZoneMesh({ zone }: { zone: SovereigntyZone }) {
  const meshRef = useRef<THREE.Mesh>(null);
  const borderRef = useRef<THREE.LineLoop>(null);
  
  useFrame((state) => {
    if (meshRef.current) {
      // Subtle pulse for sovereignty zones
      const pulse = 0.15 + Math.sin(state.clock.elapsedTime * 0.5) * 0.05;
      (meshRef.current.material as THREE.MeshBasicMaterial).opacity = pulse;
    }
    if (borderRef.current && borderRef.current.material) {
      // Animated border dash - use any to avoid THREE.js type issues
      (borderRef.current.material as any).dashOffset = -state.clock.elapsedTime * 0.5;
    }
  });

  const colors = {
    compliant: '#22c55e', // green
    warning: '#f59e0b', // amber
    violation: '#ef4444', // red
  };
  
  const color = colors[zone.complianceLevel];

  // Border geometry
  const borderPoints = [
    new THREE.Vector3(0, 0, 0),
    new THREE.Vector3(zone.size[0], 0, 0),
    new THREE.Vector3(zone.size[0], 0, zone.size[1]),
    new THREE.Vector3(0, 0, zone.size[1]),
  ];
  const borderGeometry = new THREE.BufferGeometry().setFromPoints(borderPoints);

  return (
    <group position={zone.position}>
      {/* Zone fill */}
      <mesh
        ref={meshRef}
        position={[zone.size[0] / 2, 0.03, zone.size[1] / 2]}
        rotation={[-Math.PI / 2, 0, 0]}
      >
        <planeGeometry args={[zone.size[0], zone.size[1]]} />
        <meshBasicMaterial 
          color={color}
          transparent
          opacity={0.15}
          side={THREE.DoubleSide}
        />
      </mesh>
      
      {/* Animated border */}
      <lineLoop ref={borderRef} geometry={borderGeometry} position={[0, 0.05, 0]}>
        <lineDashedMaterial 
          color={color}
          dashSize={0.5}
          gapSize={0.3}
          linewidth={2}
        />
      </lineLoop>
      
      {/* Label */}
      <Html
        position={[zone.size[0] / 2, 2, zone.size[1] / 2]}
        center
        style={{ pointerEvents: 'none' }}
      >
        <div className="bg-background/90 backdrop-blur-sm px-3 py-1.5 rounded-md border border-border shadow-lg">
          <div className="text-xs font-medium" style={{ color }}>{zone.label}</div>
          <div className="text-[10px] text-muted-foreground">{zone.jurisdiction}</div>
        </div>
      </Html>
    </group>
  );
}

export function SovereigntyOverlayLayer({ 
  visible, 
  zones = DEFAULT_ZONES,
  rackCount = 20 
}: SovereigntyOverlayLayerProps) {
  if (!visible) return null;

  // Adjust default zone size based on rack count
  const adjustedZones = zones.length > 0 ? zones : [{
    ...DEFAULT_ZONES[0],
    size: [Math.min(rackCount * 1.2, 25), 15] as [number, number],
  }];

  return (
    <group>
      {adjustedZones.map((zone) => (
        <SovereigntyZoneMesh key={zone.id} zone={zone} />
      ))}
    </group>
  );
}
