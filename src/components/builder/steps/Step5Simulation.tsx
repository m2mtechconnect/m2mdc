import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle, Map, Activity } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useWizardBuilderStore } from '@/stores/wizardBuilderStore';
import { useBlueprintStore } from '@/stores/blueprintStore';
import { validateBuilderForDeploy, ValidationResult } from '@/lib/validation/builderValidation';
import { SimulationDashboard } from '@/components/builder/step5/SimulationDashboard';
import { loadTemplateById } from '@/lib/templates/unifiedTemplateService';
import { DCFacilityMap } from '@/components/dc-ui/DCFacilityMap';
import { DCCard } from '@/components/dc-ui/DCCard';
import { DCSimulationPanel } from '@/components/simulation/DCSimulationPanel';

export function Step5Simulation() {
  const {
    goal,
    industry,
    department,
    type,
    template: templateId,
    workflow,
    modelConfig,
    setCurrentStep,
  } = useWizardBuilderStore();
  
  const { currentBlueprint } = useBlueprintStore();

  const [validation, setValidation] = useState<ValidationResult>({ isValid: true, errors: [] });
  const [isValidating, setIsValidating] = useState(false);
  const [isDeploying, setIsDeploying] = useState(false);
  const [template, setTemplate] = useState<any>(null);
  const [selectedRackId, setSelectedRackId] = useState<string | undefined>();
  const [activeView, setActiveView] = useState<'simulation' | 'facility'>('simulation');
  const navigate = useNavigate();

  // Load template if available
  useEffect(() => {
    if (templateId) {
      loadTemplateById(templateId).then(setTemplate).catch(console.error);
    }
  }, [templateId]);

  // Validate on mount and changes
  useEffect(() => {
    if (isValidating) return;
    
    setIsValidating(true);
    const state = { goal, industry, department, type, template: templateId, workflow, modelConfig };
    const result = validateBuilderForDeploy(state);
    setValidation(result);
    setIsValidating(false);
  }, [goal, industry, department, type, templateId, workflow, modelConfig, isValidating]);

  const handleDeploy = async () => {
    setIsDeploying(true);
    
    // Simulate deployment
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // In real implementation, this would trigger actual deployment
    console.log('Deploying agent...', currentBlueprint);
    
    setIsDeploying(false);
  };

  return (
    <div className="h-full flex flex-col gap-4">
      {/* Validation Banner */}
      {!validation.isValid && (
        <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-lg animate-fade-in">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-medium text-destructive mb-2">
                Complete required fields before deployment
              </p>
              <div className="space-y-1">
                {validation.errors.map((error) => (
                  <Button
                    key={error.field}
                    variant="ghost"
                    size="sm"
                    onClick={() => setCurrentStep(error.step)}
                    className="text-xs h-auto py-1 px-2 text-destructive hover:text-destructive hover:bg-destructive/10"
                  >
                    Go to Step {error.step}: {error.label}
                  </Button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* View Toggle */}
      <Tabs value={activeView} onValueChange={(v) => setActiveView(v as 'simulation' | 'facility')} className="w-full">
        <TabsList className="grid w-full grid-cols-3 bg-dc-surface">
          <TabsTrigger value="simulation" className="flex items-center gap-2">
            <Activity className="h-4 w-4" />
            DC Simulation
          </TabsTrigger>
          <TabsTrigger value="legacy">Legacy Dashboard</TabsTrigger>
          <TabsTrigger value="facility" className="flex items-center gap-2">
            <Map className="h-4 w-4" />
            Facility Map
          </TabsTrigger>
        </TabsList>

        <TabsContent value="simulation" className="mt-4">
          <DCSimulationPanel compact />
        </TabsContent>

        <TabsContent value="legacy" className="mt-4">
          <div className="flex-1 min-h-0">
            <SimulationDashboard
              template={template}
              builderState={{
                name: currentBlueprint?.name || goal,
                goal,
                industry,
                department,
                type,
                workflow,
                modelConfig,
                config: {
                  workflows: workflow?.actions ? [{ 
                    id: 'workflow-1',
                    name: 'Primary Workflow',
                    actions: workflow.actions 
                  }] : []
                }
              }}
              mode="builder"
              onDeploy={handleDeploy}
              isDeploying={isDeploying}
            />
          </div>
        </TabsContent>

        <TabsContent value="facility" className="mt-4">
          <DCCard title="Data Centre Facility Map" subtitle="Visual rack heatmap and zone layout" icon={<Map className="h-4 w-4" />}>
            <DCFacilityMap 
              selectedRackId={selectedRackId}
              onRackSelect={(rackId) => setSelectedRackId(rackId)}
            />
          </DCCard>
        </TabsContent>
      </Tabs>
    </div>
  );
}
