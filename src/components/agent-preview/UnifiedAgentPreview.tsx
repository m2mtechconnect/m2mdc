import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { useNavigate } from 'react-router-dom';
import { formatRelativeTime } from '@/lib/formatters';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Bot,
  Play,
  Pause,
  RotateCcw,
  Rocket,
  TrendingUp,
  Activity,
  CheckCircle2,
  Plug2,
} from 'lucide-react';
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
  recentActivity?: Array<{
    id: string;
    timestamp: string;
    description: string;
  }>;
  onResume?: () => void;
  onPause?: () => void;
  onRollback?: () => void;
  onDeploy?: () => void;
  isLoading?: boolean;
  mode?: 'full' | 'preview' | 'overview'; // full = all controls, preview = template/marketplace, overview = chat + metrics only
  // Agent Summary fields
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

export function UnifiedAgentPreview({
  agentId,
  agentName,
  status = 'draft',
  version = 'v0',
  successRate = 0,
  totalRuns = 0,
  roi = 0,
  connectedAppsCount = 0,
  recentActivity = [],
  onResume,
  onPause,
  onRollback,
  onDeploy,
  isLoading = false,
  mode = 'full',
  // Agent Summary props
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

  const statusColor =
    status === 'active' || status === 'deployed'
      ? 'bg-secondary/10 text-secondary border-secondary/30'
      : status === 'paused'
      ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30'
      : 'bg-muted text-muted-foreground border-border';

  const handleChat = () => {
    if (agentId) {
      navigate(`/agents/${agentId}/chat`);
    }
  };

  return (
    <div className="space-y-4">
      {/* Title */}
      <h2 className="text-h3 font-semibold">{agentName}</h2>

      {/* Status & Version Header + Actions */}
      <Card className="p-4">
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-caption text-muted-foreground mb-1">Status</p>
            <Badge className={statusColor}>
              {status.charAt(0).toUpperCase() + status.slice(1)}
            </Badge>
          </div>
          <div className="text-right">
            <p className="text-caption text-muted-foreground mb-1">Version</p>
            <p className="font-mono text-sm">{version}</p>
          </div>
        </div>

        {connectedAppsCount > 0 && (
          <div className="flex items-center gap-2 pt-2 border-t">
            <Plug2 className="h-4 w-4 text-primary" />
            <span className="text-sm text-muted-foreground">
              {connectedAppsCount} Connected {connectedAppsCount === 1 ? 'App' : 'Apps'}
            </span>
          </div>
        )}

        {/* Action Buttons */}
        <TooltipProvider delayDuration={150}>
          <div className="flex gap-2 flex-wrap mt-4 pt-4 border-t">
            {/* Chat button - only show in full mode (not in overview or preview) */}
            {mode === 'full' && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="default"
                    size="sm"
                    onClick={handleChat}
                    className="gap-2"
                    disabled={!agentId || isLoading}
                  >
                    <Bot className="h-4 w-4" />
                    Chat
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="top">
                  Start a live conversation with this agent to test its responses.
                </TooltipContent>
              </Tooltip>
            )}

            {/* Control buttons - only show in full mode */}
            {mode === 'full' && (
              <>
                {status === 'active' || status === 'deployed' ? (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={onPause}
                        disabled={isLoading || !onPause}
                      >
                        <Pause className="h-4 w-4 mr-2" />
                        Pause
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="top">
                      Temporarily pause this agent's operations.
                    </TooltipContent>
                  </Tooltip>
                ) : (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={onResume}
                        disabled={isLoading || !onResume}
                      >
                        <Play className="h-4 w-4 mr-2" />
                        Resume
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="top">
                      Continue from where you last left off in this agent's workflow.
                    </TooltipContent>
                  </Tooltip>
                )}

                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={onRollback}
                      disabled={isLoading || !onRollback}
                    >
                      <RotateCcw className="h-4 w-4 mr-2" />
                      Rollback
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="top">
                    Revert this agent to a previous version or checkpoint.
                  </TooltipContent>
                </Tooltip>

                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={onDeploy}
                      disabled={isLoading}
                      className="glow-yellow"
                    >
                      <Rocket className="h-4 w-4 mr-2" />
                      Deploy New Version
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="top">
                    Push your latest changes to production and create a new version.
                  </TooltipContent>
                </Tooltip>
              </>
            )}
          </div>
        </TooltipProvider>
      </Card>

      {/* Agent Summary Card */}
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

      {/* KPI Cards Row */}
      <div className="grid grid-cols-3 gap-4">
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="h-4 w-4 text-primary" />
            <p className="text-caption text-muted-foreground">Success Rate</p>
          </div>
          <p className="text-2xl font-bold">
            {typeof successRate === 'number' ? `${Math.round(successRate)}%` : '0%'}
          </p>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-2 mb-2">
            <Activity className="h-4 w-4 text-primary" />
            <p className="text-caption text-muted-foreground">Total Runs</p>
          </div>
          <p className="text-2xl font-bold">{totalRuns}</p>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="h-4 w-4 text-primary" />
            <p className="text-caption text-muted-foreground">ROI</p>
          </div>
          <p className="text-2xl font-bold">
            {typeof roi === 'number' ? `${roi}%` : '0%'}
          </p>
        </Card>
      </div>

      {/* Recent Activity */}
      <Card className="p-6">
        <h3 className="text-h4 font-semibold mb-4">Recent Activity</h3>
        {recentActivity.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-muted-foreground">No recent activity</p>
          </div>
        ) : (
          <div className="space-y-3">
            {recentActivity.map((activity) => (
              <div
                key={activity.id}
                className="flex items-start gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors"
              >
                <CheckCircle2 className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm">{activity.description}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {formatRelativeTime(activity.timestamp)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
