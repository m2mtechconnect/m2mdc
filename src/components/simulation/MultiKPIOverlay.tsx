/**
 * Multi-KPI Overlay Graph
 * Superimposes multiple KPIs (PUE, Thermal, Utilization, Carbon) on one graph
 */

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { TrendingUp } from 'lucide-react';

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
}

const KPI_CONFIG = {
  pue: { label: 'PUE', color: 'hsl(var(--primary))', unit: '' },
  thermal: { label: 'Thermal (°C)', color: 'hsl(var(--destructive))', unit: '°C' },
  utilization: { label: 'GPU Util (%)', color: 'hsl(var(--success))', unit: '%' },
  carbon: { label: 'Carbon (kg/h)', color: 'hsl(var(--warning))', unit: 'kg/h' },
  renewable: { label: 'Renewable (%)', color: 'hsl(var(--info))', unit: '%' },
  uptime: { label: 'Uptime (%)', color: 'hsl(var(--accent))', unit: '%' },
};

// Generate mock time series data
const generateMockData = (): KPIDataPoint[] => {
  const data: KPIDataPoint[] = [];
  for (let i = 0; i < 24; i++) {
    data.push({
      time: `${i.toString().padStart(2, '0')}:00`,
      pue: 1.3 + Math.random() * 0.2,
      thermal: 22 + Math.random() * 8,
      utilization: 60 + Math.random() * 30,
      carbon: 15 + Math.random() * 10,
      renewable: 70 + Math.random() * 20,
      uptime: 99.5 + Math.random() * 0.5,
    });
  }
  return data;
};

export function MultiKPIOverlay({ data, className }: MultiKPIOverlayProps) {
  const [selectedKPIs, setSelectedKPIs] = useState<string[]>(['pue', 'thermal', 'utilization']);
  const chartData = data || generateMockData();

  const toggleKPI = (kpi: string) => {
    setSelectedKPIs(prev => 
      prev.includes(kpi) 
        ? prev.filter(k => k !== kpi)
        : [...prev, kpi]
    );
  };

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <TrendingUp className="h-4 w-4 text-primary" />
            Multi-KPI Overlay
          </CardTitle>
          <Badge variant="outline" className="text-xs">
            {selectedKPIs.length} KPIs selected
          </Badge>
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
