import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { TrendingUp, Activity, Clock, AlertCircle, Zap } from 'lucide-react';
import type { DeployedSystem } from '@/types/system';

interface AOCMetricsTabProps {
  instance: DeployedSystem;
}

export function AOCMetricsTab({ instance }: AOCMetricsTabProps) {
  const { data: runs = [] } = useQuery({
    queryKey: ['agent-runs-metrics', instance.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('agent_runs')
        .select('*')
        .eq('agent_id', instance.id)
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) throw error;
      return data || [];
    },
  });

  const successfulRuns = runs.filter(r => r.status === 'success').length;
  const failedRuns = runs.filter(r => r.status === 'failed').length;
  const avgDuration = runs.length > 0
    ? runs.reduce((sum, r) => sum + (r.duration_ms || 0), 0) / runs.length
    : 0;

  const last24hRuns = runs.filter(r => 
    new Date(r.created_at) > new Date(Date.now() - 24 * 60 * 60 * 1000)
  );

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-6">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="h-4 w-4 text-green-500" />
            <span className="text-sm text-muted-foreground">Success Rate</span>
          </div>
          <p className="text-3xl font-bold">{instance.successRate}%</p>
          <p className="text-xs text-muted-foreground mt-1">
            {successfulRuns} / {runs.length} runs
          </p>
        </Card>

        <Card className="p-6">
          <div className="flex items-center gap-2 mb-2">
            <Activity className="h-4 w-4 text-blue-500" />
            <span className="text-sm text-muted-foreground">Total Runs</span>
          </div>
          <p className="text-3xl font-bold">{instance.totalRuns}</p>
          <p className="text-xs text-muted-foreground mt-1">
            {last24hRuns.length} in last 24h
          </p>
        </Card>

        <Card className="p-6">
          <div className="flex items-center gap-2 mb-2">
            <Clock className="h-4 w-4 text-yellow-500" />
            <span className="text-sm text-muted-foreground">Avg Duration</span>
          </div>
          <p className="text-3xl font-bold">{(avgDuration / 1000).toFixed(1)}s</p>
          <p className="text-xs text-muted-foreground mt-1">
            Per execution
          </p>
        </Card>

        <Card className="p-6">
          <div className="flex items-center gap-2 mb-2">
            <AlertCircle className="h-4 w-4 text-red-500" />
            <span className="text-sm text-muted-foreground">Errors</span>
          </div>
          <p className="text-3xl font-bold">{failedRuns}</p>
          <p className="text-xs text-muted-foreground mt-1">
            {runs.length > 0 ? ((failedRuns / runs.length) * 100).toFixed(1) : 0}% error rate
          </p>
        </Card>
      </div>

      {/* Performance Chart */}
      <Card className="p-6">
        <div className="flex items-center gap-2 mb-4">
          <Zap className="h-5 w-5 text-primary" />
          <h3 className="text-lg font-semibold">Performance Over Time</h3>
        </div>
        <div className="h-64 flex items-center justify-center text-muted-foreground">
          Chart visualization would go here
        </div>
      </Card>

      {/* Recent Error Log */}
      <Card className="p-6">
        <div className="flex items-center gap-2 mb-4">
          <AlertCircle className="h-5 w-5 text-red-500" />
          <h3 className="text-lg font-semibold">Recent Errors</h3>
          <Badge variant="destructive">{failedRuns}</Badge>
        </div>

        {failedRuns === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No errors in recent runs
          </div>
        ) : (
          <div className="space-y-2">
            {runs
              .filter(r => r.status === 'failed')
              .slice(0, 5)
              .map((run) => (
                <Card key={run.id} className="p-3 bg-red-500/10 border-red-500/20">
                  <div className="text-sm font-medium text-red-500 mb-1">
                    Error in run {run.id.slice(0, 8)}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {run.error || 'Unknown error'}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {new Date(run.created_at).toLocaleString()}
                  </p>
                </Card>
              ))}
          </div>
        )}
      </Card>
    </div>
  );
}
