/**
 * Stage 7D - facility visualisation card.
 *
 * The card owns the analytical layer, the viewport controls, rack search and
 * the Rack Quick View presentation. On desktop the quick view opens as an
 * inline drawer beside a reflowed canvas, so the selected rack stays visible
 * and the document height never grows.
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ExternalLink, Gauge, Layers3, Leaf, Maximize2, RotateCcw, Search, Thermometer, ZoomIn, ZoomOut, Zap,
  type LucideIcon,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { FacilityFloorPlan, type CenterRequest } from '../FacilityFloorPlan';
import type { FacilityDefinition } from '../facilityModel';
import type { RackGrid } from './rackModel';
import { RackQuickView, useRackDetail } from './RackQuickView';

export const CANVAS_OVERLAYS: ReadonlyArray<{
  id: 'thermal' | 'power' | 'workload' | 'carbon';
  label: string;
  legend: [string, string, string];
  Icon: LucideIcon;
}> = [
  { id: 'thermal', label: 'Thermal', legend: ['Cooler', 'Nominal', 'Warmer'], Icon: Thermometer },
  { id: 'power', label: 'Power', legend: ['Low draw', 'Moderate draw', 'High draw'], Icon: Zap },
  { id: 'workload', label: 'Capacity', legend: ['Light', 'Moderate', 'Dense'], Icon: Gauge },
  { id: 'carbon', label: 'Carbon', legend: ['Lower', 'Moderate', 'Higher'], Icon: Leaf },
];

export type CanvasOverlayId = (typeof CANVAS_OVERLAYS)[number]['id'];

const LEGEND_SWATCH: Record<CanvasOverlayId, [string, string, string]> = {
  thermal: ['#2563a8', '#c98a1e', '#b23b3b'],
  power: ['#1f6f4a', '#b8860b', '#a13333'],
  workload: ['#3a3f4b', '#6b7280', '#cbd5e1'],
  carbon: ['#14532d', '#4d7c0f', '#a16207'],
};

type Presentation = 'inline' | 'tablet' | 'mobile';

function usePresentation(): Presentation {
  const [value, setValue] = useState<Presentation>(() => {
    if (typeof window === 'undefined') return 'inline';
    return window.innerWidth >= 1200 ? 'inline' : window.innerWidth >= 768 ? 'tablet' : 'mobile';
  });
  useEffect(() => {
    const onResize = () =>
      setValue(window.innerWidth >= 1200 ? 'inline' : window.innerWidth >= 768 ? 'tablet' : 'mobile');
    onResize();
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);
  return value;
}

interface Props {
  facility: FacilityDefinition;
  grid: RackGrid;
  overlay: CanvasOverlayId;
  onOverlayChange: (overlay: CanvasOverlayId) => void;
  selectedRackId: string | null;
  onSelectRack: (rackId: string | null) => void;
  rackCount: number;
  blueprintHref: string;
  calculatedAt: string;
  /** Increment to request the selected rack be scrolled into view. */
  centerNonce?: number;
}

export function FacilityCanvas({
  facility,
  grid,
  overlay,
  onOverlayChange,
  selectedRackId,
  onSelectRack,
  rackCount,
  blueprintHref,
  calculatedAt,
  centerNonce = 0,
}: Props) {
  const active = CANVAS_OVERLAYS.find((o) => o.id === overlay) ?? CANVAS_OVERLAYS[0];
  const swatches = LEGEND_SWATCH[active.id];
  const presentation = usePresentation();

  const [zoom, setZoom] = useState(1);
  const [query, setQuery] = useState('');
  const [showRowLabels, setShowRowLabels] = useState(true);
  const [showConstraintMarkers, setShowConstraintMarkers] = useState(true);
  const [showCoolingZones, setShowCoolingZones] = useState(true);
  const [centerRequest, setCenterRequest] = useState<CenterRequest | null>(null);
  const returnFocusRef = useRef<string | null>(null);

  const rackData = useRackDetail(selectedRackId, grid, facility, calculatedAt);
  const selectedRack = selectedRackId ? grid.byId.get(selectedRackId) ?? null : null;

  // Escape closes the inline (non-modal) quick view; sheets handle their own.
  useEffect(() => {
    if (presentation !== 'inline' || !selectedRackId) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.stopPropagation();
        closeQuickViewRef.current();
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [presentation, selectedRackId]);

  useEffect(() => {
    if (selectedRackId && centerNonce > 0) {
      setCenterRequest({ rackId: selectedRackId, nonce: centerNonce });
    }
  }, [selectedRackId, centerNonce]);

  const results = useMemo(() => {
    const term = query.trim().toUpperCase();
    if (!term) return [];
    return grid.racks
      .filter(
        (rack) =>
          rack.code.startsWith(term) ||
          `ROW ${rack.rowLetter}` === term ||
          rack.rowLetter === term ||
          `RACK ${rack.code}` === term,
      )
      .slice(0, 6);
  }, [query, grid]);

  const closeQuickViewRef = useRef<() => void>(() => {});

  const closeQuickView = () => {
    const id = returnFocusRef.current ?? selectedRackId;
    onSelectRack(null);
    requestAnimationFrame(() => {
      if (id) {
        document.querySelector<SVGGElement>(`[data-rack-id="${id}"]`)?.focus();
      }
    });
  };

  closeQuickViewRef.current = closeQuickView;

  const selectRack = (rackId: string) => {
    returnFocusRef.current = rackId;
    onSelectRack(rackId);
  };

  return (
    <section
      aria-labelledby="facility-visual-heading"
      data-testid="facility-canvas"
      className="min-w-0 overflow-hidden rounded-lg border border-border bg-card"
    >
      <div className="flex min-w-0 flex-wrap items-center justify-between gap-2 border-b border-border px-4 py-3">
        <div className="min-w-0">
          <h2 id="facility-visual-heading" className="text-[16px] font-semibold leading-tight text-foreground">
            Facility visualisation
          </h2>
          <p className="mt-0.5 text-[13px] text-muted-foreground">
            Procedural design representation · select a rack for details.
          </p>
        </div>
        <div className="flex min-w-0 flex-wrap items-center gap-1.5">
          {/* Rack search. */}
          <div className="relative">
            <Search
              className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
              strokeWidth={1.75}
              aria-hidden
            />
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Find rack or asset"
              aria-label="Find rack or asset"
              data-testid="rack-search-input"
              className="h-9 w-[180px] pl-8 text-[13px] max-sm:h-11"
            />
            {query.trim() && (
              <div
                className="absolute left-0 top-full z-30 mt-1 w-[240px] overflow-hidden rounded-md border border-border bg-popover shadow-md"
                data-testid="rack-search-results"
              >
                {results.length === 0 ? (
                  <p className="px-3 py-2 text-[13px] text-muted-foreground">No matching modelled asset</p>
                ) : (
                  <ul>
                    {results.map((rack) => (
                      <li key={rack.id}>
                        <button
                          type="button"
                          data-testid={`rack-search-result-${rack.code}`}
                          className="flex w-full min-h-[40px] items-center justify-between gap-2 px-3 py-2 text-left text-[13px] hover:bg-muted focus-visible:bg-muted focus-visible:outline-none"
                          onClick={() => {
                            setQuery('');
                            selectRack(rack.id);
                            setCenterRequest({ rackId: rack.id, nonce: Date.now() });
                          }}
                        >
                          <span className="font-medium text-foreground">Rack {rack.code}</span>
                          <span className="text-muted-foreground">Row {rack.rowLetter}</span>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </div>

          {CANVAS_OVERLAYS.map((layer) => {
            const isActive = layer.id === overlay;
            return (
              <button
                key={layer.id}
                type="button"
                aria-pressed={isActive}
                data-testid={`layer-${layer.id}`}
                onClick={() => onOverlayChange(layer.id)}
                className={cn(
                  'inline-flex h-9 items-center gap-1.5 rounded-md border px-2.5 text-[13px] font-medium transition-colors duration-150 max-sm:h-11',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1',
                  isActive
                    ? 'border-[hsl(var(--info))] bg-[hsl(var(--info)/0.12)] text-[hsl(var(--info))]'
                    : 'border-border bg-card text-muted-foreground hover:border-[hsl(var(--info)/0.5)] hover:text-foreground',
                )}
              >
                <layer.Icon className="h-4 w-4" strokeWidth={1.75} aria-hidden />
                <span className="max-lg:sr-only">{layer.label}</span>
              </button>
            );
          })}

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="h-9 w-9 p-0 max-sm:h-11 max-sm:w-11" aria-label="Overlay options">
                <Layers3 className="h-4 w-4" strokeWidth={1.75} aria-hidden />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Secondary overlays</DropdownMenuLabel>
              <DropdownMenuCheckboxItem checked={showConstraintMarkers} onCheckedChange={setShowConstraintMarkers}>
                Constraint markers
              </DropdownMenuCheckboxItem>
              <DropdownMenuCheckboxItem checked={showRowLabels} onCheckedChange={setShowRowLabels}>
                Row labels
              </DropdownMenuCheckboxItem>
              <DropdownMenuCheckboxItem checked={showCoolingZones} onCheckedChange={setShowCoolingZones}>
                Cooling zones
              </DropdownMenuCheckboxItem>
              <DropdownMenuSeparator />
              <DropdownMenuLabel>Primary analytical layer</DropdownMenuLabel>
              {CANVAS_OVERLAYS.map((layer) => (
                <DropdownMenuCheckboxItem
                  key={layer.id}
                  checked={overlay === layer.id}
                  onCheckedChange={() => onOverlayChange(layer.id)}
                >
                  {layer.label}
                </DropdownMenuCheckboxItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          <div className="inline-flex items-center gap-1" role="group" aria-label="Viewport controls">
            <Button
              variant="outline"
              size="sm"
              className="h-9 w-9 p-0 max-sm:h-11 max-sm:w-11"
              aria-label="Zoom in"
              data-testid="canvas-zoom-in"
              onClick={() => setZoom((z) => Math.min(3, Number((z * 1.25).toFixed(3))))}
            >
              <ZoomIn className="h-4 w-4" strokeWidth={1.75} aria-hidden />
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="h-9 w-9 p-0 max-sm:h-11 max-sm:w-11"
              aria-label="Zoom out"
              data-testid="canvas-zoom-out"
              onClick={() => setZoom((z) => Math.max(1, Number((z / 1.25).toFixed(3))))}
            >
              <ZoomOut className="h-4 w-4" strokeWidth={1.75} aria-hidden />
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="h-9 w-9 p-0 max-sm:h-11 max-sm:w-11"
              aria-label="Fit to facility"
              data-testid="canvas-fit"
              onClick={() => setZoom(1)}
            >
              <Maximize2 className="h-4 w-4" strokeWidth={1.75} aria-hidden />
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="h-9 w-9 p-0 max-sm:h-11 max-sm:w-11"
              aria-label="Reset view"
              data-testid="canvas-reset"
              onClick={() => {
                setZoom(1);
                setQuery('');
                onSelectRack(null);
              }}
            >
              <RotateCcw className="h-4 w-4" strokeWidth={1.75} aria-hidden />
            </Button>
          </div>

          <Button asChild size="sm" variant="outline" className="h-9 text-[13px] max-sm:h-11">
            <Link to={`${blueprintHref}?tab=model&layer=${overlay}`}>
              <ExternalLink className="mr-1.5 h-4 w-4" strokeWidth={1.75} aria-hidden />
              Blueprint
            </Link>
          </Button>
        </div>
      </div>

      <div className="flex min-w-0 items-stretch h-[304px] sm:h-[344px] lg:h-[384px]">
        <div className="min-w-0 flex-1 p-3">
          <div className="h-full w-full overflow-hidden rounded-md border border-border bg-[#0a1020]">
            <FacilityFloorPlan
              facility={facility}
              overlay={overlay}
              grid={grid}
              selectedRackId={selectedRackId}
              onSelect={selectRack}
              onClearSelection={() => onSelectRack(null)}
              zoom={zoom}
              showRowLabels={showRowLabels}
              showConstraintMarkers={showConstraintMarkers}
              showCoolingZones={showCoolingZones}
              centerRequest={centerRequest}
            />
          </div>
        </div>

        {presentation === 'inline' && (
          <RackQuickView
            open={Boolean(selectedRackId)}
            onClose={closeQuickView}
            presentation="inline"
            title={selectedRack ? `Rack ${selectedRack.code}` : 'Rack'}
            subtitle={
              selectedRack
                ? `Row ${selectedRack.rowLetter} · ${selectedRack.represented ? selectedRack.aisleLabel : 'Aisle unavailable'} · Modelled asset`
                : ''
            }
            data={rackData}
            facilityId={facility.id}
            blueprintHref={blueprintHref}
          />
        )}
      </div>

      <div className="flex min-w-0 flex-wrap items-center gap-x-4 gap-y-1 border-t border-border px-4 py-2">
        <span className="text-[12px] font-semibold uppercase tracking-wide text-muted-foreground">
          {active.label} legend
        </span>
        {active.legend.map((label, index) => (
          <span key={label} className="inline-flex items-center gap-1.5 text-[13px] text-muted-foreground">
            <span
              className="h-3 w-3 rounded-sm border border-border"
              style={{ backgroundColor: swatches[index] }}
              aria-hidden
            />
            {label}
          </span>
        ))}
        <span className="text-[13px] text-muted-foreground">
          {rackCount} of ~{facility.designRackEstimate} racks represented · not a validated OpenUSD stage
        </span>
      </div>

      {presentation !== 'inline' && (
        <RackQuickView
          open={Boolean(selectedRackId)}
          onClose={closeQuickView}
          presentation={presentation}
          title={selectedRack ? `Rack ${selectedRack.code}` : 'Rack'}
          subtitle={
            selectedRack
              ? `Row ${selectedRack.rowLetter} · ${selectedRack.represented ? selectedRack.aisleLabel : 'Aisle unavailable'} · Modelled asset`
              : ''
          }
          data={rackData}
          facilityId={facility.id}
          blueprintHref={blueprintHref}
        />
      )}
    </section>
  );
}
