import { useState } from 'react';
import { Building2, Briefcase, Bot, Clock, Zap, Target, FileText, Shield, Pencil, RefreshCw, Server, Globe, Cpu, Wind } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useWizardBuilderStore } from '@/stores/wizardBuilderStore';
import { useBlueprintStore } from '@/stores/blueprintStore';
import { useCoPilotContext } from '@/contexts/CoPilotContext';
import { toast } from 'sonner';
import { DCCard, DCSectionHeader, DCKPITile } from '@/components/dc-ui';
import { BlueprintSnapshotCard } from '@/components/blueprint';

const NOT_CONFIGURED = 'Not configured';

export function Step1Summary() {
  const {
    goal, industry, department, type, template, workflow,
    setGoal, setIndustryDepartment, setType,
  } = useWizardBuilderStore();
  const { currentBlueprint, updateBlueprint } = useBlueprintStore();
  const { openWithQuestion } = useCoPilotContext();

  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isSwitchOpen, setIsSwitchOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const [editName, setEditName] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editIndustry, setEditIndustry] = useState('');
  const [editDepartment, setEditDepartment] = useState('');
  const [editType, setEditType] = useState<'agent' | 'process_twin' | '3d_twin'>('agent');

  const dcMetadata = {
    facilityLocation: NOT_CONFIGURED,
    gpuFleet: NOT_CONFIGURED,
    coolingType: NOT_CONFIGURED,
    powerTopology: NOT_CONFIGURED,
    renewablePercent: NOT_CONFIGURED,
    sovereignCompliance: NOT_CONFIGURED,
  };

  const agentName = currentBlueprint?.name ||
                    template ||
                    `${type === 'agent' ? 'AI Agent' : type === '3d_twin' ? '3D Digital Twin' : 'Process Twin'}${department ? ` for ${department}` : ''}`;

  const goals = currentBlueprint?.goals && currentBlueprint.goals.length > 0
    ? currentBlueprint.goals
    : [];

  const expectedRoi = currentBlueprint?.expectedRoi || NOT_CONFIGURED;
  const timeSaved = currentBlueprint?.timeSavedPerWeek || NOT_CONFIGURED;
  const efficiencyGain = currentBlueprint?.efficiencyGain || NOT_CONFIGURED;

  const toStringValue = (item: unknown): string => {
    if (typeof item === 'string') return item;
    if (item && typeof item === 'object') {
      const value = item as Record<string, unknown>;
      return String(value.name || value.label || value.type || '');
    }
    return String(item ?? '');
  };

  const capabilities = currentBlueprint?.workflow?.actions?.length > 0
    ? currentBlueprint.workflow.actions.slice(0, 5).map(toStringValue)
    : workflow?.actions?.length > 0
      ? workflow.actions.slice(0, 5).map(toStringValue)
      : [];

  const recommendedTools = currentBlueprint?.tools?.recommendedIntegrations?.length > 0
    ? currentBlueprint.tools.recommendedIntegrations.slice(0, 4).map(toStringValue)
    : workflow?.integrations?.length > 0
      ? workflow.integrations.slice(0, 4).map(toStringValue)
      : [];

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

    return [];
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

      toast.success('Overview updated');
      setIsEditOpen(false);
    } catch {
      toast.error('Could not save the overview');
    } finally {
      setIsSaving(false);
    }
  };

  const handleAskCoPilot = (prompt: string) => openWithQuestion(prompt);

  const isDataCentreTwin = industry?.toLowerCase().includes('data') ||
                           department?.toLowerCase().includes('infrastructure') ||
                           type === '3d_twin' ||
                           template?.toLowerCase().includes('data centre');

  return (
    <div className="mx-auto max-w-[920px] space-y-6">
      <DCSectionHeader
        title="Overview"
        subtitle="Review what is known, what is selected and what is still not configured."
        icon={<Server className="h-5 w-5" />}
      />

      {currentBlueprint?.source === 'template' && currentBlueprint?.templateName && (
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="gap-2 border-primary/30 bg-primary/5 px-3 py-1.5">
            <FileText className="h-3.5 w-3.5 text-primary" aria-hidden />
            <span className="text-xs">Template: {currentBlueprint.templateName}</span>
            {currentBlueprint.certified && <Shield className="h-3.5 w-3.5 text-success" aria-label="Certified template" />}
          </Badge>
        </div>
      )}

      <DCCard
        title={agentName}
        subtitle={type === 'agent' ? 'Agentic Intelligence' : type === '3d_twin' ? '3D Digital Twin' : 'Process Twin'}
        icon={<Bot className="h-5 w-5" />}
        status={currentBlueprint ? 'normal' : 'warning'}
      >
        <div className="space-y-4">
          <div>
            <h4 className="mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">Purpose</h4>
            <p className="text-sm">
              {currentBlueprint?.description || goal || 'No purpose has been configured yet.'}
            </p>
          </div>

          {goals.length > 0 ? (
            <div>
              <h4 className="mb-2 flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                <Target className="h-3 w-3" aria-hidden />
                Key objectives
              </h4>
              <div className="space-y-1">
                {goals.map((goalItem, idx) => (
                  <div key={idx} className="flex items-center gap-2 text-sm">
                    <span className="h-1.5 w-1.5 rounded-full bg-primary" aria-hidden />
                    {goalItem}
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No objectives configured yet.</p>
          )}

          <div className="flex flex-wrap gap-2">
            <Badge variant="outline">
              <Building2 className="mr-1 h-3 w-3" aria-hidden />
              {industry || NOT_CONFIGURED}
            </Badge>
            <Badge variant="outline">
              <Briefcase className="mr-1 h-3 w-3" aria-hidden />
              {department || NOT_CONFIGURED}
            </Badge>
            {isDataCentreTwin && (
              <Badge variant="outline">
                <Globe className="mr-1 h-3 w-3" aria-hidden />
                Data Centre Twin
              </Badge>
            )}
          </div>
        </div>
      </DCCard>

      {isDataCentreTwin && (
        <DCCard
          title="Facility specifications"
          subtitle="Only verified or explicitly configured facility values belong here."
          icon={<Server className="h-4 w-4" />}
        >
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <MetadataTile icon={<Globe className="h-3.5 w-3.5" aria-hidden />} label="Facility location" value={dcMetadata.facilityLocation} />
            <MetadataTile icon={<Cpu className="h-3.5 w-3.5" aria-hidden />} label="GPU fleet" value={dcMetadata.gpuFleet} />
            <MetadataTile icon={<Wind className="h-3.5 w-3.5" aria-hidden />} label="Cooling type" value={dcMetadata.coolingType} />
            <MetadataTile icon={<Zap className="h-3.5 w-3.5" aria-hidden />} label="Power topology" value={dcMetadata.powerTopology} />
            <MetadataTile icon={<Zap className="h-3.5 w-3.5" aria-hidden />} label="Renewable %" value={dcMetadata.renewablePercent} />
            <MetadataTile icon={<Shield className="h-3.5 w-3.5" aria-hidden />} label="Sovereign compliance" value={dcMetadata.sovereignCompliance} />
          </div>
        </DCCard>
      )}

      <div className="grid gap-4 sm:grid-cols-3">
        <DCKPITile label="Expected ROI" value={expectedRoi === NOT_CONFIGURED ? '—' : expectedRoi} sublabel={expectedRoi === NOT_CONFIGURED ? NOT_CONFIGURED : 'Blueprint estimate'} status={expectedRoi === NOT_CONFIGURED ? 'info' : 'normal'} icon={<Zap className="h-4 w-4" />} />
        <DCKPITile label="Time saved" value={timeSaved === NOT_CONFIGURED ? '—' : timeSaved} sublabel={timeSaved === NOT_CONFIGURED ? NOT_CONFIGURED : 'Blueprint estimate'} status={timeSaved === NOT_CONFIGURED ? 'info' : 'normal'} icon={<Clock className="h-4 w-4" />} />
        <DCKPITile label="Efficiency gain" value={efficiencyGain === NOT_CONFIGURED ? '—' : efficiencyGain} sublabel={efficiencyGain === NOT_CONFIGURED ? NOT_CONFIGURED : 'Blueprint estimate'} status={efficiencyGain === NOT_CONFIGURED ? 'info' : 'normal'} icon={<Cpu className="h-4 w-4" />} />
      </div>

      <DCCard title="System capabilities" icon={<Cpu className="h-4 w-4" />}>
        <div className="space-y-4">
          <SummaryList title="Core functions" values={capabilities} emptyLabel="No capabilities configured yet." />
          <SummaryList title="Connections" values={recommendedTools} emptyLabel="No connections selected yet." accent />
          <div>
            <h4 className="mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">Workflow</h4>
            {workflowSummary.length > 0 ? (
              <div className="space-y-2">
                {workflowSummary.map((workflowItem, idx) => (
                  <div key={idx} className="flex items-center gap-2 font-mono text-sm text-muted-foreground">
                    <span className="h-1.5 w-1.5 rounded-full bg-success" aria-hidden />
                    {workflowItem}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No workflow configured yet.</p>
            )}
          </div>
        </div>
      </DCCard>

      <BlueprintSnapshotCard
        twinId="default"
        onOpenFullBlueprint={() => window.open('/blueprint/default', '_blank', 'noopener,noreferrer')}
      />

      <DCCard className="bg-muted/30">
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Continue to configure intelligence, connections and workflow behavior. Missing values remain visibly unconfigured rather than being replaced by assumed facility data.
          </p>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Button variant="outline" className="flex-1" onClick={handleOpenEdit}>
              <Pencil className="mr-2 h-4 w-4" aria-hidden />
              Edit overview
            </Button>
            <Button variant="outline" className="flex-1" onClick={() => setIsSwitchOpen(true)}>
              <RefreshCw className="mr-2 h-4 w-4" aria-hidden />
              Switch template
            </Button>
          </div>

          <div className="border-t border-border/50 pt-4">
            <p className="mb-2 text-xs text-muted-foreground">Ask AURA Assistant</p>
            <div className="flex flex-wrap gap-2">
              <Button variant="ghost" size="sm" className="bg-muted text-xs hover:bg-muted/80" onClick={() => handleAskCoPilot('Suggest PUE optimization strategies for this data centre twin.')}>PUE optimization</Button>
              <Button variant="ghost" size="sm" className="bg-muted text-xs hover:bg-muted/80" onClick={() => handleAskCoPilot(`What thermal monitoring KPIs should I track for ${agentName}?`)}>Thermal KPIs</Button>
              <Button variant="ghost" size="sm" className="bg-muted text-xs hover:bg-muted/80" onClick={() => handleAskCoPilot('What sovereignty controls should be evaluated for this data centre?')}>Sovereignty controls</Button>
            </div>
          </div>
        </div>
      </DCCard>

      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit overview</DialogTitle>
            <DialogDescription>Update the name, description and classification for this build.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-name">System name</Label>
              <Input id="edit-name" value={editName} onChange={(e) => setEditName(e.target.value)} placeholder="System name" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-description">Description</Label>
              <Textarea id="edit-description" value={editDescription} onChange={(e) => setEditDescription(e.target.value)} placeholder="What does this system do?" rows={3} />
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="edit-industry">Industry</Label>
                <Input id="edit-industry" value={editIndustry} onChange={(e) => setEditIndustry(e.target.value)} placeholder="Industry" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-department">Department</Label>
                <Input id="edit-department" value={editDepartment} onChange={(e) => setEditDepartment(e.target.value)} placeholder="Department" />
              </div>
            </div>
            <div className="space-y-2">
              <Label>System type</Label>
              <Select value={editType} onValueChange={(val: 'agent' | 'process_twin' | '3d_twin') => setEditType(val)}>
                <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
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
            <Button onClick={() => void handleSaveEdit()} disabled={isSaving}>{isSaving ? 'Saving…' : 'Save changes'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isSwitchOpen} onOpenChange={setIsSwitchOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Switch template</DialogTitle>
            <DialogDescription>Choose a different data-centre template to start from.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-4">
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
                <Server className="mr-2 h-4 w-4 text-primary" aria-hidden />
                {tpl}
              </Button>
            ))}
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setIsSwitchOpen(false)}>Cancel</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function MetadataTile({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border bg-muted/50 p-3">
      <div className="mb-1 flex items-center gap-2 text-muted-foreground">
        {icon}
        <p className="text-xs">{label}</p>
      </div>
      <p className="text-sm font-medium">{value}</p>
    </div>
  );
}

function SummaryList({ title, values, emptyLabel, accent = false }: { title: string; values: string[]; emptyLabel: string; accent?: boolean }) {
  return (
    <div>
      <h4 className="mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">{title}</h4>
      {values.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {values.map((value, idx) => (
            <Badge key={`${value}-${idx}`} variant="outline" className={accent ? 'bg-accent/10' : 'bg-background/50'}>{value}</Badge>
          ))}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">{emptyLabel}</p>
      )}
    </div>
  );
}
