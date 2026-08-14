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
  type FacilityGeometryMode,
} from '@/components/twin-visualization/facilityGeometry';

interface Props {
  value: FacilityGeometryMode;
  onChange: (mode: FacilityGeometryMode) => void;
}

export function FacilityGeometrySelector({ value, onChange }: Props) {
  const active = FACILITY_GEOMETRY_MODES.find((m) => m.id === value);

  return (
    <div className="flex items-center gap-1.5 rounded-md border border-border bg-card/90 px-2 py-1 backdrop-blur">
      <Boxes className="h-3.5 w-3.5 text-muted-foreground" aria-hidden />
      <Select value={value} onValueChange={(v) => onChange(v as FacilityGeometryMode)}>
        <SelectTrigger
          className="h-7 w-[12rem] border-0 bg-transparent px-1 text-[12px] shadow-none focus:ring-1"
          aria-label="Facility geometry"
          title={active?.description}
          data-testid="facility-geometry-selector"
        >
          <SelectValue placeholder="Facility geometry" />
        </SelectTrigger>
        <SelectContent className="z-[100] max-w-[22rem] bg-card">
          {FACILITY_GEOMETRY_MODES.map((mode) => (
            <SelectItem key={mode.id} value={mode.id}>
              <span className="block">{mode.label}</span>
              <span className="mt-0.5 block text-[11px] text-muted-foreground">
                {mode.description}
              </span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
