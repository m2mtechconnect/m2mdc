import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Network } from 'lucide-react';

interface AOCWorkflowGraphProps {
  agentId: string;
  workflows: any[];
}

export function AOCWorkflowGraph({ agentId, workflows }: AOCWorkflowGraphProps) {
  return (
    <div className="h-full flex flex-col bg-card">
      {/* Header */}
      <div className="p-3 border-b flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Network className="h-4 w-4" />
          <h3 className="text-sm font-semibold">Workflow Graph</h3>
        </div>
        <Badge variant="outline">{workflows?.length || 0} Workflows</Badge>
      </div>

      {/* Graph Viewer */}
      <div className="flex-1 p-4 overflow-auto">
        {!workflows || workflows.length === 0 ? (
          <div className="h-full flex items-center justify-center">
            <div className="text-center">
              <Network className="h-12 w-12 text-muted-foreground mx-auto mb-3 opacity-50" />
              <p className="text-sm text-muted-foreground">
                No workflows configured
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Add workflows in the Builder
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {workflows.map((workflow, idx) => (
              <Card key={idx} className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-sm font-semibold">{workflow.name || `Workflow ${idx + 1}`}</h4>
                  <Badge variant={workflow.enabled ? 'default' : 'secondary'}>
                    {workflow.enabled ? 'Active' : 'Disabled'}
                  </Badge>
                </div>
                <div className="space-y-2 text-xs">
                  <div className="flex gap-2">
                    <span className="text-muted-foreground min-w-20">Trigger:</span>
                    <span className="font-mono">{workflow.trigger || 'N/A'}</span>
                  </div>
                  <div className="flex gap-2">
                    <span className="text-muted-foreground min-w-20">Actions:</span>
                    <span className="font-mono">
                      {Array.isArray(workflow.actions) ? workflow.actions.length : 0}
                    </span>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
