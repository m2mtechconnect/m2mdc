import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, TrendingDown, Activity } from 'lucide-react';

interface AOCMetricsDashboardProps {
  agentId: string;
  recentRuns: any[];
}

export function AOCMetricsDashboard({ agentId, recentRuns }: AOCMetricsDashboardProps) {
  const successCount = recentRuns.filter(r => r.status === 'completed').length;
  const errorCount = recentRuns.filter(r => r.status === 'error').length;
  const successRate = recentRuns.length > 0 
    ? Math.round((successCount / recentRuns.length) * 100) 
    : 0;

  const avgDuration = recentRuns.length > 0
    ? Math.round(recentRuns.reduce((sum, r) => sum + (r.duration_ms || 0), 0) / recentRuns.length)
    : 0;

  return (
    <div className="h-full flex flex-col bg-card border-b">
      {/* Header */}
      <div className="p-3 border-b flex items-center gap-2">
        <Activity className="h-4 w-4" />
        <h3 className="text-sm font-semibold">Metrics & Monitoring</h3>
      </div>

      {/* Metrics */}
      <div className="flex-1 p-3 overflow-auto">
        <div className="space-y-3">
          {/* Success Rate */}
          <Card className="p-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-muted-foreground">Success Rate</span>
              {successRate >= 90 ? (
                <TrendingUp className="h-3 w-3 text-green-500" />
              ) : (
                <TrendingDown className="h-3 w-3 text-red-500" />
              )}
            </div>
            <div className="text-2xl font-bold">{successRate}%</div>
            <div className="text-xs text-muted-foreground mt-1">
              {successCount} / {recentRuns.length} runs
            </div>
          </Card>

          {/* Avg Duration */}
          <Card className="p-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-muted-foreground">Avg Duration</span>
            </div>
            <div className="text-2xl font-bold">
              {avgDuration < 1000 ? `${avgDuration}ms` : `${(avgDuration / 1000).toFixed(1)}s`}
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              Per execution
            </div>
          </Card>

          {/* Error Count */}
          <Card className="p-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-muted-foreground">Errors</span>
              {errorCount > 0 && (
                <Badge variant="destructive" className="text-xs">
                  {errorCount}
                </Badge>
              )}
            </div>
            <div className="text-2xl font-bold">{errorCount}</div>
            <div className="text-xs text-muted-foreground mt-1">
              Last 50 runs
            </div>
          </Card>

          {/* Total Runs */}
          <Card className="p-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-muted-foreground">Total Runs</span>
            </div>
            <div className="text-2xl font-bold">{recentRuns.length}</div>
            <div className="text-xs text-muted-foreground mt-1">
              Recent executions
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
