/**
 * AURA Visual System V2 — empty / loading / error / blocked state language.
 */
import * as React from 'react';
import { AlertTriangle, Ban, Inbox, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

export type StateKind = 'empty' | 'loading' | 'error' | 'blocked';

const KIND_CLASS: Record<StateKind, string> = {
  empty: '',
  loading: '',
  error: 'v2-state-error',
  blocked: 'v2-state-blocked',
};

const KIND_ICON: Record<StateKind, React.ComponentType<{ className?: string }>> = {
  empty: Inbox,
  loading: Loader2,
  error: AlertTriangle,
  blocked: Ban,
};

export interface StateViewProps extends React.HTMLAttributes<HTMLDivElement> {
  kind: StateKind;
  title: string;
  description?: React.ReactNode;
  action?: React.ReactNode;
}

export function StateView({
  kind,
  title,
  description,
  action,
  className,
  ...props
}: StateViewProps) {
  const Icon = KIND_ICON[kind];
  return (
    <div
      className={cn('v2-state', KIND_CLASS[kind], className)}
      role={kind === 'error' ? 'alert' : 'status'}
      aria-live={kind === 'loading' ? 'polite' : undefined}
      data-state-kind={kind}
      {...props}
    >
      <Icon
        className={cn(
          'h-5 w-5',
          kind === 'loading' && 'animate-spin',
          kind === 'error' && 'v2-text-critical',
          kind === 'blocked' && 'v2-text-simulated',
        )}
        aria-hidden="true"
      />
      <p className="text-sm font-medium text-foreground">{title}</p>
      {description ? <p className="max-w-md text-xs text-muted-foreground">{description}</p> : null}
      {action ? <div className="pt-1">{action}</div> : null}
    </div>
  );
}

/** Shimmering skeleton block for loading placeholders. */
export function SkeletonBlock({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('v2-skeleton h-4 w-full', className)} aria-hidden="true" {...props} />;
}
