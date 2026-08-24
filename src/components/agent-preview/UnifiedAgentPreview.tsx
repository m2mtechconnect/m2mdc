import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { formatRelativeTime } from '@/lib/formatters';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Bot, Play, Pause, RotateCcw, Rocket, TrendingUp, Activity, CheckCircle2, Plug2 } from 'lucide-react';
import { AgentSummaryCard } from './AgentSummaryCard';

interface MCPServer {
  name: string;
  provider: string;
  category: string;
  authType: string;
  endpoint?: string;
  verified?: boolean;
}

interface UnifiedAgentPreviewProps {
  agentId?: string;
  agentName: string;
  status?: string;
  version?: string;
  successRate?: number;
  totalRuns?: number;
  roi?: number;
  connectedAppsCount?: number;
  recentActivity?: Array<{ id: string; timestamp: string; description: string }>;
  onResume?: () => void;
  onPause?: () => void;
  onRollback?: () => void;
  onDeploy?: () => void;
  isLoading?: boolean;
  mode?: 'full' | 'preview' | 'overview';
  description?: string;
  llmModel?: string;
  llmProvider?: string;
  temperature?: number;
  mcpServers?: MCPServer[];
  toolsCount?: number;
  resourcesCount?: number;
  promptsCount?: number;
  features?: string[];
  setupInstructions?: string[];
  compatibility?: {
    mcpEnabled: boolean;
    llmCompatible: string[];
    cloudReady: boolean;
    enterpriseSecure: boolean;
  };
  lastUpdated?: string;
  onConnectServer?: (server: MCPServer) => void;
}

function metricText(value: number | undefined, suffix = ''): string {
  return typeof value === 'number' ? `${value}${suffix}` : 'Unavailable';
}

export function UnifiedAgentPreview({
  agentId,
  agentName,
  status = 'draft',
  version = 'v0',
  successRate,
  totalRuns,
  roi,
  connectedAppsCount,
  recentActivity,
  onResume,
  onPause,
  onRollback,
  onDeploy,
  isLoading = false,
  mode = 'full',
  description,
  llmModel,
  llmProvider,
  temperature,
  mcpServers,
  toolsCount,
  resourcesCount,
  promptsCount,
  features,
  setupInstructions,
  compatibility,
  lastUpdated,
  onConnectServer,
}: UnifiedAgentPreviewProps) {
  const navigate = useNavigate();

  const statusColor = status === 'active' || status === 'deployed'
    ? 'bg-secondary/10 text-secondary border-secondary/30'
    : status === 'paused'
      ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30'
      : 'bg-muted text-muted-foreground border-border';

  const hasLifecycleAction = Boolean(onPause || onResume || onRollback || onDeploy);

  return (
    <div className="space-y-4">
      <h2 className="text-h3 font-semibold">{agentName}</h2>

      <Card className="p-4">
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-caption text-muted-foreground mb-1">Status</p>
            <Badge className={statusColor}>{status.charAt(0).toUpperCase() + status.slice(1)}</Badge>
          </div>
          <div className="text-right">
            <p className="text-caption text-muted-foreground mb-1">Version</p>
            <p className="font-mono text-sm">{version}</p>
          </div>
        </div>

        {typeof connectedAppsCount === 'number' && connectedAppsCount > 0 && (
          <div className="flex items-center gap-2 pt-2 border-t">
            <Plug2 className="h-4 w-4 text-primary" />
            <span className="text-sm text-muted-foreground">
              {connectedAppsCount} Connected {connectedAppsCount === 1 ? 'App' : 'Apps'}
            </span>
          </div>
        )}

        {mode === 'full' && (agentId || hasLifecycleAction) && (
          <TooltipProvider delayDuration={150}>
            <div className="flex gap-2 flex-wrap mt-4 pt-4 border-t">
              {agentId && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="default" size="sm" onClick={() => navigate(`/agents/${agentId}/chat`)} className="gap-2" disabled={isLoading}>
                      <Bot className="h-4 w-4" />
                      Chat
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="top">Open the configured agent conversation surface.</TooltipContent>
                </Tooltip>
              )}

              {(status === 'active' || status === 'deployed') && onPause && (
                <Button variant="outline" size="sm" onClick={onPause} disabled={isLoading}>
                  <Pause className="h-4 w-4 mr-2" />Pause
                </Button>
              )}
              {status !== 'active' && status !== 'deployed' && onResume && (
                <Button variant="outline" size="sm" onClick={onResume} disabled={isLoading}>
                  <Play className="h-4 w-4 mr-2" />Resume
                </Button>
              )}
              {onRollback && (
                <Button variant="outline" size="sm" onClick={onRollback} disabled={isLoading}>
                  <RotateCcw className="h-4 w-4 mr-2" />Rollback
                </Button>
              )}
              {onDeploy && (
                <Button variant="outline" size="sm" onClick={onDeploy} disabled={isLoading} className="glow-yellow">
                  <Rocket className="h-4 w-4 mr-2" />Deploy New Version
                </Button>
              )}
            </div>
          </TooltipProvider>
        )}
      </Card>

      {mode === 'preview' && (
        <AgentSummaryCard
          description={description}
          llmModel={llmModel}
          llmProvider={llmProvider}
          temperature={temperature}
          mcpServers={mcpServers}
          toolsCount={toolsCount}
          resourcesCount={resourcesCount}
          promptsCount={promptsCount}
          features={features}
          setupInstructions={setupInstructions}
          compatibility={compatibility}
          lastUpdated={lastUpdated}
          onConnectServer={onConnectServer}
        />
      )}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-2"><TrendingUp className="h-4 w-4 text-primary" /><p className="text-caption text-muted-foreground">Success Rate</p></div>
          <p className="text-2xl font-bold">{typeof successRate === 'number' ? `${Math.round(successRate)}%` : 'Unavailable'}</p>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-2"><Activity className="h-4 w-4 text-primary" /><p className="text-caption text-muted-foreground">Total Runs</p></div>
          <p className="text-2xl font-bold">{metricText(totalRuns)}</p>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-2"><TrendingUp className="h-4 w-4 text-primary" /><p className="text-caption text-muted-foreground">ROI</p></div>
          <p className="text-2xl font-bold">{metricText(roi, '%')}</p>
        </Card>
      </div>

      <Card className="p-6">
        <h3 className="text-h4 font-semibold mb-4">Recent Activity</h3>
        {recentActivity === undefined ? (
          <p className="text-muted-foreground text-center py-8">Activity evidence unavailable on this view</p>
        ) : recentActivity.length === 0 ? (
          <p className="text-muted-foreground text-center py-8">No recent activity recorded</p>
        ) : (
          <div className="space-y-3">
            {recentActivity.map((activity) => (
              <div key={activity.id} className="flex items-start gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors">
                <CheckCircle2 className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm">{activity.description}</p>
                  <p className="text-xs text-muted-foreground mt-1">{formatRelativeTime(activity.timestamp)}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
