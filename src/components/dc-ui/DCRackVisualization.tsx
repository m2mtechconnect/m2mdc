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
    operational: 'bg-dc-green/30 border-dc-green/50',
    normal: 'bg-dc-green/30 border-dc-green/50',
    warning: 'bg-dc-amber/30 border-dc-amber/50',
    critical: 'bg-dc-red/40 border-dc-red/60 animate-pulse-glow',
    offline: 'bg-muted/30 border-muted',
  };

  const getThermalColor = (temp: number) => {
    if (temp >= 80) return 'bg-dc-red';
    if (temp >= 70) return 'bg-dc-amber';
    if (temp >= 60) return 'bg-dc-green';
    return 'bg-dc-cyan';
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
              rack.avgTemperature >= 70 ? 'text-dc-amber' : 
              rack.avgTemperature >= 80 ? 'text-dc-red' : 'text-dc-green'
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
                  className="h-2 rounded-sm bg-noc-surface-elevated border border-noc-border"
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
                      serverStatus === 'operational' ? 'text-dc-green' :
                      serverStatus === 'warning' ? 'text-dc-amber' :
                      serverStatus === 'critical' ? 'text-dc-red' : 'text-muted-foreground'
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
          <span className="w-2 h-2 rounded-sm bg-dc-green/50" />
          <span>Normal</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-sm bg-dc-amber/50" />
          <span>Warm</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-sm bg-dc-red/50" />
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
    operational: 'bg-dc-green/20 border-dc-green/30',
    normal: 'bg-dc-green/20 border-dc-green/30',
    warning: 'bg-dc-amber/20 border-dc-amber/30',
    critical: 'bg-dc-red/20 border-dc-red/30',
  };

  const thermalColors = {
    low: 'bg-dc-green/60',
    medium: 'bg-dc-amber/60',
    high: 'bg-dc-red/60',
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
                <div className="h-full w-full rounded bg-noc-surface flex flex-col justify-end p-0.5 gap-0.5">
                  {rack.servers ? (
                    rack.servers.slice(0, 8).map((server, i) => {
                      const serverStatus = server.status === 'normal' ? 'operational' : server.status;
                      return (
                        <div
                          key={i}
                          className={cn(
                            'h-0.5 rounded-full',
                            serverStatus === 'critical' ? 'bg-dc-red' :
                            serverStatus === 'warning' ? 'bg-dc-amber' : 'bg-dc-green/60'
                          )}
                        />
                      );
                    })
                  ) : (
                    // Simplified view for racks without detailed server data
                    <div className={cn(
                      'h-full rounded',
                      rack.thermalLoad ? thermalColors[rack.thermalLoad] : 'bg-dc-green/40'
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
