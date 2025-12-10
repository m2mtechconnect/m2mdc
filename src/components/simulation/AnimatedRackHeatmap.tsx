/**
 * Animated Rack Heatmap Component
 * Shows rack temperature visualization with live updates
 * Color gradients from green (cool) to red (hot)
 */

import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Thermometer, AlertTriangle, Zap, Cpu } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { RackMetrics } from '@/simulation/types';
import { motion, AnimatePresence } from 'framer-motion';

interface AnimatedRackHeatmapProps {
  rackMetrics: RackMetrics[];
  isRunning?: boolean;
  onRackClick?: (rackId: string) => void;
  compact?: boolean;
}

// Generate default rack data if none provided
function generateDefaultRacks(count: number = 20): RackMetrics[] {
  return Array.from({ length: count }, (_, i) => ({
    rackId: `Rack-${String(i + 1).padStart(2, '0')}`,
    tempC: 22 + Math.random() * 8,
    powerKw: 8 + Math.random() * 4,
    gpuUtilPct: 60 + Math.random() * 30,
    alertLevel: 'normal' as const,
  }));
}

function getTempColor(tempC: number): string {
  // Green (20°C) -> Yellow (30°C) -> Orange (35°C) -> Red (40°C+)
  if (tempC <= 22) return 'bg-success/40 border-success/60';
  if (tempC <= 26) return 'bg-success/60 border-success/80';
  if (tempC <= 30) return 'bg-warning/40 border-warning/60';
  if (tempC <= 35) return 'bg-warning/70 border-warning/90';
  if (tempC <= 38) return 'bg-destructive/50 border-destructive/70';
  return 'bg-destructive/80 border-destructive animate-pulse';
}

function getAlertIndicator(rack: RackMetrics): { show: boolean; color: string; icon: any } {
  if (rack.tempC > 35 || rack.alertLevel === 'critical') {
    return { show: true, color: 'text-destructive', icon: AlertTriangle };
  }
  if (rack.tempC > 30 || rack.alertLevel === 'warning') {
    return { show: true, color: 'text-warning', icon: AlertTriangle };
  }
  return { show: false, color: '', icon: null };
}

function RackTile({ 
  rack, 
  isRunning, 
  onClick,
  index,
}: { 
  rack: RackMetrics; 
  isRunning: boolean;
  onClick?: () => void;
  index: number;
}) {
  const tempColor = getTempColor(rack.tempC);
  const alert = getAlertIndicator(rack);
  const isHot = rack.tempC > 35;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ 
              opacity: 1, 
              scale: 1,
              boxShadow: isHot && isRunning ? '0 0 20px rgba(239, 68, 68, 0.4)' : 'none'
            }}
            transition={{ 
              delay: index * 0.02,
              boxShadow: { duration: 0.5, repeat: isHot ? Infinity : 0, repeatType: 'reverse' }
            }}
            whileHover={{ scale: 1.05 }}
            onClick={onClick}
            className={cn(
              'relative aspect-square rounded-lg border-2 cursor-pointer transition-all duration-300',
              'flex flex-col items-center justify-center p-1',
              tempColor,
              onClick && 'hover:ring-2 hover:ring-primary/50'
            )}
          >
            {/* Rack ID */}
            <span className="text-[10px] font-mono font-bold text-foreground/90">
              {rack.rackId.replace('Rack-', '')}
            </span>
            
            {/* Temperature */}
            <motion.span 
              key={rack.tempC}
              initial={{ scale: 1.2 }}
              animate={{ scale: 1 }}
              className="text-xs font-mono text-foreground/80"
            >
              {rack.tempC.toFixed(0)}°
            </motion.span>

            {/* Alert indicator */}
            <AnimatePresence>
              {alert.show && (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  exit={{ scale: 0 }}
                  className="absolute -top-1 -right-1"
                >
                  <alert.icon className={cn('h-3 w-3', alert.color)} />
                </motion.div>
              )}
            </AnimatePresence>

            {/* Hot pulse effect */}
            {isHot && isRunning && (
              <motion.div
                className="absolute inset-0 rounded-lg border-2 border-destructive"
                animate={{ opacity: [0.3, 0.8, 0.3] }}
                transition={{ duration: 1, repeat: Infinity }}
              />
            )}
          </motion.div>
        </TooltipTrigger>
        <TooltipContent side="top" className="text-xs">
          <div className="space-y-1">
            <p className="font-semibold">{rack.rackId}</p>
            <div className="flex items-center gap-2">
              <Thermometer className="h-3 w-3" />
              <span>{rack.tempC.toFixed(1)}°C</span>
            </div>
            <div className="flex items-center gap-2">
              <Zap className="h-3 w-3" />
              <span>{rack.powerKw.toFixed(1)} kW</span>
            </div>
            <div className="flex items-center gap-2">
              <Cpu className="h-3 w-3" />
              <span>{rack.gpuUtilPct.toFixed(0)}% GPU</span>
            </div>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

export function AnimatedRackHeatmap({
  rackMetrics,
  isRunning = false,
  onRackClick,
  compact = false,
}: AnimatedRackHeatmapProps) {
  const racks = useMemo(() => {
    if (rackMetrics.length === 0) {
      return generateDefaultRacks(20);
    }
    return rackMetrics;
  }, [rackMetrics]);

  const hotRacks = racks.filter(r => r.tempC > 35).length;
  const avgTemp = racks.reduce((sum, r) => sum + r.tempC, 0) / racks.length;

  return (
    <Card className={cn('bg-card border-border', isRunning && 'ring-1 ring-primary/20')}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Thermometer className="h-4 w-4 text-primary" />
            Rack Thermal Map
          </CardTitle>
          <div className="flex items-center gap-2">
            {isRunning && (
              <Badge variant="outline" className="text-[10px] animate-pulse bg-success/10 text-success">
                LIVE
              </Badge>
            )}
            <Badge variant="outline" className="text-xs">
              Avg: {avgTemp.toFixed(1)}°C
            </Badge>
            {hotRacks > 0 && (
              <Badge variant="outline" className="text-xs text-destructive border-destructive/50">
                {hotRacks} Hot
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {/* Legend */}
        <div className="flex items-center gap-2 mb-3 text-[10px] text-muted-foreground">
          <span>Cool</span>
          <div className="flex gap-0.5">
            <div className="w-4 h-2 rounded-sm bg-success/60" />
            <div className="w-4 h-2 rounded-sm bg-warning/40" />
            <div className="w-4 h-2 rounded-sm bg-warning/70" />
            <div className="w-4 h-2 rounded-sm bg-destructive/50" />
            <div className="w-4 h-2 rounded-sm bg-destructive/80" />
          </div>
          <span>Hot</span>
        </div>

        {/* Rack Grid */}
        <div className={cn(
          'grid gap-1.5',
          compact ? 'grid-cols-10' : 'grid-cols-5 md:grid-cols-10'
        )}>
          {racks.map((rack, index) => (
            <RackTile
              key={rack.rackId}
              rack={rack}
              isRunning={isRunning}
              onClick={onRackClick ? () => onRackClick(rack.rackId) : undefined}
              index={index}
            />
          ))}
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-3 gap-2 mt-4 pt-3 border-t border-border">
          <div className="text-center">
            <p className="text-lg font-bold font-mono text-success">{racks.filter(r => r.tempC <= 28).length}</p>
            <p className="text-[10px] text-muted-foreground">Optimal</p>
          </div>
          <div className="text-center">
            <p className="text-lg font-bold font-mono text-warning">{racks.filter(r => r.tempC > 28 && r.tempC <= 35).length}</p>
            <p className="text-[10px] text-muted-foreground">Elevated</p>
          </div>
          <div className="text-center">
            <p className="text-lg font-bold font-mono text-destructive">{hotRacks}</p>
            <p className="text-[10px] text-muted-foreground">Critical</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
