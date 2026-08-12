/**
 * Single operational KPI presenter. No workspace may render its own metric
 * card: every visible value goes through this component so that mode,
 * freshness, validation, calibration and provenance always travel with it.
 */
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import type { DsxProvenancedMetric } from '@/dsx/contracts/provenancedMetric';
import { FreshnessIndicator, ValidationBadge } from './StateBadges';
import { useWorkspace } from '@/dsx/runtime/EvidenceBetaContext';

interface Props {
  id: string;
  metric: DsxProvenancedMetric;
  digits?: number;
  label?: string;
  className?: string;
  /** Hidden when the grid states one shared validation state for every tile. */
  hideValidation?: boolean;
}

export function MetricTile({ id, metric, digits = 2, label, className, hideValidation = false }: Props) {
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
          aria-label={`${label ?? metric.metric_name} - open provenance`}
          data-testid={`dsx-metric-${id}-open`}
          data-metric-name={metric.metric_name}
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

          {/* Data mode and calibration are facility-wide facts carried once by
              the operational truth bar; the tile keeps only the per-metric
              verification state, plus freshness when it is not fresh. */}
          <span className="flex flex-wrap gap-1">
            {metric.freshness !== 'fresh' && <FreshnessIndicator freshness={metric.freshness} />}
            {!hideValidation && (
              <ValidationBadge
                validation={metric.validation}
                calibration={metric.calibration}
                unattestedInputs={metric.unattested_inputs ?? []}
              />
            )}
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

/**
 * Grid of metric tiles keyed by KPI id from the shared bundle.
 * When every tile carries the identical validation state, the state is stated
 * once above the grid instead of being repeated on each tile.
 */
export function MetricGrid({
  ids,
  metrics,
  columns = 'sm:grid-cols-2 lg:grid-cols-4',
}: {
  ids: string[];
  metrics: Record<string, DsxProvenancedMetric>;
  columns?: string;
}) {
  const shown = ids.filter((id) => metrics[id]);
  const signature = (m: DsxProvenancedMetric) =>
    `${m.validation}|${m.calibration}|${(m.unattested_inputs ?? []).join(',')}`;
  const first = shown.length > 1 ? metrics[shown[0]] : undefined;
  const shared = first && shown.every((id) => signature(metrics[id]) === signature(first)) ? first : undefined;

  return (
    <div className="space-y-2">
      {shared && (
        <p
          className="flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground"
          data-testid="dsx-metric-grid-validation"
        >
          <span>All {shown.length} values below share the same verification state:</span>
          <ValidationBadge
            validation={shared.validation}
            calibration={shared.calibration}
            unattestedInputs={shared.unattested_inputs ?? []}
          />
        </p>
      )}
      <div className={cn('grid gap-3', columns)}>
        {shown.map((id) => (
          <MetricTile key={id} id={id} metric={metrics[id]} hideValidation={Boolean(shared)} />
        ))}
      </div>
    </div>
  );
}