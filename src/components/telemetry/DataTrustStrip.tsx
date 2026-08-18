/**
 * DataTrustStrip
 *
 * Operationalises the four ISO 8000-8 data-quality dimensions
 * (completeness, currency, consistency, accuracy) as a strip of pills:
 *   - Last refreshed (currency)
 *   - Sensor coverage (completeness)
 *   - Source health (consistency of upstream sources)
 *   - Quality flags (accuracy rollup: good / suspect / stale / missing)
 *
 * For a digital twin, users need to trust the data before trusting the
 * insight. If sensor coverage is low, the dashboard must not make a zone
 * look normal -- it should show that the state is unreliable.
 *
 * Truth rule: this strip must never invent coverage or quality counts. When no
 * ops-health source is bound, callers pass `state={null}` and the strip renders
 * an explicit "not bound" state instead of plausible-looking numbers.
 */

import { Card } from '@/components/ui/card';
import { Activity, Database, RefreshCw, ShieldCheck, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface DataTrustState {
  lastRefreshed: Date;
  /** sensors reporting / total expected sensors */
  sensorCoverage: { reporting: number; total: number };
  /** upstream sources OK / total */
  sourceHealth: { ok: number; total: number; sources: string[] };
  /** quality flag rollup */
  qualityFlags: { good: number; suspect: number; stale: number; missing: number };
}

interface DataTrustStripProps {
  /** Null when no ops-health source is bound to this view. */
  state: DataTrustState | null;
  compact?: boolean;
}

function pct(n: number, d: number) {
  if (d <= 0) return 0;
  return Math.round((n / d) * 100);
}

function relativeTime(d: Date): string {
  const seconds = Math.floor((Date.now() - d.getTime()) / 1000);
  if (seconds < 60) return `${seconds}s ago`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)} min ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)} h ago`;
  return `${Math.floor(seconds / 86400)} d ago`;
}

function statusColor(coveragePct: number): string {
  if (coveragePct >= 90) return 'text-emerald-600 dark:text-emerald-400';
  if (coveragePct >= 75) return 'text-amber-600 dark:text-amber-400';
  return 'text-red-600 dark:text-red-400';
}

export function DataTrustStrip({ state, compact = false }: DataTrustStripProps) {
  if (!state) {
    return (
      <Card
        className={cn('border-border bg-card', compact ? 'p-3' : 'p-4')}
        role="region"
        aria-label="Data trust indicators"
      >
        <div className="flex items-start gap-2">
          <AlertTriangle className="h-4 w-4 text-amber-500 mt-0.5 flex-shrink-0" aria-hidden="true" />
          <div className="min-w-0">
            <div className="text-sm font-semibold text-foreground">
              Data trust metrics not available
            </div>
            <p className="text-xs text-muted-foreground">
              No ops-health source is bound to this view, so sensor coverage,
              source health and quality flags cannot be reported. Connect a
              telemetry source under Connections and Data Exchange to populate them.
            </p>
          </div>
        </div>
      </Card>
    );
  }

  const coveragePct = pct(state.sensorCoverage.reporting, state.sensorCoverage.total);
  const sourcePct = pct(state.sourceHealth.ok, state.sourceHealth.total);
  const totalReadings =
    state.qualityFlags.good +
    state.qualityFlags.suspect +
    state.qualityFlags.stale +
    state.qualityFlags.missing;
  const goodPct = pct(state.qualityFlags.good, totalReadings);

  return (
    <Card
      className={cn(
        'border-border bg-card',
        compact ? 'p-3' : 'p-4'
      )}
      role="region"
      aria-label="Data trust indicators"
    >
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Last refreshed */}
        <div className="flex items-start gap-2">
          <RefreshCw className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
          <div className="min-w-0">
            <div className="text-[11px] text-muted-foreground">Last refreshed</div>
            <div
              className="text-sm font-semibold text-foreground"
              title={state.lastRefreshed.toLocaleString()}
            >
              {relativeTime(state.lastRefreshed)}
            </div>
          </div>
        </div>

        {/* Sensor coverage */}
        <div className="flex items-start gap-2">
          <Activity className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
          <div className="min-w-0">
            <div className="text-[11px] text-muted-foreground">Sensor coverage</div>
            <div className={cn('text-sm font-semibold', statusColor(coveragePct))}>
              {coveragePct}%{' '}
              <span className="text-[11px] font-normal text-muted-foreground">
                ({state.sensorCoverage.reporting}/{state.sensorCoverage.total})
              </span>
            </div>
          </div>
        </div>

        {/* Source health */}
        <div className="flex items-start gap-2">
          <Database className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
          <div className="min-w-0">
            <div className="text-[11px] text-muted-foreground">Source health</div>
            <div
              className={cn('text-sm font-semibold', statusColor(sourcePct))}
              title={state.sourceHealth.sources.join(', ')}
            >
              {state.sourceHealth.ok}/{state.sourceHealth.total} OK
            </div>
          </div>
        </div>

        {/* Quality flags */}
        <div className="flex items-start gap-2">
          {goodPct >= 90 ? (
            <ShieldCheck className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
          ) : (
            <AlertTriangle className="h-4 w-4 text-amber-500 mt-0.5 flex-shrink-0" />
          )}
          <div className="min-w-0">
            <div className="text-[11px] text-muted-foreground">Quality flags</div>
            <div className="text-sm font-semibold text-foreground flex flex-wrap items-center gap-x-2">
              <span className="text-emerald-600 dark:text-emerald-400">
                {state.qualityFlags.good} good
              </span>
              {state.qualityFlags.suspect > 0 && (
                <span className="text-amber-600 dark:text-amber-400">
                  {state.qualityFlags.suspect} suspect
                </span>
              )}
              {state.qualityFlags.stale > 0 && (
                <span className="text-orange-600 dark:text-orange-400">
                  {state.qualityFlags.stale} stale
                </span>
              )}
              {state.qualityFlags.missing > 0 && (
                <span className="text-red-600 dark:text-red-400">
                  {state.qualityFlags.missing} missing
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
}