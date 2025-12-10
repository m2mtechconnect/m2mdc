/**
 * CRAC/CRAH Summary Panel
 * Shows cooling unit status and health
 */

import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, ChevronUp, Snowflake, AlertTriangle, CheckCircle2, Pause } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import type { DataCentreFacility, CoolingUnit } from '@/types/dataCenterTwin';

interface CoolingUnitsPanelProps {
  facility: DataCentreFacility;
}

interface CoolingUnitDisplay {
  id: string;
  name: string;
  type: string;
  loadPct: number;
  coilDeltaT: number;
  humidityPct: number;
  status: 'healthy' | 'warning' | 'critical' | 'standby';
  zone: string;
}

export function CoolingUnitsPanel({ facility }: CoolingUnitsPanelProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  
  const units = useMemo<CoolingUnitDisplay[]>(() => {
    return facility.cooling.units.map((unit, index) => {
      const loadPct = unit.utilizationPct;
      const coilDeltaT = unit.coolingCoilDeltaT || unit.deltaT || 5.5;
      
      let status: CoolingUnitDisplay['status'] = 'healthy';
      if (unit.status === 'maintenance' || unit.status === 'offline') {
        status = 'standby';
      } else if (loadPct > 85 || coilDeltaT > 8) {
        status = 'warning';
      } else if (unit.status === 'critical') {
        status = 'critical';
      }
      
      return {
        id: unit.id,
        name: unit.name || `CRAC ${String.fromCharCode(65 + index)}`,
        type: unit.type,
        loadPct: Math.round(loadPct),
        coilDeltaT: Math.round(coilDeltaT * 10) / 10,
        humidityPct: Math.round(unit.humidityPct || 45),
        status,
        zone: unit.zone,
      };
    });
  }, [facility]);
  
  const statusConfig = {
    healthy: { 
      icon: CheckCircle2, 
      color: 'text-emerald-500', 
      bg: 'bg-emerald-500/10',
      label: 'Healthy' 
    },
    warning: { 
      icon: AlertTriangle, 
      color: 'text-amber-500', 
      bg: 'bg-amber-500/10',
      label: 'Warning' 
    },
    critical: { 
      icon: AlertTriangle, 
      color: 'text-red-500', 
      bg: 'bg-red-500/10',
      label: 'Critical' 
    },
    standby: { 
      icon: Pause, 
      color: 'text-slate-500', 
      bg: 'bg-slate-500/10',
      label: 'Standby' 
    },
  };
  
  return (
    <div className="rounded-lg border border-border/50 bg-card">
      {/* Header */}
      <Button
        variant="ghost"
        className="w-full flex items-center justify-between p-4 hover:bg-muted/50"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-2">
          <Snowflake className="h-4 w-4 text-blue-500" />
          <span className="font-semibold">CRAC/CRAH Units</span>
          <Badge variant="outline" className="ml-2">{units.length} units</Badge>
        </div>
        {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
      </Button>
      
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 space-y-2">
              {units.map((unit, index) => {
                const config = statusConfig[unit.status];
                const StatusIcon = config.icon;
                
                return (
                  <motion.div
                    key={unit.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.03 }}
                    className={`p-3 rounded-lg border border-border/30 ${config.bg}`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <StatusIcon className={`h-4 w-4 ${config.color}`} />
                        <span className="font-mono font-medium">{unit.name}</span>
                        <Badge variant="outline" className="text-xs">{unit.type}</Badge>
                      </div>
                      <Badge className={`${config.bg} ${config.color} border-0`}>
                        {config.label}
                      </Badge>
                    </div>
                    
                    {unit.status !== 'standby' && (
                      <div className="grid grid-cols-4 gap-4 mt-3 text-sm">
                        <div>
                          <span className="text-muted-foreground">Load:</span>
                          <div className="flex items-center gap-2 mt-1">
                            <Progress value={unit.loadPct} className="h-1.5 flex-1" />
                            <span className="font-mono text-xs">{unit.loadPct}%</span>
                          </div>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Coil ΔT:</span>
                          <span className="ml-2 font-mono">{unit.coilDeltaT}°C</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Humidity:</span>
                          <span className="ml-2 font-mono">{unit.humidityPct}%</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Zone:</span>
                          <span className="ml-2 font-mono text-cyan-500">{unit.zone}</span>
                        </div>
                      </div>
                    )}
                  </motion.div>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
