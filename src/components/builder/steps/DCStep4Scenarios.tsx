/**
 * DC Twin Builder Step 4 - Workflows & Scenarios
 * Configure simulation scenarios and automated workflows
 */

import { useState } from 'react';
import { 
  Play, GitBranch, AlertTriangle, Zap, Thermometer, Wind, 
  Shield, DollarSign, Cpu, Network, Check, Clock, Activity 
} from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { useDCTwinBuilderStore } from '@/stores/dcTwinBuilderStore';
import { toast } from 'sonner';
import { DCCard, DCSectionHeader, DCKPITile } from '@/components/dc-ui';
import { BUILDER, SCENARIOS, WORKFLOWS } from '@/ux';

const CATEGORY_ICONS: Record<string, any> = {
  capacity: Cpu,
  incident: AlertTriangle,
  emissions: DollarSign,
  compliance: Shield,
  optimization: Zap,
};

const CATEGORY_COLORS: Record<string, string> = {
  capacity: 'bg-info/10 text-info border-info/30',
  incident: 'bg-destructive/10 text-destructive border-destructive/30',
  emissions: 'bg-success/10 text-success border-success/30',
  compliance: 'bg-accent/10 text-accent border-accent/30',
  optimization: 'bg-warning/10 text-warning border-warning/30',
};

const SEVERITY_COLORS: Record<string, string> = {
  low: 'bg-success/10 text-success',
  medium: 'bg-warning/10 text-warning',
  high: 'bg-destructive/10 text-destructive',
  critical: 'bg-destructive text-destructive-foreground',
};

export function DCStep4Scenarios() {
  const { 
    workflows,
    scenarios,
    toggleWorkflow,
    toggleScenario,
    markStepComplete,
  } = useDCTwinBuilderStore();
  
  const [activeTab, setActiveTab] = useState('scenarios');

  const enabledWorkflows = workflows.filter(w => w.enabled).length;
  const enabledScenarios = scenarios.filter(s => s.enabled).length;

  const handleToggleWorkflow = (workflowId: string, enabled: boolean) => {
    toggleWorkflow(workflowId, enabled);
    toast.success(enabled ? 'Workflow enabled' : 'Workflow disabled');
  };

  const handleToggleScenario = (scenarioId: string, enabled: boolean) => {
    toggleScenario(scenarioId, enabled);
    toast.success(enabled ? 'Scenario enabled' : 'Scenario disabled');
  };

  // Group scenarios by category
  const scenariosByCategory = scenarios.reduce((acc, scenario) => {
    const category = scenario.category;
    if (!acc[category]) acc[category] = [];
    acc[category].push(scenario);
    return acc;
  }, {} as Record<string, typeof scenarios>);

  return (
    <div className="space-y-6 max-w-[920px] mx-auto">
      <DCSectionHeader
        title={BUILDER.STEPS.STEP_4.TITLE}
        subtitle={BUILDER.STEPS.STEP_4.SUBTITLE}
        icon={<GitBranch className="h-5 w-5" />}
      />

      {/* Stats Row */}
      <div className="grid gap-4 grid-cols-3">
        <DCKPITile
          label="Workflows"
          value={`${enabledWorkflows}/${workflows.length}`}
          sublabel="enabled"
          status={enabledWorkflows >= 2 ? 'normal' : 'warning'}
          icon={<GitBranch className="h-4 w-4" />}
        />
        <DCKPITile
          label="Scenarios"
          value={`${enabledScenarios}/${scenarios.length}`}
          sublabel="active"
          status={enabledScenarios >= 5 ? 'normal' : 'warning'}
          icon={<Play className="h-4 w-4" />}
        />
        <DCKPITile
          label="Categories"
          value={String(Object.keys(scenariosByCategory).length)}
          sublabel="scenario types"
          status="info"
          icon={<Activity className="h-4 w-4" />}
        />
      </div>

      {/* Main Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="scenarios" className="flex items-center gap-2">
            <Play className="h-4 w-4" />
            Scenarios
            {enabledScenarios > 0 && <Badge className="ml-1">{enabledScenarios}</Badge>}
          </TabsTrigger>
          <TabsTrigger value="workflows" className="flex items-center gap-2">
            <GitBranch className="h-4 w-4" />
            Workflows
            {enabledWorkflows > 0 && <Badge className="ml-1">{enabledWorkflows}</Badge>}
          </TabsTrigger>
        </TabsList>

        {/* Scenarios Tab */}
        <TabsContent value="scenarios" className="space-y-4 mt-4">
          {Object.entries(scenariosByCategory).map(([category, categoryScenarios]) => {
            const CategoryIcon = CATEGORY_ICONS[category] || Activity;
            const categoryLabel = category.charAt(0).toUpperCase() + category.slice(1);
            
            return (
              <DCCard 
                key={category}
                title={`${categoryLabel} Scenarios`}
                icon={<CategoryIcon className="h-4 w-4" />}
              >
                <div className="space-y-3">
                  {categoryScenarios.map((scenario) => (
                    <div 
                      key={scenario.id}
                      className={`flex items-center justify-between p-4 rounded-lg border transition-colors ${
                        scenario.enabled 
                          ? 'bg-primary/10 border-primary/30' 
                          : 'bg-muted/50 border-border'
                      }`}
                    >
                      <div className="flex items-center gap-4 flex-1">
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                          scenario.enabled ? 'bg-primary text-primary-foreground' : 'bg-muted'
                        }`}>
                          <Play className="h-5 w-5" />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <p className="font-medium">{scenario.name}</p>
                            <Badge className={SEVERITY_COLORS[scenario.severity]}>
                              {scenario.severity}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground mt-1">{scenario.description}</p>
                          <div className="flex gap-2 mt-2">
                            <Badge variant="outline" className="text-xs">
                              <Clock className="h-3 w-3 mr-1" />
                              {scenario.durationSeconds}s
                            </Badge>
                            <Badge variant="outline" className="text-xs">
                              {scenario.eventsCount} events
                            </Badge>
                            {scenario.kpisImpacted.slice(0, 2).map((kpi, idx) => (
                              <Badge key={idx} variant="secondary" className="text-xs">{kpi}</Badge>
                            ))}
                          </div>
                        </div>
                      </div>
                      <Switch 
                        checked={scenario.enabled} 
                        onCheckedChange={(checked) => handleToggleScenario(scenario.id, checked)}
                      />
                    </div>
                  ))}
                </div>
              </DCCard>
            );
          })}
        </TabsContent>

        {/* Workflows Tab */}
        <TabsContent value="workflows" className="space-y-4 mt-4">
          <DCCard 
            title="Automated Workflows" 
            subtitle="Trigger-based automation for data centre operations"
            icon={<GitBranch className="h-4 w-4" />}
          >
            <div className="space-y-3">
              {workflows.map((workflow) => (
                <div 
                  key={workflow.id}
                  className={`p-4 rounded-lg border transition-colors ${
                    workflow.enabled 
                      ? 'bg-primary/10 border-primary/30' 
                      : 'bg-muted/50 border-border'
                  }`}
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                        workflow.enabled ? 'bg-primary text-primary-foreground' : 'bg-muted'
                      }`}>
                        <GitBranch className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="font-medium">{workflow.name}</p>
                        <Badge variant="outline" className="text-xs mt-1">{workflow.agentId}</Badge>
                      </div>
                    </div>
                    <Switch 
                      checked={workflow.enabled} 
                      onCheckedChange={(checked) => handleToggleWorkflow(workflow.id, checked)}
                    />
                  </div>
                  
                  <div className="grid gap-3 sm:grid-cols-2 text-sm">
                    <div className="p-2 rounded bg-muted/50">
                      <p className="text-xs text-muted-foreground mb-1">Trigger</p>
                      <p className="font-mono text-xs">
                        {workflow.trigger.signal} {workflow.trigger.condition}
                      </p>
                    </div>
                    <div className="p-2 rounded bg-muted/50">
                      <p className="text-xs text-muted-foreground mb-1">Mitigation</p>
                      <p className="text-xs">{workflow.recommendedMitigation}</p>
                    </div>
                  </div>
                  
                  {workflow.autoActions.length > 0 && (
                    <div className="mt-3">
                      <p className="text-xs text-muted-foreground mb-1">Auto Actions</p>
                      <div className="flex flex-wrap gap-1">
                        {workflow.autoActions.map((action, idx) => (
                          <Badge key={idx} variant="secondary" className="text-xs">{action}</Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </DCCard>
        </TabsContent>
      </Tabs>

      {/* Complete Step */}
      <DCCard className="bg-muted/30">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium">Scenarios & Workflows Configured?</p>
            <p className="text-xs text-muted-foreground">
              Enable at least 5 scenarios and 2 workflows for comprehensive simulation.
            </p>
          </div>
          <Button 
            onClick={() => {
              markStepComplete(4);
              toast.success('Scenarios saved');
            }}
            disabled={enabledScenarios < 3}
          >
            <Check className="h-4 w-4 mr-2" />
            Save & Continue
          </Button>
        </div>
      </DCCard>
    </div>
  );
}
