/**
 * Event Log Panel - Real-time Activity Timeline
 * Shows scrollable log of simulation events with colored tags
 */

import { useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, CheckCircle2, Info, Zap, Activity } from 'lucide-react';
import { SimulationEvent } from './SimulationEngine';
import { cn } from '@/lib/utils';

interface EventLogPanelProps {
  events: SimulationEvent[];
  isRunning: boolean;
}

export function EventLogPanel({ events, isRunning }: EventLogPanelProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new events arrive
  useEffect(() => {
    if (scrollRef.current) {
      const scrollArea = scrollRef.current.querySelector('[data-radix-scroll-area-viewport]');
      if (scrollArea) {
        scrollArea.scrollTop = scrollArea.scrollHeight;
      }
    }
  }, [events]);

  const getEventConfig = (event: SimulationEvent) => {
    switch (event.type) {
      case 'detect':
        return {
          icon: AlertTriangle,
          color: 'bg-warning/10 text-warning border-warning/20',
          iconColor: 'text-warning'
        };
      case 'decision':
        return {
          icon: Zap,
          color: 'bg-info/10 text-info border-info/20',
          iconColor: 'text-info'
        };
      case 'action':
        return {
          icon: Activity,
          color: 'bg-accent/10 text-accent border-accent/20',
          iconColor: 'text-accent'
        };
      case 'resolved':
        return {
          icon: CheckCircle2,
          color: 'bg-success/10 text-success border-success/20',
          iconColor: 'text-success'
        };
      case 'alert':
        return {
          icon: AlertTriangle,
          color: 'bg-destructive/10 text-destructive border-destructive/20',
          iconColor: 'text-destructive'
        };
      default:
        return {
          icon: Info,
          color: 'bg-muted text-muted-foreground border-border',
          iconColor: 'text-muted-foreground'
        };
    }
  };

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium">Event Timeline</CardTitle>
          {isRunning && (
            <Badge variant="secondary" className="gap-1.5">
              <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
              Live
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="flex-1 min-h-0 pb-3">
        <ScrollArea ref={scrollRef} className="h-full pr-4">
          {events.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center p-6">
              <Activity className="h-8 w-8 text-muted-foreground mb-2" />
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

                return (
                  <div
                    key={event.id}
                    className={cn(
                      "p-3 rounded-lg border transition-all duration-200 animate-fade-in",
                      config.color
                    )}
                    style={{ animationDelay: `${index * 50}ms` }}
                  >
                    <div className="flex items-start gap-3">
                      <Icon className={cn("h-4 w-4 mt-0.5 flex-shrink-0", config.iconColor)} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs font-mono text-muted-foreground">
                            [{event.timestamp}]
                          </span>
                          <Badge variant="outline" className="text-xs uppercase">
                            {event.type}
                          </Badge>
                        </div>
                        <p className="text-sm leading-relaxed">
                          {event.message}
                        </p>
                        {event.metadata && Object.keys(event.metadata).length > 0 && (
                          <div className="mt-2 text-xs text-muted-foreground font-mono">
                            {JSON.stringify(event.metadata, null, 2)}
                          </div>
                        )}
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
