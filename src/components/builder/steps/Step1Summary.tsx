import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Building2, Briefcase, Bot, TrendingUp, Clock, Zap, Info, Target, FileText, Shield, Pencil, RefreshCw, Server, Thermometer, Globe, Cpu, Wind } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useWizardBuilderStore } from '@/stores/wizardBuilderStore';
import { useBlueprintStore } from '@/stores/blueprintStore';
import { useCoPilotContext } from '@/contexts/CoPilotContext';
import { toast } from 'sonner';
import { DCCard, DCSectionHeader } from '@/components/dc-ui';
import { DCKPITile } from '@/components/dc-ui';
import { BlueprintSnapshotCard } from '@/components/blueprint';

export function Step1Summary() {
  const navigate = useNavigate();
  const { 
    goal, industry, department, type, template, workflow, modelConfig,
    setGoal, setIndustryDepartment, setType, builderId 
  } = useWizardBuilderStore();
  const { currentBlueprint, updateBlueprint } = useBlueprintStore();
  const { openWithQuestion } = useCoPilotContext();
  
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isSwitchOpen, setIsSwitchOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  // Edit form state
  const [editName, setEditName] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editIndustry, setEditIndustry] = useState('');
  const [editDepartment, setEditDepartment] = useState('');
  const [editType, setEditType] = useState<'agent' | 'process_twin' | '3d_twin'>('agent');

  // DC Metadata state - defaults for Data Centre twins
  const [dcMetadata] = useState({
    facilityLocation: 'CA-ON (Toronto)',
    gpuFleet: 'NVIDIA H100 x 256, A100 x 128',
    coolingType: 'Liquid + Chilled Water',
    powerTopology: 'N+1 Redundancy',
    renewablePercent: '85%',
    sovereignCompliance: 'Yes',
  });

  // ALWAYS use blueprint data when available
  const agentName = currentBlueprint?.name || 
                    template || 
                    `${type === 'agent' ? 'AI Agent' : type === '3d_twin' ? '3D Digital Twin' : 'Process Twin'}${department ? ` for ${department}` : ''}`;
  
  const goals = currentBlueprint?.goals && currentBlueprint.goals.length > 0 
    ? currentBlueprint.goals 
    : [];
  
  const expectedRoi = currentBlueprint?.expectedRoi || '35-50%';
  const timeSaved = currentBlueprint?.timeSavedPerWeek || '20+ hrs/week';
  const efficiencyGain = currentBlueprint?.efficiencyGain || '3-5x faster';

  const toStringValue = (item: any): string => {
    if (typeof item === 'string') return item;
    if (item && typeof item === 'object') {
      return item.name || item.label || item.type || String(item);
    }
    return String(item);
  };

  const capabilities = currentBlueprint?.workflow?.actions?.length > 0
    ? currentBlueprint.workflow.actions.slice(0, 5).map(toStringValue)
    : workflow?.actions?.length > 0 
    ? workflow.actions.slice(0, 5).map(toStringValue)
    : ['GPU Telemetry', 'Thermal Monitoring', 'PUE Optimization', 'Workload Scheduling', 'Sovereignty Validation'];

  const recommendedTools = currentBlueprint?.tools?.recommendedIntegrations?.length > 0
    ? currentBlueprint.tools.recommendedIntegrations.slice(0, 4).map(toStringValue)
    : workflow?.integrations?.length > 0
    ? workflow.integrations.slice(0, 4).map(toStringValue)
    : ['DCIM Integration', 'Prometheus', 'Kubernetes/Slurm', 'Energy Grid API'];

  const buildWorkflowSummary = () => {
    const triggers = currentBlueprint?.workflow?.triggers || workflow?.triggers || [];
    const actions = currentBlueprint?.workflow?.actions || workflow?.actions || [];
    
    if (triggers.length > 0 && actions.length > 0) {
      const triggerNames = triggers.slice(0, 2).map(toStringValue).join(' / ');
      const actionNames = actions.slice(0, 2).map(toStringValue).join(' → ');
      return [
        `${triggerNames} → ${actionNames}`,
        ...(actions.length > 2 ? [`${actions.slice(2, 4).map(toStringValue).join(' → ')}`] : []),
      ];
    }
    
    return [
      'Thermal Alert → Cooling Adjustment → Notification',
      'GPU Load Spike → Workload Rebalance → PUE Update',
    ];
  };
  
  const workflowSummary = buildWorkflowSummary();

  const handleOpenEdit = () => {
    setEditName(agentName);
    setEditDescription(currentBlueprint?.description || goal || '');
    setEditIndustry(industry || '');
    setEditDepartment(department || '');
    setEditType(type || 'agent');
    setIsEditOpen(true);
  };

  const handleSaveEdit = async () => {
    setIsSaving(true);
    
    try {
      await setGoal(editDescription);
      await setIndustryDepartment(editIndustry, editDepartment);
      await setType(editType);
      
      if (currentBlueprint) {
        updateBlueprint({
          name: editName,
          description: editDescription,
          industry: editIndustry,
          department: editDepartment,
          type: editType,
        });
      }
      
      toast.success('Summary updated successfully');
      setIsEditOpen(false);
    } catch (error) {
      console.error('[Builder:Step1] Failed to save edits:', error);
      toast.error('Failed to save changes');
    } finally {
      setIsSaving(false);
    }
  };

  const handleAskCoPilot = (prompt: string) => {
    openWithQuestion(prompt);
  };

  // Determine if this is a DC twin
  const isDataCentreTwin = industry?.toLowerCase().includes('data') || 
                            department?.toLowerCase().includes('infrastructure') ||
                            type === '3d_twin' ||
                            template?.toLowerCase().includes('data centre');

  return (
    <div className="space-y-6 max-w-[920px] mx-auto">
      {/* Header */}
      <DCSectionHeader
        title="System Configuration"
        subtitle="Data Centre Digital Twin specification and objectives"
        icon={<Server className="h-5 w-5" />}
      />

      {/* Template Source Badge */}
      {currentBlueprint?.source === 'template' && currentBlueprint?.templateName && (
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="gap-2 px-3 py-1.5 border-primary/30 bg-primary/5">
            <FileText className="h-3.5 w-3.5 text-primary" />
            <span className="text-xs">Template: {currentBlueprint.templateName}</span>
            {currentBlueprint.certified && (
              <Shield className="h-3.5 w-3.5 text-success" />
            )}
          </Badge>
        </div>
      )}

      {/* Main Twin Overview Card */}
      <DCCard 
        title={agentName}
        subtitle={type === 'agent' ? 'Agentic Intelligence' : type === '3d_twin' ? '3D Digital Twin' : 'Process Twin'}
        icon={<Bot className="h-5 w-5" />}
        status={currentBlueprint ? 'normal' : 'warning'}
        className="border-primary/30"
      >
        <div className="space-y-4">
          <div>
            <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">Purpose</h4>
            <p className="text-sm">
              {currentBlueprint?.description || 
               goal || 
               `Automate and optimize ${department || 'data centre'} operations with AI-powered monitoring and decision making.`}
            </p>
          </div>

          {goals.length > 0 && (
            <div>
              <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-2">
                <Target className="h-3 w-3" />
                Key Objectives
              </h4>
              <div className="space-y-1">
                {goals.map((goalItem, idx) => (
                  <div key={idx} className="flex items-center gap-2 text-sm">
                    <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                    {goalItem}
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex flex-wrap gap-2">
            <Badge className="bg-destructive/10 text-destructive border-destructive/30">
              <Building2 className="h-3 w-3 mr-1" />
              {industry || 'Data Centre'}
            </Badge>
            <Badge className="bg-warning/10 text-warning border-warning/30">
              <Briefcase className="h-3 w-3 mr-1" />
              {department || 'Infrastructure'}
            </Badge>
            {isDataCentreTwin && (
              <Badge className="bg-info/10 text-info border-info/30">
                <Globe className="h-3 w-3 mr-1" />
                Sovereign Compute
              </Badge>
            )}
          </div>
        </div>
      </DCCard>

      {/* DC-Specific Metadata - Only visible for DC twins */}
      {isDataCentreTwin && (
        <DCCard 
          title="Facility Specifications" 
          subtitle="Data Centre infrastructure metadata"
          icon={<Server className="h-4 w-4" />}
        >
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div className="p-3 rounded-lg bg-muted/50 border border-border">
              <div className="flex items-center gap-2 mb-1">
                <Globe className="h-3.5 w-3.5 text-info" />
                <p className="text-xs text-muted-foreground">Facility Location</p>
              </div>
              <p className="text-sm font-medium">{dcMetadata.facilityLocation}</p>
            </div>
            <div className="p-3 rounded-lg bg-muted/50 border border-border">
              <div className="flex items-center gap-2 mb-1">
                <Cpu className="h-3.5 w-3.5 text-accent" />
                <p className="text-xs text-muted-foreground">GPU Fleet</p>
              </div>
              <p className="text-sm font-medium">{dcMetadata.gpuFleet}</p>
            </div>
            <div className="p-3 rounded-lg bg-muted/50 border border-border">
              <div className="flex items-center gap-2 mb-1">
                <Wind className="h-3.5 w-3.5 text-info" />
                <p className="text-xs text-muted-foreground">Cooling Type</p>
              </div>
              <p className="text-sm font-medium">{dcMetadata.coolingType}</p>
            </div>
            <div className="p-3 rounded-lg bg-muted/50 border border-border">
              <div className="flex items-center gap-2 mb-1">
                <Zap className="h-3.5 w-3.5 text-warning" />
                <p className="text-xs text-muted-foreground">Power Topology</p>
              </div>
              <p className="text-sm font-medium">{dcMetadata.powerTopology}</p>
            </div>
            <div className="p-3 rounded-lg bg-muted/50 border border-border">
              <div className="flex items-center gap-2 mb-1">
                <Zap className="h-3.5 w-3.5 text-success" />
                <p className="text-xs text-muted-foreground">Renewable %</p>
              </div>
              <p className="text-sm font-medium">{dcMetadata.renewablePercent}</p>
            </div>
            <div className="p-3 rounded-lg bg-muted/50 border border-border">
              <div className="flex items-center gap-2 mb-1">
                <Shield className="h-3.5 w-3.5 text-info" />
                <p className="text-xs text-muted-foreground">Sovereign Compliance</p>
              </div>
              <p className="text-sm font-medium">{dcMetadata.sovereignCompliance}</p>
            </div>
          </div>
        </DCCard>
      )}

      {/* Expected Outcomes KPIs */}
      <div className="grid gap-4 grid-cols-3">
        <DCKPITile
          label="Expected ROI"
          value={expectedRoi}
          sublabel="Cost reduction"
          status="normal"
          icon={<TrendingUp className="h-4 w-4" />}
          trend="up"
        />
        <DCKPITile
          label="Time Saved"
          value={timeSaved}
          sublabel="Per week"
          status="normal"
          icon={<Clock className="h-4 w-4" />}
          trend="up"
        />
        <DCKPITile
          label="Efficiency Gain"
          value={efficiencyGain}
          sublabel="Processing speed"
          status="normal"
          icon={<Zap className="h-4 w-4" />}
          trend="up"
        />
      </div>

      {/* Capabilities Summary */}
      <DCCard title="System Capabilities" icon={<Cpu className="h-4 w-4" />}>
        <div className="space-y-4">
          <div>
            <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">Core Functions</h4>
            <div className="flex flex-wrap gap-2">
              {capabilities.map((capability, idx) => (
                <Badge key={idx} variant="outline" className="bg-background/50">{capability}</Badge>
              ))}
            </div>
          </div>

          <div>
            <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">Infrastructure Tools</h4>
            <div className="flex flex-wrap gap-2">
              {recommendedTools.map((tool, idx) => (
                <Badge key={idx} className="bg-accent/10 text-accent border-accent/30">{tool}</Badge>
              ))}
            </div>
          </div>

          <div>
            <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">Workflow Pipeline</h4>
            <div className="space-y-2">
              {workflowSummary.map((workflowItem, idx) => (
                <div key={idx} className="flex items-center gap-2 text-sm text-muted-foreground font-mono">
                  <span className="w-1.5 h-1.5 rounded-full bg-success" />
                  {workflowItem}
                </div>
              ))}
            </div>
          </div>
        </div>
      </DCCard>

      {/* Blueprint Snapshot */}
      <BlueprintSnapshotCard 
        twinId="default"
        onOpenFullBlueprint={() => window.open('/blueprint/default', '_blank')}
      />

      {/* Actions */}
      <DCCard className="bg-muted/30">
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Ready to configure this system? Click "Next" to set up intelligence, tools, and workflows.
          </p>
          <div className="flex gap-3">
            <Button variant="outline" className="flex-1" onClick={handleOpenEdit}>
              <Pencil className="h-4 w-4 mr-2" />
              Edit Configuration
            </Button>
            <Button variant="outline" className="flex-1" onClick={() => setIsSwitchOpen(true)}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Switch Template
            </Button>
          </div>
          
          {/* Co-Pilot Quick Actions */}
          <div className="pt-4 border-t border-border/50">
            <p className="text-xs text-muted-foreground mb-2">Ask Co-Pilot:</p>
            <div className="flex flex-wrap gap-2">
              <Button 
                variant="ghost" 
                size="sm" 
                className="text-xs bg-muted hover:bg-muted/80"
                onClick={() => handleAskCoPilot(`Suggest PUE optimization strategies for this data centre twin.`)}
              >
                PUE Optimization
              </Button>
              <Button 
                variant="ghost" 
                size="sm" 
                className="text-xs bg-muted hover:bg-muted/80"
                onClick={() => handleAskCoPilot(`What thermal monitoring KPIs should I track for ${agentName}?`)}
              >
                Thermal KPIs
              </Button>
              <Button 
                variant="ghost" 
                size="sm" 
                className="text-xs bg-muted hover:bg-muted/80"
                onClick={() => handleAskCoPilot(`What are the key sovereignty compliance requirements for this data centre?`)}
              >
                Sovereignty Checks
              </Button>
            </div>
          </div>
        </div>
      </DCCard>

      {/* Edit Summary Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit System Configuration</DialogTitle>
            <DialogDescription>
              Update the name, description, and classification for this digital twin.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-name">System Name</Label>
              <Input 
                id="edit-name" 
                value={editName} 
                onChange={(e) => setEditName(e.target.value)}
                placeholder="Data Centre Twin name"
                className=""
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-description">Description</Label>
              <Textarea 
                id="edit-description" 
                value={editDescription} 
                onChange={(e) => setEditDescription(e.target.value)}
                placeholder="What does this system monitor and control?"
                rows={3}
                className=""
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-industry">Industry</Label>
                <Input 
                  id="edit-industry" 
                  value={editIndustry} 
                  onChange={(e) => setEditIndustry(e.target.value)}
                  placeholder="e.g. Data Centre"
                  className=""
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-department">Department</Label>
                <Input 
                  id="edit-department" 
                  value={editDepartment} 
                  onChange={(e) => setEditDepartment(e.target.value)}
                  placeholder="e.g. Infrastructure"
                  className=""
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>System Type</Label>
              <Select value={editType} onValueChange={(val: 'agent' | 'process_twin' | '3d_twin') => setEditType(val)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="agent">Agentic AI</SelectItem>
                  <SelectItem value="process_twin">Process Digital Twin</SelectItem>
                  <SelectItem value="3d_twin">3D Digital Twin</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditOpen(false)}>Cancel</Button>
            <Button onClick={handleSaveEdit} disabled={isSaving}>
              {isSaving ? 'Saving...' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Switch Template Dialog */}
      <Dialog open={isSwitchOpen} onOpenChange={setIsSwitchOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Switch Template</DialogTitle>
            <DialogDescription>
              Choose a different data centre template to start from.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-3">
            {['Sovereign Green AI Data Center Twin', 'HPC Cluster Optimization Twin', 'Energy & Cooling Efficiency Twin', 'GPU Workload Scheduler Twin'].map((tpl) => (
              <Button 
                key={tpl} 
                variant="outline" 
                className="w-full justify-start"
                onClick={() => {
                  toast.info(`Switching to: ${tpl}`);
                  setIsSwitchOpen(false);
                }}
              >
                <Server className="h-4 w-4 mr-2 text-primary" />
                {tpl}
              </Button>
            ))}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsSwitchOpen(false)}>Cancel</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
