/**
 * RackGroup Component
 * Groups racks by row with row labeling
 */

import { Html } from '@react-three/drei';
import type { RowVisual, RackVisual } from './types';
import { Rack } from './Rack';

interface RackGroupProps {
  row: RowVisual;
  racks: RackVisual[];
  showThermal: boolean;
  onRackClick?: (rackId: string) => void;
  /** Render interior detail geometry (bounded by the quality profile budget). */
  detailed?: boolean;
  /** Resolve the operational overlay colour for a rack, or null to clear. */
  overlayColorFor?: (rack: RackVisual) => string | null;
}

export function RackGroup({
  row,
  racks,
  showThermal,
  onRackClick,
  detailed = true,
  overlayColorFor,
}: RackGroupProps) {
  const rowRacks = racks.filter(r => r.rowId === row.id);
  const rowWidth = rowRacks.length * 1.1 + 0.5;

  return (
    <group position={row.position}>
      {/* Row label - positioned above racks */}
      <Html position={[rowWidth / 2 - 0.5, 2.8, 0]} center distanceFactor={12}>
        <div className="bg-slate-900/90 backdrop-blur-sm px-3 py-1.5 rounded-md text-xs font-semibold text-white whitespace-nowrap border border-slate-700/50 shadow-lg">
          {row.name}
          <span className={`ml-2 px-1.5 py-0.5 rounded text-[10px] ${
            row.isHotAisle 
              ? 'bg-orange-500/30 text-orange-300' 
              : 'bg-blue-500/30 text-blue-300'
          }`}>
            {row.isHotAisle ? 'Hot Aisle' : 'Cold Aisle'}
          </span>
        </div>
      </Html>

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
          overlayColor={overlayColorFor ? overlayColorFor(rack) : null}
        />
      ))}
    </group>
  );
}
