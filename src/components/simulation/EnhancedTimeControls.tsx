/**
 * Enhanced Time Controls
 * Pause, rewind, checkpoint, resume, jump to event
 */

import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { 
  Play, 
  Pause, 
  SkipBack, 
  SkipForward, 
  Rewind, 
  FastForward,
  Flag,
  Clock,
  Bookmark
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface Checkpoint {
  id: string;
  time: number;
  label: string;
  type: 'manual' | 'event' | 'auto';
}

interface EnhancedTimeControlsProps {
  currentTime: number;
  totalDuration: number;
  isPlaying: boolean;
  playbackSpeed: number;
  onPlay: () => void;
  onPause: () => void;
  onSeek: (time: number) => void;
  onSpeedChange: (speed: number) => void;
  checkpoints?: Checkpoint[];
  onAddCheckpoint?: () => void;
  className?: string;
}

const SPEED_OPTIONS = [0.5, 1, 2, 5, 10];

export function EnhancedTimeControls({
  currentTime,
  totalDuration,
  isPlaying,
  playbackSpeed,
  onPlay,
  onPause,
  onSeek,
  onSpeedChange,
  checkpoints = [],
  onAddCheckpoint,
  className
}: EnhancedTimeControlsProps) {
  const [showCheckpoints, setShowCheckpoints] = useState(false);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleRewind = () => onSeek(Math.max(0, currentTime - 10));
  const handleFastForward = () => onSeek(Math.min(totalDuration, currentTime + 10));
  const handleSkipBack = () => {
    const prevCheckpoint = [...checkpoints]
      .reverse()
      .find(cp => cp.time < currentTime - 1);
    onSeek(prevCheckpoint?.time || 0);
  };
  const handleSkipForward = () => {
    const nextCheckpoint = checkpoints.find(cp => cp.time > currentTime + 1);
    onSeek(nextCheckpoint?.time || totalDuration);
  };

  return (
    <Card className={cn("bg-card/50", className)}>
      <CardContent className="p-4">
        {/* Progress Bar with Checkpoints */}
        <div className="relative mb-4">
          <Slider
            value={[currentTime]}
            max={totalDuration}
            step={1}
            onValueChange={(v) => onSeek(v[0])}
            className="w-full"
          />
          
          {/* Checkpoint Markers */}
          {checkpoints.map(cp => (
            <button
              key={cp.id}
              className={cn(
                "absolute top-1/2 -translate-y-1/2 w-2 h-4 rounded-sm cursor-pointer transition-transform hover:scale-125",
                cp.type === 'event' ? 'bg-destructive' : 
                cp.type === 'manual' ? 'bg-primary' : 'bg-muted-foreground'
              )}
              style={{ left: `${(cp.time / totalDuration) * 100}%` }}
              onClick={() => onSeek(cp.time)}
              title={`${cp.label} (${formatTime(cp.time)})`}
            />
          ))}
        </div>

        {/* Time Display */}
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm font-mono text-muted-foreground">
            {formatTime(currentTime)}
          </span>
          <Badge variant="outline" className="text-xs">
            {playbackSpeed}x
          </Badge>
          <span className="text-sm font-mono text-muted-foreground">
            {formatTime(totalDuration)}
          </span>
        </div>

        {/* Control Buttons */}
        <div className="flex items-center justify-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={handleSkipBack}
            title="Previous checkpoint"
          >
            <SkipBack className="h-4 w-4" />
          </Button>
          
          <Button
            variant="ghost"
            size="icon"
            onClick={handleRewind}
            title="Rewind 10s"
          >
            <Rewind className="h-4 w-4" />
          </Button>
          
          <Button
            variant="default"
            size="icon"
            onClick={isPlaying ? onPause : onPlay}
            className="h-10 w-10"
          >
            {isPlaying ? (
              <Pause className="h-5 w-5" />
            ) : (
              <Play className="h-5 w-5 ml-0.5" />
            )}
          </Button>
          
          <Button
            variant="ghost"
            size="icon"
            onClick={handleFastForward}
            title="Fast forward 10s"
          >
            <FastForward className="h-4 w-4" />
          </Button>
          
          <Button
            variant="ghost"
            size="icon"
            onClick={handleSkipForward}
            title="Next checkpoint"
          >
            <SkipForward className="h-4 w-4" />
          </Button>

          <div className="w-px h-6 bg-border mx-2" />

          <Button
            variant="ghost"
            size="icon"
            onClick={onAddCheckpoint}
            title="Add checkpoint"
          >
            <Flag className="h-4 w-4" />
          </Button>

          <Button
            variant="ghost"
            size="icon"
            onClick={() => setShowCheckpoints(!showCheckpoints)}
            title="View checkpoints"
          >
            <Bookmark className="h-4 w-4" />
          </Button>
        </div>

        {/* Speed Controls */}
        <div className="flex items-center justify-center gap-2 mt-3">
          <Clock className="h-3 w-3 text-muted-foreground" />
          {SPEED_OPTIONS.map(speed => (
            <Button
              key={speed}
              variant={playbackSpeed === speed ? "default" : "ghost"}
              size="sm"
              className="h-6 px-2 text-xs"
              onClick={() => onSpeedChange(speed)}
            >
              {speed}x
            </Button>
          ))}
        </div>

        {/* Checkpoint List */}
        {showCheckpoints && checkpoints.length > 0 && (
          <div className="mt-3 border-t border-border pt-3">
            <div className="text-xs font-medium text-muted-foreground mb-2">
              Checkpoints ({checkpoints.length})
            </div>
            <div className="space-y-1 max-h-32 overflow-y-auto">
              {checkpoints.map(cp => (
                <button
                  key={cp.id}
                  onClick={() => onSeek(cp.time)}
                  className="w-full flex items-center justify-between p-1.5 rounded text-xs hover:bg-muted transition-colors"
                >
                  <span className="flex items-center gap-2">
                    <span className={cn(
                      "w-2 h-2 rounded-full",
                      cp.type === 'event' ? 'bg-destructive' : 
                      cp.type === 'manual' ? 'bg-primary' : 'bg-muted-foreground'
                    )} />
                    {cp.label}
                  </span>
                  <span className="font-mono text-muted-foreground">
                    {formatTime(cp.time)}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
