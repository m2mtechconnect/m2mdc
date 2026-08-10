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
    <div className="flex items-center gap-1.5 rounded-md border border-border bg-card/90 px-2 py-1 backdrop-blur">
      <Layers className="h-3.5 w-3.5 text-muted-foreground" aria-hidden />
      <Select value={value} onValueChange={(v) => onChange(v as TwinOverlay | 'none')}>
        <SelectTrigger
          className="h-7 w-[10.5rem] border-0 bg-transparent px-1 text-[12px] shadow-none focus:ring-1"
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
