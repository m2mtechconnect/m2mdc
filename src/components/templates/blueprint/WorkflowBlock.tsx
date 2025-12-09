/**
 * Workflow Block Component
 * Expandable/collapsible workflow display with detailed breakdown
 */

import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ChevronDown, ChevronUp, Workflow, Code2 } from 'lucide-react';

interface WorkflowBlockProps {
  workflow: {
    id?: string;
    name?: string;
    description?: string;
    purpose?: string;
    trigger?: any;
    conditions?: any[];
    actions?: any[];
    outputs?: string[];
  };
  index: number;
}

export function WorkflowBlock({ workflow, index }: WorkflowBlockProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showJson, setShowJson] = useState(false);
  
  const workflowName = workflow.name || `Workflow ${index + 1}`;
  const hasTrigger = workflow.trigger;
  const hasConditions = workflow.conditions && workflow.conditions.length > 0;
  const hasActions = workflow.actions && workflow.actions.length > 0;
  const hasOutputs = workflow.outputs && workflow.outputs.length > 0;
  
  // Get trigger summary
  const getTriggerSummary = () => {
    if (!workflow.trigger) return 'No trigger defined';
    const trigger = workflow.trigger;
    if (typeof trigger === 'string') return trigger;
    if (trigger.type) {
      let summary = trigger.type;
      if (trigger.event_type) summary += ` (${trigger.event_type})`;
      if (trigger.frequency) summary += ` - ${trigger.frequency}`;
      return summary;
    }
    return 'Configured';
  };
  
  // Get outputs summary
  const getOutputsSummary = () => {
    if (!hasOutputs) return 'No outputs';
    return workflow.outputs!.slice(0, 2).join(', ') + (workflow.outputs!.length > 2 ? '...' : '');
  };
  
  return (
    <Card className="overflow-hidden">
      {/* Collapsed View */}
      <div className="p-5">
        <div className="flex items-start justify-between gap-4 mb-3">
          <div className="flex items-start gap-3 flex-1">
            <div className="p-2 rounded-md bg-primary/10 mt-1">
              <Workflow className="h-4 w-4 text-primary" />
            </div>
            <div className="flex-1">
              <h4 className="font-semibold text-lg mb-1">{workflowName}</h4>
              {workflow.purpose && (
                <p className="text-sm text-muted-foreground mb-2">{workflow.purpose}</p>
              )}
              {workflow.description && !workflow.purpose && (
                <p className="text-sm text-muted-foreground mb-2">{workflow.description}</p>
              )}
              
              <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                <span><strong>Trigger:</strong> {getTriggerSummary()}</span>
                {hasOutputs && (
                  <span><strong>Outputs:</strong> {getOutputsSummary()}</span>
                )}
              </div>
            </div>
          </div>
          
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsExpanded(!isExpanded)}
            className="gap-2"
          >
            {isExpanded ? (
              <>
                <ChevronUp className="h-4 w-4" />
                Collapse
              </>
            ) : (
              <>
                <ChevronDown className="h-4 w-4" />
                Expand
              </>
            )}
          </Button>
        </div>
      </div>
      
      {/* Expanded View */}
      {isExpanded && (
        <div className="border-t px-5 pb-5 pt-4 bg-muted/20 space-y-4">
          {/* Trigger Table */}
          {hasTrigger && (
            <div>
              <h5 className="text-sm font-semibold mb-2">Trigger</h5>
              <div className="p-3 bg-background rounded-md border">
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <span className="text-muted-foreground">Type:</span>{' '}
                    <Badge variant="outline" className="text-xs ml-1">
                      {typeof workflow.trigger === 'string' ? workflow.trigger : workflow.trigger.type || 'N/A'}
                    </Badge>
                  </div>
                  {workflow.trigger.event_type && (
                    <div>
                      <span className="text-muted-foreground">Event:</span>{' '}
                      <span className="font-medium">{workflow.trigger.event_type}</span>
                    </div>
                  )}
                  {workflow.trigger.frequency && (
                    <div>
                      <span className="text-muted-foreground">Frequency:</span>{' '}
                      <span className="font-medium">{workflow.trigger.frequency}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
          
          {/* Conditions Table */}
          {hasConditions && (
            <div>
              <h5 className="text-sm font-semibold mb-2">Conditions ({workflow.conditions!.length})</h5>
              <div className="p-3 bg-background rounded-md border">
                <div className="space-y-2">
                  {workflow.conditions!.map((cond: any, idx: number) => (
                    <div key={idx} className="text-sm flex items-center gap-2">
                      <Badge variant="outline" className="text-xs">{cond.field}</Badge>
                      <span className="text-muted-foreground">{cond.operator}</span>
                      <span className="font-medium">{cond.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
          
          {/* Actions Table */}
          {hasActions && (
            <div>
              <h5 className="text-sm font-semibold mb-2">Actions ({workflow.actions!.length})</h5>
              <div className="p-3 bg-background rounded-md border space-y-2">
                {workflow.actions!.map((action: any, idx: number) => (
                  <div key={idx} className="pl-3 border-l-2 border-primary/50">
                    <Badge variant="secondary" className="mb-1 text-xs">
                      {typeof action === 'string' ? action : action.name || action.type || 'Action'}
                    </Badge>
                    {action.agent && (
                      <p className="text-xs text-muted-foreground">Agent: {action.agent}</p>
                    )}
                    {action.target && (
                      <p className="text-xs text-muted-foreground">Target: {action.target}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
          
          {/* Outputs List */}
          {hasOutputs && (
            <div>
              <h5 className="text-sm font-semibold mb-2">Outputs ({workflow.outputs!.length})</h5>
              <div className="flex flex-wrap gap-2">
                {workflow.outputs!.map((output: string, idx: number) => (
                  <Badge key={idx} variant="outline" className="text-xs">
                    {output}
                  </Badge>
                ))}
              </div>
            </div>
          )}
          
          {/* View JSON Toggle */}
          <div className="pt-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowJson(!showJson)}
              className="gap-2 text-xs"
            >
              <Code2 className="h-3 w-3" />
              {showJson ? 'Hide' : 'View'} Workflow JSON
            </Button>
            
            {showJson && (
              <pre className="mt-2 p-3 bg-muted rounded-md text-xs overflow-auto max-h-60 border">
                {JSON.stringify(workflow, null, 2)}
              </pre>
            )}
          </div>
        </div>
      )}
    </Card>
  );
}
