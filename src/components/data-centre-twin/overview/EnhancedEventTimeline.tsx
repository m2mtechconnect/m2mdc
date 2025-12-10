/**
 * Enhanced Event Timeline with categorized markers and zoom/pan
 */

import { useState, useMemo, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Slider } from '@/components/ui/slider';
import { 
  Clock, ZoomIn, ZoomOut, Play, Pause,
  Thermometer, Zap, Wind, Network, Shield, Cpu, Globe, Leaf
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
  isSimulated?: boolean;
}

interface EnhancedEventTimelineProps {
  events: TimelineEvent[];
  simulationEvents?: TimelineEvent[];
  isSimulationMode?: boolean;
  onEventClick?: (eventId: string) => void;
  onSeek?: (timestamp: Date) => void;
}

const domainColors: Record<string, { bg: string; border: string; text: string }> = {
  thermal: { bg: 'bg-destructive/20', border: 'border-destructive/50', text: 'text-destructive' },
  power: { bg: 'bg-warning/20', border: 'border-warning/50', text: 'text-warning' },
  cooling: { bg: 'bg-info/20', border: 'border-info/50', text: 'text-info' },
  network: { bg: 'bg-purple-500/20', border: 'border-purple-500/50', text: 'text-purple-500' },
  workload: { bg: 'bg-accent/20', border: 'border-accent/50', text: 'text-accent' },
  sovereignty: { bg: 'bg-primary/20', border: 'border-primary/50', text: 'text-primary' },
  carbon: { bg: 'bg-success/20', border: 'border-success/50', text: 'text-success' },
  financial: { bg: 'bg-amber-500/20', border: 'border-amber-500/50', text: 'text-amber-500' },
};

const domainIcons: Record<string, React.ReactNode> = {
  thermal: <Thermometer className="h-3 w-3" />,
  power: <Zap className="h-3 w-3" />,
  cooling: <Wind className="h-3 w-3" />,
  network: <Network className="h-3 w-3" />,
  workload: <Cpu className="h-3 w-3" />,
  sovereignty: <Globe className="h-3 w-3" />,
  carbon: <Leaf className="h-3 w-3" />,
  financial: <Leaf className="h-3 w-3" />,
};

export function EnhancedEventTimeline({ 
  events, 
  simulationEvents = [],
  isSimulationMode = false,
  onEventClick,
  onSeek
}: EnhancedEventTimelineProps) {
  const [zoomLevel, setZoomLevel] = useState(1);
  const [selectedEvent, setSelectedEvent] = useState<TimelineEvent | null>(null);
  const [currentTime, setCurrentTime] = useState(50); // percentage
  const timelineRef = useRef<HTMLDivElement>(null);
  
  const displayEvents = isSimulationMode 
    ? [...events, ...simulationEvents.map(e => ({ ...e, isSimulated: true }))]
    : events;
  
  const sortedEvents = useMemo(() => 
    [...displayEvents].sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime()),
    [displayEvents]
  );
  
  const timeRange = useMemo(() => {
    if (sortedEvents.length === 0) return { start: new Date(), end: new Date() };
    const now = new Date();
    const hoursAgo = 24 / zoomLevel;
    return {
      start: new Date(now.getTime() - hoursAgo * 60 * 60 * 1000),
      end: now
    };
  }, [sortedEvents, zoomLevel]);
  
  const visibleEvents = useMemo(() => 
    sortedEvents.filter(e => 
      e.timestamp >= timeRange.start && e.timestamp <= timeRange.end
    ),
    [sortedEvents, timeRange]
  );
  
  const getEventPosition = (event: TimelineEvent): number => {
    const totalMs = timeRange.end.getTime() - timeRange.start.getTime();
    const eventMs = event.timestamp.getTime() - timeRange.start.getTime();
    return (eventMs / totalMs) * 100;
  };
  
  const handleZoomIn = () => setZoomLevel(prev => Math.min(prev * 2, 8));
  const handleZoomOut = () => setZoomLevel(prev => Math.max(prev / 2, 0.5));
  
  return (
    <CollapsibleSection
      title="Event Timeline"
      badge={isSimulationMode ? 'Simulation' : 'Live'}
      defaultOpen={true}
      icon={<Clock className="h-5 w-5 text-primary" />}
    >
      {/* Controls */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" className="h-7 w-7" onClick={handleZoomOut}>
            <ZoomOut className="h-3.5 w-3.5" />
          </Button>
          <span className="text-xs text-muted-foreground font-mono w-12 text-center">
            {zoomLevel}x
          </span>
          <Button variant="outline" size="icon" className="h-7 w-7" onClick={handleZoomIn}>
            <ZoomIn className="h-3.5 w-3.5" />
          </Button>
        </div>
        
        <div className="flex items-center gap-1">
          {Object.entries(domainColors).slice(0, 6).map(([domain, colors]) => (
            <Badge 
              key={domain} 
              variant="outline" 
              className={cn('text-[10px] gap-0.5', colors.bg, colors.border, colors.text)}
            >
              {domainIcons[domain]}
            </Badge>
          ))}
        </div>
        
        {isSimulationMode && (
          <Badge className="bg-info/10 text-info border-info/30 gap-1">
            <Play className="h-3 w-3" />
            Simulation Active
          </Badge>
        )}
      </div>
      
      {/* Timeline Track */}
      <div 
        ref={timelineRef}
        className="relative h-16 bg-muted/30 rounded-lg border border-border mb-4 overflow-hidden"
      >
        {/* Time labels */}
        <div className="absolute inset-x-0 bottom-0 flex justify-between px-2 py-1 text-[10px] text-muted-foreground font-mono">
          <span>{formatTime(timeRange.start)}</span>
          <span>Now</span>
        </div>
        
        {/* Event markers */}
        {visibleEvents.map((event) => {
          const position = getEventPosition(event);
          const colors = domainColors[event.domain.toLowerCase()] || domainColors.thermal;
          
          return (
            <button
              key={event.id}
              className={cn(
                'absolute top-2 w-2.5 h-8 rounded-sm transition-all hover:scale-125 cursor-pointer',
                colors.bg,
                colors.border,
                'border',
                event.isSimulated && 'ring-2 ring-info ring-offset-1',
                event.severity === 'critical' && 'animate-pulse'
              )}
              style={{ left: `${position}%`, transform: 'translateX(-50%)' }}
              onClick={() => setSelectedEvent(event)}
            />
          );
        })}
        
        {/* Current time indicator */}
        <div 
          className="absolute top-0 bottom-0 w-0.5 bg-primary"
          style={{ left: `${currentTime}%` }}
        >
          <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-2 h-2 rounded-full bg-primary" />
        </div>
      </div>
      
      {/* Seek Slider */}
      <div className="mb-4">
        <Slider
          value={[currentTime]}
          onValueChange={([value]) => {
            setCurrentTime(value);
            const seekTime = new Date(
              timeRange.start.getTime() + 
              (value / 100) * (timeRange.end.getTime() - timeRange.start.getTime())
            );
            onSeek?.(seekTime);
          }}
          max={100}
          step={1}
          className="w-full"
        />
      </div>
      
      {/* Recent Events List */}
      <div className="space-y-2">
        {visibleEvents.slice(0, 5).map((event) => {
          const colors = domainColors[event.domain.toLowerCase()] || domainColors.thermal;
          
          return (
            <div
              key={event.id}
              className={cn(
                'flex items-center justify-between p-2 rounded-lg border cursor-pointer transition-all hover:bg-muted/30',
                event.severity === 'critical' && 'border-destructive/30',
                event.severity === 'warning' && 'border-warning/30',
                event.isSimulated && 'bg-info/5 border-info/30'
              )}
              onClick={() => setSelectedEvent(event)}
            >
              <div className="flex items-center gap-2">
                <Badge variant="outline" className={cn('gap-0.5', colors.bg, colors.border, colors.text)}>
                  {domainIcons[event.domain.toLowerCase()]}
                  <span className="text-[10px]">{event.domain}</span>
                </Badge>
                <span className="text-sm truncate max-w-[200px]">{event.title}</span>
                {event.isSimulated && (
                  <Badge variant="outline" className="text-[10px] bg-info/10 text-info">
                    SIM
                  </Badge>
                )}
              </div>
              <span className="text-xs text-muted-foreground font-mono">
                {formatTime(event.timestamp)}
              </span>
            </div>
          );
        })}
      </div>
      
      {/* Event Detail Modal */}
      <Dialog open={!!selectedEvent} onOpenChange={() => setSelectedEvent(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {selectedEvent && domainIcons[selectedEvent.domain.toLowerCase()]}
              Event Details
            </DialogTitle>
          </DialogHeader>
          
          {selectedEvent && (
            <div className="space-y-4">
              <div className="p-4 rounded-lg bg-muted/30 border border-border">
                <div className="flex items-center gap-2 mb-2">
                  <Badge variant="outline" className={cn(
                    domainColors[selectedEvent.domain.toLowerCase()]?.bg,
                    domainColors[selectedEvent.domain.toLowerCase()]?.text
                  )}>
                    {selectedEvent.domain}
                  </Badge>
                  <Badge variant={selectedEvent.severity === 'critical' ? 'destructive' : 'outline'}>
                    {selectedEvent.severity}
                  </Badge>
                  {selectedEvent.isSimulated && (
                    <Badge className="bg-info/10 text-info">Simulated</Badge>
                  )}
                </div>
                <p className="font-medium mb-1">{selectedEvent.title}</p>
                <p className="text-sm text-muted-foreground">{selectedEvent.description}</p>
              </div>
              
              <div className="text-sm">
                <span className="text-muted-foreground">Occurred at: </span>
                <span className="font-mono">{selectedEvent.timestamp.toLocaleString()}</span>
              </div>
              
              <div className="flex justify-end">
                <Button variant="outline" onClick={() => setSelectedEvent(null)}>
                  Close
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </CollapsibleSection>
  );
}

function formatTime(date: Date): string {
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}
