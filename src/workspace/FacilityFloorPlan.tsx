/**
 * Deterministic 2D floor plan of the facility model.
 *
 * Stage 7D: every rack is an individually focusable, selectable control with a
 * default, hover, keyboard-focus, selected, constraint and unavailable state.
 * Values are SIMULATED model outputs, never measured telemetry.
 */
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
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
  /** Cursor-anchored wheel/pinch zoom reports back to the canvas controls. */
  onZoomChange?: (next: number) => void;
  /** Request to scroll a rack into view and focus it. */
  centerRequest?: CenterRequest | null;
}

/**
 * Stage 7F geometry. Nothing here is a fixed canvas size: the plan is a
 * landscape floor plan whose rack footprints are recomputed from the measured
 * container so the facility fills the visualisation workspace.
 */
const LEFT_GUTTER = 82;
const RIGHT_GUTTER = 32;
const FIT_PAD = 24;
const MIN_ZOOM = 0.6;
const MAX_ZOOM = 3;

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

export interface PlanGeometry {
  rackW: number;
  rackH: number;
  rackGap: number;
  rowGap: number;
  aisleBand: number;
  contentW: number;
  contentH: number;
  bankW: number;
  fitScale: number;
}

/**
 * Derives rack footprints from the available container box. Exported so the
 * geometry can be asserted directly in unit tests.
 */
export function computePlanGeometry(
  containerW: number,
  containerH: number,
  perRow: number,
  rowCount: number,
): PlanGeometry {
  const availW = Math.max(containerW - FIT_PAD * 2, 240);
  const availH = Math.max(containerH - FIT_PAD * 2, 180);
  const usableWidth = availW - LEFT_GUTTER - RIGHT_GUTTER;
  const rackGap = clamp(usableWidth * 0.014, 10, 16);
  const totalRackGaps = rackGap * (perRow - 1);
  // The bank fills the usable width: racks are widened rather than leaving
  // large empty areas on either side of the plan.
  const rackW = clamp((usableWidth - totalRackGaps) / perRow, 68, 150);
  // Row spacing tracks the available height so the plan never has to be
  // scaled down (which is what previously shrank the whole diagram).
  const rowGap = clamp(availH * 0.07, 14, 40);
  const heightBudget = (availH - rowGap * (rowCount - 1)) / rowCount;
  const rackH = clamp(Math.min(rackW * 0.95, heightBudget), 34, 110);
  const aisleBand = Math.max(Math.min(16, rowGap - 6), 8);
  const bankW = perRow * rackW + totalRackGaps;
  const contentW = LEFT_GUTTER + bankW + RIGHT_GUTTER;
  const contentH = rowCount * rackH + (rowCount - 1) * rowGap;
  const fitScale = Math.min(availW / contentW, availH / contentH);
  return { rackW, rackH, rackGap, rowGap, aisleBand, contentW, contentH, bankW, fitScale };
}

function useContainerSize(ref: React.RefObject<HTMLElement>) {
  const [size, setSize] = useState({ width: 0, height: 0 });
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const read = () => {
      const rect = el.getBoundingClientRect();
      setSize((prev) =>
        Math.abs(prev.width - rect.width) < 0.5 && Math.abs(prev.height - rect.height) < 0.5
          ? prev
          : { width: rect.width, height: rect.height },
      );
    };
    read();
    const observer = new ResizeObserver(read);
    observer.observe(el);
    window.addEventListener('resize', read);
    return () => {
      observer.disconnect();
      window.removeEventListener('resize', read);
    };
  }, [ref]);
  return size;
}

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
  onZoomChange,
  showRowLabels = true,
  showConstraintMarkers = true,
  showCoolingZones = true,
  centerRequest = null,
}: Props) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [pan, setPan] = useState({ x: 0, y: 0 });

  const { perRow, rowCount } = grid;
  const { width: cw, height: ch } = useContainerSize(scrollRef);
  const viewW = cw || 960;
  const viewH = ch || 440;

  const geometry = useMemo(
    () => computePlanGeometry(viewW, viewH, perRow, rowCount),
    [viewW, viewH, perRow, rowCount],
  );
  const { rackW: RACK_W, rackH: RACK_H, rackGap: RACK_GAP, rowGap: ROW_GAP, aisleBand: AISLE_BAND, contentW, contentH, bankW } = geometry;
  const rowStride = RACK_H + ROW_GAP;
  const floorX = LEFT_GUTTER;
  const isNarrow = viewW < 768;

  /**
   * Fit-to-facility: the base scale is measured, never a hard-coded zoom. On
   * narrow viewports the plan fits to height and pans horizontally so rack
   * labels stay readable instead of collapsing to unreadable slivers.
   */
  const baseScale = isNarrow
    ? Math.max(geometry.fitScale, (viewH - FIT_PAD * 2) / contentH)
    : geometry.fitScale;
  const scale = clamp(baseScale * zoom, baseScale * MIN_ZOOM, baseScale * MAX_ZOOM);
  const scaledW = contentW * scale;
  const scaledH = contentH * scale;

  const clampPan = useCallback(
    (next: { x: number; y: number }) => {
      const slackX = Math.max((scaledW - viewW) / 2 + FIT_PAD, 0);
      const slackY = Math.max((scaledH - viewH) / 2 + FIT_PAD, 0);
      return { x: clamp(next.x, -slackX, slackX), y: clamp(next.y, -slackY, slackY) };
    },
    [scaledW, scaledH, viewW, viewH],
  );

  // Any container or zoom change refits: the pan offset is re-clamped so the
  // facility can never be lost outside the visible canvas.
  useEffect(() => {
    setPan((prev) => {
      const next = clampPan(prev);
      return next.x === prev.x && next.y === prev.y ? prev : next;
    });
  }, [clampPan]);

  const offsetX = (viewW - scaledW) / 2 + pan.x;
  const offsetY = (viewH - scaledH) / 2 + pan.y;

  const rackPos = useCallback(
    (rack: RackNode) => ({
      x: floorX + rack.colIndex * (RACK_W + RACK_GAP),
      y: rack.rowIndex * rowStride,
    }),
    [floorX, RACK_W, rowStride],
  );

  const focusRack = useCallback((rackId: string) => {
    const node = scrollRef.current?.querySelector<SVGGElement>(`[data-rack-id="${rackId}"]`);
    node?.focus({ preventScroll: true });
  }, []);

  /** Pans so the rack sits at the centre of the visible canvas. */
  const centerRack = useCallback(
    (rackId: string) => {
      const rack = grid.byId.get(rackId);
      if (!rack) return;
      const { x, y } = rackPos(rack);
      const cx = (x + RACK_W / 2) * scale;
      const cy = (y + RACK_H / 2) * scale;
      setPan(clampPan({ x: scaledW / 2 - cx, y: scaledH / 2 - cy }));
    },
    [grid, rackPos, scale, RACK_W, RACK_H, scaledW, scaledH, clampPan],
  );

  /** Pans only when the rack is outside the visible canvas (drawer reflow). */
  const revealRack = useCallback(
    (rackId: string) => {
      const rack = grid.byId.get(rackId);
      if (!rack) return;
      const { x, y } = rackPos(rack);
      const left = offsetX + x * scale;
      const right = left + RACK_W * scale;
      const top = offsetY + y * scale;
      const bottom = top + RACK_H * scale;
      if (left >= 8 && right <= viewW - 8 && top >= 8 && bottom <= viewH - 8) return;
      centerRack(rackId);
    },
    [grid, rackPos, offsetX, offsetY, scale, RACK_W, RACK_H, viewW, viewH, centerRack],
  );

  useEffect(() => {
    if (!centerRequest) return;
    centerRack(centerRequest.rackId);
    focusRack(centerRequest.rackId);
  }, [centerRequest, centerRack, focusRack]);

  // Keep the selected rack visible when the canvas is resized by Rack Quick View.
  useEffect(() => {
    if (!selectedRackId) return;
    revealRack(selectedRackId);
    // Deliberately keyed on the measured box: a reflow refits, a re-render does not.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedRackId, viewW, viewH]);

  const moveFocus = (rack: RackNode, dx: number, dy: number) => {
    const col = Math.min(Math.max(rack.colIndex + dx, 0), perRow - 1);
    const row = Math.min(Math.max(rack.rowIndex + dy, 0), rowCount - 1);
    const next = grid.racks.find((r) => r.rowIndex === row && r.colIndex === col);
    if (next && next.id !== rack.id) {
      focusRack(next.id);
      revealRack(next.id);
    }
  };

  const hovered = hoveredId ? grid.byId.get(hoveredId) ?? null : null;

  // Pointer panning, used mainly on narrow viewports where the plan overflows.
  const dragRef = useRef<{ id: number; x: number; y: number; origin: { x: number; y: number } } | null>(null);
  const [dragging, setDragging] = useState(false);

  /**
   * Cursor-anchored wheel and trackpad-pinch zoom. React's onWheel is passive,
   * so the listener is attached natively and reads live state through a ref.
   */
  const wheelHandlerRef = useRef<(event: WheelEvent) => void>(() => {});
  wheelHandlerRef.current = (event: WheelEvent) => {
    if (!onZoomChange) return;
    const dy = event.deltaY * (event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? 100 : 1);
    const next = clamp(zoom * Math.exp(-dy * 0.0015), MIN_ZOOM, MAX_ZOOM);
    if (Math.abs(next - zoom) < 0.0005) return;
    const rect = scrollRef.current?.getBoundingClientRect();
    if (rect) {
      // Screen point measured from the canvas centre, where the plan is anchored.
      const px = event.clientX - rect.left - rect.width / 2;
      const py = event.clientY - rect.top - rect.height / 2;
      const k = next / zoom;
      setPan((prev) => clampPan({ x: px - (px - prev.x) * k, y: py - (py - prev.y) * k }));
    }
    onZoomChange(next);
  };

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const onWheel = (event: WheelEvent) => {
      // Also covers trackpad pinch (ctrlKey), which would otherwise zoom the page.
      event.preventDefault();
      wheelHandlerRef.current(event);
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, []);

  return (
    <div
      ref={scrollRef}
      className={cn(
        'relative h-full w-full min-w-0 touch-none overflow-hidden bg-[#0a1020]',
        dragging ? 'cursor-grabbing' : 'cursor-grab',
      )}
      data-testid="facility-floor-plan"
      data-plan-scale={scale.toFixed(4)}
      data-plan-width={Math.round(scaledW)}
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClearSelection?.();
      }}
      onPointerDown={(event) => {
        if (event.pointerType === 'mouse' && event.button !== 0) return;
        if ((event.target as Element).closest('[data-rack-id]')) return;
        dragRef.current = { id: event.pointerId, x: event.clientX, y: event.clientY, origin: pan };
        event.currentTarget.setPointerCapture(event.pointerId);
        setDragging(true);
      }}
      onPointerMove={(event) => {
        const drag = dragRef.current;
        if (!drag || drag.id !== event.pointerId) return;
        setPan(
          clampPan({
            x: drag.origin.x + (event.clientX - drag.x),
            y: drag.origin.y + (event.clientY - drag.y),
          }),
        );
      }}
      onPointerUp={(event) => {
        if (dragRef.current?.id === event.pointerId) {
          event.currentTarget.releasePointerCapture?.(event.pointerId);
        }
        dragRef.current = null;
        setDragging(false);
      }}
      onPointerCancel={() => {
        dragRef.current = null;
        setDragging(false);
      }}
    >
      <svg
        viewBox={`0 0 ${viewW} ${viewH}`}
        width={viewW}
        height={viewH}
        className="block h-full w-full"
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
            width={viewW}
            height={viewH}
            fill="#0a1020"
            onMouseDown={() => onClearSelection?.()}
          />
        <g transform={`translate(${offsetX} ${offsetY}) scale(${scale})`}>
          <rect
            x={floorX - 12}
            y={-12}
            width={bankW + 24}
            height={contentH + 24}
            fill="url(#fp-grid)"
            stroke="#22304d"
            strokeWidth={1}
            rx={4}
          />

          {Array.from({ length: rowCount }).map((_, r) => {
            const y = r * rowStride;
            const rowLetter = String.fromCharCode(65 + r);
            const coldAisle = r % 2 === 0;
            const rowSelected = grid.byId.get(selectedRackId ?? '')?.rowIndex === r;
            return (
              <g key={`row-${r + 1}`}>
                {/* Row zone so racks read as one aligned bank. */}
                <rect
                  x={floorX - 6}
                  y={y - 5}
                  width={bankW + 12}
                  height={RACK_H + 10}
                  rx={4}
                  fill={rowSelected ? '#101c33' : '#0c1526'}
                  stroke={rowSelected ? '#33415c' : '#1b2740'}
                  strokeWidth={1}
                />
                {showCoolingZones && r < rowCount - 1 && (
                  <g>
                    <rect
                      x={floorX}
                      y={y + RACK_H + (ROW_GAP - AISLE_BAND) / 2}
                      width={bankW}
                      height={AISLE_BAND}
                      fill={coldAisle ? '#0d2a3f' : '#2c1517'}
                      rx={2}
                    />
                    <text
                      x={floorX + bankW / 2}
                      y={y + RACK_H + ROW_GAP / 2}
                      fill={coldAisle ? '#7fc3d4' : '#e8908d'}
                      fontSize={11.5}
                      fontWeight={600}
                      letterSpacing={1}
                      textAnchor="middle"
                      dominantBaseline="middle"
                    >
                      {coldAisle ? 'COLD AISLE' : 'HOT AISLE'}
                    </text>
                  </g>
                )}

                {showRowLabels && (
                  <text
                    x={4}
                    y={y + RACK_H / 2}
                    fill={rowSelected ? '#ffcc00' : '#94a3b8'}
                    fontSize={13}
                    fontWeight={650}
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
                    const x = rackPos(rack).x;
                    const loadText = rack.load === null ? 'unavailable' : `${Math.round(t * 100)}%`;
                    return (
                      <g
                        key={rack.id}
                        data-rack-id={rack.id}
                        data-rack-code={rack.code}
                        data-rack-state={rack.state}
                        data-selected={isSelected ? 'true' : 'false'}
                        tabIndex={0}
                        role="button"
                        aria-haspopup="dialog"
                        aria-expanded={isSelected}
                        aria-label={`Rack ${rack.code}, row ${rowLetter}, modelled load ${loadText}, state ${STATE_TEXT[rack.state]}. Opens rack details.`}
                        className={cn(
                          'cursor-pointer outline-none transition-opacity duration-150',
                          'focus-visible:[&>rect:first-of-type]:stroke-[#ffcc00]',
                          'focus-visible:[&>rect:first-of-type]:[stroke-width:3]',
                          'hover:opacity-100',
                        )}
                        opacity={dimmed ? 0.55 : 1}
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
                        {/* Top-down footprint: cold-aisle face bar plus a modelled load bar. */}
                        {rack.represented && (
                          <>
                            {RACK_H >= 62 &&
                              [0, 1, 2].map((i) => (
                                <rect
                                  key={i}
                                  x={x + 8}
                                  y={y + RACK_H / 2 - 9 + i * 7}
                                  width={RACK_W - 16}
                                  height={3}
                                  rx={1.5}
                                  fill="#16243d"
                                />
                              ))}
                            <rect
                              x={x + 4}
                              y={y + RACK_H - 5}
                              width={RACK_W - 8}
                              height={3}
                              rx={1.5}
                              fill="#1f3350"
                            />
                            <rect
                              x={x + 4}
                              y={y + RACK_H - 17}
                              width={RACK_W - 8}
                              height={9}
                              rx={2}
                              fill="#111c31"
                              stroke="#22304d"
                              strokeWidth={0.75}
                            />
                            <rect
                              x={x + 5}
                              y={y + RACK_H - 16}
                              width={Math.max((RACK_W - 10) * t, 2)}
                              height={7}
                              rx={1.5}
                              fill={rackFill(String(overlay), t)}
                            />
                          </>
                        )}
                        {!rack.represented && (
                          <text
                            x={x + RACK_W / 2}
                            y={y + RACK_H / 2}
                            fill="#64748b"
                            fontSize={11}
                            textAnchor="middle"
                            dominantBaseline="middle"
                          >
                            n/a
                          </text>
                        )}
                        <text
                          x={x + RACK_W / 2}
                          y={y + 13}
                          fill={isSelected ? '#ffcc00' : '#e2e8f0'}
                          fontSize={11.5}
                          fontWeight={650}
                          textAnchor="middle"
                          dominantBaseline="middle"
                        >
                          {rack.code}
                        </text>
                        {rack.represented && RACK_H >= 46 && (
                          <text
                            x={x + RACK_W / 2}
                            y={y + RACK_H - 27}
                            fill="#93a4bd"
                            fontSize={10.5}
                            textAnchor="middle"
                            dominantBaseline="middle"
                          >
                            {loadText}
                          </text>
                        )}
                        {showConstraintMarkers && rack.state === 'constraint' && (
                          <circle cx={x + RACK_W - 8} cy={y + 10} r={4} fill="#BA0517" stroke="#0a1020" />
                        )}
                        {showConstraintMarkers && rack.state === 'watch' && (
                          <rect x={x + RACK_W - 12} y={y + 6} width={8} height={8} rx={1} fill="#C87A0A" stroke="#0a1020" />
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
            const rx = rackPos(hovered).x;
            const ry = rackPos(hovered).y;
            const tx = Math.min(Math.max(rx + RACK_W / 2 - boxW / 2, 4), contentW - boxW - 4);
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
        </g>
      </svg>
    </div>
  );
}
