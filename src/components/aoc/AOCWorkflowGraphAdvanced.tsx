import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Network, Play, Pause, Edit2, ChevronRight } from 'lucide-react';
import { useState } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface WorkflowNode {
  id: string;
  name: string;
  type: 'trigger' | 'condition' | 'action' | 'integration';
  enabled: boolean;
  status?: 'idle' | 'running' | 'success' | 'error';
  lastRun?: string;
  config?: any;
}

interface AOCWorkflowGraphAdvancedProps {
  agentId: string;
  workflows: any[];
  onEditNode?: (nodeId: string) => void;
  onToggleNode?: (nodeId: string) => void;
}

export function AOCWorkflowGraphAdvanced({ 
  agentId, 
  workflows,
  onEditNode,
  onToggleNode 
}: AOCWorkflowGraphAdvancedProps) {
  const [selectedNode, setSelectedNode] = useState<WorkflowNode | null>(null);
  const [expandedWorkflow, setExpandedWorkflow] = useState<string | null>(null);

  // Convert workflows to nodes
  const getNodesFromWorkflow = (workflow: any): WorkflowNode[] => {
    const nodes: WorkflowNode[] = [];

    // Add trigger node
    if (workflow.trigger) {
      nodes.push({
        id: `${workflow.name}-trigger`,
        name: workflow.trigger,
        type: 'trigger',
        enabled: workflow.enabled !== false,
        status: 'idle',
      });
    }

    // Add condition nodes
    if (workflow.conditions && Array.isArray(workflow.conditions)) {
      workflow.conditions.forEach((condition: any, idx: number) => {
        nodes.push({
          id: `${workflow.name}-condition-${idx}`,
          name: condition.name || `Condition ${idx + 1}`,
          type: 'condition',
          enabled: true,
          status: 'idle',
          config: condition,
        });
      });
    }

    // Add action nodes
    if (workflow.actions && Array.isArray(workflow.actions)) {
      workflow.actions.forEach((action: any, idx: number) => {
        nodes.push({
          id: `${workflow.name}-action-${idx}`,
          name: action.name || action.action || `Action ${idx + 1}`,
          type: 'action',
          enabled: action.enabled !== false,
          status: 'idle',
          config: action,
        });
      });
    }

    return nodes;
  };

  const getNodeStatusColor = (status?: string) => {
    switch (status) {
      case 'running': return 'bg-blue-500 animate-pulse';
      case 'success': return 'bg-green-500';
      case 'error': return 'bg-red-500 animate-pulse';
      default: return 'bg-gray-400';
    }
  };

  const getNodeTypeColor = (type: string) => {
    switch (type) {
      case 'trigger': return 'border-blue-500 bg-blue-50 dark:bg-blue-950';
      case 'condition': return 'border-yellow-500 bg-yellow-50 dark:bg-yellow-950';
      case 'action': return 'border-green-500 bg-green-50 dark:bg-green-950';
      case 'integration': return 'border-primary bg-primary/5 dark:bg-primary/10';
      default: return 'border-gray-500 bg-gray-50 dark:bg-gray-950';
    }
  };

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
      <ScrollArea className="flex-1 p-4">
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
          <div className="space-y-6">
            {workflows.map((workflow, workflowIdx) => {
              const nodes = getNodesFromWorkflow(workflow);
              const isExpanded = expandedWorkflow === workflow.name;

              return (
                <Card key={workflowIdx} className="p-4">
                  {/* Workflow Header */}
                  <div 
                    className="flex items-center justify-between mb-4 cursor-pointer"
                    onClick={() => setExpandedWorkflow(isExpanded ? null : workflow.name)}
                  >
                    <div className="flex items-center gap-2">
                      <ChevronRight 
                        className={`h-4 w-4 transition-transform ${isExpanded ? 'rotate-90' : ''}`} 
                      />
                      <h4 className="text-sm font-semibold">
                        {workflow.name || `Workflow ${workflowIdx + 1}`}
                      </h4>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={workflow.enabled !== false ? 'default' : 'secondary'}>
                        {workflow.enabled !== false ? 'Active' : 'Disabled'}
                      </Badge>
                      <Badge variant="outline">{nodes.length} nodes</Badge>
                    </div>
                  </div>

                  {/* Workflow Graph */}
                  {isExpanded && (
                    <div className="space-y-3 pl-6">
                      {nodes.map((node, nodeIdx) => (
                        <div key={node.id}>
                          {/* Connection Line */}
                          {nodeIdx > 0 && (
                            <div className="flex justify-center my-2">
                              <div className="w-0.5 h-4 bg-border" />
                            </div>
                          )}

                          {/* Node Card */}
                          <Card 
                            className={`p-3 border-l-4 cursor-pointer hover:shadow-md transition-shadow ${getNodeTypeColor(node.type)}`}
                            onClick={() => setSelectedNode(node)}
                          >
                            <div className="flex items-center gap-3">
                              {/* Status Indicator */}
                              <div className={`w-3 h-3 rounded-full ${getNodeStatusColor(node.status)}`} />

                              {/* Node Info */}
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                  <span className="text-xs font-medium truncate">
                                    {node.name}
                                  </span>
                                  <Badge variant="outline" className="text-xs">
                                    {node.type}
                                  </Badge>
                                </div>
                                {node.lastRun && (
                                  <p className="text-xs text-muted-foreground">
                                    Last run: {new Date(node.lastRun).toLocaleTimeString()}
                                  </p>
                                )}
                              </div>

                              {/* Actions */}
                              <div className="flex gap-1">
                                {node.enabled ? (
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    className="h-6 w-6 p-0"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      onToggleNode?.(node.id);
                                    }}
                                  >
                                    <Pause className="h-3 w-3" />
                                  </Button>
                                ) : (
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    className="h-6 w-6 p-0"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      onToggleNode?.(node.id);
                                    }}
                                  >
                                    <Play className="h-3 w-3" />
                                  </Button>
                                )}
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-6 w-6 p-0"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onEditNode?.(node.id);
                                  }}
                                >
                                  <Edit2 className="h-3 w-3" />
                                </Button>
                              </div>
                            </div>
                          </Card>
                        </div>
                      ))}
                    </div>
                  )}
                </Card>
              );
            })}
          </div>
        )}
      </ScrollArea>

      {/* Node Details Dialog */}
      <Dialog open={!!selectedNode} onOpenChange={() => setSelectedNode(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{selectedNode?.name}</DialogTitle>
            <DialogDescription>
              {selectedNode?.type.toUpperCase()} NODE
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Status</span>
                <Badge variant={selectedNode?.enabled ? 'default' : 'secondary'}>
                  {selectedNode?.enabled ? 'Enabled' : 'Disabled'}
                </Badge>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Type</span>
                <span className="font-medium capitalize">{selectedNode?.type}</span>
              </div>
              {selectedNode?.lastRun && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Last Run</span>
                  <span className="font-medium">
                    {new Date(selectedNode.lastRun).toLocaleString()}
                  </span>
                </div>
              )}
            </div>

            {selectedNode?.config && (
              <div>
                <h4 className="text-sm font-semibold mb-2">Configuration</h4>
                <Card className="p-3 bg-muted">
                  <pre className="text-xs overflow-auto">
                    {JSON.stringify(selectedNode.config, null, 2)}
                  </pre>
                </Card>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
