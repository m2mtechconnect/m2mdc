/**
 * Data Centre Rack Visualization Component
 * Visual representation of rack status with thermal overlay
 */

import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip';

export interface RackServer {
  id: string;
  slot: number;
  name: string;
  status: 'operational' | 'warning' | 'critical' | 'offline' | 'normal';
  temperature: number;
  powerDraw: number;
  gpuCount?: number;
  gpuUtilization?: number;
}

export interface RackData {
  id: string;
  name: string;
  totalSlots?: number;
  servers?: RackServer[];
  avgTemperature?: number;
  totalPowerDraw?: number;
  status: 'operational' | 'warning' | 'critical' | 'normal';
  // Simplified props for quick overview
  powerKw?: number;
  thermalLoad?: 'low' | 'medium' | 'high';
}

interface DCRackVisualizationProps {
  rack: RackData;
  showTemperature?: boolean;
  showPower?: boolean;
  onServerClick?: (server: RackServer) => void;
  className?: string;
}

export function DCRackVisualization({
  rack,
  showTemperature = true,
  showPower = false,
  onServerClick,
  className,
}: DCRackVisualizationProps) {
  const statusColors = {
    operational: 'bg-success/30 border-success/50',
    normal: 'bg-success/30 border-success/50',
    warning: 'bg-warning/30 border-warning/50',
    critical: 'bg-destructive/40 border-destructive/60 animate-pulse',
    offline: 'bg-muted/30 border-muted',
  };

  const getThermalColor = (temp: number) => {
    if (temp >= 80) return 'bg-destructive';
    if (temp >= 70) return 'bg-warning';
    if (temp >= 60) return 'bg-success';
    return 'bg-info';
  };

  // Handle racks without servers array
  if (!rack.servers || !rack.totalSlots) {
    return (
      <div className={cn('flex flex-col gap-2', className)}>
        <div className="flex items-center justify-between px-2">
          <span className="text-xs font-semibold">{rack.name}</span>
        </div>
        <div className={cn('noc-card p-2 h-16 flex items-center justify-center', statusColors[rack.status])}>
          <span className="text-xs text-muted-foreground">
            {rack.powerKw ? `${rack.powerKw.toFixed(1)} kW` : 'No data'}
          </span>
        </div>
      </div>
    );
  }

  // Create slot map
  const slotMap = new Map<number, RackServer>();
  rack.servers.forEach(server => slotMap.set(server.slot, server));

  const slots = Array.from({ length: rack.totalSlots }, (_, i) => i + 1);

  return (
    <div className={cn('flex flex-col gap-2', className)}>
      {/* Rack header */}
      <div className="flex items-center justify-between px-2">
        <span className="text-xs font-semibold">{rack.name}</span>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          {showTemperature && rack.avgTemperature && (
            <span className={cn(
              'font-mono',
              rack.avgTemperature >= 70 ? 'text-warning' : 
              rack.avgTemperature >= 80 ? 'text-destructive' : 'text-success'
            )}>
              {rack.avgTemperature}°C
            </span>
          )}
          {showPower && rack.totalPowerDraw && (
            <span className="font-mono">{rack.totalPowerDraw}W</span>
          )}
        </div>
      </div>

      {/* Rack visualization */}
      <TooltipProvider>
        <div className="noc-card p-2 space-y-1">
          {slots.reverse().map(slotNum => {
            const server = slotMap.get(slotNum);
            
            if (!server) {
              return (
                <div
                  key={slotNum}
                  className="h-2 rounded-sm bg-muted border border-border"
                />
              );
            }

            const serverStatus = server.status === 'normal' ? 'operational' : server.status;

            return (
              <Tooltip key={slotNum}>
                <TooltipTrigger asChild>
                  <div
                    onClick={() => onServerClick?.(server)}
                    className={cn(
                      'h-2 rounded-sm border cursor-pointer transition-all hover:opacity-80',
                      statusColors[serverStatus]
                    )}
                  >
                    {showTemperature && (
                      <div
                        className={cn('h-full rounded-sm', getThermalColor(server.temperature))}
                        style={{ width: `${Math.min((server.temperature / 100) * 100, 100)}%` }}
                      />
                    )}
                  </div>
                </TooltipTrigger>
                <TooltipContent side="right" className="noc-card-elevated">
                  <div className="space-y-1 text-xs">
                    <div className="font-semibold">{server.name}</div>
                    <div className="flex gap-4">
                      <span>Temp: <span className="font-mono">{server.temperature}°C</span></span>
                      <span>Power: <span className="font-mono">{server.powerDraw}W</span></span>
                    </div>
                    {server.gpuCount && (
                      <div>
                        GPUs: <span className="font-mono">{server.gpuCount}</span> @ <span className="font-mono">{server.gpuUtilization}%</span>
                      </div>
                    )}
                    <div className={cn(
                      'capitalize',
                      serverStatus === 'operational' ? 'text-success' :
                      serverStatus === 'warning' ? 'text-warning' :
                      serverStatus === 'critical' ? 'text-destructive' : 'text-muted-foreground'
                    )}>
                      {serverStatus}
                    </div>
                  </div>
                </TooltipContent>
              </Tooltip>
            );
          })}
        </div>
      </TooltipProvider>

      {/* Legend */}
      <div className="flex items-center gap-3 px-2 text-[10px] text-muted-foreground">
        <div className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-sm bg-success/50" />
          <span>Normal</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-sm bg-warning/50" />
          <span>Warm</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-sm bg-destructive/50" />
          <span>Hot</span>
        </div>
      </div>
    </div>
  );
}

// Mini rack grid for overview
interface DCRackGridProps {
  racks: RackData[];
  columns?: number;
  onRackClick?: (rackId: string) => void;
  className?: string;
}

export function DCRackGrid({ racks, columns = 4, onRackClick, className }: DCRackGridProps) {
  const statusBg = {
    operational: 'bg-success/20 border-success/30',
    normal: 'bg-success/20 border-success/30',
    warning: 'bg-warning/20 border-warning/30',
    critical: 'bg-destructive/20 border-destructive/30',
  };

  const thermalColors = {
    low: 'bg-success/60',
    medium: 'bg-warning/60',
    high: 'bg-destructive/60',
  };

  return (
    <div 
      className={cn('grid gap-2', className)}
      style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}
    >
      {racks.map(rack => (
        <TooltipProvider key={rack.id}>
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={() => onRackClick?.(rack.id)}
                className={cn(
                  'aspect-square rounded border-2 p-1 transition-all hover:scale-105',
                  statusBg[rack.status]
                )}
              >
                <div className="h-full w-full rounded bg-muted flex flex-col justify-end p-0.5 gap-0.5">
                  {rack.servers ? (
                    rack.servers.slice(0, 8).map((server, i) => {
                      const serverStatus = server.status === 'normal' ? 'operational' : server.status;
                      return (
                        <div
                          key={i}
                          className={cn(
                            'h-0.5 rounded-full',
                            serverStatus === 'critical' ? 'bg-destructive' :
                            serverStatus === 'warning' ? 'bg-warning' : 'bg-success/60'
                          )}
                        />
                      );
                    })
                  ) : (
                    // Simplified view for racks without detailed server data
                    <div className={cn(
                      'h-full rounded',
                      rack.thermalLoad ? thermalColors[rack.thermalLoad] : 'bg-success/40'
                    )} />
                  )}
                </div>
              </button>
            </TooltipTrigger>
            <TooltipContent>
              <div className="text-xs">
                <div className="font-semibold">{rack.name}</div>
                <div>
                  {rack.servers ? `${rack.servers.length} servers` : 'Rack'} 
                  {rack.avgTemperature ? ` • ${rack.avgTemperature}°C` : ''}
                  {rack.powerKw ? ` • ${rack.powerKw.toFixed(1)} kW` : ''}
                </div>
              </div>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      ))}
    </div>
  );
}

export default DCRackVisualization;
