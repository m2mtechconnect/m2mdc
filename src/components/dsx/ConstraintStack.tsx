/**
 * Cross-domain constraint stack. Shows every domain's status including the
 * domains that cannot be assessed, so an operator never mistakes silence
 * for health.
 */
import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { useWorkspace } from '@/dsx/runtime/EvidenceBetaContext';
import { statusRank, type ConstraintStatus, type DomainConstraint } from '@/dsx/workspaces/constraints';

const STATUS_CLASS: Record<ConstraintStatus, string> = {
  violation: 'border-red-500/50 bg-red-500/10 text-red-200',
  attention: 'border-amber-500/50 bg-amber-500/10 text-amber-200',
  normal: 'border-emerald-500/50 bg-emerald-500/10 text-emerald-200',
  unavailable: 'border-zinc-500/50 bg-zinc-500/10 text-zinc-300',
};

const STATUS_LABEL: Record<ConstraintStatus, string> = {
  violation: 'Constraint violated',
  attention: 'Approaching limit',
  normal: 'Within limits',
  unavailable: 'Cannot be assessed',
};

export function ConstraintRow({ c }: { c: DomainConstraint }) {
  return (
    <li
      data-testid={`dsx-constraint-${c.domain}`}
      data-status={c.status}
      className="flex flex-col gap-1 rounded-md border border-border/60 bg-card/40 p-3"
    >
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm font-semibold">{c.label}</span>
        <Badge variant="outline" className={cn('text-[11px]', STATUS_CLASS[c.status])}>
          {STATUS_LABEL[c.status]}
        </Badge>
        <Badge variant="outline" className="text-[11px]">
          {c.evidence_events} evidence event(s)
        </Badge>
        <Link
          to={c.route}
          className="ml-auto rounded-sm text-xs underline underline-offset-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          Open {c.label} workspace
        </Link>
      </div>
      <p className="text-xs text-muted-foreground">{c.summary}</p>
      {c.affected_assets.length > 0 && (
        <p className="text-xs text-muted-foreground">
          Affected: {c.affected_assets.map((a) => a.name).join(', ')}
        </p>
      )}
      <p className="text-xs text-muted-foreground">Next step: {c.next_step}</p>
    </li>
  );
}

export function ConstraintStack({ limit }: { limit?: number }) {
  const { constraints } = useWorkspace();
  const ordered = [...constraints].sort((a, b) => statusRank(a.status) - statusRank(b.status));
  const shown = limit ? ordered.slice(0, limit) : ordered;

  return (
    <Card data-testid="dsx-constraint-stack">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm">Cross-domain constraint stack</CardTitle>
      </CardHeader>
      <CardContent>
        <ul className="space-y-2">
          {shown.map((c) => <ConstraintRow key={c.domain} c={c} />)}
        </ul>
      </CardContent>
    </Card>
  );
}