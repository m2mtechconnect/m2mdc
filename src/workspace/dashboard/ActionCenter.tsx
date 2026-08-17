/**
 * Stage 7D - compact Action Center.
 *
 * The dashboard shows the three highest-priority items (two on mobile) as
 * single-line rows. Everything else is progressive disclosure: the full list
 * opens in a drawer and each row's explanation lives in the Issue Quick View,
 * so the default document height never grows.
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Link } from 'react-router-dom';
import { CircleAlert, Ellipsis, Info, TriangleAlert } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { useReturnFocus } from '@/hooks/useReturnFocus';
import type { AttentionItem, AttentionSeverity } from './attentionQueue';
import { ActionDetailDrawer } from './ActionDetailDrawer';

const SEVERITY_UI: Record<
  AttentionSeverity,
  { label: string; Icon: typeof Info; iconClass: string; tileClass: string; accent: string }
> = {
  constraint: {
    label: 'Constraint',
    Icon: CircleAlert,
    iconClass: 'text-destructive',
    tileClass: 'bg-destructive/10',
    accent: 'bg-destructive',
  },
  review: {
    label: 'Review',
    Icon: TriangleAlert,
    iconClass: 'text-warning',
    tileClass: 'bg-warning/10',
    accent: 'bg-warning',
  },
  informational: {
    label: 'Context',
    Icon: Info,
    iconClass: 'text-info',
    tileClass: 'bg-info/10',
    accent: 'bg-info',
  },
};

function useVisibleCount(): number {
  const [count, setCount] = useState(() =>
    typeof window !== 'undefined' && window.innerWidth < 768 ? 2 : 3,
  );
  useEffect(() => {
    const onResize = () => setCount(window.innerWidth < 768 ? 2 : 3);
    onResize();
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);
  return count;
}

function ActionRow({
  item,
  onOpen,
}: {
  item: AttentionItem;
  onOpen: (id: string) => void;
}) {
  const ui = SEVERITY_UI[item.severity];
  const [primary, ...rest] = item.actions;
  return (
    <li
      data-testid={`action-item-${item.id}`}
      className="relative flex min-h-[72px] min-w-0 items-center gap-3 overflow-hidden rounded-md border border-border bg-card pl-3 pr-3 py-2.5 transition-colors duration-150 hover:bg-muted/40"
    >
      <span className={cn('absolute inset-y-0 left-0 w-1', ui.accent)} aria-hidden />
      <span
        className={cn('hidden h-9 w-9 shrink-0 items-center justify-center rounded-md sm:flex', ui.tileClass)}
        aria-hidden
      >
        <ui.Icon className={cn('h-[18px] w-[18px]', ui.iconClass)} strokeWidth={1.75} />
      </span>

      <div className="min-w-0 flex-1">
        <h3 className="min-w-0 text-[14px] font-semibold leading-snug text-foreground">
          <button
            type="button"
            onClick={() => onOpen(item.id)}
            data-testid={`action-item-open-${item.id}`}
            aria-haspopup="dialog"
            className="inline-flex min-h-[44px] items-center line-clamp-1 break-words text-left underline-offset-4 sm:min-h-[24px] sm:inline-flex hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1"
          >
            {item.title}
          </button>
        </h3>
        <p className="line-clamp-1 text-[13px] leading-snug text-muted-foreground">{item.impact}</p>
        <p className="line-clamp-1 text-[12px] font-medium text-muted-foreground">
          {ui.label} · {item.subsystem} · {item.evidence}
        </p>
      </div>

      <div className="flex shrink-0 items-center gap-1.5">
        {primary && (
          <Button asChild size="sm" className="h-9 text-[13px] font-semibold max-sm:h-11">
            <Link to={primary.to}>{primary.label}</Link>
          </Button>
        )}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="h-9 w-9 p-0 max-sm:h-11 max-sm:w-11"
              aria-label={`More actions for ${item.title}`}
              data-testid={`action-item-details-${item.id}`}
            >
              <Ellipsis className="h-[18px] w-[18px]" strokeWidth={1.75} aria-hidden />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onSelect={() => onOpen(item.id)}>View details</DropdownMenuItem>
            {rest.map((action) => (
              <DropdownMenuItem key={action.label} asChild>
                <Link to={action.to}>{action.label}</Link>
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </li>
  );
}

export function ActionCenter({
  items,
  onInspectRacks,
}: {
  items: AttentionItem[];
  onInspectRacks?: (item: AttentionItem) => void;
}) {
  const limit = useVisibleCount();
  const [searchParams, setSearchParams] = useSearchParams();

  // Deep-link state: `?action=<id>` opens a row drawer, `?actions=all` opens
  // the full list. Both are shareable and survive reload / Back.
  const actionParam = searchParams.get('action');
  const openId = actionParam && items.some((item) => item.id === actionParam) ? actionParam : null;

  // A shared link to a row that sits below the fold keeps its row context by
  // appending that row to the visible list, rather than stacking a second
  // dialog (the full-list sheet) behind the drawer.
  const visible = useMemo(() => {
    const top = items.slice(0, limit);
    if (!openId || top.some((item) => item.id === openId)) return top;
    const deepLinked = items.find((item) => item.id === openId);
    return deepLinked ? [...top, deepLinked] : top;
  }, [items, limit, openId]);
  const openItem = items.find((item) => item.id === openId) ?? null;

  const showAll = searchParams.get('actions') === 'all';
  const returnFocus = useReturnFocus(showAll);

  const patchParams = useCallback(
    (patch: Record<string, string | null>) => {
      setSearchParams(
        (current) => {
          const next = new URLSearchParams(current);
          for (const [key, value] of Object.entries(patch)) {
            if (value === null) next.delete(key);
            else next.set(key, value);
          }
          return next;
        },
        { replace: true },
      );
    },
    [setSearchParams],
  );

  const openAction = useCallback((id: string) => patchParams({ action: id }), [patchParams]);
  const closeAction = useCallback(() => patchParams({ action: null }), [patchParams]);
  const setShowAll = useCallback(
    (open: boolean) => patchParams(open ? { actions: 'all' } : { actions: null, action: null }),
    [patchParams],
  );

  return (
    <section
      aria-labelledby="action-center-heading"
      data-testid="action-center"
      className="min-w-0 rounded-lg border border-border bg-card"
    >
      <div className="flex min-w-0 flex-wrap items-center justify-between gap-2 border-b border-border px-4 py-2.5">
        <h2 id="action-center-heading" className="text-[16px] font-semibold leading-tight text-foreground">
          Action Center
        </h2>
        <div className="flex items-center gap-2">
          <p className="text-[13px] font-medium tabular-nums text-muted-foreground">
            {items.length} open
          </p>
          {items.length > limit && (
            <Button
              variant="outline"
              size="sm"
              className="h-9 text-[13px] max-sm:h-11"
              aria-haspopup="dialog"
              data-testid="action-center-view-all"
              onClick={() => setShowAll(true)}
            >
              {`View all ${items.length} items`}
            </Button>
          )}
        </div>
      </div>

      {items.length === 0 ? (
        <p className="p-4 text-[13px] text-muted-foreground">
          No open items for the current design baseline.
        </p>
      ) : (
        <ul className="min-w-0 space-y-2 p-3" data-testid="action-center-list">
          {visible.map((item) => (
            <ActionRow key={item.id} item={item} onOpen={openAction} />
          ))}
        </ul>
      )}


      <Sheet open={showAll} onOpenChange={setShowAll}>
        <SheetContent
          side="right"
          className="flex w-[min(560px,94vw)] flex-col gap-0 p-0 sm:max-w-none"
          onCloseAutoFocus={returnFocus}
        >
          <SheetHeader className="space-y-1 border-b border-border p-4 text-left">
            <SheetTitle className="text-[16px]">Action Center</SheetTitle>
            <SheetDescription className="text-[13px]">
              All modelled constraints, data-quality notes and readiness gaps.
            </SheetDescription>
          </SheetHeader>
          <ul className="min-h-0 flex-1 space-y-2 overflow-y-auto p-3" data-testid="action-center-all-list">
            {items.map((item) => (
              <ActionRow key={item.id} item={item} onOpen={openAction} />
            ))}
          </ul>
        </SheetContent>
      </Sheet>

      <ActionDetailDrawer
        item={openItem}
        onClose={closeAction}
        onInspectRacks={
          onInspectRacks
            ? (item) => {
                patchParams({ action: null, actions: null });
                onInspectRacks(item);
              }
            : undefined
        }
      />
    </section>
  );
}
