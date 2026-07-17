/**
 * Multi-KPI Overlay Graph
 * Superimposes multiple KPIs (PUE, Thermal, Utilization, Carbon) on one graph
 * Uses industry-accurate baselines from ASHRAE, Uptime Institute, and Canadian grid data
 */

import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { TrendingUp } from 'lucide-react';
import { 
  generateIndustryBaselineKpis, 
  REGIONAL_ENERGY_PROFILES 
} from '@/data/industryAccurateDefaults';
import { seededRng } from '@/lib/provenance/prng';
import { ProvenanceBadge } from '@/components/provenance/ProvenanceBadge';
import type { DataProvenance } from '@/lib/provenance/types';

interface KPIDataPoint {
  time: string;
  pue?: number;
  thermal?: number;
  utilization?: number;
  carbon?: number;
  renewable?: number;
  uptime?: number;
}

interface MultiKPIOverlayProps {
  data?: KPIDataPoint[];
  className?: string;
  region?: string;
  industry?: string;
  /**
   * Provenance for the chart series. When callers pass real telemetry via
   * `data` they should also pass `provenance="live"` (or `"derived"`).
   * Defaults to `demo` because the generator below produces deterministic
   * fixture data — never a validated reading.
   */
  provenance?: DataProvenance;
}

const KPI_CONFIG = {
  pue: { label: 'PUE', color: 'hsl(var(--primary))', unit: '' },
  thermal: { label: 'Thermal (°C)', color: 'hsl(var(--destructive))', unit: '°C' },
  utilization: { label: 'GPU Util (%)', color: 'hsl(var(--success))', unit: '%' },
  carbon: { label: 'Carbon (g/kWh)', color: 'hsl(var(--warning))', unit: 'g/kWh' },
  renewable: { label: 'Renewable (%)', color: 'hsl(var(--info))', unit: '%' },
  uptime: { label: 'Uptime (%)', color: 'hsl(var(--accent))', unit: '%' },
};

/**
 * Generate a deterministic demo time series.
 *
 * Phase 1A.3.b: previous implementation used `Math.random()` at render time,
 * which made the same "PUE 1.24" tile appear differently every reload. All
 * randomness is now driven by a `mulberry32` PRNG seeded from
 * `${region}/${industry}`, so identical inputs produce byte-identical output
 * across renders and test runs. This is fixture data — the returned series
 * MUST be presented with `demo` provenance.
 */
const generateRealisticData = (region: string = 'CA-QC', industry: string = 'ai_hpc'): KPIDataPoint[] => {
  const baselineKpis = generateIndustryBaselineKpis(industry, region);
  const energyProfile = REGIONAL_ENERGY_PROFILES[region] || REGIONAL_ENERGY_PROFILES['CA-QC'];
  const data: KPIDataPoint[] = [];
  const rng = seededRng(`multi-kpi-overlay/${region}/${industry}`);
  
  for (let i = 0; i < 24; i++) {
    const hour = i;
    
    // Diurnal patterns based on real DC operations
    // Business hours see higher GPU utilization
    const workloadMultiplier = (hour >= 9 && hour <= 18) ? 1.12 : 
                               (hour >= 6 && hour <= 21) ? 1.0 : 0.88;
    
    // Thermal follows workload with ~30min lag (thermal inertia)
    const thermalLag = Math.max(0, i - 1);
    const thermalMultiplier = (thermalLag >= 10 && thermalLag <= 17) ? 1.08 : 1.0;
    
    // Afternoon cooling load peak
    const pueMultiplier = (hour >= 14 && hour <= 17) ? 1.04 : 1.0;
    
    // Realistic noise: ±3-5% variation (seeded so results are reproducible)
    const noise = () => 1 + (rng() * 0.08 - 0.04);
    
    data.push({
      time: `${hour.toString().padStart(2, '0')}:00`,
      // PUE: Quebec baseline 1.18-1.25 range
      pue: Number((baselineKpis.pue.current * pueMultiplier * noise()).toFixed(3)),
      // Thermal: ASHRAE A1 inlet range 18-27°C
      thermal: Number((baselineKpis.avgServerTemp.current + (thermalMultiplier - 1) * 8 + (rng() * 2 - 1)).toFixed(1)),
      // GPU utilization: 65-92% typical for AI workloads
      utilization: Number((Math.min(100, baselineKpis.gpuUtilization.current * workloadMultiplier * noise())).toFixed(1)),
      // Carbon: Quebec ~1.2 g/kWh (99.8% hydro)
      carbon: Number((energyProfile.carbonIntensityGPerKwh * noise()).toFixed(1)),
      // Renewable: Quebec 99.8%, varies slightly with grid imports
      renewable: Number((Math.min(100, energyProfile.renewablePercentage * noise())).toFixed(1)),
      // Uptime: Tier III target 99.982%
      uptime: Number((99.95 + rng() * 0.05).toFixed(3)),
    });
  }
  return data;
};

export function MultiKPIOverlay({
  data,
  className,
  region = 'CA-QC',
  industry = 'ai_hpc',
  provenance,
}: MultiKPIOverlayProps) {
  const [selectedKPIs, setSelectedKPIs] = useState<string[]>(['pue', 'thermal', 'utilization']);
  const chartData = useMemo(() => data || generateRealisticData(region, industry), [data, region, industry]);
  // When the caller did not pass real `data`, the series is fixture — force
  // `demo` regardless of what was requested. This mirrors the truth-in-UI
  // rule that missing provenance can never default to `live`.
  const resolvedProvenance: DataProvenance = data
    ? (provenance ?? 'demo')
    : 'demo';
  const provenanceMeta = {
    provenance: resolvedProvenance,
    source: data ? 'caller-supplied' : `multi-kpi-overlay/${region}/${industry}`,
    stale: false,
    note: data
      ? 'Series values supplied by caller.'
      : 'Deterministic fixture — seeded PRNG, not telemetry.',
  };

  const toggleKPI = (kpi: string) => {
    setSelectedKPIs(prev => 
      prev.includes(kpi) 
        ? prev.filter(k => k !== kpi)
        : [...prev, kpi]
    );
  };

  return (
    <Card
      className={className}
      data-testid="multi-kpi-overlay"
      data-provenance={resolvedProvenance}
    >
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <TrendingUp className="h-4 w-4 text-primary" />
            Multi-KPI Overlay
          </CardTitle>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-xs">
              {selectedKPIs.length} KPIs selected
            </Badge>
            <ProvenanceBadge meta={provenanceMeta} />
          </div>
        </div>
        
        {/* KPI Selection */}
        <div className="flex flex-wrap gap-3 pt-2">
          {Object.entries(KPI_CONFIG).map(([key, config]) => (
            <label 
              key={key}
              className="flex items-center gap-2 cursor-pointer text-sm"
            >
              <Checkbox
                checked={selectedKPIs.includes(key)}
                onCheckedChange={() => toggleKPI(key)}
              />
              <span 
                className="flex items-center gap-1"
                style={{ color: config.color }}
              >
                <span className="w-3 h-0.5 rounded" style={{ backgroundColor: config.color }} />
                {config.label}
              </span>
            </label>
          ))}
        </div>
      </CardHeader>
      
      <CardContent>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border/50" />
              <XAxis 
                dataKey="time" 
                tick={{ fontSize: 10 }}
                className="text-muted-foreground"
              />
              <YAxis 
                tick={{ fontSize: 10 }}
                className="text-muted-foreground"
              />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px',
                  fontSize: '12px'
                }}
              />
              <Legend />
              
              {selectedKPIs.map(kpi => (
                <Line
                  key={kpi}
                  type="monotone"
                  dataKey={kpi}
                  name={KPI_CONFIG[kpi as keyof typeof KPI_CONFIG].label}
                  stroke={KPI_CONFIG[kpi as keyof typeof KPI_CONFIG].color}
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 4 }}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
