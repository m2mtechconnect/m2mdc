import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, TrendingDown, Activity, Clock } from 'lucide-react';
import { AOCHelpTooltip } from './AOCHelpTooltip';

interface AOCQuickStatsProps {
  stats: {
    successRate: number;
    avgDuration: number;
    totalRuns: number;
    activeStatus: string;
  };
}

export function AOCQuickStats({ stats }: AOCQuickStatsProps) {
  const getTrendIcon = (value: number) => {
    return value >= 0 ? TrendingUp : TrendingDown;
  };

  const getTrendColor = (value: number) => {
    return value >= 0 ? 'text-green-500' : 'text-red-500';
  };

  return (
    <div className="grid grid-cols-4 gap-3 mb-4">
      <Card className="p-3">
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs text-muted-foreground flex items-center gap-1">
            Status
            <AOCHelpTooltip content="Current operational status of the agent" />
          </span>
        </div>
        <div className="flex items-center justify-between">
          <Badge
            variant={stats.activeStatus === 'active' ? 'default' : 'secondary'}
            className="text-sm"
          >
            {stats.activeStatus}
          </Badge>
        </div>
      </Card>

      <Card className="p-3">
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs text-muted-foreground flex items-center gap-1">
            Success Rate
            <AOCHelpTooltip content="Percentage of successful executions in the last 50 runs" />
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-lg font-bold">{stats.successRate}%</span>
          <div className={`flex items-center gap-1 text-xs ${getTrendColor(5)}`}>
            {(() => {
              const Icon = getTrendIcon(5);
              return <Icon className="h-3 w-3" />;
            })()}
            <span>+5%</span>
          </div>
        </div>
      </Card>

      <Card className="p-3">
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs text-muted-foreground flex items-center gap-1">
            Avg Duration
            <AOCHelpTooltip content="Average execution time per run" />
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-lg font-bold">
            {stats.avgDuration < 1000
              ? `${stats.avgDuration}ms`
              : `${(stats.avgDuration / 1000).toFixed(1)}s`}
          </span>
          <Clock className="h-4 w-4 text-muted-foreground" />
        </div>
      </Card>

      <Card className="p-3">
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs text-muted-foreground flex items-center gap-1">
            Total Runs
            <AOCHelpTooltip content="Total number of executions across all time" />
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-lg font-bold">{stats.totalRuns.toLocaleString()}</span>
          <Activity className="h-4 w-4 text-muted-foreground" />
        </div>
      </Card>
    </div>
  );
}
