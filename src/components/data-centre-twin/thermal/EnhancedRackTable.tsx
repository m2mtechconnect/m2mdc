/**
 * Enhanced Rack Table
 * Detailed rack information with ΔT bars, hotspot scores, and trends
 */

import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { 
  TrendingUp, TrendingDown, Minus, Fan, Thermometer, 
  AlertTriangle, Layers, ChevronDown, ChevronUp,
  ArrowUpRight, ArrowDownRight 
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import type { RackWithAisle } from './ThermalHeatmapUtils';
import { getTempStatus } from './ThermalHeatmapUtils';

interface EnhancedRackTableProps {
  racks: RackWithAisle[];
  simulationDeltas?: Record<string, number>;
}

export function EnhancedRackTable({ racks, simulationDeltas }: EnhancedRackTableProps) {
  const [sortField, setSortField] = useState<'name' | 'inlet' | 'delta' | 'hotspot'>('inlet');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [expandedRack, setExpandedRack] = useState<string | null>(null);
  
  const sortedRacks = useMemo(() => {
    return [...racks].sort((a, b) => {
      let aVal: number, bVal: number;
      switch (sortField) {
        case 'name':
          return sortOrder === 'asc' 
            ? a.name.localeCompare(b.name) 
            : b.name.localeCompare(a.name);
        case 'inlet':
          aVal = a.inletTempC;
          bVal = b.inletTempC;
          break;
        case 'delta':
          aVal = a.deltaT;
          bVal = b.deltaT;
          break;
        case 'hotspot':
          aVal = a.hotspotRisk;
          bVal = b.hotspotRisk;
          break;
        default:
          aVal = a.inletTempC;
          bVal = b.inletTempC;
      }
      return sortOrder === 'asc' ? aVal - bVal : bVal - aVal;
    });
  }, [racks, sortField, sortOrder]);
  
  const handleSort = (field: typeof sortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('desc');
    }
  };
  
  const SortIcon = ({ field }: { field: typeof sortField }) => {
    if (sortField !== field) return null;
    return sortOrder === 'asc' ? 
      <ChevronUp className="h-3 w-3 ml-1" /> : 
      <ChevronDown className="h-3 w-3 ml-1" />;
  };
  
  return (
    <div className="rounded-lg border border-border/50 overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/30 hover:bg-muted/30">
            <TableHead className="w-[100px]">
              <Button 
                variant="ghost" 
                size="sm" 
                className="h-auto p-0 font-medium"
                onClick={() => handleSort('name')}
              >
                Rack <SortIcon field="name" />
              </Button>
            </TableHead>
            <TableHead>
              <Button 
                variant="ghost" 
                size="sm" 
                className="h-auto p-0 font-medium"
                onClick={() => handleSort('inlet')}
              >
                Inlet / Outlet <SortIcon field="inlet" />
              </Button>
            </TableHead>
            <TableHead>
              <Button 
                variant="ghost" 
                size="sm" 
                className="h-auto p-0 font-medium"
                onClick={() => handleSort('delta')}
              >
                ΔT <SortIcon field="delta" />
              </Button>
            </TableHead>
            <TableHead>Airflow</TableHead>
            <TableHead>
              <Button 
                variant="ghost" 
                size="sm" 
                className="h-auto p-0 font-medium"
                onClick={() => handleSort('hotspot')}
              >
                Hotspot Risk <SortIcon field="hotspot" />
              </Button>
            </TableHead>
            <TableHead>Cooling Zone</TableHead>
            <TableHead>Trend</TableHead>
            {simulationDeltas && <TableHead>Sim Delta</TableHead>}
          </TableRow>
        </TableHeader>
        <TableBody>
          {sortedRacks.map((rack, index) => {
            const status = getTempStatus(rack.inletTempC);
            const deltaStatus = rack.deltaT > 7 ? 'High' : rack.deltaT > 5 ? 'Normal' : 'Low';
            const simDelta = simulationDeltas?.[rack.id];
            
            // Mock trend (in real app, would come from time-series data)
            const trend = rack.inletTempC > 26 ? 'up' : rack.inletTempC < 23 ? 'down' : 'stable';
            
            return (
              <motion.tr
                key={rack.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.02 }}
                className="hover:bg-muted/20 cursor-pointer"
                onClick={() => setExpandedRack(expandedRack === rack.id ? null : rack.id)}
              >
                <TableCell className="font-mono font-medium">
                  {rack.name}
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <span className={`font-mono ${
                      status === 'Critical' ? 'text-red-500' :
                      status === 'Warning' ? 'text-amber-500' : ''
                    }`}>
                      {rack.inletTempC.toFixed(1)}°C
                    </span>
                    <span className="text-muted-foreground">/</span>
                    <span className="font-mono text-muted-foreground">
                      {rack.outletTempC.toFixed(1)}°C
                    </span>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <div className="w-16">
                      <Progress 
                        value={(rack.deltaT / 12) * 100} 
                        className={`h-2 ${
                          deltaStatus === 'High' ? '[&>div]:bg-red-500' :
                          deltaStatus === 'Normal' ? '[&>div]:bg-amber-500' : '[&>div]:bg-emerald-500'
                        }`}
                      />
                    </div>
                    <span className={`font-mono text-xs ${
                      deltaStatus === 'High' ? 'text-red-500' :
                      deltaStatus === 'Normal' ? 'text-amber-500' : 'text-emerald-500'
                    }`}>
                      {rack.deltaT.toFixed(1)}°C
                      <span className="ml-1 text-muted-foreground">({deltaStatus})</span>
                    </span>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-1 text-sm">
                    <Fan className="h-3 w-3 text-muted-foreground" />
                    <span className="font-mono">{rack.airflowCFM} CFM</span>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <div className="w-12">
                      <Progress 
                        value={rack.hotspotRisk} 
                        className={`h-2 ${
                          rack.hotspotRisk > 30 ? '[&>div]:bg-red-500' :
                          rack.hotspotRisk > 15 ? '[&>div]:bg-amber-500' : '[&>div]:bg-emerald-500'
                        }`}
                      />
                    </div>
                    <span className={`font-mono text-xs ${
                      rack.hotspotRisk > 30 ? 'text-red-500' :
                      rack.hotspotRisk > 15 ? 'text-amber-500' : 'text-emerald-500'
                    }`}>
                      {rack.hotspotRisk}%
                    </span>
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant="outline" className="font-mono text-cyan-500">
                    {rack.containmentZone}
                  </Badge>
                </TableCell>
                <TableCell>
                  {trend === 'up' ? (
                    <div className="flex items-center text-red-500">
                      <ArrowUpRight className="h-4 w-4" />
                      <span className="text-xs">+0.3°</span>
                    </div>
                  ) : trend === 'down' ? (
                    <div className="flex items-center text-emerald-500">
                      <ArrowDownRight className="h-4 w-4" />
                      <span className="text-xs">-0.2°</span>
                    </div>
                  ) : (
                    <Minus className="h-4 w-4 text-muted-foreground" />
                  )}
                </TableCell>
                {simulationDeltas && (
                  <TableCell>
                    {simDelta !== undefined && (
                      <span className={`font-mono text-xs ${
                        simDelta > 0 ? 'text-red-500' : 'text-emerald-500'
                      }`}>
                        {simDelta > 0 ? '+' : ''}{simDelta.toFixed(1)}°C
                      </span>
                    )}
                  </TableCell>
                )}
              </motion.tr>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
