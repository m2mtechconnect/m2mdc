/**
 * Stage 7D - Rack Quick View.
 *
 * One record component with three presentations: an inline drawer inside the
 * visualisation card on desktop, a right-side overlay sheet on tablet and a
 * near-full-height bottom sheet on mobile. Exactly one presentation renders at
 * a time. Every field is a modelled value or an explicit unavailable state.
 */
import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowUpRight, CircleAlert, CircleCheck, Copy, FileSearch, Info, Play, TriangleAlert, X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import type { FacilityDefinition } from '../facilityModel';
import {
  loadRackDetail, type RackDetail, type RackGrid, type RackState,
} from './rackModel';

const STATE_UI: Record<RackState, { Icon: typeof Info; className: string }> = {
  within: { Icon: CircleCheck, className: 'text-success' },
  watch: { Icon: TriangleAlert, className: 'text-warning' },
  constraint: { Icon: CircleAlert, className: 'text-destructive' },
  unknown: { Icon: Info, className: 'text-muted-foreground' },
  unavailable: { Icon: Info, className: 'text-muted-foreground' },
};

export interface RackQuickViewData {
  detail: RackDetail | null;
  loading: boolean;
  error: string | null;
  retry: () => void;
}

/** Resolves the rack record, exposing loading, error and retry states. */
export function useRackDetail(
  rackId: string | null,
  grid: RackGrid,
  facility: FacilityDefinition,
  calculatedAt: string,
): RackQuickViewData {
  const [detail, setDetail] = useState<RackDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (!rackId) {
      setDetail(null);
      setLoading(false);
      setError(null);
      return;
    }
    let active = true;
    setLoading(true);
    setError(null);
    loadRackDetail(rackId, grid, facility, calculatedAt)
      .then((result) => {
        if (!active) return;
        setDetail(result);
        setLoading(false);
      })
      .catch(() => {
        if (!active) return;
        setDetail(null);
        setError('Rack details could not be loaded.');
        setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [rackId, grid, facility, calculatedAt, attempt]);

  return { detail, loading, error, retry: () => setAttempt((n) => n + 1) };
}

function Field({ label, value, modelled }: { label: string; value: string; modelled: boolean }) {
  return (
    <div className="grid grid-cols-[8.5rem_1fr] gap-3 border-b border-border py-2 last:border-b-0">
      <dt className="text-[13px] text-muted-foreground">{label}</dt>
      <dd
        className={cn(
          'break-words text-[13px] leading-relaxed',
          modelled ? 'font-medium text-foreground' : 'italic text-muted-foreground',
        )}
      >
        {value}
      </dd>
    </div>
  );
}

interface BodyProps {
  data: RackQuickViewData;
  facilityId: string;
  blueprintHref: string;
  onInspectEvidence?: () => void;
}

export function RackQuickViewBody({ data, facilityId, blueprintHref }: BodyProps) {
  const { detail, loading, error, retry } = data;

  if (loading) {
    return (
      <div className="space-y-3 p-4" data-testid="rack-quick-view-loading">
        <Skeleton className="h-5 w-32" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-4/5" />
        <Skeleton className="h-24 w-full" />
      </div>
    );
  }

  if (error || !detail) {
    return (
      <div className="space-y-3 p-4" data-testid="rack-quick-view-error" role="alert">
        <p className="text-[14px] font-semibold text-foreground">Rack details could not be loaded.</p>
        <p className="text-[13px] leading-relaxed text-muted-foreground">
          The facility visualisation remains available.
        </p>
        <Button size="sm" variant="outline" className="h-9 text-[13px] max-sm:h-11" onClick={retry}>
          Retry
        </Button>
      </div>
    );
  }

  const state = STATE_UI[detail.rack.state];
  const rackParam = encodeURIComponent(detail.rack.code);

  return (
    <div className="space-y-4 p-4" data-testid="rack-quick-view-body">
      <p className="inline-flex items-center gap-1.5 rounded-md border border-border bg-muted/50 px-2 py-1 text-[13px] font-semibold text-foreground">
        <state.Icon className={cn('h-4 w-4', state.className)} strokeWidth={1.75} aria-hidden />
        {detail.stateLabel}
      </p>

      <section aria-label="Rack overview">
        <h4 className="text-[12px] font-semibold uppercase tracking-wide text-muted-foreground">Overview</h4>
        <dl className="mt-1.5">
          {detail.overview.map((field) => (
            <Field key={field.label} {...field} />
          ))}
        </dl>
      </section>

      <section aria-label="Rack constraints">
        <h4 className="text-[12px] font-semibold uppercase tracking-wide text-muted-foreground">Constraints</h4>
        {detail.constraints.length === 0 ? (
          <p className="mt-1.5 text-[13px] text-muted-foreground">
            No modelled constraint applies to this rack.
          </p>
        ) : (
          <ul className="mt-1.5 space-y-2">
            {detail.constraints.map((constraint) => (
              <li key={constraint.title} className="rounded-md border border-border bg-muted/40 p-3">
                <p className="text-[13px] font-semibold text-foreground">{constraint.title}</p>
                <p className="mt-1 text-[13px] leading-relaxed text-muted-foreground">{constraint.summary}</p>
                <p className="mt-1.5 text-[13px] leading-relaxed text-muted-foreground">
                  <span className="font-medium text-foreground">Impact: </span>
                  {constraint.impact}
                </p>
                <p className="mt-1 text-[13px] leading-relaxed text-muted-foreground">
                  <span className="font-medium text-foreground">Evidence: </span>
                  {constraint.evidence}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section aria-label="Rack dependencies">
        <h4 className="text-[12px] font-semibold uppercase tracking-wide text-muted-foreground">Dependencies</h4>
        <dl className="mt-1.5">
          {detail.dependencies.map((field) => (
            <Field key={field.label} {...field} />
          ))}
        </dl>
      </section>

      <div className="flex flex-wrap gap-2 pt-1">
        <Button asChild size="sm" className="h-9 text-[13px] font-semibold max-sm:h-11" data-testid="rack-open-blueprint">
          <Link to={`${blueprintHref}?tab=model&rack=${rackParam}`}>
            <ArrowUpRight className="mr-1.5 h-4 w-4" strokeWidth={1.75} aria-hidden />
            Open in Blueprint
          </Link>
        </Button>
        <Button asChild size="sm" variant="outline" className="h-9 text-[13px] max-sm:h-11">
          <Link to={`/dsx/evidence-beta/evidence?rack=${rackParam}`}>
            <FileSearch className="mr-1.5 h-4 w-4" strokeWidth={1.75} aria-hidden />
            View Evidence
          </Link>
        </Button>
        <Button asChild size="sm" variant="outline" className="h-9 text-[13px] max-sm:h-11">
          <Link to={`/simulation?twin=${encodeURIComponent(facilityId || 'default')}&rack=${rackParam}`}>
            <Play className="mr-1.5 h-4 w-4" strokeWidth={1.75} aria-hidden />
            Run simulation
          </Link>
        </Button>
        <Button
          size="sm"
          variant="outline"
          className="h-9 text-[13px] max-sm:h-11"
          onClick={() => {
            const url = `${window.location.origin}/dashboard?rack=${rackParam}`;
            void navigator.clipboard?.writeText(url).then(
              () => toast.success('Rack link copied'),
              () => toast.error('Could not copy rack link'),
            );
          }}
        >
          <Copy className="mr-1.5 h-4 w-4" strokeWidth={1.75} aria-hidden />
          Copy rack link
        </Button>
      </div>
    </div>
  );
}

interface Props extends BodyProps {
  open: boolean;
  onClose: () => void;
  /** 'inline' renders the desktop drawer; 'overlay' renders a sheet. */
  presentation: 'inline' | 'tablet' | 'mobile';
  title: string;
  subtitle: string;
}

export function RackQuickView({ open, onClose, presentation, title, subtitle, ...body }: Props) {
  const inlineRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (open && presentation === 'inline') inlineRef.current?.focus();
  }, [open, presentation, title]);

  if (!open) return null;

  if (presentation === 'inline') {
    return (
      <aside
        ref={inlineRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="false"
        aria-label={`Rack quick view: ${title}`}
        data-testid="rack-quick-view-inline"
        className="flex w-[380px] shrink-0 animate-in slide-in-from-right-4 flex-col overflow-hidden border-l border-border bg-card outline-none duration-200 motion-reduce:animate-none xl:w-[420px]"
      >
        <div className="flex items-start justify-between gap-3 border-b border-border p-4">
          <div className="min-w-0">
            <h3 className="break-words text-[16px] font-semibold leading-tight text-foreground">{title}</h3>
            <p className="mt-0.5 break-words text-[13px] text-muted-foreground">{subtitle}</p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="h-9 w-9 shrink-0 p-0"
            aria-label="Close rack quick view"
            onClick={onClose}
          >
            <X className="h-[18px] w-[18px]" strokeWidth={1.75} aria-hidden />
          </Button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto">
          <RackQuickViewBody {...body} />
        </div>
      </aside>
    );
  }

  const isMobile = presentation === 'mobile';
  return (
    <Sheet open onOpenChange={(next) => !next && onClose()}>
      <SheetContent
        side={isMobile ? 'bottom' : 'right'}
        data-testid={isMobile ? 'rack-quick-view-mobile' : 'rack-quick-view-tablet'}
        className={cn(
          'flex flex-col gap-0 p-0',
          isMobile ? 'h-[92dvh] rounded-t-xl' : 'w-[min(440px,92vw)] sm:max-w-none',
        )}
      >
        <SheetHeader className="space-y-1 border-b border-border p-4 text-left">
          <SheetTitle className="text-[16px] leading-tight">{title}</SheetTitle>
          <SheetDescription className="text-[13px]">{subtitle}</SheetDescription>
        </SheetHeader>
        <div className="min-h-0 flex-1 overflow-y-auto pb-[env(safe-area-inset-bottom)]">
          <RackQuickViewBody {...body} />
        </div>
      </SheetContent>
    </Sheet>
  );
}
