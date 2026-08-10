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

const RACK_W = 46;
const RACK_H = 76;
const GAP = 10;
/** Alternating hot / cold service aisles between rack rows. */
const AISLE_H = 34;
const ROW_LABEL_W = 64;
const PAD = 26;
const SCALE_H = 26;

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
  const rowStride = RACK_H + AISLE_H;
  const floorW = perRow * (RACK_W + GAP) - GAP;
  const width = PAD * 2 + ROW_LABEL_W + floorW;
  const height = PAD * 2 + facility.rowCount * rowStride + SCALE_H;
  const rng = seededRandom(`${facility.id}:floorplan`);
  const values: number[] = Array.from({ length: facility.rowCount * perRow }, () => rng());
  const floorX = PAD + ROW_LABEL_W;

  return (
    <div
      className="h-full w-full overflow-auto bg-[#0a1020] p-3"
      data-testid="facility-floor-plan"
    >
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="mx-auto h-full w-full"
        preserveAspectRatio="xMidYMid meet"
        role="img"
        aria-label={`Simulated floor plan of ${facility.name}: ${facility.rowCount} rows, ${facility.rackCount} racks represented.`}
      >
        <defs>
          <pattern id="fp-grid" width={20} height={20} patternUnits="userSpaceOnUse">
            <path d="M20 0H0V20" fill="none" stroke="#16233d" strokeWidth={1} />
          </pattern>
        </defs>
        <rect x={0} y={0} width={width} height={height} fill="#0a1020" />
        <rect
          x={floorX - 12}
          y={PAD - 12}
          width={floorW + 24}
          height={facility.rowCount * rowStride - AISLE_H + 24}
          fill="url(#fp-grid)"
          stroke="#22304d"
          strokeWidth={1}
          rx={4}
        />

        {Array.from({ length: facility.rowCount }).map((_, r) => {
          const y = PAD + r * rowStride;
          const rowId = `row-${r + 1}`;
          const rowLetter = String.fromCharCode(65 + r);
          const rowSelected = selectedAssetId === rowId;
          const coldAisle = r % 2 === 0;
          return (
            <g key={rowId}>
              {/* Aisle band below the row: alternating cold / hot service aisle. */}
              {r < facility.rowCount - 1 && (
                <g>
                  <rect
                    x={floorX}
                    y={y + RACK_H + 5}
                    width={floorW}
                    height={AISLE_H - 10}
                    fill={coldAisle ? '#0d2a3f' : '#2c1517'}
                    rx={2}
                  />
                  <text
                    x={floorX + 8}
                    y={y + RACK_H + AISLE_H / 2}
                    fill={coldAisle ? '#7fc3d4' : '#e8908d'}
                    fontSize={11}
                    fontWeight={600}
                    letterSpacing={1}
                    dominantBaseline="middle"
                  >
                    {coldAisle ? 'COLD AISLE' : 'HOT AISLE'}
                  </text>
                </g>
              )}

              <text
                x={PAD + 4}
                y={y + RACK_H / 2}
                fill={rowSelected ? '#ffcc00' : '#94a3b8'}
                fontSize={14}
                fontWeight={700}
                dominantBaseline="middle"
                className="cursor-pointer"
                onClick={() => onSelect(rowId)}
              >
                {`ROW ${rowLetter}`}
                <title>{`Row ${rowLetter} (modelled)`}</title>
              </text>

              {Array.from({ length: perRow }).map((__, i) => {
                const id = `rack-${r + 1}-${i + 1}`;
                const t = values[r * perRow + i] ?? 0.5;
                const isSelected = selectedAssetId === id;
                const x = floorX + i * (RACK_W + GAP);
                const loadPct = Math.round(t * 100);
                const constrained = t > 0.92;
                const units = 6;
                return (
                  <g
                    key={id}
                    tabIndex={0}
                    role="button"
                    aria-label={`Rack ${rowLetter}${i + 1}, modelled load ${loadPct} percent${
                      constrained ? ', modelled constraint' : ''
                    }`}
                    className={cn(
                      'cursor-pointer outline-none transition-opacity duration-150 hover:opacity-80',
                      'focus-visible:[&>rect:first-of-type]:stroke-[#ffcc00]',
                      'focus-visible:[&>rect:first-of-type]:[stroke-width:3]',
                    )}
                    onClick={() => onSelect(id)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault();
                        onSelect(id);
                      }
                    }}
                  >
                    <rect
                      x={x}
                      y={y}
                      width={RACK_W}
                      height={RACK_H}
                      rx={3}
                      fill="#0f172a"
                      stroke={isSelected ? '#ffcc00' : '#33415c'}
                      strokeWidth={isSelected ? 3 : 1}
                    />
                    {/* Modelled server units inside the rack enclosure. */}
                    {Array.from({ length: units }).map((___, u) => (
                      <rect
                        key={u}
                        x={x + 4}
                        y={y + 14 + u * 10}
                        width={RACK_W - 8}
                        height={7}
                        rx={1}
                        fill={rackFill(String(overlay), t)}
                        opacity={u / units < t ? 0.95 : 0.28}
                      />
                    ))}
                    <text
                      x={x + RACK_W / 2}
                      y={y + 8}
                      fill="#cbd5e1"
                      fontSize={9}
                      fontWeight={600}
                      textAnchor="middle"
                      dominantBaseline="middle"
                    >
                      {`${rowLetter}${i + 1}`}
                    </text>
                    {constrained && (
                      <circle cx={x + RACK_W - 5} cy={y + RACK_H - 5} r={3.5} fill="#BA0517" stroke="#0a1020" />
                    )}
                    <title>
                      {`Rack ${rowLetter}${i + 1} · modelled load ${loadPct}% · ${
                        constrained ? 'modelled constraint' : 'within modelled range'
                      }`}
                    </title>
                  </g>
                );
              })}
            </g>
          );
        })}

        {/* Scale reference. */}
        <g>
          <line
            x1={floorX}
            x2={floorX + (RACK_W + GAP) * 5 - GAP}
            y1={height - PAD - 6}
            y2={height - PAD - 6}
            stroke="#64748b"
            strokeWidth={1.5}
          />
          <text x={floorX} y={height - PAD + 10} fill="#94a3b8" fontSize={11}>
            5 rack positions (modelled scale)
          </text>
        </g>
      </svg>
    </div>
  );
}
