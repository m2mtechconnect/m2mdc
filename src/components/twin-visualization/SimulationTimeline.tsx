/**
 * SimulationTimeline Component
 * Horizontal timeline with event markers
 */

import { useMemo } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Play, Pause, SkipForward, RotateCcw } from 'lucide-react';
import type { SimulationEventVisual } from './types';

interface SimulationTimelineProps {
  events: SimulationEventVisual[];
  durationSeconds: number;
  currentTime: number;
  isPlaying: boolean;
  onSeek: (time: number) => void;
  onEventClick: (eventId: string) => void;
  onPlayPause: () => void;
  onReset: () => void;
}

const SEVERITY_COLORS: Record<string, string> = {
  info: 'bg-info text-info-foreground',
  warning: 'bg-warning text-warning-foreground',
  critical: 'bg-destructive text-destructive-foreground'
};

const DOMAIN_ICONS: Record<string, string> = {
  power: '⚡',
  cooling: '❄️',
  network: '🌐',
  compute: '💻',
  sovereignty: '🛡️'
};

export function SimulationTimeline({
  events,
  durationSeconds,
  currentTime,
  isPlaying,
  onSeek,
  onEventClick,
  onPlayPause,
  onReset
}: SimulationTimelineProps) {
  const progressPercent = (currentTime / durationSeconds) * 100;

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const sortedEvents = useMemo(() => 
    [...events].sort((a, b) => a.timeSeconds - b.timeSeconds),
    [events]
  );

  const handleTrackClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const percent = x / rect.width;
    onSeek(percent * durationSeconds);
  };

  return (
    <div className="bg-background/95 backdrop-blur-sm border border-border rounded-lg p-4 shadow-lg">
      {/* Controls */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            size="icon" 
            className="h-8 w-8"
            onClick={onReset}
          >
            <RotateCcw className="h-4 w-4" />
          </Button>
          <Button 
            variant="default" 
            size="icon" 
            className="h-8 w-8"
            onClick={onPlayPause}
          >
            {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
          </Button>
          <Button 
            variant="outline" 
            size="icon" 
            className="h-8 w-8"
            onClick={() => onSeek(Math.min(currentTime + 30, durationSeconds))}
          >
            <SkipForward className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-sm font-mono text-foreground">
            {formatTime(currentTime)} / {formatTime(durationSeconds)}
          </span>
          <Badge variant="outline" className="text-xs">
            {events.length} events
          </Badge>
        </div>
      </div>

      {/* Timeline track */}
      <div 
        className="relative h-8 bg-muted rounded-md cursor-pointer group"
        onClick={handleTrackClick}
      >
        {/* Progress bar */}
        <div 
          className="absolute top-0 left-0 h-full bg-primary/30 rounded-l-md transition-all"
          style={{ width: `${progressPercent}%` }}
        />
        
        {/* Playhead */}
        <div 
          className="absolute top-0 w-0.5 h-full bg-primary shadow-md transition-all"
          style={{ left: `${progressPercent}%` }}
        >
          <div className="absolute -top-1 -left-1.5 w-3 h-3 bg-primary rounded-full" />
        </div>

        {/* Event markers */}
        {sortedEvents.map((event) => {
          const position = (event.timeSeconds / durationSeconds) * 100;
          return (
            <div
              key={event.id}
              className="absolute top-1 -translate-x-1/2 cursor-pointer group/event"
              style={{ left: `${position}%` }}
              onClick={(e) => {
                e.stopPropagation();
                onEventClick(event.id);
                onSeek(event.timeSeconds);
              }}
            >
              <div 
                className={`w-2 h-6 rounded-sm ${
                  event.severity === 'critical' ? 'bg-destructive' :
                  event.severity === 'warning' ? 'bg-warning' : 'bg-info'
                } hover:scale-110 transition-transform`}
              />
              
              {/* Tooltip on hover */}
              <div className="absolute bottom-8 left-1/2 -translate-x-1/2 opacity-0 group-hover/event:opacity-100 transition-opacity pointer-events-none z-10">
                <div className="bg-popover border border-border rounded-md p-2 shadow-lg whitespace-nowrap text-xs">
                  <div className="flex items-center gap-1 font-medium">
                    <span>{DOMAIN_ICONS[event.domain]}</span>
                    <span>{event.label}</span>
                  </div>
                  <div className="text-muted-foreground mt-0.5">
                    {formatTime(event.timeSeconds)}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Event list */}
      {events.length > 0 && (
        <div className="flex gap-2 mt-3 flex-wrap">
          {sortedEvents.slice(0, 5).map((event) => (
            <Badge
              key={event.id}
              variant="outline"
              className={`cursor-pointer text-xs ${
                event.timeSeconds <= currentTime ? 'opacity-100' : 'opacity-50'
              }`}
              onClick={() => {
                onEventClick(event.id);
                onSeek(event.timeSeconds);
              }}
            >
              {DOMAIN_ICONS[event.domain]} {event.label}
            </Badge>
          ))}
          {events.length > 5 && (
            <Badge variant="secondary" className="text-xs">
              +{events.length - 5} more
            </Badge>
          )}
        </div>
      )}
    </div>
  );
}
