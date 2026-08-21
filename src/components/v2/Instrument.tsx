/**
 * AURA Visual System V2 — KPI / instrument primitive.
 * Three hierarchy levels: primary, secondary, compact.
 */
import * as React from 'react';
import { cn } from '@/lib/utils';

export type InstrumentLevel = 'primary' | 'secondary' | 'compact';
export type InstrumentState = 'verified' | 'simulated' | 'info' | 'critical' | 'neutral';

const VALUE_CLASS: Record<InstrumentLevel, string> = {
  primary: 'v2-metric v2-metric-primary',
  secondary: 'v2-metric v2-metric-secondary',
  compact: 'v2-metric v2-metric-compact',
};

const STATE_TEXT: Record<InstrumentState, string> = {
  verified: 'v2-text-verified',
  simulated: 'v2-text-simulated',
  info: 'v2-text-info',
  critical: 'v2-text-critical',
  neutral: 'v2-text-neutral',
};

export interface InstrumentProps extends React.HTMLAttributes<HTMLDivElement> {
  label: string;
  value: React.ReactNode;
  unit?: string;
  level?: InstrumentLevel;
  state?: InstrumentState;
  /** Secondary context line (delta, target, source). */
  detail?: React.ReactNode;
  /** Trailing slot for a provenance badge or action. */
  trailing?: React.ReactNode;
}

export const Instrument = React.forwardRef<HTMLDivElement, InstrumentProps>(
  ({ label, value, unit, level = 'secondary', state = 'neutral', detail, trailing, className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        'flex min-w-0 flex-col gap-1',
        level === 'compact' ? 'v2-subpanel' : 'v2-panel p-4',
        className,
      )}
      {...props}
    >
      <div className="flex items-start justify-between gap-2">
        <span className="v2-label truncate">{label}</span>
        {trailing}
      </div>
      <div className="flex items-baseline gap-1.5">
        <span className={cn(VALUE_CLASS[level], state !== 'neutral' && STATE_TEXT[state])}>{value}</span>
        {unit ? <span className="v2-mono text-xs text-muted-foreground">{unit}</span> : null}
      </div>
      {detail ? <p className="text-xs text-muted-foreground">{detail}</p> : null}
    </div>
  ),
);
Instrument.displayName = 'Instrument';

/** Responsive grid container for instrument clusters. */
export function InstrumentGrid({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('v2-instrument-grid', className)} {...props} />;
}
