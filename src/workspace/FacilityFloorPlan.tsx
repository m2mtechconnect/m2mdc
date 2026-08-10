/**
 * Deterministic 2D floor plan of the facility model.
 *
 * This is the guaranteed-renderable representation of the same asset tree the
 * 3D scene draws. It requires no WebGL, so the workspace can always show the
 * facility instead of an endless loading state. Values are SIMULATED model
 * outputs, never measured telemetry.
 */
import { cn } from '@/lib/utils';
import { seededRandom, type FacilityDefinition } from './facilityModel';
import type { TwinOverlay } from '@/context/TwinOverlayContext';

interface Props {
  facility: FacilityDefinition;
  overlay: TwinOverlay | string;
  selectedAssetId: string | null;
  onSelect: (assetId: string) => void;
}

const RACK_W = 26;
const RACK_H = 46;
const GAP = 6;
const ROW_GAP = 34;
const PAD = 28;

/** Overlay-specific colour ramp, expressed with plain CSS colours on the dark plate. */
function rackFill(overlay: string, t: number): string {
  const ramp = (a: string, b: string, c: string) => (t < 0.34 ? a : t < 0.67 ? b : c);
  switch (overlay) {
    case 'power':
      return ramp('#1f6f4a', '#b8860b', '#a13333');
    case 'cooling':
      return ramp('#155e75', '#2b8ca6', '#7fc3d4');
    case 'gpu':
      return ramp('#2c3e6b', '#3f68b8', '#7aa2f7');
    case 'workload':
      return ramp('#3a3f4b', '#6b7280', '#cbd5e1');
    case 'network':
      return ramp('#3b2f5e', '#5a4a92', '#8f7fd1');
    case 'sovereignty':
      return ramp('#4a3a10', '#8a6b16', '#ffcc00');
    case 'carbon':
      return ramp('#14532d', '#4d7c0f', '#a16207');
    case 'thermal':
    default:
      return ramp('#2563a8', '#c98a1e', '#b23b3b');
  }
}

export function FacilityFloorPlan({ facility, overlay, selectedAssetId, onSelect }: Props) {
  const perRow = Math.ceil(facility.rackCount / facility.rowCount);
  const width = PAD * 2 + perRow * (RACK_W + GAP);
  const height = PAD * 2 + facility.rowCount * (RACK_H + ROW_GAP);
  const rng = seededRandom(`${facility.id}:floorplan`);
  const values: number[] = Array.from({ length: facility.rowCount * perRow }, () => rng());

  return (
    <div className="h-full w-full overflow-auto bg-[#0a0a14] p-2" data-testid="facility-floor-plan">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="h-full w-full"
        role="img"
        aria-label={`Simulated floor plan of ${facility.name}: ${facility.rowCount} rows, ${facility.rackCount} racks.`}
      >
        <rect x={0} y={0} width={width} height={height} fill="#0a0a14" />
        {Array.from({ length: facility.rowCount }).map((_, r) => {
          const y = PAD + r * (RACK_H + ROW_GAP);
          const rowId = `row-${r + 1}`;
          const rowLetter = String.fromCharCode(65 + r);
          return (
            <g key={rowId}>
              <text x={4} y={y + RACK_H / 2} fill="#94a3b8" fontSize={11} dominantBaseline="middle">
                {rowLetter}
              </text>
              <rect
                x={PAD - 6}
                y={y - 6}
                width={perRow * (RACK_W + GAP) + 6}
                height={RACK_H + 12}
                rx={4}
                fill="transparent"
                stroke={selectedAssetId === rowId ? '#ffcc00' : '#1e293b'}
                strokeWidth={selectedAssetId === rowId ? 2 : 1}
                className="cursor-pointer"
                onClick={() => onSelect(rowId)}
              />
              {Array.from({ length: perRow }).map((__, i) => {
                const id = `rack-${r + 1}-${i + 1}`;
                const t = values[r * perRow + i] ?? 0.5;
                const isSelected = selectedAssetId === id;
                return (
                  <rect
                    key={id}
                    x={PAD + i * (RACK_W + GAP)}
                    y={y}
                    width={RACK_W}
                    height={RACK_H}
                    rx={2}
                    fill={rackFill(String(overlay), t)}
                    stroke={isSelected ? '#ffcc00' : '#0f172a'}
                    strokeWidth={isSelected ? 2 : 1}
                    className={cn('cursor-pointer transition-opacity hover:opacity-80')}
                    onClick={() => onSelect(id)}
                  >
                    <title>{`Rack ${rowLetter}${i + 1} (simulated)`}</title>
                  </rect>
                );
              })}
            </g>
          );
        })}
      </svg>
    </div>
  );
}
