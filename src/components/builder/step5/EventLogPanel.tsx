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
          color: 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20',
          iconColor: 'text-yellow-600'
        };
      case 'decision':
        return {
          icon: Zap,
          color: 'bg-blue-500/10 text-blue-600 border-blue-500/20',
          iconColor: 'text-blue-600'
        };
      case 'action':
        return {
          icon: Activity,
          color: 'bg-purple-500/10 text-purple-600 border-purple-500/20',
          iconColor: 'text-purple-600'
        };
      case 'resolved':
        return {
          icon: CheckCircle2,
          color: 'bg-green-500/10 text-green-600 border-green-500/20',
          iconColor: 'text-green-600'
        };
      case 'alert':
        return {
          icon: AlertTriangle,
          color: 'bg-red-500/10 text-red-600 border-red-500/20',
          iconColor: 'text-red-600'
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
