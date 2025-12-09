import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Activity, 
  Edit, 
  Copy, 
  Key, 
  ChevronRight,
  Database,
  Plug
} from 'lucide-react';

interface AOCAgentSidebarProps {
  agent: any;
  runtimeStatus: any;
  onEditInBuilder: () => void;
  onViewLogs: () => void;
}

export function AOCAgentSidebar({ 
  agent, 
  runtimeStatus,
  onEditInBuilder,
  onViewLogs
}: AOCAgentSidebarProps) {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-500';
      case 'paused': return 'bg-yellow-500';
      case 'draft': return 'bg-gray-500';
      default: return 'bg-red-500';
    }
  };

  return (
    <div className="p-4 space-y-4">
      {/* Agent Header */}
      <Card className="p-4">
        <div className="space-y-3">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <h3 className="font-semibold text-sm mb-1">{agent.name}</h3>
              <p className="text-xs text-muted-foreground line-clamp-2">
                {agent.description || 'No description'}
              </p>
            </div>
          </div>

          {/* Status */}
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${getStatusColor(agent.status)} animate-pulse`} />
            <span className="text-xs font-medium capitalize">{agent.status}</span>
          </div>

          {/* Version */}
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">Version</span>
            <Badge variant="outline">{agent.version}</Badge>
          </div>

          {/* Environment */}
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">Environment</span>
            <Badge>Production</Badge>
          </div>
        </div>
      </Card>

      {/* Runtime Info */}
      <Card className="p-4">
        <h4 className="text-xs font-semibold mb-3 flex items-center gap-2">
          <Activity className="h-3 w-3" />
          Runtime Status
        </h4>
        <div className="space-y-2 text-xs">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Health</span>
            <span className="font-medium capitalize">{runtimeStatus?.health || 'Unknown'}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Total Runs</span>
            <span className="font-medium">{agent.total_runs || 0}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Success Rate</span>
            <span className="font-medium">{agent.success_rate || 0}%</span>
          </div>
        </div>
      </Card>

      {/* Connected Resources */}
      <Card className="p-4">
        <h4 className="text-xs font-semibold mb-3 flex items-center gap-2">
          <Plug className="h-3 w-3" />
          Connected Resources
        </h4>
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground flex items-center gap-1">
              <Database className="h-3 w-3" />
              Data Sources
            </span>
            <span className="font-medium">
              {agent.config?.data_sources?.length || 0}
            </span>
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground flex items-center gap-1">
              <Plug className="h-3 w-3" />
              Integrations
            </span>
            <span className="font-medium">
              {agent.agent_integrations?.length || 0}
            </span>
          </div>
        </div>
      </Card>

      {/* Quick Actions */}
      <div className="space-y-2">
        <Button 
          variant="outline" 
          size="sm" 
          className="w-full justify-between"
          onClick={onEditInBuilder}
        >
          <span className="flex items-center gap-2">
            <Edit className="h-3 w-3" />
            Edit in Builder
          </span>
          <ChevronRight className="h-3 w-3" />
        </Button>
        
        <Button 
          variant="outline" 
          size="sm" 
          className="w-full justify-between"
        >
          <span className="flex items-center gap-2">
            <Copy className="h-3 w-3" />
            Clone Agent
          </span>
          <ChevronRight className="h-3 w-3" />
        </Button>

        <Button 
          variant="outline" 
          size="sm" 
          className="w-full justify-between"
        >
          <span className="flex items-center gap-2">
            <Key className="h-3 w-3" />
            API Keys
          </span>
          <ChevronRight className="h-3 w-3" />
        </Button>
      </div>

      {/* Owner Info */}
      <Card className="p-3">
        <div className="text-xs space-y-1">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Created</span>
            <span>{new Date(agent.created_at).toLocaleDateString()}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Updated</span>
            <span>{new Date(agent.updated_at).toLocaleDateString()}</span>
          </div>
        </div>
      </Card>
    </div>
  );
}
