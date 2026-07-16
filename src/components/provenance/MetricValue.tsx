/**
 * MetricValue — shared operational KPI presenter (Phase 1A.1, item 2).
 *
 * Every data-centre operational value on an active surface should render via
 * this component so that:
 *   - The value can never appear without an adjacent <ProvenanceBadge>.
 *   - The value carries `data-testid` and `data-provenance` for tests.
 *   - Screen readers get an accessible link between label, value and badge
 *     via `aria-describedby`.
 *   - `null` values render "Not available" instead of a fabricated number.
 */

import type { ReactNode } from 'react';
import type { ProvenancedMetric, DataProvenance } from '@/lib/provenance/types';
import { ProvenanceBadge } from './ProvenanceBadge';
import { cn } from '@/lib/utils';

export interface MetricValueProps<T = number | string> {
  /** Stable identifier used for `data-testid` and label association. */
  id: string;
  /** Human label shown above / next to the value. */
  label: ReactNode;
  metric: ProvenancedMetric<T>;
  /** Formatter for non-null values. Defaults to `String(value)`. */
  format?: (value: T) => string;
  /** Unit shown after the value (e.g. "%", "gCO₂/kWh"). */
  unit?: string;
  /** Optional visual affordance shown to the left of the label. */
  icon?: ReactNode;
  /** Additional description below the value (e.g. target, trend). */
  footer?: ReactNode;
  className?: string;
  /** Force a compact single-line layout. */
  compact?: boolean;
}

const NOT_AVAILABLE = 'Not available';
const NOT_ASSESSED = 'Not assessed';
const STATIC_LABEL = 'Configured target';

/** Small text meta helper for provenance -> value placeholder. */
function placeholderFor(p: DataProvenance): string {
  switch (p) {
    case 'unavailable': return NOT_AVAILABLE;
    default:            return NOT_AVAILABLE;
  }
}

export function MetricValue<T = number | string>({
  id,
  label,
  metric,
  format,
  unit,
  icon,
  footer,
  className,
  compact = false,
}: MetricValueProps<T>) {
  const labelId = `${id}-label`;
  const valueId = `${id}-value`;
  const badgeMeta = {
    provenance: metric.provenance,
    source: metric.sourceName ?? 'unknown',
    at: metric.sourceTimestamp ? new Date(metric.sourceTimestamp) : undefined,
    stale: metric.isStale ?? false,
    note: metric.description ?? metric.derivation,
  };

  const isMissing = metric.value === null;
  const displayValue = isMissing
    ? (metric.description?.toLowerCase().includes('not assessed') ? NOT_ASSESSED : placeholderFor(metric.provenance))
    : (format ? format(metric.value as T) : String(metric.value));
  const isStatic = metric.provenance === 'static';

  return (
    <div
      className={cn('space-y-1', className)}
      data-testid={`metric-${id}`}
      data-provenance={metric.provenance}
      data-stale={metric.isStale ? 'true' : 'false'}
    >
      <div className="flex items-center gap-2">
        {icon && <span aria-hidden className="opacity-70">{icon}</span>}
        <span
          id={labelId}
          className="text-xs font-medium text-muted-foreground uppercase tracking-wider"
        >
          {label}
        </span>
        <ProvenanceBadge meta={badgeMeta} compact={compact} className="ml-auto" />
      </div>
      <div
        id={valueId}
        aria-labelledby={labelId}
        className={cn(
          'font-mono font-bold',
          compact ? 'text-lg' : 'text-2xl',
          isMissing && 'text-muted-foreground italic font-normal',
          isStatic && 'text-foreground',
        )}
        data-testid={`metric-${id}-value`}
      >
        {displayValue}
        {!isMissing && unit && (
          <span className="ml-1 text-sm text-muted-foreground font-normal">{unit}</span>
        )}
        {isStatic && !isMissing && (
          <span className="ml-2 text-[10px] uppercase tracking-wider text-muted-foreground">{STATIC_LABEL}</span>
        )}
      </div>
      {footer && (
        <div className="text-xs text-muted-foreground">
          {footer}
        </div>
      )}
      {metric.isStale && (
        <div className="text-xs text-amber-600" data-testid={`metric-${id}-stale`}>
          Stale · last seen {metric.sourceTimestamp
            ? new Date(metric.sourceTimestamp).toLocaleString()
            : 'unknown'}
        </div>
      )}
    </div>
  );
}