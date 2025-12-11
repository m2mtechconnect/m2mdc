/**
 * Data Centre Event Timeline Component
 * Chronological event display with severity markers
 */

import { format, formatDistanceToNow } from 'date-fns';
import { AlertTriangle, AlertCircle, Info, CheckCircle, Clock, Zap, Thermometer, Wind, Network, Shield, Cpu } from 'lucide-react';
import { cn } from '@/lib/utils';
import { DCStatusBadge, BadgeSeverity } from './DCStatusBadge';

export interface TimelineEvent {
  id: string;
  timestamp: Date | string;
  title: string;
  description?: string;
  severity: BadgeSeverity;
  domain: 'thermal' | 'power' | 'cooling' | 'network' | 'security' | 'gpu' | 'sovereignty' | 'system';
  resolved?: boolean;
  resolvedAt?: Date | string;
}

export interface DCEventTimelineProps {
  events: TimelineEvent[];
  maxEvents?: number;
  maxItems?: number;
  showTimestamp?: boolean;
  showRelativeTime?: boolean;
  onEventClick?: (event: TimelineEvent) => void;
  className?: string;
}

const domainIcons = {
  thermal: Thermometer,
  power: Zap,
  cooling: Wind,
  network: Network,
  security: Shield,
  gpu: Cpu,
  sovereignty: Shield,
  system: AlertCircle,
};

const domainColors = {
  thermal: 'text-destructive',
  power: 'text-warning',
  cooling: 'text-info',
  network: 'text-info',
  security: 'text-destructive',
  gpu: 'text-primary',
  sovereignty: 'text-info',
  system: 'text-muted-foreground',
};

export function DCEventTimeline({
  events,
  maxEvents = 10,
  maxItems,
  showTimestamp = true,
  showRelativeTime = true,
  onEventClick,
  className,
}: DCEventTimelineProps) {
  // Support both maxEvents and maxItems props
  const limit = maxItems ?? maxEvents;
  const displayEvents = events.slice(0, limit);

  if (displayEvents.length === 0) {
    return (
      <div className={cn('flex flex-col items-center justify-center py-8 text-center', className)}>
        <CheckCircle className="h-8 w-8 text-success mb-2" />
        <p className="text-sm text-muted-foreground">No recent events</p>
      </div>
    );
  }

  return (
    <div className={cn('space-y-1', className)}>
      {displayEvents.map((event, index) => {
        const Icon = domainIcons[event.domain];
        const timestamp = typeof event.timestamp === 'string' ? new Date(event.timestamp) : event.timestamp;
        
        return (
          <div
            key={event.id}
            onClick={() => onEventClick?.(event)}
            className={cn(
              'relative flex gap-3 p-3 rounded-lg transition-colors',
              onEventClick && 'cursor-pointer hover:bg-muted/50',
              event.resolved && 'opacity-60'
            )}
          >
            {/* Timeline line */}
            {index < displayEvents.length - 1 && (
              <div className="absolute left-[26px] top-12 w-px h-[calc(100%-24px)] bg-border" />
            )}
            
            {/* Icon */}
            <div className={cn(
              'flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center border bg-muted z-10',
              event.severity === 'critical' && 'border-destructive/50 bg-destructive/10',
              event.severity === 'warning' && 'border-warning/50 bg-warning/10',
              event.severity === 'info' && 'border-info/50 bg-info/10',
              event.severity === 'success' && 'border-success/50 bg-success/10',
              event.severity === 'neutral' && 'border-border'
            )}>
              <Icon className={cn('h-4 w-4', domainColors[event.domain])} />
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-sm font-medium truncate">{event.title}</span>
                    {event.resolved && (
                      <span className="text-[10px] text-success uppercase">Resolved</span>
                    )}
                  </div>
                  {event.description && (
                    <p className="text-xs text-muted-foreground truncate">{event.description}</p>
                  )}
                </div>
                <DCStatusBadge severity={event.severity} size="sm" showIcon={false} showDot />
              </div>
              
              {showTimestamp && (
                <div className="flex items-center gap-2 mt-1 text-[10px] text-muted-foreground">
                  <Clock className="h-3 w-3" />
                  <span>{format(timestamp, 'HH:mm:ss')}</span>
                  {showRelativeTime && (
                    <span>• {formatDistanceToNow(timestamp, { addSuffix: true })}</span>
                  )}
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// Compact version for sidebar
interface DCEventListProps {
  events: TimelineEvent[];
  maxEvents?: number;
  onEventClick?: (event: TimelineEvent) => void;
  className?: string;
}

export function DCEventList({ events, maxEvents = 5, onEventClick, className }: DCEventListProps) {
  const displayEvents = events.slice(0, maxEvents);

  return (
    <div className={cn('space-y-1', className)}>
      {displayEvents.map((event) => {
        const Icon = domainIcons[event.domain];
        const timestamp = typeof event.timestamp === 'string' ? new Date(event.timestamp) : event.timestamp;
        
        return (
          <button
            key={event.id}
            onClick={() => onEventClick?.(event)}
            className="w-full flex items-center gap-2 p-2 rounded-md text-left hover:bg-muted/50 transition-colors"
          >
            <Icon className={cn('h-3.5 w-3.5 flex-shrink-0', domainColors[event.domain])} />
            <span className="flex-1 text-xs truncate">{event.title}</span>
            <span className="text-[10px] text-muted-foreground">
              {format(timestamp, 'HH:mm')}
            </span>
          </button>
        );
      })}
    </div>
  );
}

export default DCEventTimeline;
