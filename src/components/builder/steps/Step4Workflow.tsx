import { useState, useEffect } from 'react';
import { GitBranch, Play, AlertCircle, Info, Zap, Thermometer, Wind, Shield, DollarSign, Cpu, Network, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useWizardBuilderStore } from '@/stores/wizardBuilderStore';
import { useBlueprintStore } from '@/stores/blueprintStore';
import { generateWorkflow } from '@/lib/workflow/workflowGenerator';
import { WorkflowEditor } from '@/components/workflow/WorkflowEditor';
import { DCCard, DCSectionHeader, DCKPITile } from '@/components/dc-ui';

const DC_NODE_TYPES = [
  { id: 'gpu-spike', label: 'GPU Spike Trigger', icon: Cpu, color: 'dc-gpu' },
  { id: 'thermal-alert', label: 'Thermal Anomaly', icon: Thermometer, color: 'dc-thermal' },
  { id: 'cooling-failure', label: 'Cooling Failure', icon: Wind, color: 'dc-cooling' },
  { id: 'pue-drift', label: 'PUE Drift Alert', icon: Zap, color: 'dc-power' },
  { id: 'sovereignty-event', label: 'Sovereignty Event', icon: Shield, color: 'dc-sovereignty' },
  { id: 'carbon-shock', label: 'Carbon Price Shock', icon: DollarSign, color: 'dc-warning' },
  { id: 'network-congestion', label: 'Network Congestion', icon: Network, color: 'dc-info' },
];

export function Step4Workflow() {
  const { builderId, goal, industry, department, type, template, workflow, setWorkflow } = useWizardBuilderStore();
  const { currentBlueprint } = useBlueprintStore();
  const [showEditor, setShowEditor] = useState(false);
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
        <div className="flex items-center gap-3 p-4 rounded-lg bg-dc-critical/10 border border-dc-critical/30">
          <AlertCircle className="h-5 w-5 text-dc-critical flex-shrink-0" />
          <div>
            <p className="text-sm font-medium text-dc-critical">At least one action is required</p>
            <p className="text-xs text-muted-foreground">Add workflow actions to enable deployment</p>
          </div>
        </div>
      )}

      {/* Visual Workflow Editor */}
      {showEditor ? (
        <DCCard
          title="Visual Workflow Editor"
          headerAction={
            <Button variant="outline" size="sm" onClick={() => setShowEditor(false)} className="border-dc-border">
              Close Editor
            </Button>
          }
          noPadding
        >
          <div className="h-[500px] border-t border-dc-border">
            <WorkflowEditor workflowId={builderId} systemId={builderId} />
          </div>
        </DCCard>
      ) : (
        <>
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
                    className="flex items-center gap-3 p-3 rounded-lg bg-dc-surface border border-dc-border hover:border-dc-primary/30 transition-colors cursor-grab"
                  >
                    <div className={`w-9 h-9 rounded-lg bg-${node.color}/10 flex items-center justify-center`}>
                      <IconComp className={`h-4 w-4 text-${node.color}`} />
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
                  <div key={idx} className="flex items-center gap-3 p-3 rounded-lg bg-dc-surface border border-dc-border">
                    <div className="w-8 h-8 rounded-full bg-dc-primary/10 flex items-center justify-center">
                      <span className="text-sm font-mono font-medium text-dc-primary">{idx + 1}</span>
                    </div>
                    <span className="text-sm">{action}</span>
                  </div>
                ))}
              </div>
            </DCCard>
          )}

          {/* Open Editor Button */}
          <DCCard className="bg-dc-surface/50">
            <div className="space-y-4">
              <Button className="w-full" size="lg" onClick={() => setShowEditor(true)}>
                <Play className="h-4 w-4 mr-2" />
                Open Visual Workflow Editor
              </Button>
              <p className="text-xs text-center text-muted-foreground">
                Use the visual editor to drag-and-drop nodes, test actions, and add human approval checkpoints
              </p>
            </div>
          </DCCard>
        </>
      )}

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
              <span className="w-1.5 h-1.5 rounded-full bg-dc-success" />
              {feature}
            </div>
          ))}
        </div>
      </DCCard>
    </div>
  );
}
