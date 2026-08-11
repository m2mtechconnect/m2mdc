/**
 * Exception list ranked by severity, then by operational impact
 * (number of affected assets, then number of backing observations).
 * Domains that cannot be assessed are ranked above healthy domains so an
 * operator never reads silence as health.
 */
import { Link } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { useWorkspace } from '@/dsx/runtime/EvidenceBetaContext';
import { statusRank, type ConstraintStatus, type DomainConstraint } from '@/dsx/workspaces/constraints';

const STATUS_LABEL: Record<ConstraintStatus, string> = {
  violation: 'Constraint violated',
  attention: 'Approaching limit',
  normal: 'Within limits',
  unavailable: 'Cannot be assessed',
};

const STATUS_CLASS: Record<ConstraintStatus, string> = {
  violation: 'border-red-500/50 bg-red-500/10 text-red-800 dark:text-red-200',
  attention: 'border-amber-500/50 bg-amber-500/10 text-amber-800 dark:text-amber-200',
  normal: 'border-emerald-500/50 bg-emerald-500/10 text-emerald-800 dark:text-emerald-200',
  unavailable: 'border-border bg-muted text-muted-foreground',
};

export function rankExceptions(constraints: DomainConstraint[]): DomainConstraint[] {
  return [...constraints].sort((a, b) => {
    const s = statusRank(a.status) - statusRank(b.status);
    if (s !== 0) return s;
    const impact = b.affected_assets.length - a.affected_assets.length;
    if (impact !== 0) return impact;
    return b.evidence_events - a.evidence_events;
  });
}

export function ExceptionList({ limit }: { limit?: number }) {
  const { constraints, openConstraint, hrefWithContext } = useWorkspace();
  const ranked = rankExceptions(constraints).filter((c) => c.status !== 'normal');
  const rows = limit ? ranked.slice(0, limit) : ranked;

  if (rows.length === 0) {
    return (
      <p className="text-[13px] text-muted-foreground" data-testid="dsx-exceptions-empty">
        Every assessable domain is within its declared limits at this observation step.
      </p>
    );
  }

  return (
    <ul className="divide-y divide-border rounded-md border border-border" data-testid="dsx-exception-list">
      {rows.map((c) => (
        <li
          key={c.domain}
          data-testid={`dsx-constraint-${c.domain}`}
          data-status={c.status}
          className="flex flex-wrap items-center gap-x-3 gap-y-1 p-3"
        >
          <Badge variant="outline" className={cn('shrink-0 text-[12px]', STATUS_CLASS[c.status])}>
            {STATUS_LABEL[c.status]}
          </Badge>
          <button
            type="button"
            data-testid={`dsx-constraint-open-${c.domain}`}
            onClick={() => openConstraint(c)}
            className="min-w-0 shrink-0 rounded-sm text-[14px] font-semibold underline underline-offset-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            {c.label}
          </button>
          <p className="min-w-0 flex-1 truncate text-[13px] text-muted-foreground" title={c.summary}>
            {c.summary}
          </p>
          <span className="shrink-0 text-[12px] tabular-nums text-muted-foreground">
            {c.evidence_events} event(s)
          </span>
          <Link
            to={hrefWithContext(c.route)}
            className="shrink-0 rounded-sm text-[13px] underline underline-offset-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            Open {c.label}
          </Link>
        </li>
      ))}
    </ul>
  );
}