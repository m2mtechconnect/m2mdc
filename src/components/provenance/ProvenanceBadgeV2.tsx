/**
 * AURA Visual System V2 — provenance / truth-state badge styling.
 * Purely visual: truth semantics (LIVE / SIMULATED / DEMO / NOT ASSESSED)
 * are supplied by callers and are not derived or altered here.
 */
import * as React from 'react';
import { cn } from '@/lib/utils';

export type TruthState = 'live' | 'simulated' | 'demo' | 'not-assessed' | 'critical';

const BADGE_CLASS: Record<TruthState, string> = {
  live: 'v2-badge v2-badge-live',
  simulated: 'v2-badge v2-badge-simulated',
  demo: 'v2-badge v2-badge-demo',
  'not-assessed': 'v2-badge v2-badge-not-assessed',
  critical: 'v2-badge v2-badge-critical',
};

const DEFAULT_LABEL: Record<TruthState, string> = {
  live: 'Live',
  simulated: 'Simulated',
  demo: 'Demo',
  'not-assessed': 'Not assessed',
  critical: 'Blocked',
};

export interface ProvenanceBadgeV2Props extends React.HTMLAttributes<HTMLSpanElement> {
  state: TruthState;
  label?: string;
  showDot?: boolean;
}

export function ProvenanceBadgeV2({
  state,
  label,
  showDot = true,
  className,
  ...props
}: ProvenanceBadgeV2Props) {
  const text = label ?? DEFAULT_LABEL[state];
  return (
    <span className={cn(BADGE_CLASS[state], className)} data-truth-state={state} {...props}>
      {showDot ? <span className="v2-dot" aria-hidden="true" /> : null}
      {text}
    </span>
  );
}
