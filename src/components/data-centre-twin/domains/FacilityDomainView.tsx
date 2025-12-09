/**
 * Facility & Safety Domain View
 */

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Shield, Droplets, Wind, Flame, AlertTriangle, CheckCircle } from 'lucide-react';
import type { DataCentreFacility } from '@/types/dataCenterTwin';

interface FacilityDomainViewProps {
  facility: DataCentreFacility;
}

export function FacilityDomainView({ facility }: FacilityDomainViewProps) {
  // Mock facility safety data
  const safetyMetrics = {
    waterLeakSensors: { total: 24, alarmed: 0 },
    smokeDetectors: { total: 48, alarmed: 0 },
    fireSuppression: { status: 'armed', lastTest: '2024-01-15' },
    hydrogenSensors: { total: 8, maxPpm: 12 },
    pm25: 8.5,
    pm10: 15.2,
  };
  
  return (
    <div className="space-y-6">
      {/* Safety Score */}
      <div className="grid gap-4 md:grid-cols-4">
        <MetricCard
          title="Safety Score"
          value="96%"
          status="good"
          icon={Shield}
        />
        <MetricCard
          title="Water Leak Status"
          value={`${safetyMetrics.waterLeakSensors.alarmed}/${safetyMetrics.waterLeakSensors.total}`}
          subtitle="sensors clear"
          status={safetyMetrics.waterLeakSensors.alarmed === 0 ? 'good' : 'critical'}
          icon={Droplets}
        />
        <MetricCard
          title="Air Quality (PM2.5)"
          value={`${safetyMetrics.pm25} µg/m³`}
          status={safetyMetrics.pm25 < 12 ? 'good' : safetyMetrics.pm25 < 35 ? 'warning' : 'critical'}
          icon={Wind}
        />
        <MetricCard
          title="Fire Suppression"
          value={safetyMetrics.fireSuppression.status}
          status="good"
          icon={Flame}
        />
      </div>

      {/* Sensor Grid */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Water Leak Sensors */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Droplets className="h-4 w-4 text-blue-500" />
              Water Leak Detection
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-6 gap-2">
              {Array.from({ length: safetyMetrics.waterLeakSensors.total }).map((_, i) => (
                <div 
                  key={i}
                  className="aspect-square rounded-lg bg-green-500/20 border border-green-500/40 flex items-center justify-center"
                  title={`Sensor ${i + 1}: OK`}
                >
                  <CheckCircle className="h-4 w-4 text-green-500" />
                </div>
              ))}
            </div>
            <p className="text-xs text-muted-foreground mt-3">
              All {safetyMetrics.waterLeakSensors.total} sensors operational • Last check: Just now
            </p>
          </CardContent>
        </Card>

        {/* Smoke Detectors */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Flame className="h-4 w-4 text-orange-500" />
              Smoke Detection
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-8 gap-2">
              {Array.from({ length: safetyMetrics.smokeDetectors.total }).map((_, i) => (
                <div 
                  key={i}
                  className="aspect-square rounded-lg bg-green-500/20 border border-green-500/40 flex items-center justify-center"
                  title={`Detector ${i + 1}: OK`}
                >
                  <div className="w-2 h-2 rounded-full bg-green-500" />
                </div>
              ))}
            </div>
            <p className="text-xs text-muted-foreground mt-3">
              All {safetyMetrics.smokeDetectors.total} detectors operational
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Environmental Monitoring */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Environmental Monitoring</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="p-4 rounded-lg bg-muted/30 border">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-medium">Particulate Matter</span>
                <Badge variant="default">Good</Badge>
              </div>
              <div className="space-y-2">
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span>PM2.5</span>
                    <span>{safetyMetrics.pm25} µg/m³</span>
                  </div>
                  <Progress value={(safetyMetrics.pm25 / 35) * 100} className="h-2" />
                </div>
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span>PM10</span>
                    <span>{safetyMetrics.pm10} µg/m³</span>
                  </div>
                  <Progress value={(safetyMetrics.pm10 / 50) * 100} className="h-2" />
                </div>
              </div>
            </div>
            
            <div className="p-4 rounded-lg bg-muted/30 border">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-medium">Hydrogen Detection</span>
                <Badge variant="default">Safe</Badge>
              </div>
              <div className="space-y-2">
                <div className="text-center py-4">
                  <p className="text-3xl font-bold text-green-500">{safetyMetrics.hydrogenSensors.maxPpm}</p>
                  <p className="text-xs text-muted-foreground">ppm (max across {safetyMetrics.hydrogenSensors.total} sensors)</p>
                </div>
                <p className="text-xs text-center text-muted-foreground">
                  Threshold: 1000 ppm
                </p>
              </div>
            </div>
            
            <div className="p-4 rounded-lg bg-muted/30 border">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-medium">Fire Suppression</span>
                <Badge className="bg-green-500/10 text-green-600">Armed</Badge>
              </div>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">System Type</span>
                  <span>Novec 1230</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Last Test</span>
                  <span>{safetyMetrics.fireSuppression.lastTest}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Zones Covered</span>
                  <span>{facility.coolingZones.length}</span>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Active Alerts */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <AlertTriangle className="h-4 w-4" />
            Safety Alerts
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
            <CheckCircle className="h-12 w-12 text-green-500 mb-3" />
            <p className="text-lg font-medium">All Systems Normal</p>
            <p className="text-sm">No active safety alerts</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

interface MetricCardProps {
  title: string;
  value: string;
  subtitle?: string;
  status: 'good' | 'warning' | 'critical';
  icon: React.ElementType;
}

function MetricCard({ title, value, subtitle, status, icon: Icon }: MetricCardProps) {
  const getStatusColor = () => {
    switch (status) {
      case 'good': return 'text-green-500';
      case 'warning': return 'text-yellow-500';
      case 'critical': return 'text-destructive';
    }
  };

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-lg bg-muted ${getStatusColor()}`}>
            <Icon className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground">{title}</p>
            <p className={`text-xl font-bold ${getStatusColor()}`}>{value}</p>
            {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
