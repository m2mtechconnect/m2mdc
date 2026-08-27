/**
 * Enhanced KPI Card with sparklines, insights, and drill-down
 */

import { useState, useMemo } from 'react';
import { CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { TrendingUp, TrendingDown, Minus, Info, PlayCircle, ChevronRight } from 'lucide-react';
import { SparklineChart, generateSparklineData } from './SparklineChart';
import { cn } from '@/lib/utils';
import {
  KPI_SEVERITY_TEXT_CLASS,
  KPI_SEVERITY_BADGE,
  KPI_TREND_TEXT_CLASS,
} from '@/components/kpi/kpiSemantics';
import { KpiCardSurface, KpiStatusBadge, KpiValue } from '@/components/kpi/KpiCardShell';

interface EnhancedKPICardProps {
  id: string;
  label: string;
  value: number | string;
  unit: string;
  status: 'normal' | 'warning' | 'critical';
  trend?: 'up' | 'down' | 'stable';
  delta?: number;
  icon?: React.ReactNode;
  insight?: string;
  sparklineData?: number[];
  domain?: string;
  onSimulate?: (kpiId: string) => void;
  highlighted?: boolean;
  compact?: boolean;
}

export function EnhancedKPICard({
  id,
  label,
  value,
  unit,
  status = 'normal',
  trend,
  delta,
  icon,
  insight,
  sparklineData,
  domain,
  onSimulate,
  highlighted = false,
  compact = false
}: EnhancedKPICardProps) {
  const [showDrilldown, setShowDrilldown] = useState(false);
  
  const statusColors = KPI_SEVERITY_TEXT_CLASS;

  const statusBadge = KPI_SEVERITY_BADGE;
  
  const TrendIcon = trend === 'up' ? TrendingUp : trend === 'down' ? TrendingDown : Minus;
  
  const sparkData = useMemo(() => 
    sparklineData || generateSparklineData(typeof value === 'number' ? value : 50), 
    [sparklineData, value]
  );
  
  if (compact) {
    return (
      <KpiCardSurface
        as="div"
        className={cn(
          'flex items-center justify-between p-3 rounded-lg bg-muted/30 border border-border hover:border-primary/30',
          highlighted && 'ring-2 ring-primary ring-offset-2'
        )}
        ariaLabel={`${label} details`}
        onActivate={() => setShowDrilldown(true)}
      >
        <div className="flex items-center gap-3">
          {icon && <div className="p-1.5 rounded bg-accent/10">{icon}</div>}
          <div>
            <p className="text-xs text-muted-foreground">{label}</p>
            <div className="flex items-baseline gap-1">
              <span className={cn('text-lg font-bold font-mono', statusColors[status])}>
                {value}
              </span>
              <span className="text-xs text-muted-foreground">{unit}</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <SparklineChart data={sparkData} width={60} height={20} />
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
        </div>
      </KpiCardSurface>
    );
  }
  
  return (
    <>
      <KpiCardSurface
        className={cn(
          'bg-card border-border hover:border-primary/30 overflow-hidden',
          highlighted && 'ring-2 ring-primary ring-offset-2',
          status === 'critical' && 'border-destructive/30',
          status === 'warning' && 'border-warning/30'
        )}
        ariaLabel={`${label} details`}
        onActivate={() => setShowDrilldown(true)}
      >
        <CardContent className="p-4 overflow-hidden">
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-2">
              {icon && <div className="p-2 rounded-lg bg-accent/10">{icon}</div>}
              <KpiStatusBadge severity={status} />
            </div>
            {delta !== undefined && (
              <div className={cn(
                'flex items-center gap-1 text-xs font-mono',
                delta >= 0 ? KPI_TREND_TEXT_CLASS.improving : KPI_TREND_TEXT_CLASS.declining
              )}>
                <TrendIcon className="h-3 w-3" />
                {delta >= 0 ? '+' : ''}{delta}%
              </div>
            )}
          </div>
          
          <div className="space-y-2 min-w-0">
            <p className="text-xs text-muted-foreground truncate">{label}</p>
            <KpiValue
              value={value}
              unit={unit}
              className="gap-1"
              valueClassName={cn('font-mono truncate', statusColors[status])}
              unitClassName="flex-shrink-0"
            />
          </div>
          
          <div className="mt-3 w-full overflow-hidden">
            <SparklineChart data={sparkData} width={140} height={28} className="max-w-full" />
          </div>
          
          {insight && (
            <div className="mt-3 p-2 rounded bg-muted/50 border border-border overflow-hidden">
              <div className="flex items-start gap-2 min-w-0">
                <Info className="h-3 w-3 text-accent mt-0.5 shrink-0" />
                <p className="text-xs text-muted-foreground leading-relaxed line-clamp-3">{insight}</p>
              </div>
            </div>
          )}
          
          <div className="mt-3 flex justify-end opacity-0 group-hover:opacity-100 transition-opacity">
            <Button variant="ghost" size="sm" className="h-6 text-xs gap-1">
              Details <ChevronRight className="h-3 w-3" />
            </Button>
          </div>
        </CardContent>
      </KpiCardSurface>
      
      {/* Drill-down Modal */}
      <Dialog open={showDrilldown} onOpenChange={setShowDrilldown}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {icon}
              {label} Analysis
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            {/* Current Value */}
            <div className="p-4 rounded-lg bg-muted/30 border border-border">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Current Value</p>
                  <KpiValue
                    value={value}
                    unit={unit}
                    className="gap-2"
                    valueClassName={cn('text-3xl font-mono', statusColors[status])}
                    unitClassName="text-lg"
                  />
                </div>
                <KpiStatusBadge severity={status} />
              </div>
            </div>
            
            {/* 24h Trend Chart */}
            <div className="p-4 rounded-lg bg-muted/30 border border-border">
              <p className="text-sm font-medium mb-3">24-Hour Trend</p>
              <SparklineChart data={sparkData} width={540} height={80} />
            </div>
            
            {/* AI Insight */}
            {insight && (
              <div className="p-4 rounded-lg bg-accent/5 border border-accent/20">
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-full bg-accent/10">
                    <Info className="h-4 w-4 text-accent" />
                  </div>
                  <div>
                    <p className="text-sm font-medium mb-1">AI Insight</p>
                    <p className="text-sm text-muted-foreground">{insight}</p>
                  </div>
                </div>
              </div>
            )}
            
            {/* Recommended Actions */}
            <div className="p-4 rounded-lg bg-muted/30 border border-border">
              <p className="text-sm font-medium mb-3">Recommended Actions</p>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-accent" />
                  Monitor trend for next 2 hours
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-accent" />
                  Review contributing racks in thermal view
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-accent" />
                  Check cooling zone efficiency
                </li>
              </ul>
            </div>
            
            {/* Actions */}
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowDrilldown(false)}>
                Close
              </Button>
              {onSimulate && (
                <Button onClick={() => { onSimulate(id); setShowDrilldown(false); }} className="gap-2">
                  <PlayCircle className="h-4 w-4" />
                  Simulate Anomaly
                </Button>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
