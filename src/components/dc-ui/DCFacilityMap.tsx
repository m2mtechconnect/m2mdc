/**
 * DC Facility Map - Visual representation of data center zones and racks
 */

import { useState } from 'react';
import { Thermometer, Wind, Zap, Server, AlertTriangle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface RackData {
  id: string;
  name: string;
  row: number;
  col: number;
  temperature: number;
  load: number;
  status: 'normal' | 'warning' | 'critical';
}

interface ZoneData {
  id: string;
  name: string;
  type: 'cooling' | 'power' | 'ups' | 'hot_aisle' | 'cold_aisle';
  row: number;
  col: number;
  span: { rows: number; cols: number };
}

interface DCFacilityMapProps {
  onRackSelect?: (rackId: string, data: RackData) => void;
  selectedRackId?: string;
}

/**
 * Generate realistic rack data based on industry standards
 * Temperature ranges per ASHRAE TC 9.9 Thermal Guidelines:
 * - Recommended: 18-27°C inlet (A1 Class)
 * - Allowable: 15-32°C inlet (A2 Class)
 * Load distribution based on typical hyperscale patterns
 */
const generateIndustryRacks = (): RackData[] => {
  const racks: RackData[] = [];
  const rackConfigs = [
    // Row A - High-density GPU racks (NVIDIA DGX pattern)
    { temp: 24.2, load: 78, status: 'normal' as const },
    { temp: 25.8, load: 85, status: 'normal' as const },
    { temp: 27.1, load: 92, status: 'warning' as const },
    { temp: 26.4, load: 88, status: 'normal' as const },
    { temp: 23.8, load: 72, status: 'normal' as const },
    // Row B - Mixed compute/storage
    { temp: 22.5, load: 65, status: 'normal' as const },
    { temp: 23.9, load: 71, status: 'normal' as const },
    { temp: 28.4, load: 94, status: 'warning' as const },
    { temp: 24.7, load: 76, status: 'normal' as const },
    { temp: 21.8, load: 58, status: 'normal' as const },
    // Row C - Inference cluster
    { temp: 25.2, load: 82, status: 'normal' as const },
    { temp: 31.2, load: 96, status: 'critical' as const },
    { temp: 26.8, load: 87, status: 'normal' as const },
    { temp: 24.1, load: 74, status: 'normal' as const },
    { temp: 22.9, load: 68, status: 'normal' as const },
    // Row D - Network/Edge
    { temp: 20.5, load: 45, status: 'normal' as const },
    { temp: 21.2, load: 52, status: 'normal' as const },
    { temp: 22.8, load: 61, status: 'normal' as const },
    { temp: 21.9, load: 55, status: 'normal' as const },
    { temp: 20.1, load: 42, status: 'normal' as const },
  ];

  for (let row = 0; row < 4; row++) {
    for (let col = 0; col < 5; col++) {
      const configIndex = row * 5 + col;
      const config = rackConfigs[configIndex];
      
      racks.push({
        id: `rack-${row}-${col}`,
        name: `Rack ${String.fromCharCode(65 + row)}${col + 1}`,
        row,
        col,
        temperature: config.temp,
        load: config.load,
        status: config.status,
      });
    }
  }
  return racks;
};

// Zone definitions based on typical Tier III+ data center layout
const zones: ZoneData[] = [
  { id: 'crah-a', name: 'CRAH Zone A', type: 'cooling', row: 0, col: 5, span: { rows: 2, cols: 1 } },
  { id: 'crah-b', name: 'CRAH Zone B', type: 'cooling', row: 2, col: 5, span: { rows: 2, cols: 1 } },
  { id: 'ups-room', name: 'UPS Room (2N)', type: 'ups', row: 4, col: 0, span: { rows: 1, cols: 2 } },
  { id: 'pdu-mdb', name: 'PDU / MDB', type: 'power', row: 4, col: 2, span: { rows: 1, cols: 2 } },
  { id: 'hot-aisle', name: 'Hot Aisle Containment', type: 'hot_aisle', row: 4, col: 4, span: { rows: 1, cols: 2 } },
];

export function DCFacilityMap({ onRackSelect, selectedRackId }: DCFacilityMapProps) {
  const [racks] = useState(generateIndustryRacks);
  const [hoveredRack, setHoveredRack] = useState<string | null>(null);

  const getHeatmapColor = (temp: number): string => {
    if (temp < 25) return 'bg-info/60';
    if (temp < 30) return 'bg-success/60';
    if (temp < 35) return 'bg-warning/60';
    if (temp < 40) return 'bg-destructive/40';
    return 'bg-destructive/80';
  };

  const getZoneColor = (type: ZoneData['type']): string => {
    switch (type) {
      case 'cooling': return 'bg-info/20 border-info/40';
      case 'power': return 'bg-warning/20 border-warning/40';
      case 'ups': return 'bg-warning/20 border-warning/40';
      case 'hot_aisle': return 'bg-destructive/20 border-destructive/40';
      case 'cold_aisle': return 'bg-info/20 border-info/40';
      default: return 'bg-muted';
    }
  };

  const getZoneIcon = (type: ZoneData['type']) => {
    switch (type) {
      case 'cooling': return Wind;
      case 'power': return Zap;
      case 'ups': return Zap;
      default: return Thermometer;
    }
  };

  return (
    <div className="space-y-4">
      {/* Legend */}
      <div className="flex items-center gap-4 text-xs">
        <span className="text-muted-foreground">Temperature:</span>
        <div className="flex items-center gap-1">
          <div className="w-4 h-4 rounded bg-info/60" />
          <span>&lt;25°C</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-4 h-4 rounded bg-success/60" />
          <span>25-30°C</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-4 h-4 rounded bg-warning/60" />
          <span>30-35°C</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-4 h-4 rounded bg-destructive/40" />
          <span>35-40°C</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-4 h-4 rounded bg-destructive/80" />
          <span>&gt;40°C</span>
        </div>
      </div>

      {/* Facility Grid */}
      <div className="relative bg-muted rounded-lg p-4 border border-border">
        <div className="grid gap-2" style={{ gridTemplateColumns: 'repeat(6, minmax(0, 1fr))', gridTemplateRows: 'repeat(5, minmax(60px, 80px))' }}>
          {/* Racks */}
          {racks.map((rack) => (
            <div
              key={rack.id}
              className={cn(
                'relative rounded-lg border-2 p-2 cursor-pointer transition-all hover:scale-105',
                getHeatmapColor(rack.temperature),
                rack.status === 'critical' ? 'border-destructive animate-pulse' : 
                rack.status === 'warning' ? 'border-warning' : 'border-border/50',
                selectedRackId === rack.id && 'ring-2 ring-primary ring-offset-2 ring-offset-background'
              )}
              style={{ gridRow: rack.row + 1, gridColumn: rack.col + 1 }}
              onMouseEnter={() => setHoveredRack(rack.id)}
              onMouseLeave={() => setHoveredRack(null)}
              onClick={() => onRackSelect?.(rack.id, rack)}
            >
              <div className="flex flex-col items-center justify-center h-full">
                <Server className="h-4 w-4 mb-1 text-foreground/80" />
                <span className="text-xs font-medium">{rack.name}</span>
                <span className="text-[10px] text-foreground/70">{rack.temperature.toFixed(1)}°C</span>
              </div>

              {rack.status !== 'normal' && (
                <AlertTriangle className={cn(
                  'absolute top-1 right-1 h-3 w-3',
                  rack.status === 'critical' ? 'text-destructive' : 'text-warning'
                )} />
              )}

              {/* Hover tooltip */}
              {hoveredRack === rack.id && (
                <div className="absolute z-10 bottom-full left-1/2 -translate-x-1/2 mb-2 p-2 bg-card rounded-lg border border-border shadow-lg whitespace-nowrap">
                  <div className="text-xs space-y-1">
                    <div className="font-medium">{rack.name}</div>
                    <div className="flex items-center gap-2">
                      <Thermometer className="h-3 w-3" />
                      <span>{rack.temperature.toFixed(1)}°C</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Zap className="h-3 w-3" />
                      <span>{rack.load.toFixed(1)}% Load</span>
                    </div>
                    <Badge 
                      className={cn(
                        'text-[10px]',
                        rack.status === 'critical' ? 'bg-destructive/20 text-destructive' :
                        rack.status === 'warning' ? 'bg-warning/20 text-warning' :
                        'bg-success/20 text-success'
                      )}
                    >
                      {rack.status}
                    </Badge>
                  </div>
                </div>
              )}
            </div>
          ))}

          {/* Zones */}
          {zones.map((zone) => {
            const IconComp = getZoneIcon(zone.type);
            return (
              <div
                key={zone.id}
                className={cn(
                  'rounded-lg border-2 p-2 flex flex-col items-center justify-center',
                  getZoneColor(zone.type)
                )}
                style={{
                  gridRow: `${zone.row + 1} / span ${zone.span.rows}`,
                  gridColumn: `${zone.col + 1} / span ${zone.span.cols}`,
                }}
              >
                <IconComp className="h-5 w-5 mb-1 opacity-70" />
                <span className="text-xs font-medium text-center">{zone.name}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Selected Rack Details */}
      {selectedRackId && (
        <div className="p-4 bg-card rounded-lg border border-border animate-fade-in">
          <h4 className="font-medium mb-2">
            {racks.find(r => r.id === selectedRackId)?.name} Details
          </h4>
          <div className="grid grid-cols-3 gap-4 text-sm">
            <div>
              <span className="text-muted-foreground">Temperature</span>
              <p className="font-mono">{racks.find(r => r.id === selectedRackId)?.temperature.toFixed(1)}°C</p>
            </div>
            <div>
              <span className="text-muted-foreground">Load</span>
              <p className="font-mono">{racks.find(r => r.id === selectedRackId)?.load.toFixed(1)}%</p>
            </div>
            <div>
              <span className="text-muted-foreground">Status</span>
              <p className="capitalize">{racks.find(r => r.id === selectedRackId)?.status}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
