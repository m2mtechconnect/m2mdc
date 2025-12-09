import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Cpu, Database, Zap, Brain } from 'lucide-react';
import type { DeployedSystem } from '@/types/system';

interface AOCBlueprintTabProps {
  instance: DeployedSystem;
}

export function AOCBlueprintTab({ instance }: AOCBlueprintTabProps) {
  const { data: intelligence } = useQuery({
    queryKey: ['intelligence-settings', instance.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('intelligence_settings')
        .select('*')
        .eq('system_id', instance.id)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      return data;
    },
  });

  const { data: integrations = [] } = useQuery({
    queryKey: ['agent-integrations', instance.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('agent_integrations')
        .select('*')
        .eq('system_id', instance.id);

      if (error) throw error;
      return data || [];
    },
  });

  return (
    <div className="space-y-6">
      {/* Deployed Configuration Header */}
      <Card className="p-4 bg-gradient-to-r from-primary/5 to-transparent border-primary/20">
        <div className="flex items-center gap-2">
          <Cpu className="h-5 w-5 text-primary" />
          <h3 className="text-lg font-semibold">Deployed Blueprint</h3>
          <Badge variant="outline">v{instance.version}</Badge>
        </div>
        <p className="text-sm text-muted-foreground mt-1">
          Current production configuration for {instance.name}
        </p>
      </Card>

      {/* Intelligence Configuration */}
      <Card className="p-6">
        <div className="flex items-center gap-2 mb-4">
          <Brain className="h-5 w-5 text-purple-500" />
          <h4 className="font-semibold">Intelligence</h4>
        </div>
        
        {intelligence ? (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-muted-foreground mb-1">Model</p>
                <p className="text-sm font-medium">{intelligence.model_id || 'Gemini 2.5 Flash'}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">Version</p>
                <p className="text-sm font-medium">{intelligence.version || '1.0.0'}</p>
              </div>
            </div>

            {intelligence.tool_allowlist && intelligence.tool_allowlist.length > 0 && (
              <div>
                <p className="text-xs text-muted-foreground mb-2">Enabled Tools</p>
                <div className="flex flex-wrap gap-1">
                  {intelligence.tool_allowlist.map((tool, idx) => (
                    <Badge key={idx} variant="secondary" className="text-xs">
                      {tool}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {intelligence.mcp_servers && (
              <div>
                <p className="text-xs text-muted-foreground mb-2">MCP Servers</p>
                <pre className="text-xs bg-muted p-3 rounded overflow-auto">
                  {JSON.stringify(intelligence.mcp_servers, null, 2)}
                </pre>
              </div>
            )}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">No intelligence configuration</p>
        )}
      </Card>

      {/* Integrations */}
      <Card className="p-6">
        <div className="flex items-center gap-2 mb-4">
          <Zap className="h-5 w-5 text-yellow-500" />
          <h4 className="font-semibold">Connected Integrations</h4>
          <Badge variant="outline">{integrations.length}</Badge>
        </div>

        {integrations.length === 0 ? (
          <p className="text-sm text-muted-foreground">No integrations connected</p>
        ) : (
          <div className="space-y-3">
            {integrations.map((integration) => (
              <Card key={integration.id} className="p-4 bg-accent/30">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Database className="h-4 w-4" />
                    <span className="font-medium text-sm uppercase">{integration.provider}</span>
                  </div>
                  <Badge variant={integration.status === 'active' ? 'default' : 'secondary'} className="text-xs">
                    {integration.status}
                  </Badge>
                </div>
                {integration.capabilities && (
                  <div className="text-xs text-muted-foreground">
                    <p>Actions: {(integration.capabilities as any)?.actions?.length || 0}</p>
                    <p>Triggers: {(integration.capabilities as any)?.triggers?.length || 0}</p>
                  </div>
                )}
              </Card>
            ))}
          </div>
        )}
      </Card>

      {/* Configuration Snapshot */}
      <Card className="p-6">
        <div className="flex items-center gap-2 mb-4">
          <Cpu className="h-5 w-5" />
          <h4 className="font-semibold">Instance Details</h4>
        </div>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-muted-foreground mb-1">Status</p>
            <p className="font-medium">{instance.status}</p>
          </div>
          <div>
            <p className="text-muted-foreground mb-1">Version</p>
            <p className="font-medium">v{instance.version}</p>
          </div>
          <div>
            <p className="text-muted-foreground mb-1">Category</p>
            <p className="font-medium">{instance.category}</p>
          </div>
          <div>
            <p className="text-muted-foreground mb-1">Department</p>
            <p className="font-medium">{instance.department}</p>
          </div>
        </div>
      </Card>
    </div>
  );
}
