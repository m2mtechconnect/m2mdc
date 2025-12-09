/**
 * Data Centre Card Component
 * NOC-style card with status indicator and header
 */

import { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { LucideIcon } from 'lucide-react';

export type CardStatus = 'operational' | 'warning' | 'critical' | 'info' | 'neutral';

interface DCCardProps {
  children: ReactNode;
  title?: string;
  subtitle?: string;
  icon?: LucideIcon;
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
  icon: Icon,
  status = 'neutral',
  showStatusDot = false,
  elevated = false,
  noPadding = false,
  headerAction,
  footer,
  onClick,
  className,
}: DCCardProps) {
  const statusColors = {
    operational: 'border-l-dc-green',
    warning: 'border-l-dc-amber',
    critical: 'border-l-dc-red',
    info: 'border-l-dc-blue',
    neutral: 'border-l-transparent',
  };

  const dotColors = {
    operational: 'bg-dc-green shadow-glow-green',
    warning: 'bg-dc-amber shadow-glow-amber',
    critical: 'bg-dc-red shadow-glow-red animate-status-blink',
    info: 'bg-dc-blue shadow-glow-blue',
    neutral: 'bg-muted-foreground',
  };

  const iconColors = {
    operational: 'text-dc-green',
    warning: 'text-dc-amber',
    critical: 'text-dc-red',
    info: 'text-dc-blue',
    neutral: 'text-muted-foreground',
  };

  return (
    <div
      onClick={onClick}
      className={cn(
        'rounded-lg border transition-all',
        elevated ? 'noc-card-elevated' : 'noc-card',
        status !== 'neutral' && `border-l-4 ${statusColors[status]}`,
        onClick && 'cursor-pointer hover:border-primary/50',
        className
      )}
    >
      {/* Header */}
      {(title || headerAction) && (
        <div className={cn('flex items-center justify-between gap-3', noPadding ? 'p-4 pb-0' : 'p-4 border-b border-border')}>
          <div className="flex items-center gap-3 min-w-0">
            {showStatusDot && (
              <span className={cn('h-2 w-2 rounded-full flex-shrink-0', dotColors[status])} />
            )}
            {Icon && (
              <Icon className={cn('h-5 w-5 flex-shrink-0', iconColors[status])} />
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
        <div className="px-4 py-3 border-t border-border bg-noc-surface/50">
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
  icon?: LucideIcon;
  action?: ReactNode;
  metrics?: Array<{ label: string; value: string | number }>;
  className?: string;
}

export function DCSectionHeader({
  title,
  subtitle,
  icon: Icon,
  action,
  metrics,
  className,
}: DCSectionHeaderProps) {
  return (
    <div className={cn('flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6', className)}>
      <div className="flex items-center gap-3">
        {Icon && (
          <div className="p-2 rounded-lg bg-primary/10">
            <Icon className="h-5 w-5 text-primary" />
          </div>
        )}
        <div>
          <h2 className="text-lg font-semibold">{title}</h2>
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
