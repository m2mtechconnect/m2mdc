/**
 * RackGroup Component
 * Groups racks by row with row labeling
 */

import { useState } from 'react';
import { Html } from '@react-three/drei';
import type { RowVisual, RackVisual } from './types';
import { Rack, type RackDetailLevel } from './Rack';

interface RackGroupProps {
  row: RowVisual;
  racks: RackVisual[];
  showThermal: boolean;
  onRackClick?: (rackId: string) => void;
  /** Render interior detail geometry (bounded by the quality profile budget). */
  detailed?: boolean;
  /** Resolve the operational overlay colour for a rack, or null to clear. */
  overlayColorFor?: (rack: RackVisual) => string | null;
  /** Rack geometry level of detail from the active quality profile. */
  detailLevel?: RackDetailLevel;
  selectedRackId?: string | null;
  /** Row annotations visibility (Labels: On/Off view setting). */
  showLabels?: boolean;
}

export function RackGroup({
  row,
  racks,
  showThermal,
  onRackClick,
  detailed = true,
  overlayColorFor,
  detailLevel,
  selectedRackId,
  showLabels = true,
}: RackGroupProps) {
  const rowRacks = racks.filter(r => r.rowId === row.id);
  const rowWidth = rowRacks.length * 1.1 + 0.5;
  const [expanded, setExpanded] = useState(false);
  const selectedInRow = rowRacks.some((r) => r.id === selectedRackId);
  const detailVisible = expanded || selectedInRow;

  return (
    <group position={row.position}>
      {/* Compact row annotation. Screen-space sized, occluded by equipment,
          aisle descriptor revealed on hover / focus / selection only. */}
      {showLabels && (
        <Html
          position={[rowWidth / 2 - 0.5, 2.45, 0]}
          center
          occlude
          zIndexRange={[20, 0]}
          style={{ pointerEvents: 'auto' }}
        >
          <button
            type="button"
            onPointerOver={() => setExpanded(true)}
            onPointerOut={() => setExpanded(false)}
            onFocus={() => setExpanded(true)}
            onBlur={() => setExpanded(false)}
            className={`whitespace-nowrap rounded border px-1.5 py-0.5 text-[10px] leading-none backdrop-blur-sm ${
              selectedInRow
                ? 'border-amber-400/70 bg-slate-900/95 text-amber-200'
                : 'border-slate-700/60 bg-slate-900/80 text-slate-200'
            }`}
          >
            {row.name}
            {detailVisible && (
              <span className={row.isHotAisle ? 'text-orange-300' : 'text-sky-300'}>
                {` · ${row.isHotAisle ? 'Hot aisle' : 'Cold aisle'}`}
              </span>
            )}
          </button>
        </Html>
      )}

      {/* Floor marking for aisle type - subtle glow strip */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[rowWidth / 2 - 0.5, 0.01, 0]}>
        <planeGeometry args={[rowWidth, 2.8]} />
        <meshBasicMaterial 
          color={row.isHotAisle ? '#ff6600' : '#0066ff'} 
          opacity={0.08} 
          transparent 
        />
      </mesh>

      {/* Aisle edge lines */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[rowWidth / 2 - 0.5, 0.015, 1.35]}>
        <planeGeometry args={[rowWidth, 0.05]} />
        <meshBasicMaterial color={row.isHotAisle ? '#ff8844' : '#4488ff'} opacity={0.5} transparent />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[rowWidth / 2 - 0.5, 0.015, -1.35]}>
        <planeGeometry args={[rowWidth, 0.05]} />
        <meshBasicMaterial color={row.isHotAisle ? '#ff8844' : '#4488ff'} opacity={0.5} transparent />
      </mesh>

      {/* Render racks */}
      {rowRacks.map((rack) => (
        <Rack 
          key={rack.id} 
          rack={{
            ...rack,
            position: [rack.position[0] - row.position[0], rack.position[1], 0]
          }}
          showThermal={showThermal}
          onClick={onRackClick}
          detailed={detailed}
          detailLevel={detailLevel}
          selected={selectedRackId === rack.id}
          overlayColor={overlayColorFor ? overlayColorFor(rack) : null}
        />
      ))}
    </group>
  );
}
