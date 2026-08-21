/**
 * Consolidated layer selector for the facility model.
 *
 * Replaces the row of domain buttons with a single control, so the model
 * surface has one place to change what is being visualised.
 */
import { Layers } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { OVERLAY_CONFIG, type TwinOverlay } from '@/context/TwinOverlayContext';

export const MODEL_LAYERS: TwinOverlay[] = [
  'thermal',
  'power',
  'cooling',
  'gpu',
  'workload',
  'network',
  'sovereignty',
  'carbon',
];

interface Props {
  value: TwinOverlay | 'none';
  onChange: (layer: TwinOverlay | 'none') => void;
}

export function LayerSelector({ value, onChange }: Props) {
  return (
    <div className="flex items-center gap-1.5">
      <Layers className="h-4 w-4 text-muted-foreground" aria-hidden />
      <span className="hidden shrink-0 text-[12px] font-semibold uppercase tracking-wide text-muted-foreground lg:inline">Layer</span>
      <Select value={value} onValueChange={(v) => onChange(v as TwinOverlay | 'none')}>
        <SelectTrigger
          className="h-8 w-[10.5rem] border border-border bg-background px-2 text-[13px] font-medium text-foreground shadow-none focus:ring-2"
          aria-label="Model layer"
          data-testid="workspace-layer-selector"
        >
          <SelectValue placeholder="Layer" />
        </SelectTrigger>
        <SelectContent className="z-[100] bg-card">
          <SelectItem value="none">No layer</SelectItem>
          {MODEL_LAYERS.map((layer) => (
            <SelectItem key={layer} value={layer}>
              {OVERLAY_CONFIG[layer].label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
