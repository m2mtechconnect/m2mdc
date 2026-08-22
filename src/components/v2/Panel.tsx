/**
 * AURA Visual System V2 — layered surface primitives.
 * Presentation only: no data fetching, no route or auth behaviour.
 */
import * as React from 'react';
import { cn } from '@/lib/utils';

export type PanelElevation = 'flat' | 'panel' | 'elevated' | 'viewport' | 'deep';

const ELEVATION_CLASS: Record<PanelElevation, string> = {
  flat: 'bg-transparent',
  panel: 'v2-panel',
  elevated: 'v2-panel-elevated',
  viewport: 'v2-viewport',
  deep: 'v2-canvas-deep border border-[hsl(var(--v2-line))] rounded-lg',
};

export interface PanelProps extends React.HTMLAttributes<HTMLDivElement> {
  elevation?: PanelElevation;
  padded?: boolean;
}

export const Panel = React.forwardRef<HTMLDivElement, PanelProps>(
  ({ elevation = 'panel', padded = true, className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(ELEVATION_CLASS[elevation], padded && 'p-4', className)}
      {...props}
    />
  ),
);
Panel.displayName = 'Panel';

/** Quiet grouping surface used instead of nested outlined cards. */
export const SubPanel = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn('v2-subpanel', className)} {...props} />
  ),
);
SubPanel.displayName = 'SubPanel';

/** Monospace telemetry rail for provenance / streaming values. */
export const TelemetryRail = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn('v2-telemetry-rail p-3', className)} {...props} />
  ),
);
TelemetryRail.displayName = 'TelemetryRail';
