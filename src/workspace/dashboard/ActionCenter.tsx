/**
 * Stage 7D - compact Action Center.
 *
 * The dashboard shows the three highest-priority items (two on mobile) as
 * single-line rows. Everything else is progressive disclosure: the full list
 * opens in a drawer and each row's explanation lives in the Issue Quick View,
 * so the default document height never grows.
 */
import { useEffect, useMemo, useState } from 'react';
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
            className="inline-flex min-h-[44px] items-center line-clamp-1 break-words text-left underline-offset-4 sm:min-h-0 sm:block hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1"
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
  const [openId, setOpenId] = useState<string | null>(null);
  const [showAll, setShowAll] = useState(false);
  const limit = useVisibleCount();

  const visible = useMemo(() => items.slice(0, limit), [items, limit]);
  const openItem = items.find((item) => item.id === openId) ?? null;

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
            <ActionRow key={item.id} item={item} onOpen={setOpenId} />
          ))}
        </ul>
      )}


      <Sheet open={showAll} onOpenChange={setShowAll}>
        <SheetContent side="right" className="flex w-[min(560px,94vw)] flex-col gap-0 p-0 sm:max-w-none">
          <SheetHeader className="space-y-1 border-b border-border p-4 text-left">
            <SheetTitle className="text-[16px]">Action Center</SheetTitle>
            <SheetDescription className="text-[13px]">
              All modelled constraints, data-quality notes and readiness gaps.
            </SheetDescription>
          </SheetHeader>
          <ul className="min-h-0 flex-1 space-y-2 overflow-y-auto p-3" data-testid="action-center-all-list">
            {items.map((item) => (
              <ActionRow key={item.id} item={item} onOpen={setOpenId} />
            ))}
          </ul>
        </SheetContent>
      </Sheet>

      <ActionDetailDrawer
        item={openItem}
        onClose={() => setOpenId(null)}
        onInspectRacks={
          onInspectRacks
            ? (item) => {
                setOpenId(null);
                setShowAll(false);
                onInspectRacks(item);
              }
            : undefined
        }
      />
    </section>
  );
}
