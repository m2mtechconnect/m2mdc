/**
 * Single operational KPI presenter. No workspace may render its own metric
 * card: every visible value goes through this component so that mode,
 * freshness, validation, calibration and provenance always travel with it.
 */
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import type { DsxProvenancedMetric } from '@/dsx/contracts/provenancedMetric';
import { CalibrationBadge, DataModeBadge, FreshnessIndicator, ValidationBadge } from './StateBadges';
import { useWorkspace } from '@/dsx/runtime/EvidenceBetaContext';

interface Props {
  id: string;
  metric: DsxProvenancedMetric;
  digits?: number;
  label?: string;
  className?: string;
}

export function MetricTile({ id, metric, digits = 2, label, className }: Props) {
  const { openProvenance } = useWorkspace();
  const unavailable = metric.value === null;

  return (
    <Card
      data-testid={`dsx-metric-${id}`}
      data-mode={metric.data_mode}
      data-validation={metric.validation}
      className={cn('border-border/60 bg-card/60', className)}
    >
      <CardContent className="p-3">
        <button
          type="button"
          onClick={() => openProvenance(metric)}
          className="w-full space-y-2 rounded-sm text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          aria-label={`${label ?? metric.metric_name} — open provenance`}
          data-testid={`dsx-metric-${id}-open`}
        >
          <span className="block text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
            {label ?? metric.metric_name}
          </span>

          <span className="block font-mono text-2xl font-bold" data-testid={`dsx-metric-${id}-value`}>
            {unavailable ? (
              <span className="text-base font-normal italic text-muted-foreground">Unavailable</span>
            ) : (
              <>
                {metric.value!.toFixed(digits)}
                <span className="ml-1 text-sm font-normal text-muted-foreground">{metric.unit}</span>
              </>
            )}
          </span>

          <span className="flex flex-wrap gap-1">
            <DataModeBadge mode={metric.data_mode} />
            <FreshnessIndicator freshness={metric.freshness} />
            <ValidationBadge
              validation={metric.validation}
              calibration={metric.calibration}
              unattestedInputs={metric.unattested_inputs ?? []}
            />
            <CalibrationBadge calibration={metric.calibration} />
          </span>

          {unavailable && metric.missing_inputs.length > 0 && (
            <span className="block text-[11px] text-muted-foreground" data-testid={`dsx-metric-${id}-missing`}>
              Missing: {metric.missing_inputs.join(', ')}
            </span>
          )}
        </button>
      </CardContent>
    </Card>
  );
}

/** Grid of metric tiles keyed by KPI id from the shared bundle. */
export function MetricGrid({
  ids,
  metrics,
  columns = 'sm:grid-cols-2 lg:grid-cols-4',
}: {
  ids: string[];
  metrics: Record<string, DsxProvenancedMetric>;
  columns?: string;
}) {
  return (
    <div className={cn('grid gap-3', columns)}>
      {ids.filter((id) => metrics[id]).map((id) => (
        <MetricTile key={id} id={id} metric={metrics[id]} />
      ))}
    </div>
  );
}