/** Stage 7A - prioritised attention queue section. */
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { SEVERITY_META, type AttentionItem } from './attentionQueue';

const INITIAL_VISIBLE = 5;

export function AttentionQueueSection({ items }: { items: AttentionItem[] }) {
  const [expanded, setExpanded] = useState(false);
  const visible = expanded ? items : items.slice(0, INITIAL_VISIBLE);

  return (
    <section aria-labelledby="attention-heading" className="min-w-0">
      <div className="mb-2 flex flex-wrap items-baseline justify-between gap-2">
        <h2 id="attention-heading" className="text-sm font-semibold text-foreground">
          Attention required
        </h2>
        <p className="text-xs text-muted-foreground">
          {items.length} item{items.length === 1 ? '' : 's'} derived from the current design baseline
        </p>
      </div>

      <ul className="min-w-0 divide-y divide-border overflow-hidden rounded-lg border border-border bg-card">
        {visible.map((item) => {
          const severity = SEVERITY_META[item.severity];
          return (
            <li key={item.id} data-testid={`attention-item-${item.id}`} className="min-w-0 p-3 sm:p-4">
              <div className="flex min-w-0 flex-wrap items-center gap-2">
                <span className={cn('inline-flex items-center gap-1.5 rounded-sm border px-1.5 py-0.5 text-[11px] font-medium', severity.className)}>
                  <span className={cn('h-1.5 w-1.5 rounded-full', severity.dot)} aria-hidden />
                  {severity.label}
                </span>
                <span className="text-[11px] text-muted-foreground">
                  {item.category} · {item.subsystem}
                </span>
              </div>

              <h3 className="mt-1.5 break-words text-sm font-medium text-foreground">{item.title}</h3>
              <p className="mt-1 break-words text-xs leading-relaxed text-muted-foreground">
                Impact: {item.impact}
              </p>
              <p className="mt-0.5 break-words text-xs leading-relaxed text-muted-foreground">
                Evidence: {item.evidence}
              </p>

              <div className="mt-2 flex flex-wrap gap-2">
                {item.actions.map((action) => (
                  <Button key={action.label} asChild size="sm" variant="outline" className="h-8 min-h-[32px] text-xs">
                    <Link to={action.to}>
                      {action.label}
                      <ArrowRight className="ml-1 h-3.5 w-3.5" aria-hidden />
                    </Link>
                  </Button>
                ))}
              </div>
            </li>
          );
        })}
      </ul>

      {items.length > INITIAL_VISIBLE && (
        <Button variant="ghost" size="sm" className="mt-2 text-xs" onClick={() => setExpanded((v) => !v)}>
          {expanded ? 'Show top 5 only' : `View all ${items.length} items`}
        </Button>
      )}
    </section>
  );
}