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
}

export function RackGroup({ row, racks, showThermal, onRackClick }: RackGroupProps) {
  const rowRacks = racks.filter(r => r.rowId === row.id);

  return (
    <group position={row.position}>
      {/* Row label */}
      <Html position={[-1.5, 1, 0]} center distanceFactor={10}>
        <div className="bg-muted/80 backdrop-blur-sm px-2 py-1 rounded text-xs font-medium text-foreground whitespace-nowrap">
          {row.name}
          <span className="ml-2 text-muted-foreground">
            ({row.isHotAisle ? 'Hot' : 'Cold'} Aisle)
          </span>
        </div>
      </Html>

      {/* Floor marking for aisle type */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[rowRacks.length * 0.6 - 0.6, -0.01, 0]}>
        <planeGeometry args={[rowRacks.length * 1.2 + 0.5, 2.5]} />
        <meshBasicMaterial 
          color={row.isHotAisle ? '#fef3c7' : '#dbeafe'} 
          opacity={0.3} 
          transparent 
        />
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
        />
      ))}
    </group>
  );
}
