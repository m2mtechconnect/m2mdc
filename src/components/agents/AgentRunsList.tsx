/**
 * Agent Runs List - Display list of agent runs
 */
import React from 'react';
import { formatDistanceToNow } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  CheckCircle, XCircle, Clock, Loader2, Ban, 
  ChevronRight, Play, RefreshCw 
} from 'lucide-react';
import { AgentDefinitionRun, RunStatus } from '@/types/agentDefinition';
import { cn } from '@/lib/utils';

const STATUS_CONFIG: Record<RunStatus, { icon: React.ComponentType<{ className?: string }>; color: string; label: string }> = {
  pending: { icon: Clock, color: 'text-muted-foreground', label: 'Pending' },
  running: { icon: Loader2, color: 'text-blue-500', label: 'Running' },
  completed: { icon: CheckCircle, color: 'text-green-500', label: 'Completed' },
  failed: { icon: XCircle, color: 'text-red-500', label: 'Failed' },
  cancelled: { icon: Ban, color: 'text-yellow-500', label: 'Cancelled' },
};

interface AgentRunsListProps {
  runs: AgentDefinitionRun[];
  onRunClick?: (run: AgentDefinitionRun) => void;
  onRefresh?: () => void;
  isLoading?: boolean;
  showHeader?: boolean;
  maxHeight?: string;
}

export const AgentRunsList: React.FC<AgentRunsListProps> = ({
  runs,
  onRunClick,
  onRefresh,
  isLoading = false,
  showHeader = true,
  maxHeight = '400px',
}) => {
  return (
    <Card>
      {showHeader && (
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">Recent Runs</CardTitle>
            {onRefresh && (
              <Button variant="ghost" size="sm" onClick={onRefresh} disabled={isLoading}>
                <RefreshCw className={cn("h-4 w-4", isLoading && "animate-spin")} />
              </Button>
            )}
          </div>
        </CardHeader>
      )}
      
      <CardContent className={!showHeader ? 'pt-4' : 'pt-0'}>
        {runs.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Play className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p>No runs yet</p>
            <p className="text-sm">Run the agent to see results here</p>
          </div>
        ) : (
          <ScrollArea style={{ maxHeight }}>
            <div className="space-y-2">
              {runs.map(run => {
                const statusConfig = STATUS_CONFIG[run.status];
                const StatusIcon = statusConfig.icon;
                
                return (
                  <div
                    key={run.id}
                    className={cn(
                      "flex items-center gap-3 p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors",
                      onRunClick && "cursor-pointer"
                    )}
                    onClick={() => onRunClick?.(run)}
                  >
                    <StatusIcon 
                      className={cn(
                        "h-5 w-5", 
                        statusConfig.color,
                        run.status === 'running' && "animate-spin"
                      )} 
                    />
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <Badge 
                          variant={run.status === 'completed' ? 'default' : 'secondary'}
                          className="text-xs"
                        >
                          {statusConfig.label}
                        </Badge>
                        {run.durationMs && (
                          <span className="text-xs text-muted-foreground">
                            {(run.durationMs / 1000).toFixed(1)}s
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        {formatDistanceToNow(new Date(run.createdAt), { addSuffix: true })}
                      </p>
                      {run.errorMessage && (
                        <p className="text-xs text-red-500 mt-1 truncate">
                          {run.errorMessage}
                        </p>
                      )}
                    </div>
                    
                    {onRunClick && (
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    )}
                  </div>
                );
              })}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
};
