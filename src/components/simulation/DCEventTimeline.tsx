/**
 * DC Event Timeline Component
 * Chronological display of simulation events with severity markers
 * Uses Studio design system tokens
 */

import { useRef, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  AlertTriangle, AlertCircle, Info, CheckCircle2,
  Thermometer, Zap, Wind, Network, Shield, Cpu, Globe, DollarSign,
  Clock, ArrowRight
} from 'lucide-react';
import type { SimulationEvent } from '@/simulation/types';
import { cn } from '@/lib/utils';

interface DCEventTimelineProps {
  events: SimulationEvent[];
  maxHeight?: string;
  highlightedEventId?: string | null;
  onEventHover?: (eventId: string | null) => void;
  onEventClick?: (event: SimulationEvent) => void;
  autoScroll?: boolean;
}

const domainIcons: Record<string, React.ElementType> = {
  thermal: Thermometer,
  power: Zap,
  cooling: Wind,
  network: Network,
  facility: Shield,
  workload: Cpu,
  sovereignty: Globe,
  financial: DollarSign,
};

const severityConfig: Record<string, { 
  icon: React.ElementType; 
  color: string; 
  bgColor: string;
  borderColor: string;
}> = {
  low: { 
    icon: Info, 
    color: 'text-info', 
    bgColor: 'bg-info/10',
    borderColor: 'border-info/30'
  },
  medium: { 
    icon: AlertCircle, 
    color: 'text-warning', 
    bgColor: 'bg-warning/10',
    borderColor: 'border-warning/30'
  },
  high: { 
    icon: AlertTriangle, 
    color: 'text-destructive', 
    bgColor: 'bg-destructive/10',
    borderColor: 'border-destructive/30'
  },
  critical: { 
    icon: AlertTriangle, 
    color: 'text-destructive', 
    bgColor: 'bg-destructive/15',
    borderColor: 'border-destructive/40'
  },
};

const eventTypeConfig: Record<string, { label: string; color: string }> = {
  ALERT: { label: 'Alert', color: 'bg-destructive/10 text-destructive' },
  INFO: { label: 'Info', color: 'bg-info/10 text-info' },
  RECOVERY: { label: 'Recovery', color: 'bg-success/10 text-success' },
  TRIGGER: { label: 'Trigger', color: 'bg-warning/10 text-warning' },
  MITIGATION: { label: 'Mitigation', color: 'bg-accent/10 text-accent' },
  START: { label: 'Start', color: 'bg-info/10 text-info' },
  END: { label: 'End', color: 'bg-muted text-muted-foreground' },
};

function formatTimestamp(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

function EventItem({ 
  event, 
  isHighlighted,
  onHover,
  onClick,
}: { 
  event: SimulationEvent; 
  isHighlighted: boolean;
  onHover: () => void;
  onClick: () => void;
}) {
  const severity = severityConfig[event.severity] || severityConfig.low;
  const SeverityIcon = severity.icon;
  const DomainIcon = domainIcons[event.domain] || AlertCircle;
  const eventType = eventTypeConfig[event.type] || eventTypeConfig.INFO;
  
  return (
    <div 
      className={cn(
        'group relative flex gap-3 p-3 rounded-lg border transition-all duration-200 cursor-pointer',
        severity.bgColor,
        severity.borderColor,
        isHighlighted && 'ring-2 ring-primary scale-[1.02]',
        'hover:scale-[1.01]'
      )}
      onMouseEnter={onHover}
      onClick={onClick}
    >
      {/* Timeline dot */}
      <div className="flex flex-col items-center">
        <div className={cn(
          'p-1.5 rounded-full',
          severity.bgColor,
          'border',
          severity.borderColor
        )}>
          <SeverityIcon className={cn('h-3.5 w-3.5', severity.color)} />
        </div>
        <div className="flex-1 w-px bg-border/50 my-1" />
      </div>
      
      {/* Content */}
      <div className="flex-1 min-w-0 space-y-1.5">
        {/* Header */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2">
            <DomainIcon className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-sm font-medium truncate text-card-foreground">{event.title}</span>
          </div>
          <div className="flex items-center gap-1.5 flex-shrink-0">
            <Badge variant="outline" className={cn('text-[10px] h-5', eventType.color)}>
              {eventType.label}
            </Badge>
            <Badge variant="outline" className="text-[10px] h-5 font-mono">
              <Clock className="h-2.5 w-2.5 mr-1" />
              {formatTimestamp(event.timestamp)}
            </Badge>
          </div>
        </div>
        
        {/* Description */}
        <p className="text-xs text-muted-foreground line-clamp-2">
          {event.description}
        </p>
        
        {/* Affected areas */}
        {(event.affectedRacks || event.affectedZones || event.affectedClusters) && (
          <div className="flex flex-wrap gap-1 pt-1">
            {event.affectedRacks?.slice(0, 3).map((rack) => (
              <Badge key={rack} variant="outline" className="text-[10px] h-4">
                {rack}
              </Badge>
            ))}
            {event.affectedZones?.slice(0, 2).map((zone) => (
              <Badge key={zone} variant="outline" className="text-[10px] h-4">
                {zone}
              </Badge>
            ))}
            {event.affectedClusters?.slice(0, 2).map((cluster) => (
              <Badge key={cluster} variant="outline" className="text-[10px] h-4">
                {cluster}
              </Badge>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export function DCEventTimeline({
  events,
  maxHeight = '400px',
  highlightedEventId,
  onEventHover,
  onEventClick,
  autoScroll = true,
}: DCEventTimelineProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  
  // Auto-scroll to bottom when new events arrive
  useEffect(() => {
    if (autoScroll && bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [events.length, autoScroll]);
  
  // Sort events by timestamp (newest last)
  const sortedEvents = [...events].sort((a, b) => a.timestamp - b.timestamp);
  
  return (
    <Card className="bg-card border-border">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Clock className="h-4 w-4 text-primary" />
            Event Timeline
          </CardTitle>
          <Badge variant="outline" className="text-[10px]">
            {events.length} events
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <ScrollArea style={{ height: maxHeight }} ref={scrollRef}>
          <div className="space-y-2 pr-4">
            {sortedEvents.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                <Clock className="h-8 w-8 mb-2 opacity-50" />
                <p className="text-sm">No events yet</p>
                <p className="text-xs">Start a scenario to see events</p>
              </div>
            ) : (
              sortedEvents.map((event) => (
                <EventItem
                  key={event.id}
                  event={event}
                  isHighlighted={event.id === highlightedEventId}
                  onHover={() => onEventHover?.(event.id)}
                  onClick={() => onEventClick?.(event)}
                />
              ))
            )}
            <div ref={bottomRef} />
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
