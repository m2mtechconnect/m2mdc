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

import { useEffect, useMemo } from 'react';
import type { RowVisual } from './types';
import type { QualityProfile } from '@/three/qualityProfiles';
import { useRuntimeCoverageStore } from './runtimeCoverageStore';
import { familyMounted, useFacilityDerivativeStore } from './facilityDerivativeStore';
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
  // Procedural geometry stands in only where an AURA-authored OpenUSD
  // derivative has NOT mounted. State comes from the live scene, never from
  // the manifest, so a failed or pending derivative keeps its stand-in.
  const families = useFacilityDerivativeStore((s) => s.families);
  const floorDerived = familyMounted(families, 'raised-floor-tile');
  const supplyTilesDerived = familyMounted(families, 'perforated-floor-tile');
  const shellDerived = familyMounted(families, 'facility-shell');
  const showShell = shellMode !== 'off' && !shellDerived;
  const fullShell = shellMode === 'full';

  const floor = floorMaterial(Math.max(8, Math.round(Math.max(width, depth) / 0.6)));
  const wall = surfaceMaterial('wallPanel');
  const tray = surfaceMaterial('galvanizedTray');
  const busbar = surfaceMaterial('copperBus');
  const pipe = surfaceMaterial('chilledPipe');
  const glass = surfaceMaterial('glass');
  const paint = surfaceMaterial('safetyPaint');
  const steel = surfaceMaterial('powderCoatedSteel');
  const perforatedTile = perforatedTileMaterial();

  /**
   * Environmental geometry is AURA procedural, not OpenUSD-derived. It is
   * reported so the provenance breakdown can separate it from the approved
   * NVIDIA derivatives instead of implying one uniform OpenUSD facility.
   */
  const reportProcedural = useRuntimeCoverageStore((s) => s.reportProcedural);
  const coldAisles = rows.filter((r) => !r.isHotAisle).length;
  const hotAisles = rows.filter((r) => r.isHotAisle).length;
  const proceduralCount =
    (floorDerived ? 0 : 1) + // raised floor plane
    (supplyTilesDerived ? 0 : coldAisles) + // perforated supply tile strips
    2 + // painted aisle markings
    (showShell ? (fullShell ? 4 : 2) : 0) + // perimeter walls
    rows.length + // overhead cable tray runs
    (structural ? rows.length : 0) + // busway
    (structural ? 2 : 0) + // chilled water pipes
    (structural ? hotAisles * 2 : 0) + // containment end doors
    crahUnits * 2; // CRAH body + filter face
  useEffect(() => {
    reportProcedural('data-hall-environment', {
      label: 'AURA procedural environmental geometry (floor, walls, services)',
      count: proceduralCount,
      kind: 'physical',
    });
  }, [reportProcedural, proceduralCount]);

  return (
    <group name="OperationalScene:environment" userData={{ classification: 'environmental-geometry' }}>
      {/* Raised floor with 600 mm tile grid. Suppressed once the AURA-authored
          OpenUSD tile derivative has mounted, so the two never z-fight. */}
      {!floorDerived && (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[cx, 0, cz]} material={floor} receiveShadow>
          <planeGeometry args={[width, depth]} />
        </mesh>
      )}

      {/* Perforated supply tiles in the cold aisles */}
      {!supplyTilesDerived &&
        rows
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

      {/* Overhead cable trays and power busway following each row. Kept slim
          and high so they read as services, never as occluding structure. */}
      {rows.map((row) => (
        <group key={`overhead-${row.id}`}>
          <mesh position={[cx, 4.35, row.position[2]]} material={tray} castShadow>
            <boxGeometry args={[width - 1.2, 0.035, 0.2]} />
          </mesh>
          {structural && (
            <mesh position={[cx, 4.6, row.position[2]]} material={busbar} castShadow>
              <boxGeometry args={[width - 1.6, 0.05, 0.05]} />
            </mesh>
          )}
        </group>
      ))}

      {/* Chilled water supply and return routed along the rear wall */}
      {structural &&
        [
          { y: 4.2, z: minZ + 0.5 },
          { y: 3.95, z: minZ + 0.5 },
        ].map((p) => (
          <mesh
            key={`pipe-${p.y}`}
            rotation={[0, 0, Math.PI / 2]}
            position={[cx, p.y, p.z]}
            material={pipe}
            castShadow
          >
            <cylinderGeometry args={[0.07, 0.07, width - 1, 12]} />
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
