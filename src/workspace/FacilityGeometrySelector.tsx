/**
 * Facility geometry selector.
 *
 * Sits next to the layer selector in the canvas top-left safe zone. It changes
 * which geometry is mounted, never the operational data behind it.
 */
import { Boxes } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  FACILITY_GEOMETRY_MODES,
  referenceCoverageSummary,
  referenceFacilityAvailable,
  type FacilityGeometryMode,
} from '@/components/twin-visualization/facilityGeometry';

interface Props {
  value: FacilityGeometryMode;
  onChange: (mode: FacilityGeometryMode) => void;
}

export function FacilityGeometrySelector({ value, onChange }: Props) {
  const active = FACILITY_GEOMETRY_MODES.find((m) => m.id === value);
  const referenceReady = referenceFacilityAvailable();
  const coverage = referenceCoverageSummary();

  return (
    <div className="flex items-center gap-2 rounded-md border border-border bg-card/95 px-2 py-1 backdrop-blur">
      <Boxes className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
      <span className="hidden shrink-0 text-[11px] font-medium uppercase tracking-wide text-muted-foreground lg:inline">
        Facility geometry
      </span>
      <Select value={value} onValueChange={(v) => onChange(v as FacilityGeometryMode)}>
        <SelectTrigger
          className="h-8 w-[16.5rem] border-0 bg-transparent px-1 text-[12px] shadow-none focus:ring-1 [&>span]:truncate-none [&>span]:overflow-visible [&>span]:whitespace-nowrap"
          aria-label="Facility geometry"
          title={active?.description}
          data-testid="facility-geometry-selector"
          data-value={value}
          data-reference-ready={referenceReady ? 'true' : 'false'}
        >
          {/* Explicit label: the trigger must never rely on an ellipsis to
              communicate the active geometry source. */}
          <SelectValue placeholder="Facility geometry">
            <span className="whitespace-nowrap">
              {active?.label}
              {value === 'nvidia-reference' && !referenceReady ? ' - preparing assets' : ''}
            </span>
          </SelectValue>
        </SelectTrigger>
        <SelectContent className="z-[100] max-w-[24rem] bg-card">
          {FACILITY_GEOMETRY_MODES.map((mode) => {
            const preparing = mode.id === 'nvidia-reference' && !referenceReady;
            return (
              <SelectItem key={mode.id} value={mode.id} disabled={preparing}>
                <span className="block whitespace-nowrap">
                  {preparing ? `${mode.label} - preparing assets` : mode.label}
                </span>
                <span className="mt-0.5 block text-[11px] text-muted-foreground">
                  {preparing
                    ? 'No approved derivative has been activated yet. Selection is disabled until at least one role can mount.'
                    : mode.id === 'nvidia-reference'
                      ? coverage.label
                      : mode.description}
                </span>
              </SelectItem>
            );
          })}
        </SelectContent>
      </Select>
    </div>
  );
}
