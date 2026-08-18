/**
 * Sparkline Chart Component
 * Lightweight mini chart for KPI trends
 */

import { useMemo } from 'react';
import { cn } from '@/lib/utils';
import { mulberry32, deriveSeed } from '@/simulation/orchestrator/prng';

interface SparklineChartProps {
  data: number[];
  height?: number;
  width?: number;
  color?: string;
  fillOpacity?: number;
  showTrend?: boolean;
  className?: string;
}

export function SparklineChart({
  data,
  height = 24,
  width = 80,
  color = 'hsl(var(--primary))',
  fillOpacity = 0.2,
  showTrend = true,
  className
}: SparklineChartProps) {
  const pathData = useMemo(() => {
    if (data.length < 2) return '';
    
    const min = Math.min(...data);
    const max = Math.max(...data);
    const range = max - min || 1;
    
    const points = data.map((value, index) => {
      const x = (index / (data.length - 1)) * width;
      const y = height - ((value - min) / range) * height;
      return `${x},${y}`;
    });
    
    return `M${points.join(' L')}`;
  }, [data, height, width]);
  
  const fillPath = useMemo(() => {
    if (data.length < 2) return '';
    
    const min = Math.min(...data);
    const max = Math.max(...data);
    const range = max - min || 1;
    
    const points = data.map((value, index) => {
      const x = (index / (data.length - 1)) * width;
      const y = height - ((value - min) / range) * height;
      return `${x},${y}`;
    });
    
    return `M0,${height} L${points.join(' L')} L${width},${height} Z`;
  }, [data, height, width]);
  
  const trend = useMemo(() => {
    if (data.length < 2) return 'stable';
    const first = data.slice(0, Math.floor(data.length / 2));
    const second = data.slice(Math.floor(data.length / 2));
    const firstAvg = first.reduce((a, b) => a + b, 0) / first.length;
    const secondAvg = second.reduce((a, b) => a + b, 0) / second.length;
    
    if (secondAvg > firstAvg * 1.05) return 'up';
    if (secondAvg < firstAvg * 0.95) return 'down';
    return 'stable';
  }, [data]);
  
  const trendColor = trend === 'up' 
    ? 'hsl(var(--success))' 
    : trend === 'down' 
      ? 'hsl(var(--destructive))' 
      : color;
  
  return (
    <svg 
      width={width} 
      height={height} 
      className={cn('inline-block', className)}
      viewBox={`0 0 ${width} ${height}`}
    >
      <path
        d={fillPath}
        fill={showTrend ? trendColor : color}
        fillOpacity={fillOpacity}
      />
      <path
        d={pathData}
        fill="none"
        stroke={showTrend ? trendColor : color}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function generateSparklineData(
  baseValue: number,
  variance: number = 0.1,
  points: number = 24,
  seedText = 'overview-sparkline',
): number[] {
  // Truth rule: illustrative trend shape, reproducible by construction.
  // Seeded `mulberry32-v1`, never `Math.random()`.
  const rand = mulberry32(deriveSeed(`${seedText}:${baseValue}:${variance}:${points}`));
  const data: number[] = [];
  let current = baseValue;
  
  for (let i = 0; i < points; i++) {
    const change = (rand() - 0.5) * 2 * variance * baseValue;
    current = Math.max(0, current + change);
    data.push(current);
  }
  
  return data;
}
