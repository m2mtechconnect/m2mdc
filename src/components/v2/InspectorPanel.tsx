/**
 * AURA Visual System V2 — contextual inspector / drawer styling.
 * Rendering is inline (non-portal) so existing focus and keyboard
 * behaviour of host pages is unchanged.
 */
import * as React from 'react';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface InspectorPanelProps extends React.HTMLAttributes<HTMLElement> {
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  meta?: React.ReactNode;
  onClose?: () => void;
  footer?: React.ReactNode;
}

export function InspectorPanel({
  title,
  subtitle,
  meta,
  onClose,
  footer,
  children,
  className,
  ...props
}: InspectorPanelProps) {
  return (
    <aside
      className={cn('v2-inspector flex h-full min-h-0 w-full flex-col', className)}
      aria-label={typeof title === 'string' ? title : 'Inspector'}
      {...props}
    >
      <header className="flex items-start justify-between gap-3 border-b border-[hsl(var(--v2-line))] px-4 py-3">
        <div className="min-w-0 space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="truncate text-sm font-semibold text-foreground">{title}</h2>
            {meta}
          </div>
          {subtitle ? <p className="text-xs text-muted-foreground">{subtitle}</p> : null}
        </div>
        {onClose ? (
          <button
            type="button"
            onClick={onClose}
            aria-label="Close inspector"
            className="rounded-md p-1.5 text-muted-foreground hover:bg-[hsl(var(--v2-panel-elevated))] hover:text-foreground focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[hsl(var(--ring))]"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        ) : null}
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3">{children}</div>

      {footer ? (
        <footer className="border-t border-[hsl(var(--v2-line))] px-4 py-3">{footer}</footer>
      ) : null}
    </aside>
  );
}

/** Label/value row used inside inspectors for provenance details. */
export function InspectorField({
  label,
  value,
  mono = false,
}: {
  label: string;
  value: React.ReactNode;
  mono?: boolean;
}) {
  return (
    <div className="flex items-start justify-between gap-3 py-1.5">
      <span className="v2-label">{label}</span>
      <span className={cn('text-right text-xs text-foreground', mono && 'v2-mono')}>{value}</span>
    </div>
  );
}
