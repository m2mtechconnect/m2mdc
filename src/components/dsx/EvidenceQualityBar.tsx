/**
 * Evidence-quality stacked bar: accepted versus quarantined observations in
 * the current window. Counts come from the ingestion snapshot, so a rejected
 * record is always visible rather than silently dropped.
 */
import { cn } from '@/lib/utils';

export function EvidenceQualityBar({
  accepted,
  rejected,
  className,
  compact = false,
}: {
  accepted: number;
  rejected: number;
  className?: string;
  /** Inline meter for the truth bar; the full bar keeps its own heading. */
  compact?: boolean;
}) {
  const total = accepted + rejected;
  const acceptedPct = total === 0 ? 0 : (accepted / total) * 100;

  if (compact) {
    return (
      <span className={cn('flex min-w-[7rem] shrink-0 flex-col gap-0.5', className)} data-testid="dsx-evidence-quality">
        <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Evidence quality</span>
        <span
          role="img"
          aria-label={
            total === 0
              ? 'No observation was ingested in this window.'
              : `${accepted} accepted and ${rejected} quarantined observation(s) in this window.`
          }
          className="flex h-1.5 w-full overflow-hidden rounded-sm border border-border bg-muted"
        >
          <span style={{ width: `${acceptedPct}%` }} className="bg-emerald-500/70" />
          <span style={{ width: `${100 - acceptedPct}%` }} className="bg-amber-500/70" />
        </span>
        <span className="text-[11px] tabular-nums text-muted-foreground">
          {accepted} accepted · {rejected} quarantined
        </span>
      </span>
    );
  }

  return (
    <div className={cn('space-y-1.5', className)} data-testid="dsx-evidence-quality">
      <div className="flex items-baseline justify-between gap-2 text-[12px]">
        <span className="uppercase tracking-wide text-muted-foreground">Evidence quality</span>
        <span className="tabular-nums">
          {total === 0 ? 'No observation in this window' : `${acceptedPct.toFixed(1)}% accepted`}
        </span>
      </div>
      <div
        role="img"
        aria-label={
          total === 0
            ? 'No observation was ingested in this window.'
            : `${accepted} accepted and ${rejected} quarantined observation(s) in this window.`
        }
        className="flex h-2.5 w-full overflow-hidden rounded-sm border border-border bg-muted"
      >
        <span style={{ width: `${acceptedPct}%` }} className="bg-emerald-500/70" />
        <span style={{ width: `${100 - acceptedPct}%` }} className="bg-amber-500/70" />
      </div>
      <p className="text-[12px] text-muted-foreground tabular-nums">
        {accepted} accepted · {rejected} quarantined
      </p>
    </div>
  );
}