/**
 * Thermal Rack Tooltip
 * Displays detailed rack information on hover
 */

import { Badge } from '@/components/ui/badge';
import { Thermometer, Wind, Cpu, AlertTriangle, Layers } from 'lucide-react';
import type { RackWithAisle } from './ThermalHeatmapUtils';
import { getTempStatus } from './ThermalHeatmapUtils';

interface ThermalRackTooltipProps {
  rack: RackWithAisle;
}

export function ThermalRackTooltip({ rack }: ThermalRackTooltipProps) {
  const status = getTempStatus(rack.inletTempC);
  const statusColor = {
    Stable: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
    Warning: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
    Critical: 'bg-red-500/20 text-red-400 border-red-500/30',
  }[status];

  return (
    <div className="bg-slate-900/95 backdrop-blur-sm border border-slate-700 rounded-lg p-3 shadow-xl min-w-[220px] text-sm">
      {/* Header */}
      <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-700">
        <span className="font-mono font-bold text-white">{rack.name}</span>
        <Badge className={statusColor}>{status}</Badge>
      </div>
      
      {/* Temperature readings */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="flex items-center gap-1.5 text-slate-400">
            <Thermometer className="h-3.5 w-3.5 text-blue-400" />
            Inlet Temp:
          </span>
          <span className="font-mono text-white">{rack.inletTempC.toFixed(1)}°C</span>
        </div>
        
        <div className="flex items-center justify-between">
          <span className="flex items-center gap-1.5 text-slate-400">
            <Thermometer className="h-3.5 w-3.5 text-red-400" />
            Outlet Temp:
          </span>
          <span className="font-mono text-white">{rack.outletTempC.toFixed(1)}°C</span>
        </div>
        
        <div className="flex items-center justify-between">
          <span className="text-slate-400">ΔT:</span>
          <span className={`font-mono font-medium ${rack.deltaT > 7 ? 'text-amber-400' : 'text-white'}`}>
            {rack.deltaT.toFixed(1)}°C
          </span>
        </div>
        
        <div className="flex items-center justify-between">
          <span className="flex items-center gap-1.5 text-slate-400">
            <Wind className="h-3.5 w-3.5 text-cyan-400" />
            Airflow:
          </span>
          <span className="font-mono text-white">{rack.airflowCFM} CFM</span>
        </div>
        
        {rack.avgGpuTemp > 0 && (
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1.5 text-slate-400">
              <Cpu className="h-3.5 w-3.5 text-purple-400" />
              GPU Temp Avg:
            </span>
            <span className="font-mono text-white">{rack.avgGpuTemp.toFixed(0)}°C</span>
          </div>
        )}
        
        <div className="flex items-center justify-between">
          <span className="flex items-center gap-1.5 text-slate-400">
            <AlertTriangle className="h-3.5 w-3.5 text-orange-400" />
            Hotspot Risk:
          </span>
          <span className={`font-mono font-medium ${rack.hotspotRisk > 30 ? 'text-red-400' : rack.hotspotRisk > 15 ? 'text-amber-400' : 'text-emerald-400'}`}>
            {rack.hotspotRisk}%
          </span>
        </div>
        
        <div className="flex items-center justify-between pt-2 border-t border-slate-700">
          <span className="flex items-center gap-1.5 text-slate-400">
            <Layers className="h-3.5 w-3.5 text-slate-400" />
            Cooling Zone:
          </span>
          <span className="font-mono text-cyan-400">{rack.containmentZone}</span>
        </div>
      </div>
    </div>
  );
}
