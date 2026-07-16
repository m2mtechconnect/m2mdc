/**
 * KpiCardProvenance — provenance-aware wrapper around `KpiCard`.
 *
 * Phase 1A.2 primitive. The active `IntelligenceDashboard`, simulation and
 * report surfaces render `KpiCard` visually but must also expose
 * metric-level provenance to tests and screen readers. Rather than rewrite
 * `KpiCard` in place we wrap it: the wrapper carries the `data-testid`,
 * `data-provenance` and `data-stale` attributes plus an accessible
 * `<ProvenanceBadge>` that is announced as part of the tile.
 *
 * A `null` metric value forces the wrapper to render `Not available` /
 * `Not assessed` instead of whatever numeric fallback the caller supplied,
 * preventing a synthetic default from being read as `live`.
 */
import type { ComponentProps, ReactNode } from 'react';
import KpiCard from '@/components/shared/KpiCard';
import { ProvenanceBadge } from './ProvenanceBadge';
import type { ProvenancedMetric } from '@/lib/provenance/types';
import { cn } from '@/lib/utils';

type KpiCardProps = ComponentProps<typeof KpiCard>;

interface KpiCardProvenanceProps extends Omit<KpiCardProps, 'value'> {
  /** Stable identifier used for `data-testid`. Kebab-case recommended. */
  id: string;
  metric: ProvenancedMetric<number | string>;
  /** Formatter for the numeric value. Defaults to `String(value)`. */
  format?: (value: number | string) => string;
  /** Optional replacement label rendered when `metric.value === null`. */
  fallbackLabel?: ReactNode;
}

export function KpiCardProvenance({
  id,
  metric,
  format,
  fallbackLabel,
  className,
  ...rest
}: KpiCardProvenanceProps) {
  const isMissing = metric.value === null || metric.value === undefined;
  const notAssessed = isMissing &&
    (metric.description?.toLowerCase().includes('not assessed') ||
     metric.provenance === 'unavailable');

  const displayValue: string = isMissing
    ? (fallbackLabel != null
        ? String(fallbackLabel)
        : (notAssessed ? 'Not assessed' : 'Not available'))
    : (format ? format(metric.value as number | string) : String(metric.value));

  const badgeMeta = {
    provenance: metric.provenance,
    source: metric.sourceName ?? 'unknown',
    at: metric.sourceTimestamp ? new Date(metric.sourceTimestamp) : undefined,
    stale: metric.isStale ?? false,
    note: metric.description ?? metric.derivation,
  };

  return (
    <div
      className={cn('relative', className)}
      data-testid={`metric-${id}`}
      data-provenance={metric.provenance}
      data-stale={metric.isStale ? 'true' : 'false'}
    >
      <KpiCard
        {...rest}
        value={displayValue}
      />
      <div
        className="pointer-events-auto absolute right-2 top-2 z-10"
        aria-label={`${rest.label} provenance`}
      >
        <ProvenanceBadge meta={badgeMeta} compact />
      </div>
      {metric.isStale && (
        <div
          data-testid={`metric-${id}-stale`}
          className="mt-1 px-3 text-[10px] text-amber-600"
        >
          Stale reading
        </div>
      )}
    </div>
  );
}

export default KpiCardProvenance;