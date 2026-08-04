/**
 * Persistent mode banner. Every Evidence Beta workspace renders this so a
 * simulated or replayed reading can never be mistaken for live data.
 */
import { AlertTriangle, Database, RadioTower, WifiOff } from 'lucide-react';
import { cn } from '@/lib/utils';
import { modeLabel, UNCALIBRATED_NOTICE, type DataMode, type FreshnessState } from '@/dsx/modes';

interface Props {
  mode: DataMode;
  freshness: FreshnessState;
  lastObservedAt: string | null;
  runId: string | null;
  className?: string;
}

const ICONS: Record<DataMode, typeof Database> = {
  SIMULATED: Database,
  REPLAYED: Database,
  LIVE: RadioTower,
  UNAVAILABLE: WifiOff,
};

export function DsxModeBanner({ mode, freshness, lastObservedAt, runId, className }: Props) {
  const Icon = ICONS[mode];
  return (
    <div
      role="status"
      aria-live="polite"
      data-testid="dsx-mode-banner"
      data-mode={mode}
      className={cn(
        'flex flex-wrap items-center gap-x-4 gap-y-1 rounded-md border border-border bg-muted/60 px-4 py-2 text-xs',
        className,
      )}
    >
      <span className="flex items-center gap-2 font-semibold uppercase tracking-wider text-foreground">
        <Icon className="h-4 w-4" aria-hidden />
        {modeLabel(mode)} data
      </span>
      <span className="flex items-center gap-1 text-muted-foreground">
        <AlertTriangle className="h-3.5 w-3.5" aria-hidden />
        {UNCALIBRATED_NOTICE}
      </span>
      <span className="text-muted-foreground">Freshness: {freshness}</span>
      <span className="text-muted-foreground">
        Last observation: {lastObservedAt ?? 'none'}
      </span>
      <span className="truncate text-muted-foreground">Run: {runId ?? 'not applicable'}</span>
    </div>
  );
}