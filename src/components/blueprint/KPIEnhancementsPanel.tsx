/**
 * KPI Enhancements Panel
 * Why this KPI matters, what impacts it, forecasting trends
 */

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Info, 
  TrendingUp, 
  TrendingDown,
  Workflow,
  Target,
  AlertCircle,
  Lightbulb,
  LineChart
} from 'lucide-react';
import { LineChart as RechartsLine, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import { cn } from '@/lib/utils';

interface KPIDetail {
  id: string;
  name: string;
  value: number;
  unit: string;
  target: number;
  warningThreshold: number;
  criticalThreshold: number;
  trend: 'up' | 'down' | 'stable';
  trendValue: number;
  why: string;
  impacts: string[];
  workflows: string[];
  forecast: { day: number; value: number; confidence: number }[];
  autoRecommendations: string[];
}

interface KPIEnhancementsPanelProps {
  kpi?: KPIDetail;
  className?: string;
}

// Mock KPI for demo
const MOCK_KPI: KPIDetail = {
  id: 'pue',
  name: 'Power Usage Effectiveness',
  value: 1.38,
  unit: '',
  target: 1.30,
  warningThreshold: 1.45,
  criticalThreshold: 1.60,
  trend: 'down',
  trendValue: -2.1,
  why: 'PUE measures total facility energy divided by IT equipment energy. Lower values indicate more efficient use of power, directly reducing operational costs and carbon footprint. Industry standard for efficient DCs is <1.4.',
  impacts: [
    'Cooling system efficiency',
    'IT load distribution',
    'Outside air temperature',
    'Facility lighting & HVAC',
    'Power distribution losses',
    'UPS efficiency curves'
  ],
  workflows: [
    'Cooling Optimization Agent',
    'Power Load Balancer',
    'Thermal Guardian',
    'Carbon Tracker'
  ],
  forecast: [
    { day: 0, value: 1.38, confidence: 100 },
    { day: 5, value: 1.36, confidence: 92 },
    { day: 10, value: 1.35, confidence: 85 },
    { day: 15, value: 1.33, confidence: 78 },
    { day: 20, value: 1.32, confidence: 70 },
    { day: 25, value: 1.31, confidence: 62 },
    { day: 30, value: 1.30, confidence: 55 },
  ],
  autoRecommendations: [
    'Increase supply air temperature by 1°C to reduce cooling load',
    'Consolidate workloads during off-peak hours',
    'Enable free cooling when OAT < 18°C',
    'Review UPS load balancing for optimal efficiency curve'
  ]
};

export function KPIEnhancementsPanel({ kpi, className }: KPIEnhancementsPanelProps) {
  const data = kpi || MOCK_KPI;
  const [activeTab, setActiveTab] = useState('why');

  const getStatusColor = () => {
    if (data.value >= data.criticalThreshold) return 'text-destructive';
    if (data.value >= data.warningThreshold) return 'text-warning';
    if (data.value <= data.target) return 'text-success';
    return 'text-foreground';
  };

  return (
    <Card className={className}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <Target className="h-4 w-4 text-primary" />
            {data.name}
          </CardTitle>
          <div className="flex items-center gap-2">
            <span className={cn("text-2xl font-bold", getStatusColor())}>
              {data.value.toFixed(2)}{data.unit}
            </span>
            <Badge 
              variant={data.trend === 'down' ? 'default' : data.trend === 'up' ? 'destructive' : 'secondary'}
              className="text-xs"
            >
              {data.trend === 'down' ? <TrendingDown className="h-3 w-3 mr-1" /> : 
               data.trend === 'up' ? <TrendingUp className="h-3 w-3 mr-1" /> : null}
              {data.trendValue > 0 ? '+' : ''}{data.trendValue}%
            </Badge>
          </div>
        </div>

        {/* Threshold Indicator */}
        <div className="flex items-center gap-2 text-xs mt-2">
          <span className="text-success">Target: {data.target}</span>
          <span className="text-muted-foreground">|</span>
          <span className="text-warning">Warning: {data.warningThreshold}</span>
          <span className="text-muted-foreground">|</span>
          <span className="text-destructive">Critical: {data.criticalThreshold}</span>
        </div>
      </CardHeader>

      <CardContent className="pt-0">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid grid-cols-4 h-8 mb-3">
            <TabsTrigger value="why" className="text-xs">
              <Info className="h-3 w-3 mr-1" />
              Why
            </TabsTrigger>
            <TabsTrigger value="impacts" className="text-xs">
              <AlertCircle className="h-3 w-3 mr-1" />
              Impacts
            </TabsTrigger>
            <TabsTrigger value="forecast" className="text-xs">
              <LineChart className="h-3 w-3 mr-1" />
              Forecast
            </TabsTrigger>
            <TabsTrigger value="actions" className="text-xs">
              <Lightbulb className="h-3 w-3 mr-1" />
              Actions
            </TabsTrigger>
          </TabsList>

          <TabsContent value="why" className="mt-0">
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground leading-relaxed">
                {data.why}
              </p>
              <div>
                <div className="text-xs font-medium mb-2 flex items-center gap-1">
                  <Workflow className="h-3 w-3" />
                  Related Workflows
                </div>
                <div className="flex flex-wrap gap-1">
                  {data.workflows.map((wf, i) => (
                    <Badge key={i} variant="outline" className="text-xs">
                      {wf}
                    </Badge>
                  ))}
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="impacts" className="mt-0">
            <ScrollArea className="h-40">
              <div className="space-y-2">
                {data.impacts.map((impact, i) => (
                  <div 
                    key={i}
                    className="flex items-center gap-2 p-2 rounded-lg bg-muted/30 text-sm"
                  >
                    <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                    {impact}
                  </div>
                ))}
              </div>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="forecast" className="mt-0">
            <div className="h-40">
              <ResponsiveContainer width="100%" height="100%">
                <RechartsLine data={data.forecast}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border/50" />
                  <XAxis 
                    dataKey="day" 
                    tick={{ fontSize: 10 }}
                    tickFormatter={(v) => `D${v}`}
                  />
                  <YAxis 
                    domain={['auto', 'auto']}
                    tick={{ fontSize: 10 }}
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                      fontSize: '12px'
                    }}
                    formatter={(value: number, name: string) => [
                      value.toFixed(2),
                      name === 'value' ? 'Projected' : name
                    ]}
                  />
                  <ReferenceLine 
                    y={data.target} 
                    stroke="hsl(var(--success))" 
                    strokeDasharray="3 3"
                    label={{ value: 'Target', fontSize: 10, fill: 'hsl(var(--success))' }}
                  />
                  <Line
                    type="monotone"
                    dataKey="value"
                    stroke="hsl(var(--primary))"
                    strokeWidth={2}
                    dot={{ r: 3 }}
                  />
                </RechartsLine>
              </ResponsiveContainer>
            </div>
            <p className="text-xs text-muted-foreground mt-2 text-center">
              30-day forecast with confidence bands
            </p>
          </TabsContent>

          <TabsContent value="actions" className="mt-0">
            <ScrollArea className="h-40">
              <div className="space-y-2">
                {data.autoRecommendations.map((rec, i) => (
                  <div 
                    key={i}
                    className="flex items-start gap-2 p-2 rounded-lg bg-info/10 border border-info/20 text-sm"
                  >
                    <Lightbulb className="h-4 w-4 text-info shrink-0 mt-0.5" />
                    <span>{rec}</span>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
