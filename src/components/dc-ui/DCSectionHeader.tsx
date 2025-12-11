import { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface DCSectionHeaderProps {
  title: string;
  subtitle?: string;
  icon?: ReactNode;
  action?: ReactNode;
  className?: string;
  variant?: 'default' | 'compact' | 'large';
}

export function DCSectionHeader({
  title,
  subtitle,
  icon,
  action,
  className,
  variant = 'default',
}: DCSectionHeaderProps) {
  return (
    <div className={cn(
      'flex items-start justify-between gap-4',
      variant === 'compact' && 'gap-2',
      className
    )}>
      <div className="flex items-start gap-3">
        {icon && (
          <div className={cn(
            'flex items-center justify-center rounded-lg bg-primary/10 border border-primary/30',
            variant === 'compact' ? 'p-1.5' : 'p-2',
            variant === 'large' && 'p-3'
          )}>
            {icon}
          </div>
        )}
        <div>
          <h3 className={cn(
            'font-semibold text-foreground',
            variant === 'compact' && 'text-sm',
            variant === 'default' && 'text-base',
            variant === 'large' && 'text-lg'
          )}>
            {title}
          </h3>
          {subtitle && (
            <p className={cn(
              'text-muted-foreground',
              variant === 'compact' ? 'text-xs' : 'text-sm',
              'mt-0.5'
            )}>
              {subtitle}
            </p>
          )}
        </div>
      </div>
      {action && (
        <div className="flex-shrink-0">
          {action}
        </div>
      )}
    </div>
  );
}
