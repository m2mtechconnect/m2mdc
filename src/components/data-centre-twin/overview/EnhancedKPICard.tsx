/**
 * Enhanced KPI Card with sparklines, insights, and drill-down
 */

import { useState, useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { TrendingUp, TrendingDown, Minus, Info, PlayCircle, ChevronRight } from 'lucide-react';
import { SparklineChart, generateSparklineData } from './SparklineChart';
import { cn } from '@/lib/utils';

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
  
  const statusColors = {
    normal: 'text-success',
    warning: 'text-warning',
    critical: 'text-destructive',
  };
  
  const statusBadge = {
    normal: { label: 'Stable', className: 'bg-success/10 text-success border-success/30' },
    warning: { label: 'Warning', className: 'bg-warning/10 text-warning border-warning/30' },
    critical: { label: 'Critical', className: 'bg-destructive/10 text-destructive border-destructive/30' },
  };
  
  const TrendIcon = trend === 'up' ? TrendingUp : trend === 'down' ? TrendingDown : Minus;
  
  const sparkData = useMemo(() => 
    sparklineData || generateSparklineData(typeof value === 'number' ? value : 50), 
    [sparklineData, value]
  );
  
  if (compact) {
    return (
      <div 
        className={cn(
          'flex items-center justify-between p-3 rounded-lg bg-muted/30 border border-border hover:border-primary/30 transition-all cursor-pointer',
          highlighted && 'ring-2 ring-primary ring-offset-2'
        )}
        onClick={() => setShowDrilldown(true)}
      >
        <div className="flex items-center gap-3">
          {icon && <div className="p-1.5 rounded bg-primary/10">{icon}</div>}
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
      </div>
    );
  }
  
  return (
    <>
      <Card 
        className={cn(
          'bg-card border-border hover:border-primary/30 transition-all cursor-pointer group',
          highlighted && 'ring-2 ring-primary ring-offset-2',
          status === 'critical' && 'border-destructive/30',
          status === 'warning' && 'border-warning/30'
        )}
        onClick={() => setShowDrilldown(true)}
      >
        <CardContent className="p-4">
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-2">
              {icon && <div className="p-2 rounded-lg bg-primary/10">{icon}</div>}
              <Badge variant="outline" className={statusBadge[status].className}>
                {statusBadge[status].label}
              </Badge>
            </div>
            {delta !== undefined && (
              <div className={cn(
                'flex items-center gap-1 text-xs font-mono',
                delta >= 0 ? 'text-success' : 'text-destructive'
              )}>
                <TrendIcon className="h-3 w-3" />
                {delta >= 0 ? '+' : ''}{delta}%
              </div>
            )}
          </div>
          
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground">{label}</p>
            <div className="flex items-baseline gap-1">
              <span className={cn('text-2xl font-bold font-mono', statusColors[status])}>
                {value}
              </span>
              <span className="text-sm text-muted-foreground">{unit}</span>
            </div>
          </div>
          
          <div className="mt-3">
            <SparklineChart data={sparkData} width={140} height={28} />
          </div>
          
          {insight && (
            <div className="mt-3 p-2 rounded bg-muted/50 border border-border">
              <div className="flex items-start gap-2">
                <Info className="h-3 w-3 text-primary mt-0.5 shrink-0" />
                <p className="text-[10px] text-muted-foreground leading-relaxed">{insight}</p>
              </div>
            </div>
          )}
          
          <div className="mt-3 flex justify-end opacity-0 group-hover:opacity-100 transition-opacity">
            <Button variant="ghost" size="sm" className="h-6 text-xs gap-1">
              Details <ChevronRight className="h-3 w-3" />
            </Button>
          </div>
        </CardContent>
      </Card>
      
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
                  <div className="flex items-baseline gap-2">
                    <span className={cn('text-3xl font-bold font-mono', statusColors[status])}>
                      {value}
                    </span>
                    <span className="text-lg text-muted-foreground">{unit}</span>
                  </div>
                </div>
                <Badge variant="outline" className={statusBadge[status].className}>
                  {statusBadge[status].label}
                </Badge>
              </div>
            </div>
            
            {/* 24h Trend Chart */}
            <div className="p-4 rounded-lg bg-muted/30 border border-border">
              <p className="text-sm font-medium mb-3">24-Hour Trend</p>
              <SparklineChart data={sparkData} width={540} height={80} />
            </div>
            
            {/* AI Insight */}
            {insight && (
              <div className="p-4 rounded-lg bg-primary/5 border border-primary/20">
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-full bg-primary/10">
                    <Info className="h-4 w-4 text-primary" />
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
                  <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                  Monitor trend for next 2 hours
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                  Review contributing racks in thermal view
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-primary" />
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
