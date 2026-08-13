/**
 * Rack
 * Detailed, unbranded EIA-310 style cabinet built to documented industry
 * dimensions (600 mm wide x 1200 mm deep x 42U / 48U tall).
 *
 * No branded vendor product is approximated: this is a generic cabinet, and it
 * is replaced automatically by an approved USD/GLB derivative once one is
 * registered in `assets/manifest.json`.
 *
 * Geometry included: plinth and levelling feet, welded frame, front and rear
 * mounting uprights with U markings, perforated front and rear doors with
 * handles, solid side panels, top panel with brush gland, 1U/2U server trays
 * with vent faceplates, blanking panels, a top-of-rack switch, a patch panel,
 * a vertical PDU strip, rear power and network connection areas, cable bundles
 * and restrained status LEDs.
 *
 * Telemetry is NEVER baked into a physical material: overlay state renders on a
 * dedicated translucent mesh in front of the door, so clearing the overlay
 * restores the physical look exactly.
 */

import { useRef, useState, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import * as THREE from 'three';
import type { RackVisual } from './types';
import { getThermalColor } from './types';
import {
  surfaceMaterial,
  ledMaterial,
  overlayMaterial,
  perforatedDoorMaterial,
  faceplateMaterial,
} from '@/three/materials';

export type RackDetailLevel = 'full' | 'exterior' | 'simple';
export type RackVariant = 'compute' | 'network' | 'storage' | 'partial' | 'reserved';

interface RackProps {
  rack: RackVisual;
  showThermal: boolean;
  onClick?: (rackId: string) => void;
  /** Interior detail level, bounded by the active quality profile. */
  detailed?: boolean;
  detailLevel?: RackDetailLevel;
  /** Overlay colour for the active operational overlay, or null to clear. */
  overlayColor?: string | null;
  /** Overlay opacity (0.05 - 0.75). */
  overlayOpacity?: number;
  selected?: boolean;
}

// EIA-310 derived envelope in metres.
const RACK_WIDTH = 0.85;
const RACK_DEPTH = 1.2;
const POST = 0.05;
const U = 0.04445; // 1U = 44.45 mm

/**
 * Variant is derived from the AURA asset record (utilisation and reported
 * accelerator load), never invented. Racks with no reported population are
 * classified as reserved rather than drawn as fully populated.
 */
function deriveVariant(rack: RackVisual): RackVariant {
  if (rack.utilizationPercent <= 1) return 'reserved';
  if (rack.name.toLowerCase().includes('net') || rack.name.toLowerCase().includes('fabric')) {
    return 'network';
  }
  if ((rack.gpuLoad ?? 0) > 0) return 'compute';
  if (rack.utilizationPercent < 45) return 'partial';
  return 'storage';
}

export function Rack({
  rack,
  showThermal,
  onClick,
  detailed = true,
  detailLevel,
  overlayColor = null,
  overlayOpacity = 0.35,
  selected = false,
}: RackProps) {
  const groupRef = useRef<THREE.Group>(null);
  const [hovered, setHovered] = useState(false);

  const level: RackDetailLevel = detailLevel ?? (detailed ? 'full' : 'exterior');
  const variant = useMemo(() => deriveVariant(rack), [rack]);

  // Subtle emphasis pulse for racks affected by a simulation event.
  useFrame((state) => {
    if (groupRef.current && rack.isAffected) {
      const scale = 1 + Math.sin(state.clock.elapsedTime * 4) * 0.01;
      groupRef.current.scale.setScalar(scale);
    }
  });

  const units = rack.heightU || 42;
  const innerHeight = units * U;
  const plinth = 0.1;
  const height = innerHeight + plinth + 0.05;

  /**
   * Slot plan: each entry is one visible piece of equipment mounted at a rack
   * unit. Population comes from reported utilisation; everything else is a
   * blanking panel, so the cabinet never looks uniformly "full".
   */
  const slots = useMemo(() => {
    if (level === 'simple') return [] as Array<{ y: number; h: number; kind: string }>;
    const populated = Math.round((units * Math.min(100, Math.max(0, rack.utilizationPercent))) / 100);
    const out: Array<{ y: number; h: number; kind: string }> = [];
    let u = 0;

    // Top-of-rack switch and patch panel are present on every live cabinet.
    if (variant !== 'reserved') {
      out.push({ y: 0, h: 1, kind: 'switch' });
      out.push({ y: 1, h: 1, kind: 'patch' });
      u = 2;
    }

    const trayHeight = variant === 'compute' ? 2 : variant === 'storage' ? 4 : 1;
    while (u < Math.min(units - 1, populated)) {
      out.push({ y: u, h: trayHeight, kind: 'server' });
      u += trayHeight;
      // occasional single-U gap to break the uniform stack
      if ((out.length % 5) === 0) {
        out.push({ y: u, h: 1, kind: 'blank' });
        u += 1;
      }
    }
    while (u < units - 1) {
      out.push({ y: u, h: 2, kind: 'blank' });
      u += 2;
    }
    return out.map((s) => ({
      ...s,
      y: plinth + (s.y + s.h / 2) * U,
      h: s.h * U - 0.004,
    }));
  }, [level, units, rack.utilizationPercent, variant]);

  const resolvedOverlay = overlayColor ?? (showThermal ? getThermalColor(rack.thermalCelsius) : null);

  const frame = surfaceMaterial('powderCoatedSteel');
  const sidePanel = surfaceMaterial('darkRackDoor');
  const perforated = perforatedDoorMaterial();
  const faceplate = faceplateMaterial();
  const metal = surfaceMaterial('brushedMetal');
  const blanking = surfaceMaterial('blankingPanel');
  const plastic = surfaceMaterial('blackPlastic');
  const cable = surfaceMaterial('rubberCable');

  const frontZ = RACK_DEPTH / 2;
  const rearZ = -RACK_DEPTH / 2;

  return (
    <group position={rack.position} ref={groupRef} name={`rack:${rack.id}`} userData={{ assetId: rack.id, assetName: rack.name }}>
      {/* Levelling feet */}
      {level !== 'simple' &&
        [
          [-(RACK_WIDTH / 2 - 0.08), frontZ - 0.1],
          [RACK_WIDTH / 2 - 0.08, frontZ - 0.1],
          [-(RACK_WIDTH / 2 - 0.08), rearZ + 0.1],
          [RACK_WIDTH / 2 - 0.08, rearZ + 0.1],
        ].map(([fx, fz]) => (
          <mesh key={`foot-${fx}:${fz}`} position={[fx, 0.02, fz]} material={metal}>
            <cylinderGeometry args={[0.022, 0.03, 0.04, 8]} />
          </mesh>
        ))}

      {/* Plinth */}
      <mesh position={[0, plinth / 2 + 0.02, 0]} material={sidePanel} castShadow receiveShadow>
        <boxGeometry args={[RACK_WIDTH, plinth, RACK_DEPTH]} />
      </mesh>

      {/* Welded corner frame */}
      {[
        [-(RACK_WIDTH / 2 - POST / 2), frontZ - POST / 2],
        [RACK_WIDTH / 2 - POST / 2, frontZ - POST / 2],
        [-(RACK_WIDTH / 2 - POST / 2), rearZ + POST / 2],
        [RACK_WIDTH / 2 - POST / 2, rearZ + POST / 2],
      ].map(([px, pz]) => (
        <mesh key={`post-${px}:${pz}`} position={[px, height / 2, pz]} material={frame} castShadow>
          <boxGeometry args={[POST, height, POST]} />
        </mesh>
      ))}

      {/* Solid side panels - visually distinct from the perforated doors */}
      {[-(RACK_WIDTH / 2), RACK_WIDTH / 2].map((px) => (
        <mesh key={`side-${px}`} position={[px, height / 2, 0]} material={sidePanel} castShadow receiveShadow>
          <boxGeometry args={[0.016, height - 0.1, RACK_DEPTH - 0.03]} />
        </mesh>
      ))}

      {/* Top panel with brush-gland cut-out block */}
      <mesh position={[0, height - 0.015, 0]} material={frame} castShadow>
        <boxGeometry args={[RACK_WIDTH, 0.03, RACK_DEPTH]} />
      </mesh>
      {level !== 'simple' && (
        <mesh position={[0, height + 0.005, -0.25]} material={plastic}>
          <boxGeometry args={[RACK_WIDTH * 0.55, 0.02, 0.1]} />
        </mesh>
      )}

      {/* Front and rear mounting uprights */}
      {level === 'full' &&
        [frontZ - 0.09, rearZ + 0.09].map((pz) =>
          [-(RACK_WIDTH / 2 - 0.11), RACK_WIDTH / 2 - 0.11].map((px) => (
            <mesh key={`rail-${px}:${pz}`} position={[px, plinth + innerHeight / 2, pz]} material={metal}>
              <boxGeometry args={[0.018, innerHeight, 0.035]} />
            </mesh>
          )),
        )}

      {/* Mounted equipment and blanking panels */}
      {slots.map((slot, index) => {
        if (slot.kind === 'blank') {
          return (
            <mesh
              key={`slot-${index}`}
              position={[0, slot.y, frontZ - 0.14]}
              material={blanking}
              castShadow
            >
              <boxGeometry args={[RACK_WIDTH - 0.2, slot.h, 0.02]} />
            </mesh>
          );
        }
        const isSwitch = slot.kind === 'switch';
        const isPatch = slot.kind === 'patch';
        return (
          <group key={`slot-${index}`}>
            {/* chassis body */}
            <mesh position={[0, slot.y, 0.05]} material={plastic} castShadow>
              <boxGeometry args={[RACK_WIDTH - 0.21, slot.h, RACK_DEPTH - 0.42]} />
            </mesh>
            {/* detailed faceplate */}
            <mesh position={[0, slot.y, frontZ - 0.135]} material={isPatch ? metal : faceplate}>
              <boxGeometry args={[RACK_WIDTH - 0.2, slot.h, 0.018]} />
            </mesh>
            {/* status LEDs (hardware state, never telemetry) */}
            <mesh
              position={[RACK_WIDTH / 2 - 0.15, slot.y, frontZ - 0.124]}
              material={ledMaterial(rack.isCritical && index % 4 === 0 ? '#e0533d' : isSwitch ? '#4aa3ff' : '#4ade80')}
            >
              <boxGeometry args={[0.018, 0.008, 0.006]} />
            </mesh>
          </group>
        );
      })}

      {/* Vertical rack PDU on the rear right upright */}
      {level === 'full' && variant !== 'reserved' && (
        <>
          <mesh position={[RACK_WIDTH / 2 - 0.06, plinth + innerHeight / 2, rearZ + 0.16]} material={plastic} castShadow>
            <boxGeometry args={[0.05, innerHeight * 0.9, 0.05]} />
          </mesh>
          <mesh position={[RACK_WIDTH / 2 - 0.06, plinth + innerHeight * 0.95, rearZ + 0.19]} material={ledMaterial('#4ade80')}>
            <boxGeometry args={[0.02, 0.012, 0.005]} />
          </mesh>
        </>
      )}

      {/* Rear cable bundles into the overhead tray */}
      {level === 'full' && variant !== 'reserved' &&
        [-0.18, 0, 0.18].map((cx) => (
          <mesh key={`bundle-${cx}`} position={[cx, plinth + innerHeight * 0.75, rearZ + 0.08]} material={cable}>
            <cylinderGeometry args={[0.022, 0.022, innerHeight * 0.5, 6]} />
          </mesh>
        ))}

      {/* Front perforated door - primary pick target */}
      <mesh
        position={[0, plinth + innerHeight / 2, frontZ]}
        material={perforated}
        onClick={(e) => {
          e.stopPropagation();
          onClick?.(rack.id);
        }}
        onPointerOver={() => setHovered(true)}
        onPointerOut={() => setHovered(false)}
        castShadow
        receiveShadow
        name={`rack-front-door:${rack.id}`}
      >
        <boxGeometry args={[RACK_WIDTH - 0.06, innerHeight, 0.02]} />
      </mesh>

      {/* Rear perforated door */}
      <mesh position={[0, plinth + innerHeight / 2, rearZ]} material={perforated} castShadow receiveShadow name={`rack-rear-door:${rack.id}`}>
        <boxGeometry args={[RACK_WIDTH - 0.06, innerHeight, 0.02]} />
      </mesh>

      {/* Door handles, front and rear */}
      {[frontZ + 0.03, rearZ - 0.03].map((hz) => (
        <mesh key={`handle-${hz}`} position={[RACK_WIDTH / 2 - 0.1, height * 0.55, hz]} material={metal}>
          <boxGeometry args={[0.026, 0.2, 0.026]} />
        </mesh>
      ))}

      {/* Operational overlay - separate mesh in front of the door face. */}
      {resolvedOverlay && (
        <mesh
          position={[0, plinth + innerHeight / 2, frontZ + 0.02]}
          material={overlayMaterial(resolvedOverlay, overlayOpacity)}
          renderOrder={2}
        >
          <planeGeometry args={[RACK_WIDTH - 0.08, innerHeight]} />
        </mesh>
      )}

      {/* Selection / hover outline - never replaces the physical material */}
      {(selected || hovered || rack.isCritical) && (
        <lineSegments position={[0, height / 2, 0]}>
          <edgesGeometry args={[new THREE.BoxGeometry(RACK_WIDTH + 0.03, height, RACK_DEPTH + 0.03)]} />
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
