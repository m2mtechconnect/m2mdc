/**
 * Stage 7B - facility visualisation card.
 *
 * A contained dark canvas inside a light enterprise card, with a card header,
 * layer toolbar, always-visible legend and a truthful footer. The canvas is a
 * procedural design representation, never a validated OpenUSD stage.
 */
import { Link } from 'react-router-dom';
import { Layers } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { FacilityFloorPlan } from '../FacilityFloorPlan';
import type { FacilityAsset, FacilityDefinition } from '../facilityModel';

export const CANVAS_OVERLAYS = [
  { id: 'thermal', label: 'Thermal', legend: ['Cooler', 'Nominal', 'Warmer'] },
  { id: 'power', label: 'Power', legend: ['Low draw', 'Moderate draw', 'High draw'] },
  { id: 'workload', label: 'Capacity', legend: ['Light', 'Moderate', 'Dense'] },
  { id: 'carbon', label: 'Carbon', legend: ['Lower', 'Moderate', 'Higher'] },
] as const;

export type CanvasOverlayId = (typeof CANVAS_OVERLAYS)[number]['id'];

const LEGEND_SWATCH: Record<CanvasOverlayId, [string, string, string]> = {
  thermal: ['#2563a8', '#c98a1e', '#b23b3b'],
  power: ['#1f6f4a', '#b8860b', '#a13333'],
  workload: ['#3a3f4b', '#6b7280', '#cbd5e1'],
  carbon: ['#14532d', '#4d7c0f', '#a16207'],
};

interface Props {
  facility: FacilityDefinition;
  overlay: CanvasOverlayId;
  onOverlayChange: (overlay: CanvasOverlayId) => void;
  selectedAssetId: string | null;
  onSelect: (assetId: string) => void;
  selectedAsset: FacilityAsset | null;
  rackCount: number;
  blueprintHref: string;
}

export function FacilityCanvas({
  facility,
  overlay,
  onOverlayChange,
  selectedAssetId,
  onSelect,
  selectedAsset,
  rackCount,
  blueprintHref,
}: Props) {
  const active = CANVAS_OVERLAYS.find((o) => o.id === overlay) ?? CANVAS_OVERLAYS[0];
  const swatches = LEGEND_SWATCH[active.id];

  return (
    <section
      aria-labelledby="facility-visual-heading"
      data-testid="facility-canvas"
      className="min-w-0 overflow-hidden rounded-lg border border-border bg-card"
    >
      <div className="flex min-w-0 flex-wrap items-center justify-between gap-2 border-b border-border p-4">
        <div className="min-w-0">
          <h2 id="facility-visual-heading" className="text-[18px] font-semibold leading-tight text-foreground">
            Facility visualisation
          </h2>
          <p className="mt-0.5 text-[13px] text-muted-foreground">
            Procedural design representation of the modelled floor.
          </p>
        </div>
        <div className="flex min-w-0 flex-wrap items-center gap-1.5" role="group" aria-label="Visualisation layer">
          {CANVAS_OVERLAYS.map((layer) => (
            <Button
              key={layer.id}
              size="sm"
              variant={overlay === layer.id ? 'default' : 'outline'}
              aria-pressed={overlay === layer.id}
              className="min-h-[36px] text-[13px] max-sm:min-h-[44px]"
              onClick={() => onOverlayChange(layer.id)}
            >
              {layer.label}
            </Button>
          ))}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="min-h-[36px] text-[13px] max-sm:min-h-[44px]">
                <Layers className="mr-1.5 h-3.5 w-3.5" aria-hidden />
                Layers
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Active layer</DropdownMenuLabel>
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
          <Button asChild size="sm" variant="outline" className="min-h-[36px] text-[13px] max-sm:min-h-[44px]">
            <Link to={`${blueprintHref}?tab=model&layer=${overlay}`}>Open in Blueprint</Link>
          </Button>
        </div>
      </div>

      <div className="min-w-0 overflow-hidden p-4">
        <div className="h-[300px] w-full overflow-hidden rounded-md border border-border bg-[#0a0a14] sm:h-[360px] lg:h-[420px]">
          <FacilityFloorPlan
            facility={facility}
            overlay={overlay}
            selectedAssetId={selectedAssetId}
            onSelect={onSelect}
          />
        </div>

        <div className="mt-3 flex min-w-0 flex-wrap items-center gap-x-4 gap-y-2">
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
        </div>

        {selectedAsset && (
          <div className="mt-3 min-w-0 rounded-md border border-border bg-muted/50 p-3">
            <p className="text-[13px] font-semibold text-foreground">{selectedAsset.name}</p>
            <p className="mt-0.5 break-words text-[13px] text-muted-foreground">
              {selectedAsset.kind} · modelled asset · no measured telemetry available
            </p>
          </div>
        )}
      </div>

      <div className="min-w-0 border-t border-border px-4 py-3">
        <p className="break-words text-[13px] leading-relaxed text-muted-foreground">
          Procedural design visualisation · {rackCount} of approximately {facility.designRackEstimate} racks
          represented · Not a validated OpenUSD stage.
        </p>
      </div>
    </section>
  );
}
