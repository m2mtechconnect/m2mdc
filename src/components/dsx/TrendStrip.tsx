/**
 * Observation-step trend strip.
 *
 * The horizontal axis is the run's observation steps, not wall-clock hours:
 * the connected source publishes one observation per step, so labelling this
 * "24 hours" would be a fabrication. A step with no accepted observation
 * leaves a gap instead of a zero.
 */
import { cn } from '@/lib/utils';

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

export function TrendStrip({ series, className }: { series: TrendSeries[]; className?: string }) {
  return (
    <div className={cn('grid gap-3 sm:grid-cols-2 xl:grid-cols-4', className)} data-testid="dsx-trend-strip">
      {series.map((s) => {
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
              {values.length < 2 ? 'Not enough accepted observations to draw a trend.' : `${values.length} observation steps`}
            </p>
          </figure>
        );
      })}
    </div>
  );
}