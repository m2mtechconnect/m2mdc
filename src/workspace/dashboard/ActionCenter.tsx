/**
 * Stage 7B - Action Center.
 *
 * Lightning-style related-list treatment: a single surface, structured
 * operational rows, semantic status column, one primary action per row and
 * everything else behind links or an overflow menu.
 */
import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertOctagon, AlertTriangle, Info, MoreHorizontal } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  ATTENTION_FILTERS,
  attentionGroup,
  type AttentionGroup,
  type AttentionItem,
  type AttentionSeverity,
} from './attentionQueue';

const INITIAL_VISIBLE = 4;

const SEVERITY_UI: Record<
  AttentionSeverity,
  { label: string; Icon: typeof Info; iconClass: string; accent: string; tint: string }
> = {
  constraint: {
    label: 'Constraint',
    Icon: AlertOctagon,
    iconClass: 'text-destructive',
    accent: 'bg-destructive',
    tint: 'bg-destructive/[0.04]',
  },
  review: {
    label: 'Review',
    Icon: AlertTriangle,
    iconClass: 'text-warning',
    accent: 'bg-warning',
    tint: 'bg-warning/[0.05]',
  },
  informational: {
    label: 'Context',
    Icon: Info,
    iconClass: 'text-info',
    accent: 'bg-info',
    tint: 'bg-transparent',
  },
};

export function ActionCenter({ items }: { items: AttentionItem[] }) {
  const [filter, setFilter] = useState<AttentionGroup | 'all'>('all');
  const [expanded, setExpanded] = useState(false);

  const filtered = useMemo(
    () => (filter === 'all' ? items : items.filter((item) => attentionGroup(item) === filter)),
    [items, filter],
  );
  const visible = expanded ? filtered : filtered.slice(0, INITIAL_VISIBLE);

  return (
    <section
      aria-labelledby="action-center-heading"
      data-testid="action-center"
      className="min-w-0 rounded-lg border border-border bg-card"
    >
      <div className="min-w-0 border-b border-border p-4 sm:p-5">
        <div className="flex min-w-0 flex-wrap items-baseline justify-between gap-2">
          <h2 id="action-center-heading" className="text-[18px] font-semibold leading-tight text-foreground">
            Action Center
          </h2>
          <p className="text-[13px] tabular-nums text-muted-foreground">
            {items.length} open item{items.length === 1 ? '' : 's'}
          </p>
        </div>
        <p className="mt-1 text-[13px] leading-relaxed text-muted-foreground">
          Review modelled constraints and incomplete readiness.
        </p>

        <div
          className="mt-3 flex min-w-0 flex-wrap gap-1.5"
          role="group"
          aria-label="Filter action items"
        >
          {ATTENTION_FILTERS.map((option) => {
            const active = filter === option.id;
            const count =
              option.id === 'all'
                ? items.length
                : items.filter((item) => attentionGroup(item) === option.id).length;
            return (
              <button
                key={option.id}
                type="button"
                aria-pressed={active}
                data-testid={`action-filter-${option.id}`}
                onClick={() => {
                  setFilter(option.id);
                  setExpanded(false);
                }}
                className={cn(
                  'inline-flex min-h-[36px] items-center gap-1.5 rounded-md border px-3 text-[13px] font-medium transition-colors',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1',
                  active
                    ? 'border-primary bg-primary text-primary-foreground'
                    : 'border-border bg-card text-muted-foreground hover:border-primary/40 hover:text-foreground',
                )}
              >
                {option.label}
                <span className="tabular-nums opacity-70">{count}</span>
              </button>
            );
          })}
        </div>
      </div>

      {filtered.length === 0 ? (
        <p className="p-5 text-[14px] text-muted-foreground">
          No items in this category for the current design baseline.
        </p>
      ) : (
        <ul className="min-w-0 space-y-2 p-3 sm:p-4">
          {visible.map((item, index) => {
            const ui = SEVERITY_UI[item.severity];
            const highest = index === 0 && !expanded && filter === 'all';
            const [primary, ...rest] = item.actions;
            return (
              <li
                key={item.id}
                data-testid={`action-item-${item.id}`}
                className={cn(
                  'relative min-w-0 overflow-hidden rounded-md border border-border pl-5',
                  highest ? ui.tint : 'bg-card',
                )}
              >
                <span
                  className={cn('absolute inset-y-0 left-0 w-2', ui.accent)}
                  aria-hidden
                />
                <div className="flex min-w-0 gap-3 p-3 sm:p-4">
                  <div className="hidden w-12 shrink-0 justify-center pt-0.5 sm:flex">
                    <ui.Icon className={cn('h-6 w-6', ui.iconClass)} aria-hidden />
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
                      <span className="text-[12px] font-semibold uppercase tracking-wide text-foreground">
                        {ui.label}
                      </span>
                      <span className="text-[12px] font-medium text-muted-foreground">
                        {item.category}
                      </span>
                    </div>

                    <h3 className="mt-1 break-words text-[15px] font-semibold leading-snug text-foreground">
                      {item.title}
                    </h3>
                    <p className="mt-1 break-words text-[13px] leading-relaxed text-muted-foreground">
                      {item.impact}
                    </p>
                    <p className="mt-1 break-words text-[12px] font-medium text-muted-foreground">
                      {item.subsystem} · {item.evidence}
                    </p>

                    <div className="mt-3 flex min-w-0 flex-wrap items-center gap-2">
                      {primary && (
                        <Button asChild size="sm" className="min-h-[36px] text-[13px] max-sm:min-h-[44px]">
                          <Link to={primary.to}>{primary.label}</Link>
                        </Button>
                      )}
                      {rest.map((action) => (
                        <Button
                          key={action.label}
                          asChild
                          size="sm"
                          variant="link"
                          className="hidden min-h-[36px] px-1 text-[13px] sm:inline-flex"
                        >
                          <Link to={action.to}>{action.label}</Link>
                        </Button>
                      ))}
                      {rest.length > 0 && (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="ml-auto h-9 w-9 p-0 max-sm:h-11 max-sm:w-11 sm:hidden"
                              aria-label={`More actions for ${item.title}`}
                            >
                              <MoreHorizontal className="h-4 w-4" aria-hidden />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            {rest.map((action) => (
                              <DropdownMenuItem key={action.label} asChild>
                                <Link to={action.to}>{action.label}</Link>
                              </DropdownMenuItem>
                            ))}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </div>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {filtered.length > INITIAL_VISIBLE && (
        <div className="border-t border-border px-4 py-3">
          <Button
            variant="outline"
            size="sm"
            className="min-h-[36px] text-[13px] max-sm:min-h-[44px]"
            onClick={() => setExpanded((v) => !v)}
          >
            {expanded ? `Show top ${INITIAL_VISIBLE} only` : `View all ${filtered.length} items`}
          </Button>
        </div>
      )}
    </section>
  );
}
