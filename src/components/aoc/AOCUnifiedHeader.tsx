import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Play,
  Pause,
  Square,
  RotateCw,
  Edit,
  Copy,
  RotateCcw,
  MoreVertical,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { useRuntimeControl } from '@/hooks/useRuntimeControl';
import { useAnalytics } from '@/hooks/useAnalytics';
import type { DeployedSystem } from '@/types/system';
import { useEffect } from 'react';

interface AOCUnifiedHeaderProps {
  instance: DeployedSystem;
  icon?: string;
  onEdit?: () => void;
  onClone?: () => void;
}

export function AOCUnifiedHeader({
  instance,
  icon,
  onEdit,
  onClone,
}: AOCUnifiedHeaderProps) {
  const { mutate: controlRuntime, isPending, hasPermission } = useRuntimeControl(instance.id);
  const { trackEvent } = useAnalytics();

  useEffect(() => {
    trackEvent('aoc_viewed', { agentId: instance.id });
  }, [instance.id]);

  const handleAction = (action: 'run' | 'pause' | 'stop' | 'restart') => {
    controlRuntime(action);
    trackEvent('runtime_action', { agentId: instance.id, action });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
      case 'running':
        return 'bg-green-500/10 text-green-500 border-green-500/20';
      case 'paused':
        return 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20';
      case 'stopped':
      case 'archived':
        return 'bg-gray-500/10 text-gray-500 border-gray-500/20';
      default:
        return 'bg-blue-500/10 text-blue-500 border-blue-500/20';
    }
  };

  const formatStatus = (status: string) => {
    return status.charAt(0).toUpperCase() + status.slice(1);
  };

  return (
    <Card className="border-2 border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
      <div className="p-6">
        {/* Header Section */}
        <div className="flex items-start justify-between mb-6">
          <div className="flex items-start gap-4 flex-1 min-w-0">
            {/* Icon */}
            <div className="text-5xl flex-shrink-0">{icon || '🤖'}</div>

            {/* Title & Meta */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-3 mb-2 flex-wrap">
                <h1 className="text-2xl font-bold truncate">{instance.name}</h1>
                <Badge className={`${getStatusColor(instance.status)} border`}>
                  {formatStatus(instance.status)}
                </Badge>
                <Badge variant="outline" className="font-mono text-xs">
                  v{instance.version}
                </Badge>
              </div>

              <p className="text-muted-foreground text-sm line-clamp-2 mb-3">
                {instance.description}
              </p>

              {/* Metadata Row */}
              <div className="flex items-center gap-4 text-xs text-muted-foreground flex-wrap">
                <span className="flex items-center gap-1">
                  <strong>Environment:</strong> Dev
                </span>
                <span>•</span>
                <span className="flex items-center gap-1">
                  <strong>Last Updated:</strong>{' '}
                  {formatDistanceToNow(new Date(instance.updatedAt), { addSuffix: true })}
                </span>
                {instance.deployedAt && (
                  <>
                    <span>•</span>
                    <span className="flex items-center gap-1">
                      <strong>Deployed:</strong>{' '}
                      {formatDistanceToNow(new Date(instance.deployedAt), { addSuffix: true })}
                    </span>
                  </>
                )}
              </div>

              {/* Tags */}
              <div className="flex items-center gap-2 mt-3">
                <Badge variant="secondary" className="text-xs">
                  {instance.category}
                </Badge>
                <Badge variant="secondary" className="text-xs">
                  {instance.department}
                </Badge>
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="flex items-center gap-2 flex-shrink-0">
            <Button
              size="sm"
              variant="outline"
              className="gap-2"
              disabled={!hasPermission || isPending || instance.status === 'active'}
              onClick={() => handleAction('run')}
            >
              <Play className="h-4 w-4" />
              Run
            </Button>

            <Button
              size="sm"
              variant="outline"
              className="gap-2"
              disabled={!hasPermission || isPending || instance.status !== 'active'}
              onClick={() => handleAction('pause')}
            >
              <Pause className="h-4 w-4" />
              Pause
            </Button>

            <Button
              size="sm"
              variant="outline"
              className="gap-2"
              disabled={!hasPermission || isPending || instance.status === 'paused'}
              onClick={() => handleAction('stop')}
            >
              <Square className="h-4 w-4" />
              Stop
            </Button>

            <Button
              size="sm"
              variant="outline"
              className="gap-2"
              disabled={!hasPermission || isPending}
              onClick={() => handleAction('restart')}
            >
              <RotateCw className="h-4 w-4" />
              Restart
            </Button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button size="sm" variant="outline">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {onEdit && (
                  <DropdownMenuItem onClick={onEdit}>
                    <Edit className="h-4 w-4 mr-2" />
                    Edit Configuration
                  </DropdownMenuItem>
                )}
                {onClone && (
                  <DropdownMenuItem onClick={onClone}>
                    <Copy className="h-4 w-4 mr-2" />
                    Clone Agent
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem>
                  <RotateCcw className="h-4 w-4 mr-2" />
                  Rollback Version
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Metrics Row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="p-3 rounded-lg bg-background/50 border border-border/50">
            <div className="text-xs text-muted-foreground mb-1">Success Rate</div>
            <div className="text-xl font-bold">{instance.successRate}%</div>
          </div>

          <div className="p-3 rounded-lg bg-background/50 border border-border/50">
            <div className="text-xs text-muted-foreground mb-1">Total Runs</div>
            <div className="text-xl font-bold">{instance.totalRuns}</div>
          </div>

          <div className="p-3 rounded-lg bg-background/50 border border-border/50">
            <div className="text-xs text-muted-foreground mb-1">Last Run</div>
            <div className="text-sm font-semibold truncate">
              {instance.lastRun
                ? formatDistanceToNow(new Date(instance.lastRun.timestamp), { addSuffix: true })
                : 'Never'}
            </div>
          </div>

          <div className="p-3 rounded-lg bg-background/50 border border-border/50">
            <div className="text-xs text-muted-foreground mb-1">Avg Duration</div>
            <div className="text-sm font-semibold">
              {instance.avgDuration ? `${(instance.avgDuration / 1000).toFixed(1)}s` : 'N/A'}
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
}