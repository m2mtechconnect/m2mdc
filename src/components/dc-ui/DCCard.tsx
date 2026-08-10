/**
 * Data Centre Card Component
 * NOC-style card with status indicator and header
 */

import { ReactNode } from 'react';
import { cn } from '@/lib/utils';

export type CardStatus = 'operational' | 'warning' | 'critical' | 'info' | 'neutral' | 'normal';

interface DCCardProps {
  children: ReactNode;
  title?: string;
  subtitle?: string;
  icon?: ReactNode;
  status?: CardStatus;
  showStatusDot?: boolean;
  elevated?: boolean;
  noPadding?: boolean;
  headerAction?: ReactNode;
  footer?: ReactNode;
  onClick?: () => void;
  className?: string;
}

export function DCCard({
  children,
  title,
  subtitle,
  icon,
  status = 'neutral',
  showStatusDot = false,
  elevated = false,
  noPadding = false,
  headerAction,
  footer,
  onClick,
  className,
}: DCCardProps) {
  // Map 'normal' to 'operational'
  const normalizedStatus = status === 'normal' ? 'operational' : status;
  
  const statusColors = {
    operational: 'border-l-success',
    warning: 'border-l-warning',
    critical: 'border-l-destructive',
    info: 'border-l-info',
    neutral: 'border-l-transparent',
  };

  const dotColors = {
    operational: 'bg-success',
    warning: 'bg-warning',
    critical: 'bg-destructive animate-pulse',
    info: 'bg-info',
    neutral: 'bg-muted-foreground',
  };

  const iconColors = {
    operational: 'text-success',
    warning: 'text-warning',
    critical: 'text-destructive',
    info: 'text-info',
    neutral: 'text-muted-foreground',
  };

  return (
    <div
      onClick={onClick}
      className={cn(
        'rounded-lg border bg-card transition-all',
        elevated ? 'shadow-elevated' : 'shadow-card',
        normalizedStatus !== 'neutral' && `border-l-4 ${statusColors[normalizedStatus]}`,
        onClick && 'cursor-pointer hover:border-primary/50',
        className
      )}
    >
      {/* Header */}
      {(title || headerAction) && (
        <div className={cn('flex items-center justify-between gap-3', noPadding ? 'p-4 pb-0' : 'p-4 border-b border-border')}>
          <div className="flex items-center gap-3 min-w-0">
            {showStatusDot && (
              <span className={cn('h-2 w-2 rounded-full flex-shrink-0', dotColors[normalizedStatus])} />
            )}
            {icon && (
              <div className={cn('flex-shrink-0', iconColors[normalizedStatus])}>
                {icon}
              </div>
            )}
            <div className="min-w-0">
              {title && (
                <h3 className="text-sm font-semibold truncate">{title}</h3>
              )}
              {subtitle && (
                <p className="text-xs text-muted-foreground truncate">{subtitle}</p>
              )}
            </div>
          </div>
          {headerAction && (
            <div className="flex-shrink-0">{headerAction}</div>
          )}
        </div>
      )}

      {/* Content */}
      <div className={cn(noPadding ? '' : 'p-4', !title && !headerAction && noPadding ? '' : '')}>{children}</div>

      {/* Footer */}
      {footer && (
        <div className="px-4 py-3 border-t border-border bg-muted/50">
          {footer}
        </div>
      )}
    </div>
  );
}

// Section header component
interface DCSectionHeaderProps {
  title: string;
  subtitle?: string;
  icon?: ReactNode;
  action?: ReactNode;
  metrics?: Array<{ label: string; value: string | number }>;
  className?: string;
  /**
   * Heading level rendered for the title. Pages that use this component as
   * their page title pass "h1" so every route exposes exactly one H1.
   */
  as?: 'h1' | 'h2' | 'h3';
}

export function DCSectionHeader({
  title,
  subtitle,
  icon,
  action,
  metrics,
  className,
  as: Heading = 'h2',
}: DCSectionHeaderProps) {
  return (
    <div className={cn('flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6', className)}>
      <div className="flex items-center gap-3">
        {icon && (
          <div className="p-2 rounded-lg bg-accent/10" aria-hidden="true">
            {icon}
          </div>
        )}
        <div>
          <Heading className="text-lg font-semibold">{title}</Heading>
          {subtitle && (
            <p className="text-sm text-muted-foreground">{subtitle}</p>
          )}
        </div>
      </div>
      
      <div className="flex items-center gap-4">
        {metrics && metrics.length > 0 && (
          <div className="flex items-center gap-4 text-sm">
            {metrics.map((metric, index) => (
              <div key={index} className="flex items-center gap-2">
                <span className="text-muted-foreground">{metric.label}:</span>
                <span className="font-semibold font-mono">{metric.value}</span>
              </div>
            ))}
          </div>
        )}
        {action}
      </div>
    </div>
  );
}

export default DCCard;
