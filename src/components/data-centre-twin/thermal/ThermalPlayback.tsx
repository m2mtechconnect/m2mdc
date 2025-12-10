/**
 * Thermal Playback Timeline
 * 24-hour historical slider with event markers
 */

import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Play, Pause, RotateCcw, Clock, AlertCircle, Thermometer } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import type { DataCentreFacility } from '@/types/dataCenterTwin';

interface ThermalPlaybackProps {
  facility: DataCentreFacility;
  isSimulationMode?: boolean;
  onTimeChange?: (hourOffset: number) => void;
}

interface ThermalEvent {
  id: string;
  hour: number;
  type: 'hotspot' | 'cooling' | 'threshold' | 'recovery';
  message: string;
  severity: 'info' | 'warning' | 'critical';
}

export function ThermalPlayback({ facility, isSimulationMode = false, onTimeChange }: ThermalPlaybackProps) {
  const [currentHour, setCurrentHour] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  
  // Generate mock thermal events over 24 hours
  const events = useMemo<ThermalEvent[]>(() => {
    const hotRacks = facility.thermalHardware.racks.filter(r => r.inletTempC >= 28);
    
    const baseEvents: ThermalEvent[] = [
      { id: 'e1', hour: 2, type: 'cooling', message: 'CRAC B entered maintenance mode', severity: 'info' },
      { id: 'e2', hour: 6, type: 'threshold', message: 'Rack R07 crossed 28°C threshold', severity: 'warning' },
      { id: 'e3', hour: 9, type: 'hotspot', message: 'Hotspot detected in Hot Aisle A', severity: 'critical' },
      { id: 'e4', hour: 12, type: 'cooling', message: 'Increased cooling in Zone B', severity: 'info' },
      { id: 'e5', hour: 14, type: 'recovery', message: 'Thermal stability restored', severity: 'info' },
      { id: 'e6', hour: 18, type: 'threshold', message: 'GPU temps rising in Cluster 1', severity: 'warning' },
      { id: 'e7', hour: 22, type: 'cooling', message: 'Night mode cooling activated', severity: 'info' },
    ];
    
    if (hotRacks.length > 0) {
      baseEvents.push({
        id: 'e8',
        hour: 10,
        type: 'hotspot',
        message: `${hotRacks[0].name} showing elevated temps`,
        severity: 'warning',
      });
    }
    
    return baseEvents.sort((a, b) => a.hour - b.hour);
  }, [facility]);
  
  const handleSliderChange = (value: number[]) => {
    const hour = value[0];
    setCurrentHour(hour);
    onTimeChange?.(hour);
  };
  
  const handlePlayPause = () => {
    setIsPlaying(!isPlaying);
    // In real implementation, this would start an interval
  };
  
  const handleReset = () => {
    setCurrentHour(0);
    setIsPlaying(false);
    onTimeChange?.(0);
  };
  
  const severityColors = {
    info: 'bg-blue-500',
    warning: 'bg-amber-500',
    critical: 'bg-red-500',
  };
  
  const formatHour = (hour: number) => {
    const now = new Date();
    const target = new Date(now.getTime() - (24 - hour) * 60 * 60 * 1000);
    return target.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };
  
  return (
    <div className="rounded-lg border border-border/50 bg-card p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Clock className="h-4 w-4 text-purple-500" />
          <span className="font-semibold">Thermal Timeline</span>
          {isSimulationMode && (
            <Badge className="bg-purple-500/20 text-purple-500 border-purple-500/30">
              Simulation
            </Badge>
          )}
        </div>
        
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="font-mono">
            {formatHour(currentHour)}
          </Badge>
          <span className="text-sm text-muted-foreground">
            ({currentHour}h ago)
          </span>
        </div>
      </div>
      
      {/* Timeline with event markers */}
      <div className="relative mb-4">
        {/* Event markers */}
        <div className="absolute top-0 left-0 right-0 h-2 pointer-events-none">
          <TooltipProvider delayDuration={100}>
            {events.map((event) => (
              <Tooltip key={event.id}>
                <TooltipTrigger asChild>
                  <div
                    className={`absolute top-0 w-2 h-2 rounded-full ${severityColors[event.severity]} cursor-pointer pointer-events-auto`}
                    style={{ left: `${(event.hour / 24) * 100}%`, transform: 'translateX(-50%)' }}
                  />
                </TooltipTrigger>
                <TooltipContent side="top" className="max-w-xs">
                  <div className="text-xs">
                    <div className="font-medium">{formatHour(event.hour)}</div>
                    <div className="text-muted-foreground">{event.message}</div>
                  </div>
                </TooltipContent>
              </Tooltip>
            ))}
          </TooltipProvider>
        </div>
        
        {/* Slider */}
        <div className="pt-4">
          <Slider
            value={[currentHour]}
            max={24}
            step={0.5}
            onValueChange={handleSliderChange}
            className="w-full"
          />
        </div>
        
        {/* Time labels */}
        <div className="flex justify-between mt-1 text-xs text-muted-foreground">
          <span>24h ago</span>
          <span>18h</span>
          <span>12h</span>
          <span>6h</span>
          <span>Now</span>
        </div>
      </div>
      
      {/* Playback controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={handlePlayPause}
            className="h-8 w-8 p-0"
          >
            {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={handleReset}
            className="h-8 w-8 p-0"
          >
            <RotateCcw className="h-4 w-4" />
          </Button>
          
          <div className="flex gap-1 ml-2">
            {[1, 2, 4].map((speed) => (
              <Button
                key={speed}
                size="sm"
                variant={playbackSpeed === speed ? 'default' : 'outline'}
                onClick={() => setPlaybackSpeed(speed)}
                className="h-7 px-2 text-xs"
              >
                {speed}x
              </Button>
            ))}
          </div>
        </div>
        
        {/* Current events */}
        <div className="flex items-center gap-2">
          {events
            .filter(e => Math.abs(e.hour - currentHour) < 0.5)
            .slice(0, 1)
            .map(event => (
              <motion.div
                key={event.id}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className={`flex items-center gap-1 px-2 py-1 rounded text-xs ${
                  event.severity === 'critical' ? 'bg-red-500/20 text-red-500' :
                  event.severity === 'warning' ? 'bg-amber-500/20 text-amber-500' :
                  'bg-blue-500/20 text-blue-500'
                }`}
              >
                <AlertCircle className="h-3 w-3" />
                {event.message}
              </motion.div>
            ))}
        </div>
      </div>
    </div>
  );
}
