import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { GitBranch, Play, CheckCircle2, XCircle, Clock } from 'lucide-react';

interface AOCWorkflowTabProps {
  agentId: string;
}

export function AOCWorkflowTab({ agentId }: AOCWorkflowTabProps) {
  const useMock = false /* PR-0.1 B7: VITE_USE_MOCK_AOC removed from allowlist */;

  const { data: workflows = [] } = useQuery({
    queryKey: ['agent-workflows', agentId],
    queryFn: async () => {
      if (useMock) {
        const { mockAgentWorkflows } = await import('@/lib/mock/aocMockData');
        return mockAgentWorkflows;
      }

      const { data, error } = await supabase
        .from('agent_workflows')
        .select('*')
        .eq('agent_id', agentId);

      if (error) throw error;
      
      // Dev fallback
      if ((!data || data.length === 0) && import.meta.env.DEV) {
        console.warn('[AOC Demo] No workflows found – falling back to mock');
        const { mockAgentWorkflows } = await import('@/lib/mock/aocMockData');
        return mockAgentWorkflows;
      }
      
      return data || [];
    },
  });

  const getNodeIcon = (status: string) => {
    switch (status) {
      case 'running':
        return <Clock className="h-4 w-4 text-blue-500 animate-pulse" />;
      case 'completed':
        return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case 'error':
        return <XCircle className="h-4 w-4 text-red-500" />;
      default:
        return <GitBranch className="h-4 w-4 text-muted-foreground" />;
    }
  };

  return (
    <div className="space-y-4">
      <Card className="p-4">
        <div className="flex items-center gap-2 mb-4">
          <GitBranch className="h-5 w-5 text-primary" />
          <h3 className="text-lg font-semibold">Workflow Execution Graph</h3>
          <Badge variant="outline">{workflows.length} workflows</Badge>
        </div>
        <p className="text-sm text-muted-foreground">
          Visual representation of deployed workflows and their execution state
        </p>
      </Card>

      {workflows.length === 0 ? (
        <Card className="p-12 text-center">
          <GitBranch className="h-12 w-12 mx-auto mb-3 opacity-50" />
          <p className="text-sm text-muted-foreground">No workflows deployed</p>
        </Card>
      ) : (
        <div className="grid gap-4">
          {workflows.map((workflow) => {
            const workflowData = workflow.workflow_json as any;
            const nodes = workflowData?.nodes || [];

            return (
              <Card key={workflow.id} className="p-4">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h4 className="font-semibold">{workflow.name}</h4>
                    <p className="text-xs text-muted-foreground">
                      Trigger: {workflow.trigger_type || 'Manual'}
                    </p>
                  </div>
                  <Badge variant={workflow.enabled ? 'default' : 'secondary'}>
                    {workflow.enabled ? 'Enabled' : 'Disabled'}
                  </Badge>
                </div>

                {/* Workflow DAG */}
                <div className="space-y-3">
                  {nodes.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground text-sm">
                      No nodes configured
                    </div>
                  ) : (
                    nodes.map((node: any, idx: number) => (
                      <div key={idx}>
                        <div className="flex items-center gap-3 p-3 rounded-lg bg-accent/30 border border-border/50">
                          {getNodeIcon(node.status || 'idle')}
                          <div className="flex-1">
                            <p className="text-sm font-medium">{node.name || node.type}</p>
                            <p className="text-xs text-muted-foreground">
                              {node.action || node.type}
                            </p>
                          </div>
                          {node.status && (
                            <Badge variant="outline" className="text-xs">
                              {node.status}
                            </Badge>
                          )}
                        </div>
                        {idx < nodes.length - 1 && (
                          <div className="flex justify-center my-1">
                            <Play className="h-4 w-4 text-muted-foreground rotate-90" />
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
