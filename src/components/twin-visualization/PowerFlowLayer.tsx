/**
 * PowerFlowLayer Component
 * Renders power distribution segments with flow animation
 */

import { Html } from '@react-three/drei';
import * as THREE from 'three';
import type { PowerSegmentVisual } from './types';
import { getPowerColor } from './types';

interface PowerFlowLayerProps {
  segments: PowerSegmentVisual[];
  visible: boolean;
}

function PowerSegment({ segment }: { segment: PowerSegmentVisual }) {
  const loadRatio = segment.loadKw / segment.capacityKw;
  const color = getPowerColor(loadRatio, segment.isDegraded);

  // Create curved path
  const midPoint: [number, number, number] = [
    (segment.fromPosition[0] + segment.toPosition[0]) / 2,
    Math.max(segment.fromPosition[1], segment.toPosition[1]) + 0.5,
    (segment.fromPosition[2] + segment.toPosition[2]) / 2
  ];

  const curve = new THREE.QuadraticBezierCurve3(
    new THREE.Vector3(...segment.fromPosition),
    new THREE.Vector3(...midPoint),
    new THREE.Vector3(...segment.toPosition)
  );

  const points = curve.getPoints(20);
  const lineGeometry = new THREE.BufferGeometry().setFromPoints(points);

  return (
    <group>
      <line>
        <bufferGeometry attach="geometry" {...lineGeometry} />
        <lineBasicMaterial attach="material" color={color} linewidth={2} />
      </line>
      
      {/* Source node marker */}
      <mesh position={segment.fromPosition}>
        <sphereGeometry args={[0.15, 16, 16]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.3} />
      </mesh>
    </group>
  );
}

function PowerNode({ position, label, type }: { 
  position: [number, number, number]; 
  label: string;
  type: string;
}) {
  const size = type === 'grid' ? 0.4 : type === 'ups' ? 0.3 : 0.2;
  
  return (
    <group position={position}>
      <mesh>
        <boxGeometry args={[size, size, size]} />
        <meshStandardMaterial 
          color={type === 'grid' ? '#f59e0b' : type === 'ups' ? '#3b82f6' : '#22c55e'}
          metalness={0.5}
          roughness={0.3}
        />
      </mesh>
      <Html position={[0, size + 0.2, 0]} center distanceFactor={10}>
        <div className="bg-background/90 px-2 py-0.5 rounded text-xs font-medium whitespace-nowrap">
          {label}
        </div>
      </Html>
    </group>
  );
}

export function PowerFlowLayer({ segments, visible }: PowerFlowLayerProps) {
  if (!visible) return null;

  // Extract unique power nodes
  const nodePositions = new Map<string, { position: [number, number, number]; type: string; label: string }>();
  
  segments.forEach(seg => {
    if (!nodePositions.has(seg.from)) {
      nodePositions.set(seg.from, {
        position: seg.fromPosition,
        type: seg.fromType,
        label: seg.from.toUpperCase().replace('-', ' ')
      });
    }
    if (!nodePositions.has(seg.to)) {
      nodePositions.set(seg.to, {
        position: seg.toPosition,
        type: seg.toType,
        label: seg.to.toUpperCase().replace('-', ' ')
      });
    }
  });

  return (
    <group>
      {segments.map((segment) => (
        <PowerSegment key={segment.id} segment={segment} />
      ))}
      {Array.from(nodePositions.entries()).map(([id, node]) => (
        <PowerNode key={id} {...node} />
      ))}
    </group>
  );
}
