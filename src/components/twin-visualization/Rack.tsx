/**
 * Rack Component
 * Detailed 3D representation of a single unbranded EIA-310 style server rack.
 *
 * Geometry is procedural and documented (frame, side panels, perforated front
 * and rear doors, mounting rails, 1U equipment trays, plinth, top panel). It is
 * replaced automatically by an approved GLB derivative once one is registered
 * in `assets/manifest.json`.
 *
 * Telemetry is NEVER baked into the physical material: overlay state renders on
 * a dedicated translucent mesh in front of the door.
 */

import { useRef, useState, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import * as THREE from 'three';
import type { RackVisual } from './types';
import { getThermalColor } from './types';
import { surfaceMaterial, ledMaterial, overlayMaterial } from '@/three/materials';

interface RackProps {
  rack: RackVisual;
  showThermal: boolean;
  onClick?: (rackId: string) => void;
  /** Render interior detail (trays, rails). Disabled beyond the detail budget. */
  detailed?: boolean;
  /** Overlay colour for the active operational overlay, or null to clear. */
  overlayColor?: string | null;
  /** Overlay opacity (0.05 - 0.75). */
  overlayOpacity?: number;
  selected?: boolean;
}

// EIA-310 derived envelope, scaled to the layout engine pitch.
const RACK_WIDTH = 0.85;
const RACK_DEPTH = 1.1;
const POST = 0.05;

export function Rack({
  rack,
  showThermal,
  onClick,
  detailed = true,
  overlayColor = null,
  overlayOpacity = 0.35,
  selected = false,
}: RackProps) {
  const groupRef = useRef<THREE.Group>(null);
  const [hovered, setHovered] = useState(false);

  // Subtle emphasis pulse for racks affected by a simulation event.
  useFrame((state) => {
    if (groupRef.current && rack.isAffected) {
      const scale = 1 + Math.sin(state.clock.elapsedTime * 4) * 0.01;
      groupRef.current.scale.setScalar(scale);
    }
  });

  const height = (rack.heightU / 42) * 2.0;

  // Equipment trays: filled proportionally to reported utilisation.
  const trays = useMemo(() => {
    if (!detailed) return [] as number[];
    const slots = Math.max(6, Math.round(rack.heightU / 3));
    const filled = Math.round((slots * Math.min(100, Math.max(0, rack.utilizationPercent))) / 100);
    return Array.from({ length: filled }, (_, i) => (i + 0.7) * (height / slots));
  }, [detailed, rack.heightU, rack.utilizationPercent, height]);

  const resolvedOverlay =
    overlayColor ??
    (showThermal ? getThermalColor(rack.thermalCelsius) : null);

  const frame = surfaceMaterial('powderCoatedSteel');
  const door = surfaceMaterial('darkRackDoor');
  const perforated = surfaceMaterial('perforatedMetal');
  const tray = surfaceMaterial('brushedMetal');

  return (
    <group position={rack.position} ref={groupRef}>
      {/* Plinth */}
      <mesh position={[0, 0.03, 0]} material={frame} castShadow receiveShadow>
        <boxGeometry args={[RACK_WIDTH, 0.06, RACK_DEPTH]} />
      </mesh>

      {/* Corner posts */}
      {[
        [-(RACK_WIDTH / 2 - POST / 2), (RACK_DEPTH / 2 - POST / 2)],
        [(RACK_WIDTH / 2 - POST / 2), (RACK_DEPTH / 2 - POST / 2)],
        [-(RACK_WIDTH / 2 - POST / 2), -(RACK_DEPTH / 2 - POST / 2)],
        [(RACK_WIDTH / 2 - POST / 2), -(RACK_DEPTH / 2 - POST / 2)],
      ].map(([px, pz]) => (
        <mesh key={`${px}:${pz}`} position={[px, height / 2, pz]} material={frame} castShadow>
          <boxGeometry args={[POST, height, POST]} />
        </mesh>
      ))}

      {/* Side panels */}
      {[-(RACK_WIDTH / 2), RACK_WIDTH / 2].map((px) => (
        <mesh key={px} position={[px, height / 2, 0]} material={frame} castShadow receiveShadow>
          <boxGeometry args={[0.015, height - 0.08, RACK_DEPTH - 0.02]} />
        </mesh>
      ))}

      {/* Top panel */}
      <mesh position={[0, height - 0.02, 0]} material={frame} castShadow>
        <boxGeometry args={[RACK_WIDTH, 0.04, RACK_DEPTH]} />
      </mesh>

      {/* Front perforated door - primary pick target */}
      <mesh
        position={[0, height / 2, RACK_DEPTH / 2]}
        material={perforated}
        onClick={(e) => {
          e.stopPropagation();
          onClick?.(rack.id);
        }}
        onPointerOver={() => setHovered(true)}
        onPointerOut={() => setHovered(false)}
        castShadow
        receiveShadow
      >
        <boxGeometry args={[RACK_WIDTH - 0.08, height - 0.12, 0.03]} />
      </mesh>

      {/* Rear door */}
      <mesh position={[0, height / 2, -RACK_DEPTH / 2]} material={door} castShadow receiveShadow>
        <boxGeometry args={[RACK_WIDTH - 0.08, height - 0.12, 0.03]} />
      </mesh>

      {/* Door handle */}
      <mesh position={[RACK_WIDTH / 2 - 0.12, height * 0.55, RACK_DEPTH / 2 + 0.03]} material={tray}>
        <boxGeometry args={[0.03, 0.18, 0.02]} />
      </mesh>

      {/* Mounting rails */}
      {detailed &&
        [-(RACK_WIDTH / 2 - 0.12), RACK_WIDTH / 2 - 0.12].map((px) => (
          <mesh key={`rail-${px}`} position={[px, height / 2, 0.3]} material={tray}>
            <boxGeometry args={[0.02, height - 0.16, 0.03]} />
          </mesh>
        ))}

      {/* Equipment trays */}
      {trays.map((ty) => (
        <group key={ty}>
          <mesh position={[0, ty, 0.18]} material={tray} castShadow>
            <boxGeometry args={[RACK_WIDTH - 0.16, 0.035, RACK_DEPTH - 0.34]} />
          </mesh>
          <mesh
            position={[RACK_WIDTH / 2 - 0.16, ty, RACK_DEPTH / 2 - 0.08]}
            material={ledMaterial(rack.isCritical ? '#e0533d' : '#4ade80')}
          >
            <boxGeometry args={[0.02, 0.012, 0.008]} />
          </mesh>
        </group>
      ))}

      {/* Status LEDs on the door bezel (hardware state, not telemetry) */}
      <mesh
        position={[RACK_WIDTH / 2 - 0.06, height - 0.12, RACK_DEPTH / 2 + 0.02]}
        material={ledMaterial(rack.isCritical ? '#e0533d' : '#4ade80')}
      >
        <boxGeometry args={[0.024, 0.024, 0.006]} />
      </mesh>

      {/* Operational overlay - separate mesh, clipped to the rack face.
          Clearing the overlay restores the physical material untouched. */}
      {resolvedOverlay && (
        <mesh
          position={[0, height / 2, RACK_DEPTH / 2 + 0.025]}
          material={overlayMaterial(resolvedOverlay, overlayOpacity)}
          renderOrder={2}
        >
          <planeGeometry args={[RACK_WIDTH - 0.1, height - 0.14]} />
        </mesh>
      )}

      {/* Selection / hover outline */}
      {(selected || hovered || rack.isCritical) && (
        <lineSegments position={[0, height / 2, 0]}>
          <edgesGeometry args={[new THREE.BoxGeometry(RACK_WIDTH + 0.02, height, RACK_DEPTH + 0.02)]} />
          <lineBasicMaterial color={rack.isCritical ? '#e0533d' : selected ? '#ffcc00' : '#9aa1a8'} />
        </lineSegments>
      )}

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
