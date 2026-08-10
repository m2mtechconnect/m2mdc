/**
 * Stage 7D - compact status snapshot.
 *
 * Replaces the four narrow rail cards (operating state, integration readiness,
 * evidence coverage, assistant) with a single five-row summary. Each row links
 * to the exact destination that owns the detail.
 */
import { Link } from 'react-router-dom';
import { ArrowRight, ChevronRight, Gauge } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

export interface SnapshotRow {
  label: string;
  value: string;
  tone: 'critical' | 'neutral';
  to: string;
}

export function buildSnapshotRows(evidenceNeedingReview: number): SnapshotRow[] {
  return [
    { label: 'Operating mode', value: 'Simulated', tone: 'neutral', to: '/integrations' },
    { label: 'Live telemetry', value: 'Not connected', tone: 'neutral', to: '/integrations' },
    { label: 'NVIDIA runtime', value: 'Not available', tone: 'neutral', to: '/settings/integrations/nvidia-dsx' },
    {
      label: 'Evidence requiring review',
      value: String(evidenceNeedingReview),
      tone: evidenceNeedingReview > 0 ? 'critical' : 'neutral',
      to: '/dsx/evidence-beta',
    },
    { label: 'Production readiness', value: 'No-Go', tone: 'critical', to: '/settings/integrations/nvidia-dsx' },
  ];
}

export function StatusSnapshot({ rows, evidenceHref }: { rows: SnapshotRow[]; evidenceHref: string }) {
  return (
    <section
      aria-labelledby="status-snapshot-heading"
      data-testid="status-snapshot"
      className="min-w-0 overflow-hidden rounded-lg border border-border bg-card"
    >
      <div className="flex min-h-[42px] min-w-0 items-center gap-2.5 border-b border-border px-4 py-2.5">
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-muted" aria-hidden>
          <Gauge className="h-[18px] w-[18px] text-muted-foreground" strokeWidth={1.75} />
        </span>
        <h2 id="status-snapshot-heading" className="min-w-0 text-[15px] font-semibold leading-tight text-foreground">
          Status snapshot
        </h2>
      </div>

      <ul className="min-w-0 divide-y divide-border">
        {rows.map((row) => (
          <li key={row.label} className="min-w-0">
            <Link
              to={row.to}
              data-testid={`snapshot-row-${row.label.toLowerCase().replace(/\s+/g, '-')}`}
              className="flex min-h-[42px] min-w-0 items-center justify-between gap-3 px-4 py-1.5 text-[13px] transition-colors hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
            >
              <span className="min-w-0 break-words text-muted-foreground">{row.label}</span>
              <span className="flex shrink-0 items-center gap-1">
                <span className={cn('font-medium tabular-nums', row.tone === 'critical' ? 'text-destructive' : 'text-foreground')}>
                  {row.value}
                </span>
                <ChevronRight className="h-4 w-4 text-muted-foreground" strokeWidth={1.75} aria-hidden />
              </span>
            </Link>
          </li>
        ))}
      </ul>

      <div className="hidden flex-wrap gap-2 border-t border-border p-3 sm:flex">
        <Button asChild variant="outline" size="sm" className="h-9 flex-1 text-[13px] max-sm:h-11">
          <Link to="/integrations">View Integrations</Link>
        </Button>
        <Button asChild variant="outline" size="sm" className="h-9 flex-1 text-[13px] max-sm:h-11">
          <Link to={evidenceHref}>
            Review Evidence
            <ArrowRight className="ml-1.5 h-4 w-4" strokeWidth={1.75} aria-hidden />
          </Link>
        </Button>
      </div>
    </section>
  );
}
