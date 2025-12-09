import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { MapPin, Activity, Thermometer, Zap, AlertTriangle, CheckCircle2, XCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Sensor {
  id: string;
  name: string;
  type: 'temperature' | 'motion' | 'power' | 'pressure' | 'humidity';
  location: { x: number; y: number; zone: string };
  status: 'healthy' | 'warning' | 'critical' | 'offline';
  value: number;
  unit: string;
  lastUpdate: string;
  threshold?: { min: number; max: number };
}

interface Zone {
  id: string;
  name: string;
  bounds: { x: number; y: number; width: number; height: number };
  color: string;
  sensorCount: number;
  healthySensors: number;
}

interface DigitalTwinSpatialViewProps {
  twinId: string;
  sensors?: Sensor[];
  zones?: Zone[];
  viewMode?: '2d' | '3d' | 'list';
}

export function DigitalTwinSpatialView({ 
  twinId, 
  sensors: propSensors,
  zones: propZones,
  viewMode: initialViewMode = '2d' 
}: DigitalTwinSpatialViewProps) {
  const [viewMode, setViewMode] = useState<'2d' | '3d' | 'list'>(initialViewMode);
  const [selectedSensor, setSelectedSensor] = useState<Sensor | null>(null);
  const [selectedZone, setSelectedZone] = useState<string | null>(null);

  // Mock data - in production, fetch from digital_twins table
  const mockSensors: Sensor[] = propSensors || [
    {
      id: 's1',
      name: 'Gate A Temperature',
      type: 'temperature',
      location: { x: 150, y: 100, zone: 'zone-1' },
      status: 'healthy',
      value: 22.5,
      unit: '°C',
      lastUpdate: new Date().toISOString(),
      threshold: { min: 15, max: 30 }
    },
    {
      id: 's2',
      name: 'Baggage Belt Motion',
      type: 'motion',
      location: { x: 300, y: 200, zone: 'zone-2' },
      status: 'healthy',
      value: 100,
      unit: '%',
      lastUpdate: new Date().toISOString(),
    },
    {
      id: 's3',
      name: 'Terminal Power',
      type: 'power',
      location: { x: 450, y: 150, zone: 'zone-3' },
      status: 'warning',
      value: 85,
      unit: 'kW',
      lastUpdate: new Date(Date.now() - 120000).toISOString(),
      threshold: { min: 0, max: 100 }
    },
    {
      id: 's4',
      name: 'Runway Pressure',
      type: 'pressure',
      location: { x: 200, y: 350, zone: 'zone-4' },
      status: 'critical',
      value: 95,
      unit: 'PSI',
      lastUpdate: new Date(Date.now() - 300000).toISOString(),
      threshold: { min: 0, max: 90 }
    },
  ];

  const mockZones: Zone[] = propZones || [
    { id: 'zone-1', name: 'Terminal Gates', bounds: { x: 50, y: 50, width: 250, height: 150 }, color: 'hsl(var(--primary))', sensorCount: 1, healthySensors: 1 },
    { id: 'zone-2', name: 'Baggage Handling', bounds: { x: 250, y: 150, width: 200, height: 150 }, color: 'hsl(var(--secondary))', sensorCount: 1, healthySensors: 1 },
    { id: 'zone-3', name: 'Terminal Infrastructure', bounds: { x: 400, y: 100, width: 150, height: 150 }, color: 'hsl(var(--accent))', sensorCount: 1, healthySensors: 0 },
    { id: 'zone-4', name: 'Runway Operations', bounds: { x: 100, y: 300, width: 250, height: 150 }, color: 'hsl(var(--muted))', sensorCount: 1, healthySensors: 0 },
  ];

  const sensors = mockSensors;
  const zones = mockZones;

  const getSensorIcon = (type: Sensor['type']) => {
    switch (type) {
      case 'temperature': return Thermometer;
      case 'motion': return Activity;
      case 'power': return Zap;
      default: return MapPin;
    }
  };

  const getSensorStatusColor = (status: Sensor['status']) => {
    switch (status) {
      case 'healthy': return 'text-green-500';
      case 'warning': return 'text-yellow-500';
      case 'critical': return 'text-red-500';
      case 'offline': return 'text-gray-500';
    }
  };

  const getSensorStatusIcon = (status: Sensor['status']) => {
    switch (status) {
      case 'healthy': return CheckCircle2;
      case 'warning': return AlertTriangle;
      case 'critical': return XCircle;
      case 'offline': return XCircle;
    }
  };

  const filteredSensors = selectedZone 
    ? sensors.filter(s => s.location.zone === selectedZone)
    : sensors;

  return (
    <div className="space-y-4">
      {/* View Mode Tabs */}
      <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as typeof viewMode)}>
        <TabsList>
          <TabsTrigger value="2d">2D Map</TabsTrigger>
          <TabsTrigger value="3d" disabled>3D View</TabsTrigger>
          <TabsTrigger value="list">List View</TabsTrigger>
        </TabsList>

        {/* 2D Map View */}
        <TabsContent value="2d" className="space-y-4">
          <div className="grid grid-cols-4 gap-4">
            {/* Spatial Map */}
            <Card className="col-span-3">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MapPin className="h-5 w-5" />
                  Spatial Layout
                </CardTitle>
                <CardDescription>
                  Interactive sensor and zone visualization
                </CardDescription>
              </CardHeader>
              <CardContent>
                <svg 
                  viewBox="0 0 600 500" 
                  className="w-full border rounded-lg bg-muted/20"
                  style={{ minHeight: '400px' }}
                >
                  {/* Zones */}
                  {zones.map(zone => (
                    <g key={zone.id}>
                      <rect
                        x={zone.bounds.x}
                        y={zone.bounds.y}
                        width={zone.bounds.width}
                        height={zone.bounds.height}
                        fill={selectedZone === zone.id ? 'hsl(var(--primary) / 0.2)' : 'hsl(var(--muted) / 0.1)'}
                        stroke={selectedZone === zone.id ? 'hsl(var(--primary))' : 'hsl(var(--border))'}
                        strokeWidth={selectedZone === zone.id ? 2 : 1}
                        className="cursor-pointer transition-all"
                        onClick={() => setSelectedZone(selectedZone === zone.id ? null : zone.id)}
                      />
                      <text
                        x={zone.bounds.x + zone.bounds.width / 2}
                        y={zone.bounds.y + 20}
                        textAnchor="middle"
                        className="text-xs fill-foreground/60 pointer-events-none"
                      >
                        {zone.name}
                      </text>
                    </g>
                  ))}

                  {/* Sensors */}
                  {sensors.map(sensor => (
                    <g 
                      key={sensor.id}
                      className="cursor-pointer"
                      onClick={() => setSelectedSensor(sensor)}
                    >
                      <circle
                        cx={sensor.location.x}
                        cy={sensor.location.y}
                        r={selectedSensor?.id === sensor.id ? 12 : 8}
                        fill={
                          sensor.status === 'healthy' ? 'hsl(142 76% 36%)' :
                          sensor.status === 'warning' ? 'hsl(38 92% 50%)' :
                          sensor.status === 'critical' ? 'hsl(0 84% 60%)' :
                          'hsl(240 5% 64%)'
                        }
                        className="transition-all"
                      />
                      {selectedSensor?.id === sensor.id && (
                        <circle
                          cx={sensor.location.x}
                          cy={sensor.location.y}
                          r={16}
                          fill="none"
                          stroke="hsl(var(--primary))"
                          strokeWidth={2}
                          className="animate-pulse"
                        />
                      )}
                    </g>
                  ))}
                </svg>
              </CardContent>
            </Card>

            {/* Sensor Details Panel */}
            <Card className="col-span-1">
              <CardHeader>
                <CardTitle className="text-sm">
                  {selectedSensor ? 'Sensor Details' : 'Zone Overview'}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {selectedSensor ? (
                  <>
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        {(() => {
                          const Icon = getSensorIcon(selectedSensor.type);
                          const StatusIcon = getSensorStatusIcon(selectedSensor.status);
                          return (
                            <>
                              <Icon className="h-4 w-4" />
                              <span className="font-medium text-sm">{selectedSensor.name}</span>
                            </>
                          );
                        })()}
                      </div>
                      <Badge variant={selectedSensor.status === 'healthy' ? 'default' : 'destructive'}>
                        {selectedSensor.status}
                      </Badge>
                    </div>

                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Current Value</span>
                        <span className="font-mono font-medium">
                          {selectedSensor.value} {selectedSensor.unit}
                        </span>
                      </div>

                      {selectedSensor.threshold && (
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Threshold</span>
                          <span className="font-mono text-xs">
                            {selectedSensor.threshold.min} - {selectedSensor.threshold.max}
                          </span>
                        </div>
                      )}

                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Last Update</span>
                        <span className="text-xs">
                          {new Date(selectedSensor.lastUpdate).toLocaleTimeString()}
                        </span>
                      </div>
                    </div>

                    <Button 
                      size="sm" 
                      variant="outline" 
                      className="w-full"
                      onClick={() => setSelectedSensor(null)}
                    >
                      Clear Selection
                    </Button>
                  </>
                ) : (
                  <div className="space-y-3">
                    <p className="text-sm text-muted-foreground">
                      Click on sensors or zones to view details
                    </p>
                    
                    <div className="space-y-2">
                      {zones.map(zone => (
                        <Button
                          key={zone.id}
                          variant={selectedZone === zone.id ? 'default' : 'ghost'}
                          size="sm"
                          className="w-full justify-start"
                          onClick={() => setSelectedZone(selectedZone === zone.id ? null : zone.id)}
                        >
                          <div className="flex items-center justify-between w-full">
                            <span className="text-xs">{zone.name}</span>
                            <Badge variant="outline" className="text-xs">
                              {zone.healthySensors}/{zone.sensorCount}
                            </Badge>
                          </div>
                        </Button>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* List View */}
        <TabsContent value="list" className="space-y-2">
          {filteredSensors.map(sensor => {
            const Icon = getSensorIcon(sensor.type);
            const StatusIcon = getSensorStatusIcon(sensor.status);
            return (
              <Card 
                key={sensor.id}
                className={cn(
                  "cursor-pointer transition-all",
                  selectedSensor?.id === sensor.id && "ring-2 ring-primary"
                )}
                onClick={() => setSelectedSensor(sensor)}
              >
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={cn(
                        "p-2 rounded-lg",
                        sensor.status === 'healthy' && "bg-green-500/10",
                        sensor.status === 'warning' && "bg-yellow-500/10",
                        sensor.status === 'critical' && "bg-red-500/10",
                        sensor.status === 'offline' && "bg-gray-500/10"
                      )}>
                        <Icon className={cn("h-5 w-5", getSensorStatusColor(sensor.status))} />
                      </div>
                      
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{sensor.name}</span>
                          <StatusIcon className={cn("h-4 w-4", getSensorStatusColor(sensor.status))} />
                        </div>
                        <p className="text-sm text-muted-foreground capitalize">{sensor.type} Sensor</p>
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="text-lg font-mono font-semibold">
                        {sensor.value} {sensor.unit}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {new Date(sensor.lastUpdate).toLocaleTimeString()}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </TabsContent>
      </Tabs>
    </div>
  );
}
