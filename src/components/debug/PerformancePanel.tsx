/**
 * Performance Panel
 * Displays real-time performance metrics for debugging
 */

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Gauge,
  RefreshCw,
  Trash2,
} from 'lucide-react';
import {
  getAllPerformanceMetrics,
  clearPerformanceMetrics,
  subscribeToMetrics,
  type PerformanceMetric,
} from '@/hooks/usePerformanceMonitor';
import { cn } from '@/lib/utils';

const THRESHOLD_MS = 200;

export function PerformancePanel({ className }: { className?: string }) {
  const [metrics, setMetrics] = useState<PerformanceMetric[]>([]);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Initial load
    setMetrics(getAllPerformanceMetrics());

    // Subscribe to updates
    const unsubscribe = subscribeToMetrics((m) => setMetrics([...m]));
    return unsubscribe;
  }, []);

  const completedMetrics = metrics.filter((m) => m.duration !== undefined);
  const warnings = completedMetrics.filter((m) => m.duration! > THRESHOLD_MS);
  const avgDuration =
    completedMetrics.length > 0
      ? completedMetrics.reduce((sum, m) => sum + m.duration!, 0) / completedMetrics.length
      : 0;

  // Group by type
  const byType: Record<string, PerformanceMetric[]> = {};
  completedMetrics.forEach((m) => {
    if (!byType[m.type]) byType[m.type] = [];
    byType[m.type].push(m);
  });

  const handleClear = () => {
    clearPerformanceMetrics();
    setMetrics([]);
  };

  // Toggle visibility with keyboard shortcut
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey && e.key === 'P') {
        setIsVisible((v) => !v);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  if (!isVisible) {
    return (
      <Button
        variant="outline"
        size="sm"
        className="fixed bottom-4 right-4 z-50 gap-2 opacity-50 hover:opacity-100"
        onClick={() => setIsVisible(true)}
        title="Show Performance Panel (Ctrl+Shift+P)"
      >
        <Gauge className="h-4 w-4" />
        <span className="text-xs">{completedMetrics.length}</span>
        {warnings.length > 0 && (
          <Badge variant="destructive" className="h-4 w-4 p-0 text-[10px]">
            {warnings.length}
          </Badge>
        )}
      </Button>
    );
  }

  return (
    <Card className={cn('fixed bottom-4 right-4 z-50 w-96 shadow-xl', className)}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm flex items-center gap-2">
            <Activity className="h-4 w-4" />
            Performance Monitor
          </CardTitle>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={handleClear}>
              <Trash2 className="h-3 w-3" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0"
              onClick={() => setIsVisible(false)}
            >
              ×
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Summary */}
        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="p-2 rounded bg-muted/50">
            <p className="text-lg font-mono font-bold">{completedMetrics.length}</p>
            <p className="text-[10px] text-muted-foreground">Metrics</p>
          </div>
          <div className="p-2 rounded bg-muted/50">
            <p className={cn('text-lg font-mono font-bold', avgDuration > THRESHOLD_MS && 'text-destructive')}>
              {avgDuration.toFixed(0)}ms
            </p>
            <p className="text-[10px] text-muted-foreground">Avg</p>
          </div>
          <div className="p-2 rounded bg-muted/50">
            <p className={cn('text-lg font-mono font-bold', warnings.length > 0 && 'text-destructive')}>
              {warnings.length}
            </p>
            <p className="text-[10px] text-muted-foreground">Warnings</p>
          </div>
        </div>

        {/* By Type */}
        <div className="space-y-1">
          {Object.entries(byType).map(([type, items]) => {
            const avg = items.reduce((s, m) => s + m.duration!, 0) / items.length;
            const max = Math.max(...items.map((m) => m.duration!));
            return (
              <div key={type} className="flex items-center justify-between text-xs p-2 rounded bg-muted/30">
                <span className="font-medium capitalize">{type}</span>
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground">{items.length}x</span>
                  <span className={cn('font-mono', avg > THRESHOLD_MS && 'text-destructive')}>
                    avg {avg.toFixed(0)}ms
                  </span>
                  <span className={cn('font-mono', max > THRESHOLD_MS && 'text-destructive')}>
                    max {max.toFixed(0)}ms
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Warnings List */}
        {warnings.length > 0 && (
          <div className="space-y-1">
            <p className="text-xs font-medium flex items-center gap-1 text-destructive">
              <AlertTriangle className="h-3 w-3" />
              Threshold Exceeded ({THRESHOLD_MS}ms)
            </p>
            <ScrollArea className="h-24">
              <div className="space-y-1">
                {warnings.slice(0, 10).map((m, i) => (
                  <div key={i} className="text-[10px] p-1.5 rounded bg-destructive/10 flex justify-between">
                    <span className="truncate">{m.name}</span>
                    <span className="font-mono text-destructive">{m.duration!.toFixed(0)}ms</span>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>
        )}

        <p className="text-[10px] text-muted-foreground text-center">
          Press Ctrl+Shift+P to toggle
        </p>
      </CardContent>
    </Card>
  );
}
