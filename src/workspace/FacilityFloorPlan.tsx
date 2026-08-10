/**
 * Deterministic 2D floor plan of the facility model.
 *
 * Stage 7D: every rack is an individually focusable, selectable control with a
 * default, hover, keyboard-focus, selected, constraint and unavailable state.
 * Values are SIMULATED model outputs, never measured telemetry.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';
import type { FacilityDefinition } from './facilityModel';
import type { RackGrid, RackNode } from './dashboard/rackModel';

export interface CenterRequest {
  rackId: string;
  nonce: number;
}

interface Props {
  facility: FacilityDefinition;
  overlay: string;
  grid: RackGrid;
  selectedRackId: string | null;
  onSelect: (rackId: string) => void;
  onClearSelection?: () => void;
  /** Zoom factor applied to the scrollable stage. 1 = fit to card. */
  zoom?: number;
  /** Secondary overlays toggled from the layer menu. */
  showRowLabels?: boolean;
  showConstraintMarkers?: boolean;
  showCoolingZones?: boolean;
  /** Request to scroll a rack into view and focus it. */
  centerRequest?: CenterRequest | null;
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

const STATE_TEXT: Record<RackNode['state'], string> = {
  within: 'Within target',
  watch: 'Watch',
  constraint: 'Constraint',
  unknown: 'Unknown',
  unavailable: 'Unavailable',
};

export function FacilityFloorPlan({
  facility,
  overlay,
  grid,
  selectedRackId,
  onSelect,
  onClearSelection,
  zoom = 1,
  showRowLabels = true,
  showConstraintMarkers = true,
  showCoolingZones = true,
  centerRequest = null,
}: Props) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  const { perRow, rowCount } = grid;
  const rowStride = RACK_H + AISLE_H;
  const floorW = perRow * (RACK_W + GAP) - GAP;
  const width = PAD * 2 + ROW_LABEL_W + floorW;
  const height = PAD * 2 + rowCount * rowStride + SCALE_H;
  const floorX = PAD + ROW_LABEL_W;

  const focusRack = useCallback((rackId: string) => {
    const node = scrollRef.current?.querySelector<SVGGElement>(`[data-rack-id="${rackId}"]`);
    node?.focus();
  }, []);

  const centerRack = useCallback((rackId: string) => {
    const container = scrollRef.current;
    const node = container?.querySelector<SVGGElement>(`[data-rack-id="${rackId}"]`);
    if (!container || !node) return;
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
    const rect = node.getBoundingClientRect();
    const box = container.getBoundingClientRect();
    container.scrollTo({
      left: container.scrollLeft + (rect.left - box.left) - box.width / 2 + rect.width / 2,
      top: container.scrollTop + (rect.top - box.top) - box.height / 2 + rect.height / 2,
      behavior: reduce ? 'auto' : 'smooth',
    });
  }, []);

  useEffect(() => {
    if (!centerRequest) return;
    centerRack(centerRequest.rackId);
    focusRack(centerRequest.rackId);
  }, [centerRequest, centerRack, focusRack]);

  const moveFocus = (rack: RackNode, dx: number, dy: number) => {
    const col = Math.min(Math.max(rack.colIndex + dx, 0), perRow - 1);
    const row = Math.min(Math.max(rack.rowIndex + dy, 0), rowCount - 1);
    const next = grid.racks.find((r) => r.rowIndex === row && r.colIndex === col);
    if (next && next.id !== rack.id) {
      focusRack(next.id);
      centerRack(next.id);
    }
  };

  const hovered = hoveredId ? grid.byId.get(hoveredId) ?? null : null;

  return (
    <div
      ref={scrollRef}
      className="h-full w-full overflow-auto bg-[#0a1020]"
      data-testid="facility-floor-plan"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClearSelection?.();
      }}
    >
      <div
        className="min-h-full p-3"
        style={{ width: `${zoom * 100}%`, height: `${zoom * 100}%` }}
      >
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="mx-auto h-full w-full"
          preserveAspectRatio="xMidYMid meet"
          aria-label={`Simulated floor plan of ${facility.name}: ${rowCount} rows, ${facility.rackCount} racks represented.`}
        >
          <defs>
            <pattern id="fp-grid" width={20} height={20} patternUnits="userSpaceOnUse">
              <path d="M20 0H0V20" fill="none" stroke="#16233d" strokeWidth={1} />
            </pattern>
          </defs>
          <rect
            x={0}
            y={0}
            width={width}
            height={height}
            fill="#0a1020"
            onMouseDown={() => onClearSelection?.()}
          />
          <rect
            x={floorX - 12}
            y={PAD - 12}
            width={floorW + 24}
            height={rowCount * rowStride - AISLE_H + 24}
            fill="url(#fp-grid)"
            stroke="#22304d"
            strokeWidth={1}
            rx={4}
          />

          {Array.from({ length: rowCount }).map((_, r) => {
            const y = PAD + r * rowStride;
            const rowLetter = String.fromCharCode(65 + r);
            const coldAisle = r % 2 === 0;
            const rowSelected = grid.byId.get(selectedRackId ?? '')?.rowIndex === r;
            return (
              <g key={`row-${r + 1}`}>
                {showCoolingZones && r < rowCount - 1 && (
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

                {showRowLabels && (
                  <text
                    x={PAD + 4}
                    y={y + RACK_H / 2}
                    fill={rowSelected ? '#ffcc00' : '#94a3b8'}
                    fontSize={14}
                    fontWeight={700}
                    dominantBaseline="middle"
                  >
                    {`ROW ${rowLetter}`}
                  </text>
                )}

                {grid.racks
                  .filter((rack) => rack.rowIndex === r)
                  .map((rack) => {
                    const t = rack.load ?? 0;
                    const isSelected = selectedRackId === rack.id;
                    const dimmed = Boolean(selectedRackId) && !isSelected;
                    const x = floorX + rack.colIndex * (RACK_W + GAP);
                    const loadText = rack.load === null ? 'unavailable' : `${Math.round(t * 100)}%`;
                    const units = 6;
                    return (
                      <g
                        key={rack.id}
                        data-rack-id={rack.id}
                        data-rack-code={rack.code}
                        data-rack-state={rack.state}
                        data-selected={isSelected ? 'true' : 'false'}
                        tabIndex={0}
                        role="button"
                        aria-selected={isSelected}
                        aria-label={`Rack ${rack.code}, row ${rowLetter}, modelled load ${loadText}, state ${STATE_TEXT[rack.state]}. Opens rack details.`}
                        className={cn(
                          'cursor-pointer outline-none transition-opacity duration-150',
                          'focus-visible:[&>rect:first-of-type]:stroke-[#ffcc00]',
                          'focus-visible:[&>rect:first-of-type]:[stroke-width:3]',
                          'hover:opacity-100',
                        )}
                        opacity={dimmed ? 0.45 : 1}
                        onMouseEnter={() => setHoveredId(rack.id)}
                        onMouseLeave={() => setHoveredId((id) => (id === rack.id ? null : id))}
                        onFocus={() => setHoveredId(rack.id)}
                        onBlur={() => setHoveredId((id) => (id === rack.id ? null : id))}
                        onClick={() => onSelect(rack.id)}
                        onKeyDown={(event) => {
                          switch (event.key) {
                            case 'Enter':
                            case ' ':
                              event.preventDefault();
                              onSelect(rack.id);
                              break;
                            case 'ArrowRight':
                              event.preventDefault();
                              moveFocus(rack, 1, 0);
                              break;
                            case 'ArrowLeft':
                              event.preventDefault();
                              moveFocus(rack, -1, 0);
                              break;
                            case 'ArrowDown':
                              event.preventDefault();
                              moveFocus(rack, 0, 1);
                              break;
                            case 'ArrowUp':
                              event.preventDefault();
                              moveFocus(rack, 0, -1);
                              break;
                            default:
                              break;
                          }
                        }}
                      >
                        <rect
                          x={x}
                          y={y}
                          width={RACK_W}
                          height={RACK_H}
                          rx={3}
                          fill={rack.represented ? '#0f172a' : '#131a2b'}
                          stroke={isSelected ? '#ffcc00' : hoveredId === rack.id ? '#7aa2f7' : '#33415c'}
                          strokeWidth={isSelected ? 3.5 : hoveredId === rack.id ? 2 : 1}
                          strokeDasharray={rack.represented ? undefined : '4 3'}
                        />
                        {rack.represented &&
                          Array.from({ length: units }).map((___, u) => (
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
                        {!rack.represented && (
                          <text
                            x={x + RACK_W / 2}
                            y={y + RACK_H / 2}
                            fill="#64748b"
                            fontSize={9}
                            textAnchor="middle"
                            dominantBaseline="middle"
                          >
                            n/a
                          </text>
                        )}
                        <text
                          x={x + RACK_W / 2}
                          y={y + 8}
                          fill="#cbd5e1"
                          fontSize={9}
                          fontWeight={600}
                          textAnchor="middle"
                          dominantBaseline="middle"
                        >
                          {rack.code}
                        </text>
                        {showConstraintMarkers && rack.state === 'constraint' && (
                          <circle cx={x + RACK_W - 5} cy={y + RACK_H - 5} r={3.5} fill="#BA0517" stroke="#0a1020" />
                        )}
                        {showConstraintMarkers && rack.state === 'watch' && (
                          <rect x={x + RACK_W - 9} y={y + RACK_H - 9} width={7} height={7} rx={1} fill="#C87A0A" stroke="#0a1020" />
                        )}
                      </g>
                    );
                  })}
              </g>
            );
          })}

          {/* Hover / focus preview. Preview only: the full record lives in Rack Quick View. */}
          {hovered && (() => {
            const boxW = 168;
            const boxH = 62;
            const rx = floorX + hovered.colIndex * (RACK_W + GAP);
            const ry = PAD + hovered.rowIndex * rowStride;
            const tx = Math.min(Math.max(rx + RACK_W / 2 - boxW / 2, 4), width - boxW - 4);
            const ty = ry - boxH - 6 < 4 ? ry + RACK_H + 6 : ry - boxH - 6;
            return (
              <g pointerEvents="none" data-testid="rack-preview-tooltip">
                <rect x={tx} y={ty} width={boxW} height={boxH} rx={4} fill="#0f1a30" stroke="#3b5680" />
                <text x={tx + 8} y={ty + 16} fill="#f1f5f9" fontSize={11} fontWeight={700}>
                  {`Rack ${hovered.code}`}
                </text>
                <text x={tx + 8} y={ty + 30} fill="#cbd5e1" fontSize={10}>
                  {`Modelled load: ${hovered.load === null ? 'Unavailable' : `${Math.round(hovered.load * 100)}%`}`}
                </text>
                <text x={tx + 8} y={ty + 42} fill="#cbd5e1" fontSize={10}>
                  {`State: ${STATE_TEXT[hovered.state]}`}
                </text>
                <text x={tx + 8} y={ty + 54} fill="#8fb0e0" fontSize={10}>
                  Click for details
                </text>
              </g>
            );
          })()}

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
    </div>
  );
}
