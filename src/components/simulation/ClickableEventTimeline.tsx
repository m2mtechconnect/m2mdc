/**
 * Clickable Event Timeline - Shows simulation events with timestamps
 * Allows clicking to jump to specific moments
 */

import { memo, useRef, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Clock, Thermometer, Zap, Wind, Network, Shield, 
  Cpu, Globe, Leaf, AlertTriangle, ChevronRight
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import type { SimulationEvent } from '@/simulation/types';

interface ClickableEventTimelineProps {
  events: SimulationEvent[];
  isRunning: boolean;
  currentTime: number;
  onSeekToEvent?: (timestamp: number) => void;
  onEventClick?: (event: SimulationEvent) => void;
}

const domainIcons: Record<string, React.ElementType> = {
  thermal: Thermometer,
  power: Zap,
  cooling: Wind,
  network: Network,
  facility: Shield,
  workload: Cpu,
  sovereignty: Globe,
  financial: Leaf,
  carbon: Leaf,
};

const severityStyles: Record<string, { bg: string; border: string; text: string }> = {
  info: { bg: 'bg-info/10', border: 'border-info/30', text: 'text-info' },
  warning: { bg: 'bg-warning/10', border: 'border-warning/30', text: 'text-warning' },
  critical: { bg: 'bg-destructive/10', border: 'border-destructive/30', text: 'text-destructive' },
};

function formatTimestamp(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

const EventItem = memo(function EventItem({
  event,
  isNew,
  isCurrent,
  onSeek,
  onClick
}: {
  event: SimulationEvent;
  isNew: boolean;
  isCurrent: boolean;
  onSeek?: () => void;
  onClick?: () => void;
}) {
  const Icon = domainIcons[event.domain] || AlertTriangle;
  const severity = severityStyles[event.severity] || severityStyles.info;

  return (
    <motion.div
      initial={isNew ? { opacity: 0, x: -20, scale: 0.95 } : false}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      transition={{ duration: 0.3 }}
      onClick={onClick}
      className={cn(
        'flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-all',
        'hover:shadow-md hover:-translate-y-0.5',
        severity.bg,
        severity.border,
        isCurrent && 'ring-2 ring-primary'
      )}
    >
      {/* Timeline dot */}
      <div className="flex flex-col items-center">
        <div className={cn(
          'w-8 h-8 rounded-lg flex items-center justify-center',
          severity.bg,
          event.severity === 'critical' && 'animate-pulse'
        )}>
          <Icon className={cn('h-4 w-4', severity.text)} />
        </div>
        <div className="w-px h-full bg-border mt-2" />
      </div>
      
      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <Badge variant="outline" className={cn('text-[10px]', severity.text, severity.border)}>
            {event.domain}
          </Badge>
          <Badge 
            variant="outline" 
            className={cn(
              'text-[10px]',
              event.severity === 'critical' && 'text-destructive border-destructive/30'
            )}
          >
            {event.severity}
          </Badge>
          <span className="text-[10px] text-muted-foreground font-mono ml-auto">
            {formatTimestamp(event.timestamp)}
          </span>
        </div>
        
        <p className="text-sm font-medium text-card-foreground line-clamp-1">
          {event.title}
        </p>
        
        {event.description && (
          <p className="text-xs text-muted-foreground line-clamp-2 mt-1">
            {event.description}
          </p>
        )}
        
        {onSeek && (
          <Button
            variant="ghost"
            size="sm"
            className="h-6 text-xs mt-2 gap-1 text-muted-foreground hover:text-foreground"
            onClick={(e) => { e.stopPropagation(); onSeek(); }}
          >
            Jump to moment
            <ChevronRight className="h-3 w-3" />
          </Button>
        )}
      </div>
    </motion.div>
  );
});

export const ClickableEventTimeline = memo(function ClickableEventTimeline({
  events,
  isRunning,
  currentTime,
  onSeekToEvent,
  onEventClick
}: ClickableEventTimelineProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const lastEventCount = useRef(events.length);

  // Auto-scroll when new events arrive
  useEffect(() => {
    if (isRunning && events.length > lastEventCount.current && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
    lastEventCount.current = events.length;
  }, [events.length, isRunning]);

  // Sort events by timestamp (most recent first for display)
  const sortedEvents = [...events].sort((a, b) => b.timestamp - a.timestamp);

  // Find current event (closest to current time)
  const currentEventIndex = sortedEvents.findIndex(e => e.timestamp <= currentTime);

  return (
    <Card className="bg-card border-border">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm flex items-center gap-2">
            <Clock className="h-4 w-4 text-primary" />
            Event Timeline
          </CardTitle>
          <div className="flex items-center gap-2">
            {isRunning && (
              <Badge variant="outline" className="text-[10px] text-success border-success/30 animate-pulse">
                <span className="relative flex h-2 w-2 mr-1">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-success opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-success" />
                </span>
                LIVE
              </Badge>
            )}
            <Badge variant="secondary" className="text-[10px]">
              {events.length} events
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[400px] pr-4" ref={scrollRef}>
          <AnimatePresence>
            {sortedEvents.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                <Clock className="h-8 w-8 mb-3 opacity-50" />
                <p className="text-sm font-medium">No events yet</p>
                <p className="text-xs">Events will appear here as the simulation runs</p>
              </div>
            ) : (
              <div className="space-y-3">
                {sortedEvents.map((event, index) => (
                  <EventItem
                    key={event.id}
                    event={event}
                    isNew={index === 0 && isRunning}
                    isCurrent={index === currentEventIndex}
                    onSeek={onSeekToEvent ? () => onSeekToEvent(event.timestamp) : undefined}
                    onClick={onEventClick ? () => onEventClick(event) : undefined}
                  />
                ))}
              </div>
            )}
          </AnimatePresence>
        </ScrollArea>
        
        {/* Timeline scrubber hint */}
        {events.length > 0 && !isRunning && (
          <div className="mt-3 pt-3 border-t border-border text-center">
            <p className="text-[10px] text-muted-foreground">
              Click any event to view details • Use "Jump to moment" to seek
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
});
