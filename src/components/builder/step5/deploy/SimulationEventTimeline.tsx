/**
 * Simulation Event Timeline Component
 * Displays chronological events with severity indicators
 */

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Clock, AlertCircle, AlertTriangle, Info, CheckCircle2,
  ChevronRight
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import type { SimulationEvent } from '@/lib/simulationTemplates';

interface SimulationEventTimelineProps {
  events: SimulationEvent[];
  isSampleData?: boolean;
}

function formatTimestamp(offsetMin: number): string {
  if (offsetMin === 0) return 'Start';
  if (offsetMin < 60) return `+${offsetMin} min`;
  const hours = Math.floor(offsetMin / 60);
  const mins = offsetMin % 60;
  return mins > 0 ? `+${hours}h ${mins}m` : `+${hours}h`;
}

function getSeverityConfig(severity?: 'low' | 'medium' | 'high' | 'critical') {
  switch (severity) {
    case 'critical':
      return {
        icon: AlertCircle,
        color: 'text-red-500',
        bgColor: 'bg-red-500/10',
        borderColor: 'border-red-500/30',
        label: 'Critical',
      };
    case 'high':
      return {
        icon: AlertTriangle,
        color: 'text-orange-500',
        bgColor: 'bg-orange-500/10',
        borderColor: 'border-orange-500/30',
        label: 'High',
      };
    case 'medium':
      return {
        icon: Info,
        color: 'text-yellow-500',
        bgColor: 'bg-yellow-500/10',
        borderColor: 'border-yellow-500/30',
        label: 'Medium',
      };
    case 'low':
    default:
      return {
        icon: CheckCircle2,
        color: 'text-green-500',
        bgColor: 'bg-green-500/10',
        borderColor: 'border-green-500/30',
        label: 'Low',
      };
  }
}

function formatDetails(details: Record<string, unknown>): string {
  return Object.entries(details)
    .map(([key, value]) => {
      const formattedKey = key.replace(/([A-Z])/g, ' $1').replace(/_/g, ' ').trim();
      const capitalizedKey = formattedKey.charAt(0).toUpperCase() + formattedKey.slice(1);
      
      if (typeof value === 'object' && value !== null) {
        if (Array.isArray(value)) {
          return `${capitalizedKey}: ${value.join(', ')}`;
        }
        return `${capitalizedKey}: ${JSON.stringify(value)}`;
      }
      return `${capitalizedKey}: ${value}`;
    })
    .join('\n');
}

export function SimulationEventTimeline({ events, isSampleData = false }: SimulationEventTimelineProps) {
  const sortedEvents = [...events].sort((a, b) => a.timestampOffsetMin - b.timestampOffsetMin);

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Event Timeline
          </CardTitle>
          {isSampleData && (
            <Badge variant="secondary" className="text-xs">
              Sample Data
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="relative">
          {/* Timeline line */}
          <div className="absolute left-[18px] top-2 bottom-2 w-0.5 bg-border" />
          
          <div className="space-y-4">
            {sortedEvents.map((event, idx) => {
              const config = getSeverityConfig(event.severity);
              const Icon = config.icon;
              
              return (
                <div key={idx} className="relative flex gap-4">
                  {/* Timeline dot */}
                  <div className={cn(
                    "relative z-10 flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-2",
                    config.bgColor,
                    config.borderColor
                  )}>
                    <Icon className={cn("h-4 w-4", config.color)} />
                  </div>
                  
                  {/* Event content */}
                  <div className="flex-1 pt-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-mono text-muted-foreground">
                        {formatTimestamp(event.timestampOffsetMin)}
                      </span>
                      <ChevronRight className="h-3 w-3 text-muted-foreground" />
                      <span className="text-sm font-medium">{event.label}</span>
                    </div>
                    
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div className="text-xs text-muted-foreground line-clamp-1 cursor-help hover:text-foreground transition-colors">
                            {Object.entries(event.details).slice(0, 3).map(([key, value], i) => (
                              <span key={key}>
                                {i > 0 && ' • '}
                                <span className="capitalize">{key.replace(/_/g, ' ')}</span>: {
                                  typeof value === 'object' 
                                    ? Array.isArray(value) ? value.join(', ') : JSON.stringify(value)
                                    : String(value)
                                }
                              </span>
                            ))}
                          </div>
                        </TooltipTrigger>
                        <TooltipContent side="bottom" align="start" className="max-w-sm">
                          <pre className="text-xs whitespace-pre-wrap font-mono">
                            {formatDetails(event.details)}
                          </pre>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
