/**
 * Truthful empty / unavailable state. Never renders a placeholder metric; it
 * states plainly why nothing is shown and what the operator can do next.
 */
import * as React from 'react';
import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface WorkspaceEmptyStateProps {
  icon?: LucideIcon;
  title: React.ReactNode;
  description?: React.ReactNode;
  /** Truth label such as NOT MEASURED / UNAVAILABLE. */
  status?: string;
  action?: React.ReactNode;
  className?: string;
}

export function WorkspaceEmptyState({
  icon: Icon,
  title,
  description,
  status,
  action,
  className,
}: WorkspaceEmptyStateProps) {
  return (
    <div className={cn('aura-ws-empty', className)} data-testid="workspace-empty-state" role="status">
      {Icon ? <Icon className="h-6 w-6 text-muted-foreground" strokeWidth={1.5} aria-hidden="true" /> : null}
      <p className="text-[15px] font-semibold text-foreground">{title}</p>
      {status ? (
        <span className="aura-ws-chip" data-variant="qualifier">
          {status}
        </span>
      ) : null}
      {description ? (
        <p className="max-w-prose text-[13px] leading-relaxed text-muted-foreground">{description}</p>
      ) : null}
      {action ? <div className="pt-1">{action}</div> : null}
    </div>
  );
}

export default WorkspaceEmptyState;
