/**
 * Renders one dataset-backed value with its classification and provenance.
 * A non-renderable classification never prints a number.
 */
import { Badge } from '@/components/ui/badge';
import type { DatasetValue } from '@/data/dataset/referenceSelectors';
import { CLASSIFICATION_LABEL, isRenderableValue } from '@/data/dataset/valueClassification';
import { UnavailableState } from './UnavailableState';

export function DatasetValueRow({ value }: { value: DatasetValue }) {
  if (!isRenderableValue(value.classification)) {
    if (value.classification === 'UNAVAILABLE') {
      return <UnavailableState label={value.label} />;
    }
    return (
      <div className="flex items-center justify-between gap-3 py-1.5 text-xs">
        <span className="text-foreground">{value.label}</span>
        <Badge variant="outline">{CLASSIFICATION_LABEL[value.classification]}</Badge>
      </div>
    );
  }

  return (
    <div className="flex items-start justify-between gap-3 border-b border-border/60 py-1.5 text-xs last:border-0">
      <div>
        <p className="text-foreground">{value.label}</p>
        <p className="text-[11px] text-muted-foreground">
          {value.recordId} - commit {value.sourceCommit?.slice(0, 8)} - {value.normalizationRule}
        </p>
      </div>
      <div className="text-right">
        <p className="font-medium text-foreground">
          {String(value.value)}
          {value.unit ? ` ${value.unit}` : ''}
        </p>
        <Badge variant="outline" className="mt-0.5">
          {CLASSIFICATION_LABEL[value.classification]}
        </Badge>
      </div>
    </div>
  );
}

export default DatasetValueRow;
