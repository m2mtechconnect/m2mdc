/**
 * Cooling Correlation Panel
 * Shows relationship between cooling zones and affected racks
 */

import { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, ChevronUp, Layers, Wind, DollarSign, Activity } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import type { DataCentreFacility } from '@/types/dataCenterTwin';

interface CoolingCorrelationPanelProps {
  facility: DataCentreFacility;
}

interface CoolingZoneCorrelation {
  id: string;
  name: string;
  affectedRacks: string[];
  efficiency: number;
  airflowCFM: number;
  energyCostPerHour: number;
  status: 'optimal' | 'warning' | 'degraded';
  deltaT: number;
}

export function CoolingCorrelationPanel({ facility }: CoolingCorrelationPanelProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  
  const correlations = useMemo<CoolingZoneCorrelation[]>(() => {
    const zones = facility.cooling.zones;
    const racks = facility.thermalHardware.racks;
    
    // Map each zone to affected racks based on zone assignment
    return zones.map((zone, index) => {
      // Assign racks to zones (roughly 2-4 racks per zone)
      const rackStartIndex = Math.floor(index * racks.length / zones.length);
      const rackEndIndex = Math.floor((index + 1) * racks.length / zones.length);
      const affectedRacks = racks.slice(rackStartIndex, rackEndIndex).map(r => r.name);
      
      // Calculate efficiency based on zone performance
      const efficiency = Math.min(100, Math.max(0, 
        100 - Math.abs(zone.ambientTempC - zone.targetTempC) * 10
      ));
      
      // Calculate airflow
      const airflowCFM = zone.airflowCfm || Math.round(zone.units?.reduce((sum, u) => sum + (u.fanSpeedRpm || 0) * 0.05, 0) || 50000);
      
      // Estimate energy cost
      const energyCostPerHour = (zone.pueContribution || 0.15) * 0.12; // $0.12/kWh base rate
      
      // Determine status
      const deltaT = Math.abs(zone.ambientTempC - zone.targetTempC);
      let status: 'optimal' | 'warning' | 'degraded' = 'optimal';
      if (efficiency < 70) status = 'degraded';
      else if (efficiency < 85) status = 'warning';
      
      return {
        id: zone.id,
        name: zone.name,
        affectedRacks,
        efficiency: Math.round(efficiency),
        airflowCFM,
        energyCostPerHour,
        status,
        deltaT,
      };
    });
  }, [facility]);
  
  const statusColors = {
    optimal: 'bg-emerald-500/10 border-emerald-500/30 text-emerald-500',
    warning: 'bg-amber-500/10 border-amber-500/30 text-amber-500',
    degraded: 'bg-red-500/10 border-red-500/30 text-red-500',
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
          <Layers className="h-4 w-4 text-cyan-500" />
          <span className="font-semibold">Cooling Zone Correlation</span>
          <Badge variant="outline" className="ml-2">{correlations.length} zones</Badge>
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
            <div className="px-4 pb-4 space-y-3">
              {correlations.map((zone, index) => (
                <motion.div
                  key={zone.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="p-3 rounded-lg bg-muted/30 border border-border/30"
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{zone.name}</span>
                      <Badge className={statusColors[zone.status]}>
                        {zone.status}
                      </Badge>
                    </div>
                    <span className="text-sm text-muted-foreground">
                      → {zone.affectedRacks.length > 3 
                        ? `Racks ${zone.affectedRacks[0]} – ${zone.affectedRacks[zone.affectedRacks.length - 1]}`
                        : zone.affectedRacks.join(', ')}
                    </span>
                  </div>
                  
                  <div className="grid grid-cols-4 gap-4 text-sm">
                    <div className="flex items-center gap-2">
                      <Activity className="h-3.5 w-3.5 text-muted-foreground" />
                      <span className="text-muted-foreground">Efficiency:</span>
                      <span className={`font-mono font-medium ${
                        zone.efficiency >= 85 ? 'text-emerald-500' :
                        zone.efficiency >= 70 ? 'text-amber-500' : 'text-red-500'
                      }`}>
                        {zone.efficiency}%
                      </span>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <Wind className="h-3.5 w-3.5 text-muted-foreground" />
                      <span className="text-muted-foreground">Airflow:</span>
                      <span className="font-mono">{zone.airflowCFM.toLocaleString()} CFM</span>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <DollarSign className="h-3.5 w-3.5 text-muted-foreground" />
                      <span className="text-muted-foreground">Cost:</span>
                      <span className="font-mono">${zone.energyCostPerHour.toFixed(3)}/hr</span>
                    </div>
                    
                    <div>
                      <Progress 
                        value={zone.efficiency} 
                        className="h-2"
                      />
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
