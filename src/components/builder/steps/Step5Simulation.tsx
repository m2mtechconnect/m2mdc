import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle, Map, Activity, FileText, Download, Eye } from 'lucide-react';
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
import { useBlueprint } from '@/hooks/useBlueprint';
import { Badge } from '@/components/ui/badge';

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
  const { blueprint, summary } = useBlueprint('default');

  const [validation, setValidation] = useState<ValidationResult>({ isValid: true, errors: [] });
  const [isValidating, setIsValidating] = useState(false);
  const [isDeploying, setIsDeploying] = useState(false);
  const [template, setTemplate] = useState<any>(null);
  const [selectedRackId, setSelectedRackId] = useState<string | undefined>();
  const [activeView, setActiveView] = useState<'simulation' | 'facility' | 'blueprint'>('simulation');
  const navigate = useNavigate();

  // Download blueprint as JSON
  const handleDownloadBlueprint = () => {
    if (!blueprint) return;
    const json = JSON.stringify(blueprint, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${blueprint.name.replace(/\s+/g, '-').toLowerCase()}-blueprint.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

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
      <Tabs value={activeView} onValueChange={(v) => setActiveView(v as 'simulation' | 'facility' | 'blueprint')} className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="simulation" className="flex items-center gap-2">
            <Activity className="h-4 w-4" />
            DC Simulation
          </TabsTrigger>
          <TabsTrigger value="legacy">Legacy Dashboard</TabsTrigger>
          <TabsTrigger value="facility" className="flex items-center gap-2">
            <Map className="h-4 w-4" />
            Facility Map
          </TabsTrigger>
          <TabsTrigger value="blueprint" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Blueprint
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

        <TabsContent value="blueprint" className="mt-4">
          <DCCard 
            title="System Blueprint Review" 
            subtitle="Complete configuration snapshot for audit and deployment" 
            icon={<FileText className="h-4 w-4" />}
          >
            <div className="space-y-6">
              {/* Summary Stats */}
              {summary && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="p-3 bg-muted/50 rounded-lg border border-border">
                    <div className="text-xs text-studio-muted">Domains</div>
                    <div className="text-lg font-semibold text-foreground">{summary.enabledDomains}/{summary.totalDomains}</div>
                  </div>
                  <div className="p-3 bg-muted/50 rounded-lg border border-border">
                    <div className="text-xs text-studio-muted">Agents</div>
                    <div className="text-lg font-semibold text-foreground">{summary.totalAgents}</div>
                  </div>
                  <div className="p-3 bg-muted/50 rounded-lg border border-border">
                    <div className="text-xs text-studio-muted">KPIs</div>
                    <div className="text-lg font-semibold text-foreground">{summary.totalKpis}</div>
                  </div>
                  <div className="p-3 bg-muted/50 rounded-lg border border-border">
                    <div className="text-xs text-studio-muted">Scenarios</div>
                    <div className="text-lg font-semibold text-foreground">{summary.totalScenarios}</div>
                  </div>
                </div>
              )}

              {/* Blueprint Details */}
              {blueprint && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium text-foreground">{blueprint.name}</h4>
                      <p className="text-sm text-studio-muted">{blueprint.location} • {blueprint.tier} • {blueprint.capacityKw}kW</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs">v{blueprint.version}</Badge>
                    </div>
                  </div>

                  {/* Quick Lists */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="p-3 bg-muted/50 rounded-lg border border-border">
                      <h5 className="text-xs font-medium text-studio-muted mb-2">Active Agents</h5>
                      <div className="flex flex-wrap gap-1">
                        {blueprint.agents.filter(a => a.status === 'active').slice(0, 5).map(a => (
                          <Badge key={a.id} variant="secondary" className="text-xs">{a.name}</Badge>
                        ))}
                        {blueprint.agents.filter(a => a.status === 'active').length > 5 && (
                          <Badge variant="outline" className="text-xs">+{blueprint.agents.filter(a => a.status === 'active').length - 5}</Badge>
                        )}
                      </div>
                    </div>
                    <div className="p-3 bg-muted/50 rounded-lg border border-border">
                      <h5 className="text-xs font-medium text-studio-muted mb-2">Enabled Workflows</h5>
                      <div className="flex flex-wrap gap-1">
                        {blueprint.workflows.filter(w => w.enabled).slice(0, 5).map(w => (
                          <Badge key={w.id} variant="secondary" className="text-xs">{w.name}</Badge>
                        ))}
                        {blueprint.workflows.filter(w => w.enabled).length > 5 && (
                          <Badge variant="outline" className="text-xs">+{blueprint.workflows.filter(w => w.enabled).length - 5}</Badge>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="flex items-center gap-3 pt-4 border-t border-border">
                <Button variant="outline" onClick={handleDownloadBlueprint} className="gap-2">
                  <Download className="h-4 w-4" />
                  Download JSON
                </Button>
                <Button variant="outline" onClick={() => navigate('/blueprint/default')} className="gap-2">
                  <Eye className="h-4 w-4" />
                  View Full Blueprint
                </Button>
              </div>
            </div>
          </DCCard>
        </TabsContent>
      </Tabs>
    </div>
  );
}
