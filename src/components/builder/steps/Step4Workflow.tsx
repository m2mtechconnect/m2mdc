import { useState, useEffect } from 'react';
import { GitBranch, Play, AlertCircle, Info, Zap, Thermometer, Wind, Shield, DollarSign, Cpu, Network, AlertTriangle, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useWizardBuilderStore } from '@/stores/wizardBuilderStore';
import { useBlueprintStore } from '@/stores/blueprintStore';
import { generateWorkflow } from '@/lib/workflow/workflowGenerator';
import { WorkflowEditor } from '@/components/workflow/WorkflowEditor';
import { DCCard, DCSectionHeader, DCKPITile } from '@/components/dc-ui';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

const DC_NODE_TYPES = [
  { id: 'gpu-spike', label: 'GPU Spike Trigger', icon: Cpu, color: 'primary' },
  { id: 'thermal-alert', label: 'Thermal Anomaly', icon: Thermometer, color: 'destructive' },
  { id: 'cooling-failure', label: 'Cooling Failure', icon: Wind, color: 'info' },
  { id: 'pue-drift', label: 'PUE Drift Alert', icon: Zap, color: 'warning' },
  { id: 'sovereignty-event', label: 'Sovereignty Event', icon: Shield, color: 'success' },
  { id: 'carbon-shock', label: 'Carbon Price Shock', icon: DollarSign, color: 'warning' },
  { id: 'network-congestion', label: 'Network Congestion', icon: Network, color: 'info' },
];

export function Step4Workflow() {
  const { builderId, goal, industry, department, type, template, workflow, setWorkflow } = useWizardBuilderStore();
  const { currentBlueprint } = useBlueprintStore();
  const [editorOpen, setEditorOpen] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);

  useEffect(() => {
    if (isGenerating || (workflow && workflow.actions?.length > 0)) {
      return;
    }

    if (!workflow || workflow.actions?.length === 0) {
      setIsGenerating(true);
      
      if (currentBlueprint?.workflow?.actions?.length > 0) {
        const newWorkflow = {
          triggers: currentBlueprint.workflow.triggers || [],
          actions: currentBlueprint.workflow.actions || [],
          integrations: currentBlueprint.workflow.integrations || [],
          hitl: [],
        };
        setWorkflow(newWorkflow)
          .catch(console.error)
          .finally(() => setIsGenerating(false));
      } else {
        const generated = generateWorkflow({ goal, industry, department, type, template });
        setWorkflow(generated)
          .catch(console.error)
          .finally(() => setIsGenerating(false));
      }
    }
  }, [goal, industry, department, type, template, currentBlueprint]);

  return (
    <div className="space-y-6 max-w-[920px] mx-auto">
      <DCSectionHeader
        title="Workflow Builder"
        subtitle="Design operational automation with visual node-based workflows"
        icon={<GitBranch className="h-5 w-5" />}
      />

      {/* Workflow Stats */}
      <div className="grid gap-4 grid-cols-3">
        <DCKPITile
          label="Triggers"
          value={String(workflow?.triggers?.length || 0)}
          sublabel="Event sources"
          status={workflow?.triggers?.length ? 'normal' : 'warning'}
          icon={<AlertTriangle className="h-4 w-4" />}
        />
        <DCKPITile
          label="Actions"
          value={String(workflow?.actions?.length || 0)}
          sublabel="Automated steps"
          status={workflow?.actions?.length ? 'normal' : 'critical'}
          icon={<Play className="h-4 w-4" />}
        />
        <DCKPITile
          label="Integrations"
          value={String(workflow?.integrations?.length || 0)}
          sublabel="Connected systems"
          status="info"
          icon={<Network className="h-4 w-4" />}
        />
      </div>

      {/* Validation Warning */}
      {(workflow?.actions?.length || 0) === 0 && (
        <div className="flex items-center gap-3 p-4 rounded-lg bg-destructive/10 border border-destructive/30">
          <AlertCircle className="h-5 w-5 text-destructive flex-shrink-0" />
          <div>
            <p className="text-sm font-medium text-destructive">At least one action is required</p>
            <p className="text-xs text-muted-foreground">Add workflow actions to enable deployment</p>
          </div>
        </div>
      )}

      {/* DC Node Types */}
      <DCCard 
        title="Data Centre Workflow Nodes" 
        subtitle="Drag-and-drop triggers and actions for DC operations"
        icon={<Cpu className="h-4 w-4" />}
      >
        <div className="grid gap-3 sm:grid-cols-2">
          {DC_NODE_TYPES.map((node) => {
            const IconComp = node.icon;
            return (
              <div
                key={node.id}
                className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 border border-border hover:border-primary/30 transition-colors cursor-grab"
              >
                <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
                  <IconComp className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <p className="font-medium text-sm">{node.label}</p>
                  <p className="text-xs text-muted-foreground">Trigger</p>
                </div>
              </div>
            );
          })}
        </div>
      </DCCard>

      {/* Configured Actions */}
      {workflow?.actions && workflow.actions.length > 0 && (
        <DCCard title="Configured Actions" icon={<Play className="h-4 w-4" />}>
          <div className="space-y-2">
            {workflow.actions.map((action, idx) => (
              <div key={idx} className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 border border-border">
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                  <span className="text-sm font-mono font-medium text-primary">{idx + 1}</span>
                </div>
                <span className="text-sm">{action}</span>
              </div>
            ))}
          </div>
        </DCCard>
      )}

      {/* Inline Collapsible Workflow Editor */}
      <Collapsible open={editorOpen} onOpenChange={setEditorOpen}>
        <DCCard className="bg-muted/30">
          <div className="space-y-4">
            <CollapsibleTrigger asChild>
              <Button className="w-full" size="lg" variant={editorOpen ? 'outline' : 'default'}>
                <ChevronDown className={`h-4 w-4 mr-2 transition-transform ${editorOpen ? 'rotate-180' : ''}`} />
                {editorOpen ? 'Close Visual Workflow Editor' : 'Open Visual Workflow Editor'}
              </Button>
            </CollapsibleTrigger>
            <p className="text-xs text-center text-muted-foreground">
              Use the visual editor to drag-and-drop nodes, test actions, and add human approval checkpoints
            </p>
          </div>
        </DCCard>
        <CollapsibleContent className="mt-4">
          <DCCard noPadding>
            <div className="border-t border-border">
              <WorkflowEditor workflowId={builderId} systemId={builderId} />
            </div>
          </DCCard>
        </CollapsibleContent>
      </Collapsible>

      {/* Workflow Features */}
      <DCCard title="Workflow Capabilities" icon={<Info className="h-4 w-4" />}>
        <div className="grid gap-3 sm:grid-cols-2">
          {[
            'GPU spike auto-mitigation',
            'Thermal runaway prevention',
            'PUE drift correction',
            'Sovereignty violation alerts',
            'Carbon price response',
            'Human-in-the-loop approvals',
            'Conditional branching',
            'Real-time validation',
          ].map((feature, idx) => (
            <div key={idx} className="flex items-center gap-2 text-sm text-muted-foreground">
              <span className="w-1.5 h-1.5 rounded-full bg-success" />
              {feature}
            </div>
          ))}
        </div>
      </DCCard>
    </div>
  );
}
