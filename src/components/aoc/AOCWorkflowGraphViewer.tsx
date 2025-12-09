import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Workflow, Play, Square, Info } from 'lucide-react';
import { toast } from 'sonner';

interface AOCWorkflowGraphViewerProps {
  agentId: string;
}

export function AOCWorkflowGraphViewer({ agentId }: AOCWorkflowGraphViewerProps) {
  const { data: workflows = [] } = useQuery({
    queryKey: ['agent-workflows', agentId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('agent_workflows')
        .select('*')
        .eq('agent_id', agentId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    },
  });

  const toggleWorkflow = async (workflowId: string, currentState: boolean) => {
    const { error } = await supabase
      .from('agent_workflows')
      .update({ enabled: !currentState })
      .eq('id', workflowId);

    if (error) {
      toast.error('Failed to update workflow');
    } else {
      toast.success(`Workflow ${!currentState ? 'enabled' : 'disabled'}`);
    }
  };

  const renderWorkflowNode = (node: any, index: number) => {
    const nodeTypes: Record<string, { color: string; icon: string }> = {
      trigger: { color: 'bg-blue-500/10 text-blue-500', icon: '▶' },
      condition: { color: 'bg-purple-500/10 text-purple-500', icon: '?' },
      action: { color: 'bg-green-500/10 text-green-500', icon: '⚡' },
    };

    const nodeType = nodeTypes[node.type] || nodeTypes.action;

    return (
      <div key={index} className="flex items-center gap-2">
        <div
          className={`px-3 py-2 rounded-lg ${nodeType.color} border border-current/20 text-sm font-medium flex items-center gap-2`}
        >
          <span>{nodeType.icon}</span>
          <span>{node.name || node.type}</span>
        </div>
        {index < (workflows.length - 1) && (
          <div className="w-8 h-0.5 bg-border"></div>
        )}
      </div>
    );
  };

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Workflow className="h-5 w-5 text-primary" />
          <h3 className="text-lg font-semibold">Workflow Graph</h3>
        </div>
      </div>

      <ScrollArea className="h-[500px]">
        {workflows.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <Workflow className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p className="text-sm">No workflows configured</p>
            <p className="text-xs mt-1">Create workflows in the Builder</p>
          </div>
        ) : (
          <div className="space-y-6">
            {workflows.map((workflow) => (
              <Card key={workflow.id} className="p-4 border-l-4 border-l-primary">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h4 className="font-semibold">{workflow.name}</h4>
                      <Badge variant={workflow.enabled ? 'default' : 'secondary'}>
                        {workflow.enabled ? 'Active' : 'Inactive'}
                      </Badge>
                    </div>
                    {workflow.trigger_type && (
                      <p className="text-sm text-muted-foreground">
                        Trigger: {workflow.trigger_type}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => toggleWorkflow(workflow.id, workflow.enabled)}
                    >
                      {workflow.enabled ? (
                        <>
                          <Square className="h-3 w-3 mr-1" />
                          Disable
                        </>
                      ) : (
                        <>
                          <Play className="h-3 w-3 mr-1" />
                          Enable
                        </>
                      )}
                    </Button>

                    <Button size="sm" variant="ghost">
                      <Info className="h-3 w-3" />
                    </Button>
                  </div>
                </div>

                {/* Workflow DAG */}
                <div className="flex items-center gap-2 flex-wrap">
                  {(workflow.workflow_json as any)?.nodes?.map((node: any, idx: number) =>
                    renderWorkflowNode(node, idx)
                  )}
                </div>

                {/* Workflow Stats */}
                <div className="grid grid-cols-3 gap-4 mt-4 pt-4 border-t">
                  <div>
                    <div className="text-xs text-muted-foreground mb-1">Last Run</div>
                    <div className="text-sm font-medium">Never</div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground mb-1">Success Rate</div>
                    <div className="text-sm font-medium">N/A</div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground mb-1">Avg Duration</div>
                    <div className="text-sm font-medium">N/A</div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </ScrollArea>
    </Card>
  );
}