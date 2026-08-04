/**
 * Shared state primitives: data mode, calibration, freshness, connection,
 * unavailable and planned. Colour is never the only carrier of meaning —
 * every badge also carries text.
 */
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { modeLabel, type DataMode, type FreshnessState } from '@/dsx/modes';
import type { CalibrationStatus, MetricValidation } from '@/dsx/contracts/provenancedMetric';
import type { DsxConnectionState } from '@/dsx/contract';
import { AlertTriangle, CircleSlash, Clock, Info } from 'lucide-react';
import type { ReactNode } from 'react';
import type { Capability } from '@/dsx/workspaces/availability';

const MODE_CLASS: Record<DataMode, string> = {
  SIMULATED: 'border-violet-500/50 bg-violet-500/10 text-violet-200',
  REPLAYED: 'border-violet-500/50 bg-violet-500/10 text-violet-200',
  LIVE: 'border-cyan-500/50 bg-cyan-500/10 text-cyan-200',
  UNAVAILABLE: 'border-zinc-500/50 bg-zinc-500/10 text-zinc-300',
};

export function DataModeBadge({ mode, className }: { mode: DataMode; className?: string }) {
  return (
    <Badge
      variant="outline"
      data-testid="dsx-data-mode"
      data-mode={mode}
      className={cn('text-[11px] font-medium', MODE_CLASS[mode], className)}
    >
      {modeLabel(mode)}
    </Badge>
  );
}

export function CalibrationBadge({ calibration }: { calibration: CalibrationStatus }) {
  const label =
    calibration === 'field_calibrated' ? 'Field calibrated'
      : calibration === 'not_applicable' ? 'Calibration not applicable'
        : 'Uncalibrated';
  return (
    <Badge
      variant="outline"
      data-testid="dsx-calibration"
      data-calibration={calibration}
      className={cn('text-[11px]', calibration === 'uncalibrated' && 'border-amber-500/50 bg-amber-500/10 text-amber-200')}
    >
      {label}
    </Badge>
  );
}

const FRESHNESS_CLASS: Record<FreshnessState, string> = {
  fresh: 'border-emerald-500/50 bg-emerald-500/10 text-emerald-200',
  delayed: 'border-amber-500/50 bg-amber-500/10 text-amber-200',
  stale: 'border-red-500/50 bg-red-500/10 text-red-200',
  unknown: 'border-zinc-500/50 bg-zinc-500/10 text-zinc-300',
};

const FRESHNESS_LABEL: Record<FreshnessState, string> = {
  fresh: 'Fresh',
  delayed: 'Delayed',
  stale: 'Stale',
  unknown: 'Freshness unknown',
};

export function FreshnessIndicator({ freshness, className }: { freshness: FreshnessState; className?: string }) {
  return (
    <Badge
      variant="outline"
      data-testid="dsx-freshness"
      data-freshness={freshness}
      className={cn('gap-1 text-[11px]', FRESHNESS_CLASS[freshness], className)}
    >
      <Clock className="h-3 w-3" aria-hidden />
      {FRESHNESS_LABEL[freshness]}
    </Badge>
  );
}

export function ValidationBadge({ validation }: { validation: MetricValidation }) {
  const label =
    validation === 'validated' ? 'Validated'
      : validation === 'requires_review' ? 'Requires review'
        : validation === 'invalid' ? 'Invalid'
          : 'Unavailable';
  return (
    <Badge
      variant="outline"
      data-testid="dsx-validation"
      data-validation={validation}
      className={cn(
        'text-[11px]',
        validation === 'requires_review' && 'border-amber-500/50 bg-amber-500/10 text-amber-200',
        validation === 'invalid' && 'border-red-500/50 bg-red-500/10 text-red-200',
      )}
    >
      {label}
    </Badge>
  );
}

/**
 * Connection health is deliberately a separate concept from data freshness:
 * a connected source can still be stale, and a fresh replay can have no
 * connection at all.
 */
export function ConnectionState({ state, label }: { state: DsxConnectionState | 'unavailable'; label?: string }) {
  const ok = state === 'connected';
  return (
    <Badge
      variant="outline"
      data-testid="dsx-connection-state"
      data-connection={state}
      className={cn(
        'text-[11px]',
        ok ? 'border-emerald-500/50 bg-emerald-500/10 text-emerald-200'
          : 'border-zinc-500/50 bg-zinc-500/10 text-zinc-300',
      )}
    >
      {label ? `${label}: ` : 'Connection: '}{String(state).replace(/_/g, ' ')}
    </Badge>
  );
}

export function UnavailableState({
  title = 'Unavailable',
  reason,
  missingInputs = [],
  testId = 'dsx-unavailable',
  children,
}: {
  title?: string;
  reason: string;
  missingInputs?: string[];
  testId?: string;
  children?: ReactNode;
}) {
  return (
    <div
      data-testid={testId}
      data-state="unavailable"
      className="flex flex-col gap-2 rounded-md border border-dashed border-zinc-600/60 bg-zinc-500/5 p-4 text-sm"
    >
      <span className="flex items-center gap-2 font-semibold text-zinc-200">
        <CircleSlash className="h-4 w-4" aria-hidden />
        {title}
      </span>
      <p className="text-muted-foreground">{reason}</p>
      {missingInputs.length > 0 && (
        <p className="text-xs text-muted-foreground" data-testid={`${testId}-missing`}>
          Missing: {missingInputs.join(', ')}
        </p>
      )}
      {children}
    </div>
  );
}

export function PlannedState({ title, reason }: { title: string; reason: string }) {
  return (
    <div
      data-testid="dsx-planned"
      data-state="planned"
      className="flex flex-col gap-2 rounded-md border border-dashed border-amber-500/40 bg-amber-500/5 p-4 text-sm"
    >
      <span className="flex items-center gap-2 font-semibold text-amber-200">
        <Info className="h-4 w-4" aria-hidden />
        {title} — Planned
      </span>
      <p className="text-muted-foreground">{reason}</p>
      <p className="text-xs text-muted-foreground">
        A planned capability produces no results. Nothing on this panel is calculated.
      </p>
    </div>
  );
}

export function CapabilityNotice({ capability: c }: { capability: Capability }) {
  if (c.state === 'planned') return <PlannedState title={c.label} reason={c.reason} />;
  if (c.state === 'unavailable') {
    return (
      <UnavailableState
        title={`${c.label} unavailable`}
        reason={c.reason}
        missingInputs={c.missing_inputs}
        testId={`dsx-capability-${c.id}`}
      />
    );
  }
  return null;
}

export function SafetyChip({ className }: { className?: string }) {
  return (
    <span
      data-testid="dsx-safety-status"
      className={cn(
        'inline-flex items-center gap-1.5 rounded-sm border border-amber-500/50 bg-amber-500/10 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wider text-amber-200',
        className,
      )}
    >
      <AlertTriangle className="h-3 w-3" aria-hidden />
      SIMULATED · UNCALIBRATED · NOT FOR PHYSICAL CONTROL
    </span>
  );
}