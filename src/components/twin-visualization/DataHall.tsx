/**
 * DataHall
 * Architectural environment for the facility model.
 *
 * Everything rendered here is classified as ENVIRONMENTAL GEOMETRY: it gives
 * the hall believable scale and context but does not represent an addressable
 * AURA asset and is never selectable or labelled with telemetry. Equipment that
 * does map to an asset record (racks, and CRAH units when the facility model
 * declares them) is rendered by the asset components instead.
 */

import { useMemo } from 'react';
import type { RowVisual } from './types';
import type { QualityProfile } from '@/three/qualityProfiles';
import {
  floorMaterial,
  perforatedTileMaterial,
  surfaceMaterial,
} from '@/three/materials';

export interface HallBounds {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
}

/**
 * Facility shell visibility.
 *   off     - operator default: no walls, ceiling or structural beams.
 *   cutaway - distant context walls only, camera-facing sections removed.
 *   full    - complete architectural shell for spatial review.
 */
export type ShellMode = 'off' | 'cutaway' | 'full';

interface Props {
  bounds: HallBounds;
  rows: RowVisual[];
  profile: QualityProfile;
  /** Number of CRAH units declared by the facility model. 0 renders none. */
  crahUnits?: number;
  /** Architectural shell visibility. Defaults to the operator view (off). */
  shellMode?: ShellMode;
}

const CEILING = 4.2;
const WALL_CLEARANCE = 2.0;

export function DataHall({ bounds, rows, profile, crahUnits = 0, shellMode = 'off' }: Props) {
  const geometry = useMemo(() => {
    const minX = bounds.minX - WALL_CLEARANCE;
    const maxX = bounds.maxX + WALL_CLEARANCE;
    const minZ = bounds.minZ - WALL_CLEARANCE;
    const maxZ = bounds.maxZ + WALL_CLEARANCE;
    return {
      minX,
      maxX,
      minZ,
      maxZ,
      width: maxX - minX,
      depth: maxZ - minZ,
      cx: (minX + maxX) / 2,
      cz: (minZ + maxZ) / 2,
    };
  }, [bounds]);

  const { minX, maxX, minZ, maxZ, width, depth, cx, cz } = geometry;
  const structural = profile.id !== 'low';
  const showShell = shellMode !== 'off';
  const fullShell = shellMode === 'full';

  const floor = floorMaterial(Math.max(8, Math.round(Math.max(width, depth) / 0.6)));
  const wall = surfaceMaterial('wallPanel');
  const ceiling = surfaceMaterial('ceilingPanel');
  const tray = surfaceMaterial('galvanizedTray');
  const busbar = surfaceMaterial('copperBus');
  const pipe = surfaceMaterial('chilledPipe');
  const glass = surfaceMaterial('glass');
  const paint = surfaceMaterial('safetyPaint');
  const steel = surfaceMaterial('powderCoatedSteel');
  const perforatedTile = perforatedTileMaterial();

  return (
    <group name="OperationalScene:environment" userData={{ classification: 'environmental-geometry' }}>
      {/* Raised floor with 600 mm tile grid */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[cx, 0, cz]} material={floor} receiveShadow>
        <planeGeometry args={[width, depth]} />
      </mesh>

      {/* Perforated supply tiles in the cold aisles */}
      {rows
        .filter((r) => !r.isHotAisle)
        .map((row) => (
          <mesh
            key={`tile-${row.id}`}
            rotation={[-Math.PI / 2, 0, 0]}
            position={[cx, 0.006, row.position[2] + 1.4]}
            material={perforatedTile}
          >
            <planeGeometry args={[Math.max(4, bounds.maxX - bounds.minX + 1.2), 0.6]} />
          </mesh>
        ))}

      {/* Painted aisle safety clearance markings along the hall edges */}
      {[minZ + 1.4, maxZ - 1.4].map((mz) => (
        <mesh key={`mark-${mz}`} rotation={[-Math.PI / 2, 0, 0]} position={[cx, 0.008, mz]} material={paint}>
          <planeGeometry args={[width - 2, 0.12]} />
        </mesh>
      ))}

      {/* FacilityShell: purely architectural context. Never included in camera
          fit and never rendered in the default operator view. */}
      {showShell && (
        <group name="FacilityShell" userData={{ classification: 'facility-shell' }}>
          <group name="FacilityShell:PerimeterWalls">
            {/* Distant wall retained in both cutaway and full. */}
            <mesh position={[cx, CEILING / 2, minZ]} material={wall} receiveShadow>
              <boxGeometry args={[width, fullShell ? CEILING : CEILING * 0.6, 0.2]} />
            </mesh>
            <mesh position={[minX, CEILING / 2, cz]} material={wall} receiveShadow>
              <boxGeometry args={[0.2, fullShell ? CEILING : CEILING * 0.6, depth]} />
            </mesh>
            {/* Camera-facing walls exist only in full shell mode. */}
            {fullShell && (
              <>
                <mesh position={[maxX, CEILING / 2, cz]} material={wall} receiveShadow>
                  <boxGeometry args={[0.2, CEILING, depth]} />
                </mesh>
                <mesh position={[cx, CEILING / 2, maxZ]} material={wall} receiveShadow>
                  <boxGeometry args={[width, CEILING, 0.2]} />
                </mesh>
              </>
            )}
          </group>

          {/* Structural beams, roof cross-members and ceiling decks are
              permanently removed from every shell mode: they carry no
              operational identity and occluded the rack faces. Overhead
              lighting lives in FacilityLighting and is unaffected. */}
        </group>
      )}

      {/* Overhead cable trays and power busway following each row */}
      {rows.map((row) => (
        <group key={`overhead-${row.id}`}>
          <mesh position={[cx, 3.5, row.position[2]]} material={tray} castShadow>
            <boxGeometry args={[width - 1.2, 0.06, 0.34]} />
          </mesh>
          {structural && (
            <mesh position={[cx, 3.9, row.position[2]]} material={busbar} castShadow>
              <boxGeometry args={[width - 1.6, 0.1, 0.1]} />
            </mesh>
          )}
        </group>
      ))}

      {/* Chilled water supply and return routed along the rear wall */}
      {structural &&
        [
          { y: 3.2, z: minZ + 0.5 },
          { y: 2.9, z: minZ + 0.5 },
        ].map((p) => (
          <mesh
            key={`pipe-${p.y}`}
            rotation={[0, 0, Math.PI / 2]}
            position={[cx, p.y, p.z]}
            material={pipe}
            castShadow
          >
            <cylinderGeometry args={[0.11, 0.11, width - 1, 12]} />
          </mesh>
        ))}

      {/* Hot-aisle containment: end doors in transparent panels */}
      {structural &&
        rows
          .filter((r) => r.isHotAisle)
          .map((row) =>
            [bounds.minX - 0.9, bounds.maxX + 0.9].map((px) => (
              <mesh key={`cont-${row.id}-${px}`} position={[px, 1.2, row.position[2]]} material={glass}>
                <boxGeometry args={[0.06, 2.4, 1.9]} />
              </mesh>
            )),
          )}

      {/* CRAH units - only rendered when the facility model declares them */}
      {Array.from({ length: crahUnits }, (_, i) => {
        const px = minX + 2 + i * 3.2;
        if (px > maxX - 2) return null;
        return (
          <group key={`crah-${i}`} position={[px, 0, maxZ - 1.2]} name={`environment:crah-${i}`}>
            <mesh position={[0, 1.05, 0]} material={steel} castShadow receiveShadow>
              <boxGeometry args={[1.6, 2.1, 0.9]} />
            </mesh>
            <mesh position={[0, 1.4, 0.47]} material={perforatedTile}>
              <boxGeometry args={[1.3, 1.1, 0.03]} />
            </mesh>
          </group>
        );
      })}

    </group>
  );
}
