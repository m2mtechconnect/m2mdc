/**
 * WorkloadOverlayLayer Component
 * Renders GPU workload distribution and job allocation visualization
 */

import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { Html } from '@react-three/drei';
import type { RackVisual } from './types';

interface WorkloadOverlayLayerProps {
  visible: boolean;
  racks: RackVisual[];
  avgGpuUtilization?: number;
}

function GPUActivityRing({ 
  position, 
  utilization, 
  rackId 
}: { 
  position: [number, number, number]; 
  utilization: number;
  rackId: string;
}) {
  const ringRef = useRef<THREE.Mesh>(null);
  
  useFrame((state) => {
    if (ringRef.current) {
      // Rotate ring based on utilization
      ringRef.current.rotation.z = state.clock.elapsedTime * (utilization / 100);
      
      // Pulse opacity based on load
      const baseOpacity = 0.3 + (utilization / 100) * 0.4;
      const pulse = baseOpacity + Math.sin(state.clock.elapsedTime * 2) * 0.1;
      (ringRef.current.material as THREE.MeshBasicMaterial).opacity = pulse;
    }
  });
  
  // Color gradient from green (low) to purple (high GPU load)
  const hue = 0.8 - (utilization / 100) * 0.5; // Purple to green
  const color = new THREE.Color().setHSL(hue, 0.8, 0.5);
  
  return (
    <group position={position}>
      {/* Activity ring */}
      <mesh ref={ringRef} rotation={[-Math.PI / 2, 0, 0]} position={[0, 3.5, 0]}>
        <ringGeometry args={[0.6, 0.8, 32]} />
        <meshBasicMaterial 
          color={color}
          transparent
          opacity={0.5}
          side={THREE.DoubleSide}
        />
      </mesh>
      
      {/* Utilization bar */}
      <mesh position={[0, 4.2, 0]}>
        <boxGeometry args={[0.1, utilization / 100 * 0.8, 0.1]} />
        <meshBasicMaterial color={color} />
      </mesh>
      
      {/* Label for high utilization racks */}
      {utilization > 85 && (
        <Html
          position={[0, 5, 0]}
          center
          style={{ pointerEvents: 'none' }}
        >
          <div className="bg-destructive/90 text-destructive-foreground px-1.5 py-0.5 rounded text-[9px] font-medium animate-pulse">
            {utilization}%
          </div>
        </Html>
      )}
    </group>
  );
}

function WorkloadFlowLines({ racks, visible }: { racks: RackVisual[]; visible: boolean }) {
  const linesRef = useRef<THREE.LineSegments>(null);
  
  const lineGeometry = useMemo(() => {
    const points: THREE.Vector3[] = [];
    
    // Create flow lines between high-utilization racks (simulating job distribution)
    const highUtilRacks = racks.filter(r => (r.gpuLoad ?? r.utilizationPercent) > 60);
    
    for (let i = 0; i < highUtilRacks.length - 1; i++) {
      const from = highUtilRacks[i];
      const to = highUtilRacks[i + 1];
      
      points.push(
        new THREE.Vector3(from.position[0], 4, from.position[2]),
        new THREE.Vector3(to.position[0], 4, to.position[2])
      );
    }
    
    return new THREE.BufferGeometry().setFromPoints(points);
  }, [racks]);
  
  useFrame((state) => {
    if (linesRef.current && linesRef.current.material) {
      // Use any to avoid THREE.js type issues with dashOffset
      (linesRef.current.material as any).dashOffset = -state.clock.elapsedTime;
    }
  });
  
  if (!visible || racks.length < 2) return null;
  
  return (
    <lineSegments ref={linesRef} geometry={lineGeometry}>
      <lineDashedMaterial
        color="#a855f7"
        dashSize={0.3}
        gapSize={0.2}
        transparent
        opacity={0.4}
      />
    </lineSegments>
  );
}

export function WorkloadOverlayLayer({ 
  visible, 
  racks,
  avgGpuUtilization = 75 
}: WorkloadOverlayLayerProps) {
  if (!visible) return null;

  return (
    <group>
      <WorkloadFlowLines racks={racks} visible={visible} />
      {racks.map((rack) => (
        <GPUActivityRing
          key={rack.id}
          position={rack.position}
          utilization={rack.gpuLoad ?? rack.utilizationPercent}
          rackId={rack.id}
        />
      ))}
    </group>
  );
}
