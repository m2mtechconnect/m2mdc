/**
 * Compact per-metric evidence-state indicator.
 *
 * Replaces the wall of provenance pills that used to sit on every KPI card:
 * one chip states mode + freshness, its tooltip states calibration and
 * validation, and activating it opens the full provenance drawer.
 */
import { AlertTriangle, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { DsxProvenancedMetric } from '@/dsx/contracts/provenancedMetric';
import { modeLabel } from '@/dsx/modes';

const FRESHNESS_CLASS: Record<string, string> = {
  fresh: 'text-emerald-700 dark:text-emerald-300',
  delayed: 'text-amber-700 dark:text-amber-300',
  stale: 'text-red-700 dark:text-red-300',
  unknown: 'text-muted-foreground',
};

export function EvidenceIndicator({
  metric,
  className,
}: {
  metric: DsxProvenancedMetric;
  className?: string;
}) {
  const unverified = metric.calibration === 'uncalibrated';
  const title = [
    `${modeLabel(metric.data_mode)} data`,
    `freshness: ${metric.freshness}`,
    `validation: ${metric.validation.replace(/_/g, ' ')}`,
    `calibration: ${metric.calibration.replace(/_/g, ' ')}`,
    metric.last_observed_at ? `last observation: ${metric.last_observed_at}` : 'no observation recorded',
  ].join(' · ');

  return (
    <span
      title={title}
      data-testid="dsx-evidence-indicator"
      data-mode={metric.data_mode}
      data-freshness={metric.freshness}
      className={cn(
        'inline-flex items-center gap-1 rounded-sm border border-border bg-muted/60 px-1.5 py-0.5 text-[12px] leading-none',
        className,
      )}
    >
      <span className="font-medium uppercase tracking-wide text-muted-foreground">
        {modeLabel(metric.data_mode)}
      </span>
      <Clock className={cn('h-3 w-3', FRESHNESS_CLASS[metric.freshness])} aria-hidden />
      <span className={FRESHNESS_CLASS[metric.freshness]}>{metric.freshness}</span>
      {unverified && <AlertTriangle className="h-3 w-3 text-amber-600 dark:text-amber-400" aria-hidden />}
      <span className="sr-only">{title}</span>
    </span>
  );
}