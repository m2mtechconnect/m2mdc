import { useState, useEffect } from 'react';
import { GitBranch, Play, AlertCircle, Info } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useWizardBuilderStore } from '@/stores/wizardBuilderStore';
import { useBlueprintStore } from '@/stores/blueprintStore';
import { generateWorkflow } from '@/lib/workflow/workflowGenerator';
import { WorkflowEditor } from '@/components/workflow/WorkflowEditor';

export function Step4Workflow() {
  const { builderId, goal, industry, department, type, template, workflow, setWorkflow } = useWizardBuilderStore();
  const { currentBlueprint } = useBlueprintStore();
  const [showEditor, setShowEditor] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);

  // Auto-generate workflow if empty, prefer blueprint data
  useEffect(() => {
    // Prevent regeneration if already generating or if workflow already has actions
    if (isGenerating || (workflow && workflow.actions?.length > 0)) {
      return;
    }

    if (!workflow || workflow.actions?.length === 0) {
      console.log('🔄 [Step4] Auto-generating workflow', { 
        hasBlueprint: !!currentBlueprint,
        blueprintActions: currentBlueprint?.workflow?.actions?.length,
        goal, industry, department, type 
      });
      
      setIsGenerating(true);
      
      // Use blueprint workflow if available
      if (currentBlueprint?.workflow?.actions?.length > 0) {
        const newWorkflow = {
          triggers: currentBlueprint.workflow.triggers || [],
          actions: currentBlueprint.workflow.actions || [],
          integrations: currentBlueprint.workflow.integrations || [],
          hitl: [],
        };
        console.log('✅ [Step4] Using blueprint workflow', newWorkflow);
        setWorkflow(newWorkflow)
          .catch((err) => {
            console.error('❌ [Step4] Failed to save blueprint workflow:', err);
            // Don't leave user stuck - show error via toast would be better
          })
          .finally(() => setIsGenerating(false));
      } else {
        // Otherwise generate from scratch
        const generated = generateWorkflow({
          goal,
          industry,
          department,
          type,
          template,
        });
        console.log('✅ [Step4] Generated workflow', generated);
        setWorkflow(generated)
          .catch((err) => {
            console.error('❌ [Step4] Failed to save generated workflow:', err);
          })
          .finally(() => setIsGenerating(false));
      }
    }
  }, [goal, industry, department, type, template, currentBlueprint]);

  return (
    <div className="space-y-8 max-w-[880px] mx-auto">
      <div>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
                Workflow Builder
                <Info className="h-5 w-5 text-muted-foreground" />
              </h1>
            </TooltipTrigger>
            <TooltipContent className="max-w-sm">
              <p>Design your agent's reasoning and automation using a visual workflow. Add actions, decisions, conditions, and tool calls to build your operational pipeline.</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
        <p className="text-muted-foreground mt-2">
          Visual agentic graph with drag-and-drop nodes
        </p>
      </div>

      {/* Workflow Summary */}
      <Card className="border-primary bg-primary/5">
        <CardHeader>
          <CardTitle className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary flex items-center justify-center">
              <GitBranch className="w-5 h-5 text-primary-foreground" />
            </div>
            <div>
              <p className="text-lg">Auto-Generated Workflow</p>
              <p className="text-sm font-normal text-muted-foreground">
                Template-based workflow ready to customize
              </p>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 md:grid-cols-3">
            <div className="p-3 bg-background rounded-lg">
              <p className="text-xs text-muted-foreground mb-1">Triggers</p>
              <p className="text-lg font-bold">{workflow?.triggers?.length || 0}</p>
            </div>
            <div className="p-3 bg-background rounded-lg">
              <p className="text-xs text-muted-foreground mb-1">Actions</p>
              <p className="text-lg font-bold">{workflow?.actions?.length || 0}</p>
            </div>
            <div className="p-3 bg-background rounded-lg">
              <p className="text-xs text-muted-foreground mb-1">Integrations</p>
              <p className="text-lg font-bold">{workflow?.integrations?.length || 0}</p>
            </div>
          </div>

          {(workflow?.actions?.length || 0) === 0 && (
            <div className="flex items-center gap-2 p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
              <AlertCircle className="h-4 w-4 text-destructive flex-shrink-0" />
              <p className="text-sm text-destructive">
                At least one action is required to proceed
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Visual Workflow Editor */}
      {showEditor ? (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Visual Workflow Editor</CardTitle>
              <Button variant="outline" size="sm" onClick={() => setShowEditor(false)}>
                Close Editor
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="border rounded-lg overflow-hidden">
              <WorkflowEditor workflowId={builderId} systemId={builderId} />
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Workflow Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Node Types Available */}
            <div>
              <h4 className="text-sm font-medium mb-3">Available Node Types</h4>
              <div className="flex flex-wrap gap-2">
                <Badge variant="outline">Analyze</Badge>
                <Badge variant="outline">Classify</Badge>
                <Badge variant="outline">Extract</Badge>
                <Badge variant="outline">Summarize</Badge>
                <Badge variant="outline">RAG Retrieval</Badge>
                <Badge variant="outline">Tool Call</Badge>
                <Badge variant="outline">MCP Call</Badge>
                <Badge variant="outline">API Call</Badge>
                <Badge variant="outline">Conditional Logic</Badge>
                <Badge variant="outline">Loops</Badge>
                <Badge variant="outline">Notify Team</Badge>
                <Badge variant="outline">Update CRM</Badge>
                <Badge variant="outline">Create Ticket</Badge>
                <Badge variant="outline">Escalation</Badge>
              </div>
            </div>

            {/* Current Actions */}
            {workflow?.actions && workflow.actions.length > 0 && (
              <div>
                <h4 className="text-sm font-medium mb-3">Configured Actions</h4>
                <div className="space-y-2">
                  {workflow.actions.map((action, idx) => (
                    <div key={idx} className="flex items-center gap-3 p-3 border rounded-lg">
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                        <span className="text-sm font-medium">{idx + 1}</span>
                      </div>
                      <span className="text-sm">{action}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Open Visual Editor Button */}
            <Button className="w-full" size="lg" onClick={() => setShowEditor(true)}>
              <Play className="h-4 w-4 mr-2" />
              Open Visual Workflow Editor
            </Button>

            <p className="text-xs text-center text-muted-foreground">
              Use the visual editor to drag-and-drop nodes, test actions, and add human approval checkpoints
            </p>
          </CardContent>
        </Card>
      )}

      {/* Features Info */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Workflow Features</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li className="flex items-start gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5 flex-shrink-0" />
              Drag-and-drop visual graph editor
            </li>
            <li className="flex items-start gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5 flex-shrink-0" />
              Node testing and error overlays
            </li>
            <li className="flex items-start gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5 flex-shrink-0" />
              Human approval checkpoints (HITL)
            </li>
            <li className="flex items-start gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5 flex-shrink-0" />
              Conditional logic and loops
            </li>
            <li className="flex items-start gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5 flex-shrink-0" />
              Real-time validation
            </li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
