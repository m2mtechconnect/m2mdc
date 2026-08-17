/**
 * Observation-step trend strip.
 *
 * The horizontal axis is the run's observation steps, not wall-clock hours:
 * the connected source publishes one observation per step, so labelling this
 * "24 hours" would be a fabrication. A step with no accepted observation
 * leaves a gap instead of a zero.
 */
import { cn } from '@/lib/utils';
import {
  SERIES_LABEL,
  type SeriesClassification,
} from '@/data/dataset/chartSemantics';

/** Minimum accepted observations in one series before a line can be drawn. */
const MIN_POINTS = 2;

export interface TrendSeries {
  id: string;
  label: string;
  unit: string;
  points: (number | null)[];
  digits?: number;
}

function path(points: (number | null)[], width: number, height: number): string {
  const values = points.filter((p): p is number => p !== null);
  if (values.length < 2) return '';
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const step = width / Math.max(1, points.length - 1);
  let d = '';
  let pen = false;
  points.forEach((p, i) => {
    if (p === null) { pen = false; return; }
    const x = i * step;
    const y = height - ((p - min) / span) * (height - 4) - 2;
    d += `${pen ? 'L' : 'M'}${x.toFixed(2)} ${y.toFixed(2)} `;
    pen = true;
  });
  return d.trim();
}

export function TrendStrip({
  series,
  className,
  classification = 'TRUE_TIME_SERIES',
}: {
  series: TrendSeries[];
  className?: string;
  /**
   * Semantics of the underlying records. Point-in-time reference values are
   * never drawn as a line: they render as snapshot cards with an explicit
   * "historical trend unavailable" statement.
   */
  classification?: SeriesClassification;
}) {
  if (classification === 'POINT_IN_TIME' || classification === 'UNAVAILABLE') {
    return (
      <div
        className={cn('grid gap-3 sm:grid-cols-2 xl:grid-cols-4', className)}
        data-testid="dsx-trend-strip"
        data-trend-state="snapshot"
        data-series-classification={classification}
      >
        {series.map((s) => {
          const values = s.points.filter((p): p is number => p !== null);
          const last = values.length ? values[values.length - 1] : null;
          const digits = s.digits ?? 2;
          return (
            <div key={s.id} className="min-w-0 rounded-md border border-border bg-card p-3">
              <p className="truncate text-[12px] uppercase tracking-wide text-muted-foreground">
                {s.label}
              </p>
              <p className="text-[14px] font-semibold tabular-nums">
                {last === null ? (
                  <span className="text-[12px] font-normal italic text-muted-foreground">
                    Unavailable
                  </span>
                ) : (
                  `${last.toFixed(digits)} ${s.unit}`
                )}
              </p>
              <p className="mt-1 text-[12px] text-muted-foreground">
                {SERIES_LABEL[classification]}. Historical trend unavailable.
              </p>
            </div>
          );
        })}
      </div>
    );
  }

  // A run with fewer than two accepted observations produces one identical
  // empty state per series. Collapse them into a single truthful statement.
  const drawable = series.filter((s) => s.points.filter((p) => p !== null).length >= 2);
  if (drawable.length === 0) {
    const counts = series.map((s) => ({
      id: s.id,
      label: s.label,
      accepted: s.points.filter((p) => p !== null).length,
      offered: s.points.length,
    }));
    const best = Math.max(0, ...counts.map((c) => c.accepted));
    const missing = Math.max(0, MIN_POINTS - best);
    const missingStep =
      best === 0
        ? 'No series has an accepted observation yet. The missing step is ingesting a first accepted observation for at least one series.'
        : `The closest series has ${best} of ${MIN_POINTS} required accepted observations. The missing step is ${missing} further accepted observation step(s) for that series.`;
    return (
      <div
        data-testid="dsx-trend-strip"
        data-trend-state="insufficient"
        data-trend-missing-observations={missing}
        className="rounded-md border border-dashed border-border bg-card/40 p-3 text-[12px] text-muted-foreground"
      >
        <p className="font-medium text-foreground">No trend can be drawn yet</p>
        <p className="mt-1">
          Threshold: a line is drawn only when a single series holds at least {MIN_POINTS} accepted
          observations in this run. Rejected or missing observations leave a gap and are never
          counted or interpolated.
        </p>
        <p className="mt-1" data-testid="dsx-trend-missing-step">{missingStep}</p>
        <ul className="mt-2 space-y-0.5">
          {counts.map((c) => (
            <li key={c.id} className="flex justify-between gap-2">
              <span className="truncate">{c.label}</span>
              <span className="shrink-0 tabular-nums">
                {c.accepted} of {MIN_POINTS} accepted ({c.offered} step(s) in run)
              </span>
            </li>
          ))}
        </ul>
      </div>
    );
  }

  return (
    <div className={cn('grid gap-3 sm:grid-cols-2 xl:grid-cols-4', className)} data-testid="dsx-trend-strip">
      {drawable.map((s) => {
        const values = s.points.filter((p): p is number => p !== null);
        const last = values.length ? values[values.length - 1] : null;
        const digits = s.digits ?? 2;
        const summary = values.length
          ? `${s.label}: latest ${last!.toFixed(digits)} ${s.unit}, minimum ${Math.min(...values).toFixed(digits)}, maximum ${Math.max(...values).toFixed(digits)} across ${values.length} observation step(s).`
          : `${s.label}: no accepted observation in this run, so no trend is drawn.`;
        return (
          <figure
            key={s.id}
            data-testid={`dsx-trend-${s.id}`}
            className="min-w-0 rounded-md border border-border bg-card p-3"
          >
            <figcaption className="flex items-baseline justify-between gap-2">
              <span className="truncate text-[12px] uppercase tracking-wide text-muted-foreground">{s.label}</span>
              <span className="shrink-0 text-[14px] font-semibold tabular-nums">
                {last === null ? <span className="text-[12px] font-normal italic text-muted-foreground">Unavailable</span>
                  : `${last.toFixed(digits)} ${s.unit}`}
              </span>
            </figcaption>
            <svg
              viewBox="0 0 160 40"
              preserveAspectRatio="none"
              role="img"
              aria-label={summary}
              className="mt-2 h-10 w-full"
            >
              <path
                d={path(s.points, 160, 40)}
                fill="none"
                stroke="currentColor"
                strokeWidth={1.5}
                className="text-primary"
              />
            </svg>
            <p className="text-[12px] text-muted-foreground">
              {values.length < MIN_POINTS
                ? `${values.length} of ${MIN_POINTS} accepted observations needed to draw a trend.`
                : `${values.length} observation steps`}
            </p>
          </figure>
        );
      })}
    </div>
  );
}