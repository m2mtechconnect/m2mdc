/**
 * SimulationTimeline Component
 * Horizontal timeline with event markers and playback controls
 * POLISHED: Enhanced animations, better visual hierarchy
 */

import { useMemo } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Play, 
  Pause, 
  SkipForward, 
  RotateCcw,
  Zap,
  Snowflake,
  Network,
  Cpu,
  Shield
} from 'lucide-react';
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

const DOMAIN_CONFIG: Record<string, { icon: typeof Zap; label: string }> = {
  power: { icon: Zap, label: 'Power' },
  cooling: { icon: Snowflake, label: 'Cooling' },
  network: { icon: Network, label: 'Network' },
  compute: { icon: Cpu, label: 'Compute' },
  sovereignty: { icon: Shield, label: 'Sovereignty' }
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
  const progressPercent = Math.min((currentTime / durationSeconds) * 100, 100);

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
    const percent = Math.max(0, Math.min(1, x / rect.width));
    onSeek(percent * durationSeconds);
  };

  return (
    <div className="bg-card/95 backdrop-blur-sm border border-border rounded-lg p-4 shadow-lg">
      {/* Controls */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-1.5">
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-8 w-8 hover:bg-muted"
            onClick={onReset}
            title="Reset"
          >
            <RotateCcw className="h-4 w-4" />
          </Button>
          <Button 
            variant={isPlaying ? "secondary" : "default"}
            size="icon" 
            className="h-9 w-9"
            onClick={onPlayPause}
            title={isPlaying ? "Pause" : "Play"}
          >
            {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4 ml-0.5" />}
          </Button>
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-8 w-8 hover:bg-muted"
            onClick={() => onSeek(Math.min(currentTime + 30, durationSeconds))}
            title="Skip 30s"
          >
            <SkipForward className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 bg-muted/50 px-2.5 py-1 rounded-md">
            <span className="text-sm font-mono font-medium text-foreground tabular-nums">
              {formatTime(currentTime)}
            </span>
            <span className="text-muted-foreground">/</span>
            <span className="text-sm font-mono text-muted-foreground tabular-nums">
              {formatTime(durationSeconds)}
            </span>
          </div>
          {events.length > 0 && (
            <Badge variant="outline" className="text-xs font-medium">
              {events.filter(e => e.timeSeconds <= currentTime).length}/{events.length} events
            </Badge>
          )}
        </div>
      </div>

      {/* Timeline track */}
      <div 
        className="relative h-10 bg-muted/50 rounded-lg cursor-pointer group overflow-hidden"
        onClick={handleTrackClick}
      >
        {/* Progress bar with gradient */}
        <div 
          className="absolute top-0 left-0 h-full bg-gradient-to-r from-primary/40 to-primary/20 rounded-l-lg transition-all duration-100"
          style={{ width: `${progressPercent}%` }}
        />
        
        {/* Playhead */}
        <div 
          className="absolute top-0 w-0.5 h-full bg-primary shadow-lg transition-all duration-100 z-10"
          style={{ left: `${progressPercent}%` }}
        >
          <div className="absolute -top-0.5 -left-2 w-4 h-4 bg-primary rounded-full shadow-md flex items-center justify-center">
            <div className="w-1.5 h-1.5 bg-primary-foreground rounded-full" />
          </div>
        </div>

        {/* Event markers */}
        {sortedEvents.map((event) => {
          const position = (event.timeSeconds / durationSeconds) * 100;
          const isPast = event.timeSeconds <= currentTime;
          const DomainIcon = DOMAIN_CONFIG[event.domain]?.icon || Cpu;
          
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
                className={`w-2.5 h-8 rounded-sm transition-all duration-150 ${
                  event.severity === 'critical' 
                    ? 'bg-destructive hover:bg-destructive/80' 
                    : event.severity === 'warning' 
                      ? 'bg-warning hover:bg-warning/80' 
                      : 'bg-info hover:bg-info/80'
                } ${isPast ? 'opacity-100' : 'opacity-60'} hover:scale-110`}
              />
              
              {/* Tooltip on hover */}
              <div className="absolute bottom-10 left-1/2 -translate-x-1/2 opacity-0 group-hover/event:opacity-100 transition-opacity pointer-events-none z-20">
                <div className="bg-popover border border-border rounded-lg p-2.5 shadow-xl whitespace-nowrap">
                  <div className="flex items-center gap-1.5 font-medium text-sm text-foreground">
                    <DomainIcon className="h-3.5 w-3.5" />
                    <span>{event.label}</span>
                  </div>
                  <div className="text-xs text-muted-foreground mt-1 flex items-center gap-2">
                    <span>{formatTime(event.timeSeconds)}</span>
                    <Badge 
                      variant="outline" 
                      className={`text-[10px] h-4 px-1 ${
                        event.severity === 'critical' ? 'border-destructive text-destructive' :
                        event.severity === 'warning' ? 'border-warning text-warning' : ''
                      }`}
                    >
                      {event.severity}
                    </Badge>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Event chips */}
      {events.length > 0 && (
        <div className="flex gap-1.5 mt-3 flex-wrap">
          {sortedEvents.slice(0, 6).map((event) => {
            const isPast = event.timeSeconds <= currentTime;
            const DomainIcon = DOMAIN_CONFIG[event.domain]?.icon || Cpu;
            
            return (
              <Badge
                key={event.id}
                variant={isPast ? "secondary" : "outline"}
                className={`cursor-pointer text-xs gap-1 transition-all ${
                  isPast ? 'opacity-100' : 'opacity-50 hover:opacity-75'
                }`}
                onClick={() => {
                  onEventClick(event.id);
                  onSeek(event.timeSeconds);
                }}
              >
                <DomainIcon className="h-3 w-3" />
                {event.label}
              </Badge>
            );
          })}
          {events.length > 6 && (
            <Badge variant="outline" className="text-xs opacity-60">
              +{events.length - 6} more
            </Badge>
          )}
        </div>
      )}
    </div>
  );
}
