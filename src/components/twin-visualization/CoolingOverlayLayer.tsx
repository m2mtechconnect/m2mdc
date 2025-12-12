/**
 * CoolingOverlayLayer Component
 * Renders airflow visualization and cooling asset status
 */

import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { Html } from '@react-three/drei';

interface CoolingUnit {
  id: string;
  type: 'crac' | 'crah' | 'inrow';
  position: [number, number, number];
  efficiency: number; // 0-100
  load: number; // 0-100
  status: 'normal' | 'warning' | 'critical';
}

interface CoolingOverlayLayerProps {
  visible: boolean;
  units?: CoolingUnit[];
  coolingEfficiency?: number;
}

// Default cooling units
const DEFAULT_UNITS: CoolingUnit[] = [
  { id: 'crac-1', type: 'crac', position: [-2, 0, 5], efficiency: 85, load: 72, status: 'normal' },
  { id: 'crac-2', type: 'crac', position: [-2, 0, 10], efficiency: 82, load: 68, status: 'normal' },
  { id: 'crah-1', type: 'crah', position: [22, 0, 5], efficiency: 78, load: 85, status: 'warning' },
  { id: 'crah-2', type: 'crah', position: [22, 0, 10], efficiency: 88, load: 65, status: 'normal' },
];

function AirflowParticles({ visible }: { visible: boolean }) {
  const particlesRef = useRef<THREE.Points>(null);
  const count = 200;
  
  const [positions, velocities] = useMemo(() => {
    const pos = new Float32Array(count * 3);
    const vel = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      // Spread particles across the data center floor
      pos[i * 3] = Math.random() * 20;
      pos[i * 3 + 1] = Math.random() * 3 + 0.5;
      pos[i * 3 + 2] = Math.random() * 15;
      
      // Velocity - flowing from cold to hot aisle
      vel[i * 3] = (Math.random() - 0.5) * 0.02;
      vel[i * 3 + 1] = Math.random() * 0.01;
      vel[i * 3 + 2] = 0.03 + Math.random() * 0.02;
    }
    return [pos, vel];
  }, []);
  
  useFrame(() => {
    if (!particlesRef.current || !visible) return;
    
    const positions = particlesRef.current.geometry.attributes.position.array as Float32Array;
    
    for (let i = 0; i < count; i++) {
      positions[i * 3] += velocities[i * 3];
      positions[i * 3 + 1] += velocities[i * 3 + 1];
      positions[i * 3 + 2] += velocities[i * 3 + 2];
      
      // Reset particles that go too far
      if (positions[i * 3 + 2] > 18) {
        positions[i * 3 + 2] = 0;
        positions[i * 3] = Math.random() * 20;
        positions[i * 3 + 1] = Math.random() * 3 + 0.5;
      }
    }
    
    particlesRef.current.geometry.attributes.position.needsUpdate = true;
  });
  
  if (!visible) return null;
  
  return (
    <points ref={particlesRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          args={[positions, 3]}
        />
      </bufferGeometry>
      <pointsMaterial
        size={0.08}
        color="#38bdf8"
        transparent
        opacity={0.6}
        sizeAttenuation
      />
    </points>
  );
}

function CoolingUnitMesh({ unit }: { unit: CoolingUnit }) {
  const meshRef = useRef<THREE.Mesh>(null);
  
  useFrame((state) => {
    if (meshRef.current && unit.status !== 'normal') {
      // Pulse for warning/critical
      const scale = 1 + Math.sin(state.clock.elapsedTime * 3) * 0.05;
      meshRef.current.scale.setScalar(scale);
    }
  });
  
  const colors = {
    normal: '#22c55e',
    warning: '#f59e0b',
    critical: '#ef4444',
  };
  
  const unitSize = unit.type === 'inrow' ? [0.8, 2.5, 0.6] : [1.2, 2.8, 1];
  
  return (
    <group position={unit.position}>
      <mesh ref={meshRef} position={[0, unitSize[1] / 2, 0]}>
        <boxGeometry args={unitSize as [number, number, number]} />
        <meshStandardMaterial 
          color={colors[unit.status]}
          transparent
          opacity={0.8}
          emissive={colors[unit.status]}
          emissiveIntensity={0.3}
        />
      </mesh>
      
      {/* Status label */}
      <Html
        position={[0, unitSize[1] + 0.5, 0]}
        center
        style={{ pointerEvents: 'none' }}
      >
        <div className="bg-background/90 backdrop-blur-sm px-2 py-1 rounded text-[10px] border border-border">
          <div className="font-medium uppercase">{unit.type}</div>
          <div className="text-muted-foreground">
            Eff: {unit.efficiency}% | Load: {unit.load}%
          </div>
        </div>
      </Html>
    </group>
  );
}

export function CoolingOverlayLayer({ 
  visible, 
  units = DEFAULT_UNITS,
  coolingEfficiency = 82 
}: CoolingOverlayLayerProps) {
  if (!visible) return null;

  return (
    <group>
      <AirflowParticles visible={visible} />
      {units.map((unit) => (
        <CoolingUnitMesh key={unit.id} unit={unit} />
      ))}
    </group>
  );
}
