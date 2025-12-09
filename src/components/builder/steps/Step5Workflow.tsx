import { useState, useEffect } from 'react';
import { CheckCircle2, Plus, Zap, Cog, Link2, UserCheck, AlertCircle } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { useWizardBuilderStore } from '@/stores/wizardBuilderStore';
import { generateWorkflow } from '@/lib/workflow/workflowGenerator';

export function Step5Workflow() {
  const { goal, industry, department, type, template, workflow, modelConfig, setWorkflow, setModelConfig, error } = useWizardBuilderStore();
  const [acceptRecommended, setAcceptRecommended] = useState(false);
  const [fieldError, setFieldError] = useState('');
  const [isInitializing, setIsInitializing] = useState(false);

  // Auto-generate recommended workflow on mount (prevent infinite loop)
  useEffect(() => {
    if (isInitializing || (workflow && workflow.actions?.length > 0)) {
      return;
    }

    setIsInitializing(true);
    
    const generated = generateWorkflow({
      goal,
      industry,
      department,
      type,
      template,
    });
    
    setWorkflow(generated).finally(() => {
      setIsInitializing(false);
      setAcceptRecommended(true);
    });
    
    // Ensure model config is set
    if (!modelConfig?.model) {
      setModelConfig({
        provider: 'google',
        model: 'google/gemini-2.5-flash',
      });
    }
  }, [goal, industry, department, type, template]);

  const handleAcceptRecommended = (checked: boolean) => {
    setAcceptRecommended(checked);
    setFieldError('');
    
    if (checked) {
      const generated = generateWorkflow({
        goal,
        industry,
        department,
        type,
        template,
      });
      setWorkflow(generated);
    }
  };

  const addTrigger = () => {
    setWorkflow({
      triggers: [...(workflow?.triggers || []), `Trigger ${(workflow?.triggers?.length || 0) + 1}`],
    });
  };

  const addAction = () => {
    setWorkflow({
      actions: [...(workflow?.actions || []), `Action ${(workflow?.actions?.length || 0) + 1}`],
    });
  };

  const addIntegration = () => {
    setWorkflow({
      integrations: [...(workflow?.integrations || []), `Integration ${(workflow?.integrations?.length || 0) + 1}`],
    });
  };

  return (
    <div className="space-y-8 max-w-[880px] mx-auto">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Configure Workflow</h1>
        <p className="text-muted-foreground mt-2">
          Accept recommended or customize
        </p>
      </div>

      {/* Quick Accept */}
      <Card className="p-6 border-primary bg-primary/5">
        <div className="flex items-start gap-4">
          <CheckCircle2 className="w-6 h-6 text-primary flex-shrink-0 mt-1" />
          <div className="flex-1 space-y-3">
            <div>
              <h3 className="font-semibold mb-1">Recommended Workflow</h3>
              <p className="text-sm text-muted-foreground">
                Auto-generated for {type} in {department}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Switch
                id="accept-workflow"
                checked={acceptRecommended}
                onCheckedChange={handleAcceptRecommended}
                aria-label="Accept recommended workflow"
              />
              <label htmlFor="accept-workflow" className="text-sm font-medium cursor-pointer">
                Accept Recommended Workflow
              </label>
            </div>
          </div>
        </div>
      </Card>

      {/* Current Workflow Summary */}
      <Card className="p-4">
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Current Configuration</span>
            <div className="flex gap-2">
              <Badge variant={workflow?.actions?.length > 0 ? "secondary" : "destructive"}>
                {workflow?.actions?.length || 0} action{(workflow?.actions?.length || 0) !== 1 ? 's' : ''}
              </Badge>
              {(workflow?.actions?.length || 0) === 0 && (
                <AlertCircle className="w-4 h-4 text-destructive" />
              )}
            </div>
          </div>
          <div className="text-sm text-muted-foreground">
            {workflow?.triggers?.length || 0} trigger{(workflow?.triggers?.length || 0) !== 1 ? 's' : ''} → {workflow?.actions?.length || 0} action{(workflow?.actions?.length || 0) !== 1 ? 's' : ''}
          </div>
        </div>
      </Card>

      {fieldError && (
        <div className="p-4 border border-destructive bg-destructive/10 rounded-lg">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-destructive" />
            <p className="text-sm text-destructive">{fieldError}</p>
          </div>
        </div>
      )}

      {/* Advanced Editor (Collapsed by default) */}
      <Accordion type="single" collapsible className="w-full">
        <AccordionItem value="advanced">
          <AccordionTrigger className="text-sm font-medium">
            Advanced Workflow Editor (Optional)
          </AccordionTrigger>
          <AccordionContent>
            <div className="space-y-6 pt-4">
              {/* Triggers */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-sm font-medium">Event Triggers</h4>
                  <Button size="sm" variant="outline" onClick={addTrigger}>
                    <Plus className="w-4 h-4 mr-1" />
                    Add
                  </Button>
                </div>
                <div className="space-y-2">
                  {workflow?.triggers?.map((trigger, idx) => (
                    <Card key={idx} className="p-3 bg-muted/50">
                      <div className="flex items-center gap-2">
                        <Zap className="w-4 h-4 text-primary" />
                        <span className="text-sm">{trigger}</span>
                      </div>
                    </Card>
                  ))}
                </div>
              </div>

              {/* Actions */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-sm font-medium">Actions (Required)</h4>
                  <Button size="sm" variant="outline" onClick={addAction}>
                    <Plus className="w-4 h-4 mr-1" />
                    Add
                  </Button>
                </div>
                <div className="space-y-2">
                  {workflow?.actions?.map((action, idx) => (
                    <Card key={idx} className="p-3 bg-muted/50">
                      <div className="flex items-center gap-2">
                        <Cog className="w-4 h-4 text-primary" />
                        <span className="text-sm">{action}</span>
                      </div>
                    </Card>
                  ))}
                </div>
              </div>

              {/* Integrations */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Link2 className="w-4 h-4" />
                    <h4 className="text-sm font-medium">Integrations (Optional)</h4>
                  </div>
                  <Button size="sm" variant="outline" onClick={addIntegration}>
                    <Plus className="w-4 h-4 mr-1" />
                    Add
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {(workflow?.integrations?.length || 0) > 0 ? (
                    workflow?.integrations?.map((integration, idx) => (
                      <Badge key={idx} variant="secondary">{integration}</Badge>
                    ))
                  ) : (
                    <p className="text-sm text-muted-foreground">No integrations</p>
                  )}
                </div>
              </div>

              {/* HITL */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <UserCheck className="w-4 h-4" />
                    <h4 className="text-sm font-medium">Approvals (Optional)</h4>
                  </div>
                  <Button size="sm" variant="outline" onClick={() => {
                    setWorkflow({
                      hitl: [...(workflow?.hitl || []), `Approval ${(workflow?.hitl?.length || 0) + 1}`]
                    });
                  }}>
                    <Plus className="w-4 h-4 mr-1" />
                    Add
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {(workflow?.hitl?.length || 0) > 0 ? (
                    workflow?.hitl?.map((approval, idx) => (
                      <Badge key={idx} variant="secondary">{approval}</Badge>
                    ))
                  ) : (
                    <p className="text-sm text-muted-foreground">No approvals</p>
                  )}
                </div>
              </div>

              {/* Model Configuration */}
              <div>
                <h4 className="text-sm font-medium mb-3">Model Configuration</h4>
                <Card className="p-3 bg-muted/50">
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Provider:</span>
                      <span className="font-medium">{modelConfig.provider || 'Not set'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Model:</span>
                      <span className="font-medium">{modelConfig.model || 'Not set'}</span>
                    </div>
                  </div>
                </Card>
              </div>
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>

      {error && (
        <div className="p-4 border border-destructive bg-destructive/10 rounded-lg">
          <p className="text-sm text-destructive">{error}</p>
        </div>
      )}
    </div>
  );
}
