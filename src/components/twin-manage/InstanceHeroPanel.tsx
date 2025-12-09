import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Activity, TrendingUp, Clock, PlayCircle } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import type { DeployedSystem } from '@/types/system';

interface InstanceHeroPanelProps {
  instance: DeployedSystem;
  icon?: string;
}

export function InstanceHeroPanel({ instance, icon }: InstanceHeroPanelProps) {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
      case 'running':
        return 'bg-green-500/10 text-green-500 border-green-500/20';
      case 'deployed':
        return 'bg-blue-500/10 text-blue-500 border-blue-500/20';
      case 'paused':
        return 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20';
      case 'archived':
        return 'bg-gray-500/10 text-gray-500 border-gray-500/20';
      default:
        return 'bg-gray-500/10 text-gray-500 border-gray-500/20';
    }
  };

  const formatStatus = (status: string) => {
    return status.charAt(0).toUpperCase() + status.slice(1);
  };

  const lastRunText = instance.lastRun 
    ? formatDistanceToNow(new Date(instance.lastRun.timestamp), { addSuffix: true })
    : 'Never';

  return (
    <Card className="border-2 border-primary/20 bg-gradient-to-br from-primary/5 to-transparent overflow-hidden">
      <div className="p-6">
        {/* Header Row */}
        <div className="flex items-start gap-4 mb-6">
          {/* Icon */}
          <div className="text-5xl flex-shrink-0">
            {icon || '🤖'}
          </div>

          {/* Title and Description */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-2xl font-bold truncate">{instance.name}</h1>
              <Badge className={`${getStatusColor(instance.status)} border`}>
                {formatStatus(instance.status)}
              </Badge>
            </div>
            <p className="text-muted-foreground text-sm line-clamp-2">
              {instance.description}
            </p>
            <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground">
              <span>Version {instance.version}</span>
              {instance.deployedAt && (
                <>
                  <span>•</span>
                  <span>Deployed {formatDistanceToNow(new Date(instance.deployedAt), { addSuffix: true })}</span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Live Metrics Row */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <div className="flex items-center gap-3 p-3 rounded-lg bg-background/50 border border-border/50">
            <div className="p-2 rounded-lg bg-green-500/10">
              <TrendingUp className="h-5 w-5 text-green-500" />
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Success Rate</div>
              <div className="text-xl font-bold">{instance.successRate}%</div>
            </div>
          </div>

          <div className="flex items-center gap-3 p-3 rounded-lg bg-background/50 border border-border/50">
            <div className="p-2 rounded-lg bg-blue-500/10">
              <Activity className="h-5 w-5 text-blue-500" />
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Total Runs</div>
              <div className="text-xl font-bold">{instance.totalRuns}</div>
            </div>
          </div>

          <div className="flex items-center gap-3 p-3 rounded-lg bg-background/50 border border-border/50">
            <div className="p-2 rounded-lg bg-purple-500/10">
              <Clock className="h-5 w-5 text-purple-500" />
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Last Run</div>
              <div className="text-sm font-semibold truncate">{lastRunText}</div>
            </div>
          </div>

          <div className="flex items-center gap-3 p-3 rounded-lg bg-background/50 border border-border/50">
            <div className="p-2 rounded-lg bg-orange-500/10">
              <PlayCircle className="h-5 w-5 text-orange-500" />
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Avg Duration</div>
              <div className="text-sm font-semibold">
                {instance.avgDuration 
                  ? `${(instance.avgDuration / 1000).toFixed(1)}s`
                  : 'N/A'
                }
              </div>
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
}
