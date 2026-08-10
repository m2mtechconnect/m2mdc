/**
 * Action Center row drilldown.
 *
 * Opens the full record behind a row: severity, domain, subsystem, the impact
 * and evidence statements, the timestamp the item was derived from, and one
 * visible primary action. While the record is resolving the drawer shows a
 * skeleton and keeps the primary action disabled; a row with no action renders
 * a disabled button with the reason instead of hiding it.
 */
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { CircleAlert, Info, TriangleAlert } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle,
} from '@/components/ui/sheet';
import { cn } from '@/lib/utils';
import type { AttentionItem, AttentionSeverity } from './attentionQueue';
import { formatObservedAt, loadActionDetail, type ActionDetail } from './actionDetail';

const SEVERITY_STYLE: Record<AttentionSeverity, { Icon: typeof Info; className: string }> = {
  constraint: { Icon: CircleAlert, className: 'border-destructive/40 bg-destructive/10 text-destructive' },
  review: { Icon: TriangleAlert, className: 'border-warning/40 bg-warning/10 text-warning' },
  informational: { Icon: Info, className: 'border-info/40 bg-info/10 text-info' },
};

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid grid-cols-[8.5rem_1fr] gap-3 py-1.5">
      <dt className="text-[12px] font-medium text-muted-foreground">{label}</dt>
      <dd className="break-words text-[13px] leading-relaxed text-foreground">{value}</dd>
    </div>
  );
}

function DetailSkeleton() {
  return (
    <div className="space-y-3" data-testid="action-detail-loading" aria-hidden>
      <Skeleton className="h-5 w-28" />
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-4/5" />
      <Skeleton className="h-4 w-3/5" />
      <Skeleton className="h-20 w-full" />
    </div>
  );
}

export function ActionDetailDrawer({
  item,
  onClose,
  onInspectRacks,
}: {
  item: AttentionItem | null;
  onClose: () => void;
  /** Opens the facility visualisation focused on the racks this item affects. */
  onInspectRacks?: (item: AttentionItem) => void;
}) {
  const [detail, setDetail] = useState<ActionDetail | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!item) {
      setDetail(null);
      setLoading(false);
      return;
    }
    let active = true;
    setLoading(true);
    setDetail(null);
    loadActionDetail(item).then((next) => {
      if (!active) return;
      setDetail(next);
      setLoading(false);
    });
    return () => {
      active = false;
    };
  }, [item]);

  const severity = SEVERITY_STYLE[detail?.severity ?? item?.severity ?? 'informational'];
  const primary = detail?.primaryAction ?? null;

  return (
    <Sheet open={!!item} onOpenChange={(open) => !open && onClose()}>
      <SheetContent
        side="right"
        className="flex w-full flex-col overflow-hidden bg-card sm:max-w-lg"
        data-testid="action-detail-drawer"
        data-item-id={item?.id ?? ''}
        data-state-loading={loading ? 'true' : 'false'}
      >
        <SheetHeader className="pr-8 text-left">
          <SheetTitle className="text-[15px] leading-snug">
            {item?.title ?? 'Action item'}
          </SheetTitle>
          <SheetDescription className="text-[13px]">
            Full record for this Action Center item, derived from the current facility model.
          </SheetDescription>
        </SheetHeader>

        <ScrollArea className="-mr-4 mt-3 min-h-0 flex-1 pr-4">
          {loading || !detail ? (
            <DetailSkeleton />
          ) : (
            <div data-testid="action-detail-content">
              <div className="flex flex-wrap items-center gap-2">
                <Badge
                  variant="outline"
                  className={cn('gap-1.5 text-[11px]', severity.className)}
                  data-testid="action-detail-severity"
                >
                  <severity.Icon className="h-3.5 w-3.5" strokeWidth={1.75} aria-hidden />
                  {detail.severityLabel}
                </Badge>
                <Badge variant="outline" className="text-[11px]" data-testid="action-detail-domain">
                  {detail.domainLabel}
                </Badge>
                <Badge variant="outline" className="text-[11px]">{detail.category}</Badge>
              </div>

              <Separator className="my-3" />
              <h3 className="pb-1 text-[12px] font-semibold uppercase tracking-wider text-muted-foreground">
                Why this is listed
              </h3>
              <p className="text-[13px] leading-relaxed text-muted-foreground">{detail.impact}</p>

              <Separator className="my-3" />
              <dl>
                <Field label="Subsystem" value={detail.subsystem} />
                <Field label="Evidence" value={detail.evidence} />
                <Field label={detail.observedLabel} value={formatObservedAt(detail.observedAt)} />
                <Field label="Item id" value={detail.id} />
              </dl>
              <p className="mt-1 text-[12px] leading-relaxed text-muted-foreground" data-testid="action-detail-basis">
                {detail.basisNote}
              </p>

              {detail.secondaryActions.length > 0 && (
                <>
                  <Separator className="my-3" />
                  <h3 className="pb-1.5 text-[12px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Related surfaces
                  </h3>
                  <ul className="space-y-1.5">
                    {detail.secondaryActions.map((action) => (
                      <li key={action.label}>
                        <Button
                          asChild
                          variant="outline"
                          size="sm"
                          className="h-9 w-full justify-start text-[13px] max-sm:h-11"
                        >
                          <Link to={action.to} onClick={onClose}>{action.label}</Link>
                        </Button>
                      </li>
                    ))}
                  </ul>
                </>
              )}
              {onInspectRacks && item && (
                <>
                  <Separator className="my-3" />
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-9 w-full justify-start text-[13px] max-sm:h-11"
                    data-testid="action-detail-inspect-racks"
                    onClick={() => onInspectRacks(item)}
                  >
                    Inspect affected racks
                  </Button>
                  <p className="mt-1.5 text-[12px] leading-relaxed text-muted-foreground">
                    Scrolls to the facility visualisation, activates the related layer and opens the first
                    affected rack.
                  </p>
                </>
              )}
              <div className="h-4" />
            </div>
          )}
        </ScrollArea>

        <div className="border-t border-border pt-3">
          {primary ? (
            <Button
              asChild
              className="h-10 w-full text-[13px] font-semibold max-sm:h-11"
              data-testid="action-detail-primary"
            >
              <Link to={primary.to} onClick={onClose}>{primary.label}</Link>
            </Button>
          ) : (
            <Button
              className="h-10 w-full text-[13px] font-semibold max-sm:h-11"
              data-testid="action-detail-primary"
              disabled
              title={loading ? 'Loading the record for this item' : 'No action surface is available for this item'}
            >
              {loading ? 'Loading record' : 'No action available'}
            </Button>
          )}
          <p className="mt-2 text-[12px] text-muted-foreground">
            {loading
              ? 'Assembling this record from the current facility model.'
              : primary
                ? 'Opens the surface that explains or resolves this item.'
                : 'This item is informational and has no linked surface.'}
          </p>
        </div>
      </SheetContent>
    </Sheet>
  );
}
