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
  /** Visual hierarchy only: no change to the value, provenance or semantics. */
  level?: 'primary' | 'secondary' | 'compact';
}

export function MetricTile({
  id,
  metric,
  digits = 2,
  label,
  className,
  hideValidation = false,
  level = 'secondary',
}: Props) {
  const { openProvenance } = useWorkspace();
  const unavailable = metric.value === null;

  return (
    <Card
      data-testid={`dsx-metric-${id}`}
      data-mode={metric.data_mode}
      data-validation={metric.validation}
      className={cn(
        'overflow-hidden rounded-md border-y border-r border-l-4 border-border/60 border-l-primary bg-card shadow-sm transition-shadow hover:shadow-md',
        level === 'primary' && 'border-l-primary bg-[hsl(var(--v2-panel-elevated))]',
        level === 'compact' && 'border-l-2 border-l-border/60',
        unavailable && 'border-l-muted-foreground/30',
        className,
      )}
    >
      <CardContent className={level === 'compact' ? 'p-3' : 'p-4'}>
        <button
          type="button"
          onClick={() => openProvenance(metric)}
          className="w-full space-y-2 rounded-sm text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          aria-label={`${label ?? metric.metric_name} - open provenance`}
          data-testid={`dsx-metric-${id}-open`}
          data-metric-name={metric.metric_name}
        >
          <span className="block text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            {label ?? metric.metric_name}
          </span>

          <span
            className={cn(
              'v2-mono block font-bold leading-none tabular-nums text-foreground',
              level === 'primary' ? 'text-[34px]' : level === 'compact' ? 'text-xl' : 'text-3xl',
            )}
            data-testid={`dsx-metric-${id}-value`}
          >
            {unavailable ? (
              <span className="text-base font-normal italic text-muted-foreground">Unavailable</span>
            ) : (
              <>
                {metric.value!.toFixed(digits)}
                <span className="ml-1.5 text-xs font-medium text-muted-foreground">{metric.unit}</span>
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
  level = 'secondary',
}: {
  ids: string[];
  metrics: Record<string, DsxProvenancedMetric>;
  columns?: string;
  level?: 'primary' | 'secondary' | 'compact';
}) {
  const shown = ids.filter((id) => metrics[id]);
  /* Tiles collapse to one statement when they render the identical badge:
     the badge text depends on the validation state and on whether the value
     is verified, not on which inputs are unattested (those stay in the
     per-metric provenance drawer). */
  const unverified = (m: DsxProvenancedMetric) =>
    m.calibration === 'uncalibrated' || (m.unattested_inputs ?? []).length > 0;
  const signature = (m: DsxProvenancedMetric) => `${m.validation}|${unverified(m)}`;
  const first = shown.length > 1 ? metrics[shown[0]] : undefined;
  const shared = first && shown.every((id) => signature(metrics[id]) === signature(first)) ? first : undefined;

  return (
    <div className="space-y-2">
      {shared && (
        <div
          className="flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground"
          data-testid="dsx-metric-grid-validation"
        >
          <span>All {shown.length} values below share the same verification state:</span>
          <ValidationBadge
            validation={shared.validation}
            calibration={unverified(shared) ? 'uncalibrated' : shared.calibration}
          />
        </div>
      )}
      <div className={cn('grid gap-4', columns)}>
        {shown.map((id) => (
          <MetricTile key={id} id={id} metric={metrics[id]} level={level} hideValidation={Boolean(shared)} />
        ))}
      </div>
    </div>
  );
}