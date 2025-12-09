/**
 * Data Centre Status Badge Component
 * Severity indicators for alerts, events, and system states
 */

import { cn } from '@/lib/utils';
import { AlertTriangle, AlertCircle, Info, CheckCircle, XCircle, Zap } from 'lucide-react';

export type BadgeSeverity = 'critical' | 'warning' | 'info' | 'success' | 'neutral';
export type BadgeSize = 'sm' | 'md' | 'lg';

interface DCStatusBadgeProps {
  severity: BadgeSeverity;
  label?: string;
  showIcon?: boolean;
  showDot?: boolean;
  animated?: boolean;
  size?: BadgeSize;
  className?: string;
}

export function DCStatusBadge({
  severity,
  label,
  showIcon = true,
  showDot = false,
  animated = false,
  size = 'md',
  className,
}: DCStatusBadgeProps) {
  const severityConfig = {
    critical: {
      bg: 'bg-dc-red/15',
      border: 'border-dc-red/30',
      text: 'text-dc-red-light',
      icon: XCircle,
      dot: 'bg-dc-red',
    },
    warning: {
      bg: 'bg-dc-amber/15',
      border: 'border-dc-amber/30',
      text: 'text-dc-amber-light',
      icon: AlertTriangle,
      dot: 'bg-dc-amber',
    },
    info: {
      bg: 'bg-dc-blue/15',
      border: 'border-dc-blue/30',
      text: 'text-dc-blue-light',
      icon: Info,
      dot: 'bg-dc-blue',
    },
    success: {
      bg: 'bg-dc-green/15',
      border: 'border-dc-green/30',
      text: 'text-dc-green-light',
      icon: CheckCircle,
      dot: 'bg-dc-green',
    },
    neutral: {
      bg: 'bg-muted/50',
      border: 'border-muted',
      text: 'text-muted-foreground',
      icon: AlertCircle,
      dot: 'bg-muted-foreground',
    },
  };

  const sizeConfig = {
    sm: {
      padding: 'px-1.5 py-0.5',
      text: 'text-[10px]',
      icon: 'h-2.5 w-2.5',
      dot: 'h-1.5 w-1.5',
      gap: 'gap-1',
    },
    md: {
      padding: 'px-2 py-0.5',
      text: 'text-xs',
      icon: 'h-3 w-3',
      dot: 'h-2 w-2',
      gap: 'gap-1.5',
    },
    lg: {
      padding: 'px-3 py-1',
      text: 'text-sm',
      icon: 'h-4 w-4',
      dot: 'h-2.5 w-2.5',
      gap: 'gap-2',
    },
  };

  const config = severityConfig[severity];
  const sizes = sizeConfig[size];
  const Icon = config.icon;

  return (
    <span
      className={cn(
        'inline-flex items-center font-semibold uppercase tracking-wide rounded border',
        config.bg,
        config.border,
        config.text,
        sizes.padding,
        sizes.text,
        sizes.gap,
        animated && severity === 'critical' && 'animate-pulse-glow',
        className
      )}
    >
      {showDot && (
        <span
          className={cn(
            'rounded-full',
            config.dot,
            sizes.dot,
            animated && severity === 'critical' && 'animate-status-blink'
          )}
        />
      )}
      {showIcon && <Icon className={sizes.icon} />}
      {label && <span>{label}</span>}
    </span>
  );
}

// Event type badges
export type EventType = 'thermal' | 'power' | 'cooling' | 'network' | 'security' | 'gpu' | 'sovereignty';

interface DCEventBadgeProps {
  type: EventType;
  label?: string;
  size?: BadgeSize;
  className?: string;
}

export function DCEventBadge({ type, label, size = 'md', className }: DCEventBadgeProps) {
  const typeConfig = {
    thermal: { bg: 'bg-dc-red/15', border: 'border-dc-red/30', text: 'text-dc-red-light', icon: Zap },
    power: { bg: 'bg-dc-amber/15', border: 'border-dc-amber/30', text: 'text-dc-amber-light', icon: Zap },
    cooling: { bg: 'bg-dc-cyan/15', border: 'border-dc-cyan/30', text: 'text-dc-cyan', icon: Zap },
    network: { bg: 'bg-dc-blue/15', border: 'border-dc-blue/30', text: 'text-dc-blue-light', icon: Zap },
    security: { bg: 'bg-dc-red/15', border: 'border-dc-red/30', text: 'text-dc-red-light', icon: Zap },
    gpu: { bg: 'bg-dc-purple/15', border: 'border-dc-purple/30', text: 'text-dc-purple-light', icon: Zap },
    sovereignty: { bg: 'bg-dc-blue/15', border: 'border-dc-blue/30', text: 'text-dc-blue-light', icon: Zap },
  };

  const sizeConfig = {
    sm: 'px-1.5 py-0.5 text-[10px] gap-1',
    md: 'px-2 py-0.5 text-xs gap-1.5',
    lg: 'px-3 py-1 text-sm gap-2',
  };

  const config = typeConfig[type];

  return (
    <span
      className={cn(
        'inline-flex items-center font-medium rounded border',
        config.bg,
        config.border,
        config.text,
        sizeConfig[size],
        className
      )}
    >
      {label || type.charAt(0).toUpperCase() + type.slice(1)}
    </span>
  );
}

export default DCStatusBadge;
