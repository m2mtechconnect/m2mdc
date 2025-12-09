/**
 * Enhanced Event Log Panel
 * Real-time activity timeline with bi-directional KPI chart linking
 */

import { useEffect, useRef, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  AlertTriangle, CheckCircle2, Info, Zap, Activity,
  Maximize2, Pin, ExternalLink
} from 'lucide-react';
import { cn } from '@/lib/utils';

export interface SimulationEvent {
  id: string;
  timestamp: string | number;
  type: 'detect' | 'decision' | 'action' | 'resolved' | 'alert' | 'info';
  message: string;
  metadata?: Record<string, any>;
  kpiImpact?: Array<{ kpi: string; delta: number }>;
  severity?: 'low' | 'medium' | 'high' | 'critical';
}

interface EnhancedEventLogPanelProps {
  events: SimulationEvent[];
  isRunning: boolean;
  highlightedEventId?: string | null;
  onEventHover?: (eventId: string | null, timestamp?: number | null) => void;
  onEventClick?: (event: SimulationEvent) => void;
  onPinEvent?: (event: SimulationEvent) => void;
  pinnedEventIds?: string[];
}

export function EnhancedEventLogPanel({
  events,
  isRunning,
  highlightedEventId,
  onEventHover,
  onEventClick,
  onPinEvent,
  pinnedEventIds = []
}: EnhancedEventLogPanelProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const eventRefs = useRef<Map<string, HTMLDivElement>>(new Map());

  // Auto-scroll to bottom when new events arrive
  useEffect(() => {
    if (scrollRef.current && isRunning) {
      const scrollArea = scrollRef.current.querySelector('[data-radix-scroll-area-viewport]');
      if (scrollArea) {
        scrollArea.scrollTop = scrollArea.scrollHeight;
      }
    }
  }, [events, isRunning]);

  // Scroll to highlighted event when it changes
  useEffect(() => {
    if (highlightedEventId && eventRefs.current.has(highlightedEventId)) {
      const element = eventRefs.current.get(highlightedEventId);
      element?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [highlightedEventId]);

  const setEventRef = useCallback((id: string, element: HTMLDivElement | null) => {
    if (element) {
      eventRefs.current.set(id, element);
    } else {
      eventRefs.current.delete(id);
    }
  }, []);

  const getEventConfig = (event: SimulationEvent) => {
    const configs = {
      detect: {
        icon: AlertTriangle,
        color: 'bg-yellow-500/10 text-yellow-600 border-yellow-500/30',
        iconColor: 'text-yellow-600',
        label: 'Detection'
      },
      decision: {
        icon: Zap,
        color: 'bg-blue-500/10 text-blue-600 border-blue-500/30',
        iconColor: 'text-blue-600',
        label: 'Decision'
      },
      action: {
        icon: Activity,
        color: 'bg-purple-500/10 text-purple-600 border-purple-500/30',
        iconColor: 'text-purple-600',
        label: 'Action'
      },
      resolved: {
        icon: CheckCircle2,
        color: 'bg-green-500/10 text-green-600 border-green-500/30',
        iconColor: 'text-green-600',
        label: 'Resolved'
      },
      alert: {
        icon: AlertTriangle,
        color: 'bg-red-500/10 text-red-600 border-red-500/30',
        iconColor: 'text-red-600',
        label: 'Alert'
      },
      info: {
        icon: Info,
        color: 'bg-muted text-muted-foreground border-border',
        iconColor: 'text-muted-foreground',
        label: 'Info'
      }
    };
    return configs[event.type] || configs.info;
  };

  const getSeverityBadge = (severity?: string) => {
    if (!severity) return null;
    const colors = {
      low: 'bg-blue-500/20 text-blue-600',
      medium: 'bg-yellow-500/20 text-yellow-600',
      high: 'bg-orange-500/20 text-orange-600',
      critical: 'bg-red-500/20 text-red-600 animate-pulse'
    };
    return (
      <Badge variant="outline" className={cn('text-[10px] ml-2', colors[severity as keyof typeof colors])}>
        {severity.toUpperCase()}
      </Badge>
    );
  };

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="pb-3 flex-shrink-0">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium">Event Timeline</CardTitle>
          <div className="flex items-center gap-2">
            {events.length > 0 && (
              <Badge variant="secondary" className="text-xs">
                {events.length} events
              </Badge>
            )}
            {isRunning && (
              <Badge variant="default" className="gap-1.5 animate-pulse">
                <div className="w-1.5 h-1.5 rounded-full bg-white" />
                Live
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="flex-1 min-h-0 pb-3">
        <ScrollArea ref={scrollRef} className="h-full pr-4">
          {events.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center p-6">
              <Activity className="h-8 w-8 text-muted-foreground/50 mb-2" />
              <p className="text-sm text-muted-foreground">
                No events yet
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Click Run to start the simulation
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {events.map((event, index) => {
                const config = getEventConfig(event);
                const Icon = config.icon;
                const isPinned = pinnedEventIds.includes(event.id);
                const isHighlighted = highlightedEventId === event.id;

                return (
                  <div
                    key={event.id}
                    ref={(el) => setEventRef(event.id, el)}
                    className={cn(
                      "p-3 rounded-lg border transition-all duration-200 cursor-pointer group",
                      config.color,
                      isHighlighted && "ring-2 ring-primary shadow-md scale-[1.02]",
                      isPinned && "border-primary/50"
                    )}
                    style={{ animationDelay: `${index * 30}ms` }}
                    onMouseEnter={() => onEventHover?.(event.id, typeof event.timestamp === 'number' ? event.timestamp : null)}
                    onMouseLeave={() => onEventHover?.(null)}
                    onClick={() => onEventClick?.(event)}
                  >
                    <div className="flex items-start gap-3">
                      <Icon className={cn("h-4 w-4 mt-0.5 flex-shrink-0", config.iconColor)} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <span className="text-xs font-mono text-muted-foreground">
                            [{event.timestamp}]
                          </span>
                          <Badge variant="outline" className="text-[10px] uppercase">
                            {config.label}
                          </Badge>
                          {getSeverityBadge(event.severity)}
                          {isPinned && (
                            <Pin className="h-3 w-3 text-primary fill-primary" />
                          )}
                        </div>
                        <p className="text-sm leading-relaxed">
                          {event.message}
                        </p>
                        
                        {/* KPI Impact indicators */}
                        {event.kpiImpact && event.kpiImpact.length > 0 && (
                          <div className="mt-2 flex flex-wrap gap-1">
                            {event.kpiImpact.map((impact, i) => (
                              <Badge 
                                key={i} 
                                variant="secondary" 
                                className={cn(
                                  "text-[10px]",
                                  impact.delta > 0 ? "bg-green-500/20 text-green-600" : "bg-red-500/20 text-red-600"
                                )}
                              >
                                {impact.kpi}: {impact.delta > 0 ? '+' : ''}{impact.delta.toFixed(1)}
                              </Badge>
                            ))}
                          </div>
                        )}
                        
                        {/* Metadata */}
                        {event.metadata && Object.keys(event.metadata).length > 0 && (
                          <div className="mt-2 text-[10px] text-muted-foreground font-mono bg-muted/50 p-2 rounded">
                            {Object.entries(event.metadata).map(([key, value]) => (
                              <div key={key}>
                                <span className="text-muted-foreground">{key}:</span>{' '}
                                <span>{JSON.stringify(value)}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                      
                      {/* Hover actions */}
                      <div className="flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        {onPinEvent && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6"
                            onClick={(e) => {
                              e.stopPropagation();
                              onPinEvent(event);
                            }}
                          >
                            <Pin className={cn("h-3 w-3", isPinned && "fill-current")} />
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          onClick={(e) => {
                            e.stopPropagation();
                            onEventClick?.(event);
                          }}
                        >
                          <Maximize2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
