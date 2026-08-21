/**
 * Stage 7K — one prioritized "Requires attention" list. Key Risks, readiness
 * blockers, data conflicts and evidence-backed opportunities are merged here.
 * Generic positive recommendations are deliberately excluded.
 *
 * Every action navigates. Nothing in this panel can create, queue or start a
 * simulation.
 */
import { useId, useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronDown, ChevronRight, CircleCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { EvidenceChip } from './EvidenceChip';
import type { AttentionItem, AttentionSeverity } from '@/pages/blueprint/operatorModel';

const SEVERITY_LABEL: Record<AttentionSeverity, string> = {
  high: 'High',
  medium: 'Medium',
  low: 'Low',
};

const SEVERITY_TONE: Record<AttentionSeverity, string> = {
  high: 'text-destructive',
  medium: 'text-warning',
  low: 'text-muted-foreground',
};

interface Props {
  items: AttentionItem[];
  defaultOpen: boolean;
}

export function RequiresAttentionPanel({ items, defaultOpen }: Props) {
  const [open, setOpen] = useState(defaultOpen);
  const panelId = useId();
  const highCount = items.filter((i) => i.severity === 'high').length;

  if (items.length === 0) {
    return (
      <section
        className="flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2"
        aria-label="Requires attention"
        data-testid="blueprint-attention"
      >
        <CircleCheck className="h-4 w-4 text-success" aria-hidden />
        <p className="text-xs text-foreground">
          Requires attention: nothing unresolved for this Blueprint.
        </p>
      </section>
    );
  }

  return (
    <section
      className="rounded-lg border border-border bg-card"
      aria-label="Requires attention"
      data-testid="blueprint-attention"
    >
      <h2>
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          aria-controls={panelId}
          className="flex min-h-11 w-full items-center gap-2 px-3 py-2 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
        >
          {open ? (
            <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
          ) : (
            <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
          )}
          <span className="text-sm font-semibold text-foreground">Requires attention</span>
          <span className="text-xs text-muted-foreground">
            {items.length} item{items.length === 1 ? '' : 's'}
            {highCount > 0 ? ` · ${highCount} high severity` : ' · none high severity'}
          </span>
        </button>
      </h2>

      <ul id={panelId} hidden={!open} className="divide-y divide-border border-t border-border">
        {items.map((item) => (
          <li key={item.id} className="flex flex-wrap items-start gap-x-3 gap-y-1.5 px-3 py-2.5">
            <div className="min-w-0 flex-1">
              <p className="text-xs font-medium text-foreground">
                <span className={SEVERITY_TONE[item.severity]}>{SEVERITY_LABEL[item.severity]}</span>
                {' - '}
                {item.title}
              </p>
              <p className="mt-0.5 text-[13px] text-muted-foreground">{item.consequence}</p>
              <div className="mt-1 flex flex-wrap items-center gap-1.5">
                <EvidenceChip state={item.evidence} />
                <span className="text-[13px] text-muted-foreground">Owner: {item.destination}</span>
              </div>
            </div>
            <Button asChild size="sm" variant="outline" className="h-8 shrink-0">
              <Link to={item.href}>{item.actionLabel}</Link>
            </Button>
          </li>
        ))}
      </ul>
    </section>
  );
}