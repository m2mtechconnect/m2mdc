import { Badge } from '@/components/ui/badge';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Cpu, Database, Zap, Brain, Wind, Network, Shield, GitBranch, ArrowRight } from 'lucide-react';
import type { DeployedSystem } from '@/types/system';
import { DCCard, DCSectionHeader } from '@/components/dc-ui';
import { DCArchitectureDiagram } from '@/components/dc-ui/DCArchitectureDiagram';

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
      {/* Section Header */}
      <DCSectionHeader
        title="Data Centre Architecture"
        subtitle="Infrastructure blueprint and system topology"
        icon={<Cpu className="h-5 w-5" />}
      />

      {/* Deployed Configuration Header */}
      <DCCard 
        title="Deployed Blueprint" 
        subtitle={`Current production configuration for ${instance.name}`}
        icon={<Cpu className="h-5 w-5" />}
        status="info"
        headerAction={<Badge variant="outline" className="border-dc-primary/30">v{instance.version}</Badge>}
      >
        <div className="text-sm text-muted-foreground">
          This blueprint defines the operational topology and data flow for the Data Centre Digital Twin.
        </div>
      </DCCard>

      {/* DC Architecture Diagram */}
      <DCCard 
        title="System Architecture" 
        subtitle="Data flow: GPU Cluster → Cooling → Power → Network → Sovereignty → Workflows"
        icon={<GitBranch className="h-4 w-4" />}
      >
        <DCArchitectureDiagram showJson={true} />
      </DCCard>

      {/* Intelligence Configuration */}
      <DCCard 
        title="Intelligence Configuration"
        icon={<Brain className="h-4 w-4 text-dc-gpu" />}
      >
        {intelligence ? (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="p-3 rounded-lg bg-dc-surface border border-dc-border">
                <p className="text-xs text-muted-foreground mb-1">AI Model</p>
                <p className="text-sm font-medium">{intelligence.model_id || 'Gemini 2.5 Flash'}</p>
              </div>
              <div className="p-3 rounded-lg bg-dc-surface border border-dc-border">
                <p className="text-xs text-muted-foreground mb-1">Version</p>
                <p className="text-sm font-medium">{intelligence.version || '1.0.0'}</p>
              </div>
            </div>

            {intelligence.tool_allowlist && intelligence.tool_allowlist.length > 0 && (
              <div>
                <p className="text-xs text-muted-foreground mb-2">Enabled Tools</p>
                <div className="flex flex-wrap gap-2">
                  {intelligence.tool_allowlist.map((tool, idx) => (
                    <Badge key={idx} variant="outline" className="bg-dc-surface border-dc-primary/30">
                      {tool}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {intelligence.mcp_servers && (
              <div>
                <p className="text-xs text-muted-foreground mb-2">MCP Servers</p>
                <pre className="text-xs bg-dc-bg-secondary p-4 rounded-lg overflow-auto font-mono max-h-[200px]">
                  {JSON.stringify(intelligence.mcp_servers, null, 2)}
                </pre>
              </div>
            )}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">No intelligence configuration</p>
        )}
      </DCCard>

      {/* Integrations */}
      <DCCard 
        title="Connected Integrations"
        icon={<Zap className="h-4 w-4 text-dc-power" />}
        headerAction={<Badge variant="outline" className="border-dc-power/30">{integrations.length} active</Badge>}
      >
        {integrations.length === 0 ? (
          <p className="text-sm text-muted-foreground">No integrations connected</p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {integrations.map((integration) => (
              <div 
                key={integration.id} 
                className="p-4 rounded-lg bg-dc-surface border border-dc-border"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Database className="h-4 w-4 text-dc-info" />
                    <span className="font-medium text-sm uppercase">{integration.provider}</span>
                  </div>
                  <Badge 
                    variant={integration.status === 'active' ? 'default' : 'secondary'} 
                    className={integration.status === 'active' ? 'bg-dc-success/20 text-dc-success border-dc-success/30' : ''}
                  >
                    {integration.status}
                  </Badge>
                </div>
                {integration.capabilities && (
                  <div className="text-xs text-muted-foreground grid grid-cols-2 gap-2">
                    <span>Actions: {(integration.capabilities as any)?.actions?.length || 0}</span>
                    <span>Triggers: {(integration.capabilities as any)?.triggers?.length || 0}</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </DCCard>

      {/* Instance Details */}
      <DCCard 
        title="Instance Details"
        icon={<Database className="h-4 w-4" />}
      >
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-3 rounded-lg bg-dc-surface border border-dc-border">
            <p className="text-xs text-muted-foreground mb-1">Status</p>
            <p className="font-medium text-sm">{instance.status}</p>
          </div>
          <div className="p-3 rounded-lg bg-dc-surface border border-dc-border">
            <p className="text-xs text-muted-foreground mb-1">Version</p>
            <p className="font-medium text-sm">v{instance.version}</p>
          </div>
          <div className="p-3 rounded-lg bg-dc-surface border border-dc-border">
            <p className="text-xs text-muted-foreground mb-1">Category</p>
            <p className="font-medium text-sm">{instance.category}</p>
          </div>
          <div className="p-3 rounded-lg bg-dc-surface border border-dc-border">
            <p className="text-xs text-muted-foreground mb-1">Department</p>
            <p className="font-medium text-sm">{instance.department}</p>
          </div>
        </div>
      </DCCard>
    </div>
  );
}
