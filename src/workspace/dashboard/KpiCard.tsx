/**
 * Stage 7A - interpretable KPI card.
 * Value, state, baseline comparison, provenance action. No trend arrows,
 * because no historical series exists in this environment.
 */
import { Link } from 'react-router-dom';
import { FileSearch } from 'lucide-react';
import { cn } from '@/lib/utils';
import { KPI_STATE_META, type KpiInterpretation } from './kpiInterpretation';

interface Props {
  kpi: KpiInterpretation;
  calculatedAt: string;
  evidenceHref: string;
  blueprintHref: string;
}

export function KpiCard({ kpi, calculatedAt, evidenceHref, blueprintHref }: Props) {
  const meta = KPI_STATE_META[kpi.state];
  return (
    <div
      data-testid={`command-kpi-${kpi.key}`}
      data-state={kpi.state}
      className="flex min-w-0 flex-col rounded-lg border border-border bg-card p-3"
    >
      <Link
        to={blueprintHref}
        data-testid={`command-kpi-${kpi.key}-blueprint`}
        aria-label={`${kpi.label}: open the backing layer in Blueprint`}
        className="rounded-sm text-[11px] font-medium uppercase tracking-wide text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        {kpi.label}
      </Link>

      <p className="mt-1 break-words text-2xl font-semibold tabular-nums leading-tight text-foreground">
        {kpi.value}
      </p>

      <p className={cn('mt-1.5 inline-flex w-fit max-w-full items-center gap-1.5 rounded-sm border px-1.5 py-0.5 text-[11px] font-medium', meta.className)}>
        <span className={cn('h-1.5 w-1.5 shrink-0 rounded-full', meta.dotClassName)} aria-hidden />
        <span className="truncate">{kpi.stateLabel}</span>
      </p>

      {kpi.comparison && (
        <p className="mt-1.5 text-[11px] leading-snug text-muted-foreground">{kpi.comparison}</p>
      )}

      {kpi.fill !== null && (
        <div className="mt-2 h-1 w-full overflow-hidden rounded-full bg-muted" aria-hidden>
          <div className={cn('h-full rounded-full', meta.dotClassName)} style={{ width: `${Math.max(2, Math.min(100, kpi.fill * 100))}%` }} />
        </div>
      )}

      <div className="mt-2 flex items-center justify-between gap-2">
        <span className="min-w-0 truncate text-[10px] text-muted-foreground">Modelled · {calculatedAt}</span>
        <Link
          to={evidenceHref}
          data-testid={`command-kpi-${kpi.key}-evidence`}
          aria-label={`View evidence for ${kpi.label}`}
          className="inline-flex shrink-0 items-center gap-1 rounded-sm text-[11px] text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <FileSearch className="h-3.5 w-3.5" aria-hidden />
          Evidence
        </Link>
      </div>
    </div>
  );
}