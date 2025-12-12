/**
 * Compact Event Timeline - Minimal horizontal layout
 */

import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { 
  Clock, ChevronRight,
  Thermometer, Zap, Wind, Network, Cpu, Globe, Leaf
} from 'lucide-react';
import { CollapsibleSection } from '@/components/shared/CollapsibleSection';
import { cn } from '@/lib/utils';

interface TimelineEvent {
  id: string;
  timestamp: Date;
  domain: string;
  severity: 'info' | 'warning' | 'critical';
  title: string;
  description: string;
}

interface CompactEventTimelineProps {
  events: TimelineEvent[];
  onOpenFullTimeline?: () => void;
  onEventClick?: (eventId: string) => void;
}

const domainColors: Record<string, string> = {
  thermal: 'bg-destructive text-destructive-foreground',
  power: 'bg-warning text-warning-foreground',
  cooling: 'bg-info text-info-foreground',
  network: 'bg-purple-500 text-white',
  workload: 'bg-accent text-accent-foreground',
  sovereignty: 'bg-primary text-primary-foreground',
  carbon: 'bg-success text-success-foreground',
};

const domainIcons: Record<string, React.ReactNode> = {
  thermal: <Thermometer className="h-3 w-3" />,
  power: <Zap className="h-3 w-3" />,
  cooling: <Wind className="h-3 w-3" />,
  network: <Network className="h-3 w-3" />,
  workload: <Cpu className="h-3 w-3" />,
  sovereignty: <Globe className="h-3 w-3" />,
  carbon: <Leaf className="h-3 w-3" />,
};

export function CompactEventTimeline({ 
  events, 
  onOpenFullTimeline,
  onEventClick 
}: CompactEventTimelineProps) {
  const [sliderValue, setSliderValue] = useState([100]);
  
  const recentEvents = events.slice(0, 5);
  const latestEvent = recentEvents[0];

  return (
    <CollapsibleSection
      title="Event Timeline"
      badge="Live"
      defaultOpen={true}
      icon={<Clock className="h-4 w-4 text-primary" />}
    >
      {/* Domain Filter Chips */}
      <div className="flex items-center gap-1 mb-3 overflow-x-auto pb-1">
        {Object.entries(domainIcons).map(([domain, icon]) => (
          <button
            key={domain}
            className={cn(
              'flex items-center justify-center w-7 h-7 rounded-full transition-colors',
              domainColors[domain],
              'opacity-70 hover:opacity-100'
            )}
            title={domain}
          >
            {icon}
          </button>
        ))}
      </div>
      
      {/* Mini Timeline Bar */}
      <div className="relative h-8 bg-muted/30 rounded-lg border border-border mb-3 overflow-hidden">
        {/* Time markers */}
        <div className="absolute inset-x-0 bottom-0 flex justify-between px-2 py-0.5 text-[9px] text-muted-foreground font-mono">
          <span>24h ago</span>
          <span>Now</span>
        </div>
        
        {/* Event dots on timeline */}
        {recentEvents.map((event, idx) => {
          const position = 100 - (idx * 15);
          const color = domainColors[event.domain.toLowerCase()] || 'bg-muted';
          
          return (
            <div
              key={event.id}
              className={cn(
                'absolute top-1.5 w-2 h-4 rounded-sm',
                color,
                event.severity === 'critical' && 'animate-pulse'
              )}
              style={{ left: `${position}%`, transform: 'translateX(-50%)' }}
              title={event.title}
            />
          );
        })}
      </div>
      
      {/* Slider */}
      <div className="mb-3">
        <Slider
          value={sliderValue}
          onValueChange={setSliderValue}
          max={100}
          step={1}
          className="w-full"
        />
      </div>
      
      {/* Latest Event Summary */}
      {latestEvent ? (
        <div 
          className="p-2 rounded-lg bg-muted/30 border border-border cursor-pointer hover:bg-muted/50 transition-colors"
          onClick={() => onEventClick?.(latestEvent.id)}
        >
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <Badge 
                variant="outline" 
                className={cn('shrink-0 text-[10px] gap-0.5', domainColors[latestEvent.domain.toLowerCase()])}
              >
                {domainIcons[latestEvent.domain.toLowerCase()]}
              </Badge>
              <span className="text-xs truncate">{latestEvent.title}</span>
            </div>
            <span className="text-[10px] text-muted-foreground font-mono shrink-0">
              {formatTimeAgo(latestEvent.timestamp)}
            </span>
          </div>
        </div>
      ) : (
        <div className="p-3 text-center text-xs text-muted-foreground">
          No recent events
        </div>
      )}
      
      {/* Open Full Timeline Link */}
      <Button
        variant="ghost"
        size="sm"
        className="w-full mt-2 text-xs text-muted-foreground gap-1"
        onClick={onOpenFullTimeline}
      >
        Open full event log
        <ChevronRight className="h-3 w-3" />
      </Button>
    </CollapsibleSection>
  );
}

function formatTimeAgo(date: Date): string {
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const minutes = Math.floor(diff / 60000);
  
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}
