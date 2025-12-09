import { useState } from 'react';
import { Building2, Briefcase, Bot, TrendingUp, Clock, Zap, Info, Target, FileText, Shield, Pencil, RefreshCw } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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

export function Step1Summary() {
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

  // ALWAYS use blueprint data when available - no generic fallbacks for template-sourced data
  const agentName = currentBlueprint?.name || 
                    template || 
                    `${type === 'agent' ? 'AI Agent' : type === '3d_twin' ? '3D Digital Twin' : 'Process Twin'}${department ? ` for ${department}` : ''}`;
  
  const goals = currentBlueprint?.goals && currentBlueprint.goals.length > 0 
    ? currentBlueprint.goals 
    : [];
  
  const expectedRoi = currentBlueprint?.expectedRoi || '35-50%';
  const timeSaved = currentBlueprint?.timeSavedPerWeek || '20+ hrs/week';
  const efficiencyGain = currentBlueprint?.efficiencyGain || '3-5x faster';

  // Helper to safely extract string from any value
  const toStringValue = (item: any): string => {
    if (typeof item === 'string') return item;
    if (item && typeof item === 'object') {
      return item.name || item.label || item.type || String(item);
    }
    return String(item);
  };

  // Derive capabilities from blueprint/workflow
  const capabilities = currentBlueprint?.workflow?.actions?.length > 0
    ? currentBlueprint.workflow.actions.slice(0, 5).map(toStringValue)
    : workflow?.actions?.length > 0 
    ? workflow.actions.slice(0, 5).map(toStringValue)
    : ['API Integration', 'Event Monitoring', 'Data Processing', 'Automated Workflows', 'Real-time Analysis'];

  // Derive tools from blueprint integrations
  const recommendedTools = currentBlueprint?.tools?.recommendedIntegrations?.length > 0
    ? currentBlueprint.tools.recommendedIntegrations.slice(0, 4).map(toStringValue)
    : workflow?.integrations?.length > 0
    ? workflow.integrations.slice(0, 4).map(toStringValue)
    : ['CRM Integration', 'Email Automation', 'Slack Notifications', 'Database Access'];

  // Show workflow structure if available
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
      'Trigger Detection → Analysis → Action',
      'Data Ingestion → Processing → Reporting',
    ];
  };
  
  const workflowSummary = buildWorkflowSummary();

  // Open edit modal with current values
  const handleOpenEdit = () => {
    setEditName(agentName);
    setEditDescription(currentBlueprint?.description || goal || '');
    setEditIndustry(industry || '');
    setEditDepartment(department || '');
    setEditType(type || 'agent');
    setIsEditOpen(true);
  };

  // Save edits to backend
  const handleSaveEdit = async () => {
    setIsSaving(true);
    console.log('[Builder:Step1] Saving summary edits', { editName, editDescription, editIndustry, editDepartment, editType });
    
    try {
      // Update wizard store (which persists to backend)
      await setGoal(editDescription);
      await setIndustryDepartment(editIndustry, editDepartment);
      await setType(editType);
      
      // Update blueprint store
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

  // Co-Pilot integration
  const handleAskCoPilot = (prompt: string) => {
    openWithQuestion(prompt);
  };

  return (
    <div className="space-y-8 max-w-[880px] mx-auto">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 space-y-3">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
                  Agent/Twin Summary
                  <Info className="h-5 w-5 text-muted-foreground" />
                </h1>
              </TooltipTrigger>
              <TooltipContent className="max-w-sm">
                <p>This step reviews the recommended agent or digital twin. Confirm objectives and expectations before configuring intelligence, data, tools, and workflows.</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
          <p className="text-muted-foreground">
            Confirm objectives and expectations before setup
          </p>
          
          {/* Template Source Indicator */}
          {currentBlueprint?.source === 'template' && currentBlueprint?.templateName && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Badge 
                    variant="secondary" 
                    className="gap-2 px-3 py-1.5 cursor-help hover:bg-secondary/80 transition-colors"
                  >
                    <FileText className="h-3.5 w-3.5" />
                    <span className="text-xs font-medium">Started from template: {currentBlueprint.templateName}</span>
                    {currentBlueprint.certified && (
                      <Shield className="h-3.5 w-3.5 text-green-500" />
                    )}
                  </Badge>
                </TooltipTrigger>
                <TooltipContent className="max-w-md">
                  <div className="space-y-2 text-xs">
                    <p className="font-semibold text-sm">{currentBlueprint.templateName}</p>
                    {currentBlueprint.sourceEntry && (
                      <p className="text-muted-foreground">
                        Selected from: <span className="font-medium capitalize">{currentBlueprint.sourceEntry}</span>
                      </p>
                    )}
                    {currentBlueprint.certified && (
                      <p className="text-green-600 flex items-center gap-1">
                        <Shield className="h-3 w-3" />
                        <span className="font-medium">Certified Template</span>
                      </p>
                    )}
                    <p className="text-muted-foreground">
                      Pre-configured with industry best practices. All settings can be customized.
                    </p>
                  </div>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </div>
      </div>

      {/* Agent/Twin Overview */}
      <Card className="border-primary bg-primary/5">
        <CardHeader>
          <CardTitle className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary flex items-center justify-center">
              <Bot className="w-5 h-5 text-primary-foreground" />
            </div>
            <div>
              <p className="text-lg">{agentName}</p>
              <p className="text-sm font-normal text-muted-foreground">
                {type === 'agent' ? 'Agentic AI' : type === '3d_twin' ? '3D Digital Twin' : 'Process Twin'}
              </p>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h3 className="text-sm font-medium mb-2">Purpose & Description</h3>
            <p className="text-sm text-muted-foreground">
              {currentBlueprint?.description || 
               goal || 
               `Automate and optimize ${department || 'business'} operations with AI-powered decision making and task execution.`}
            </p>
          </div>

          {/* Goals */}
          {goals.length > 0 && (
            <div>
              <h3 className="text-sm font-medium mb-2 flex items-center gap-2">
                <Target className="h-4 w-4" />
                Key Goals
              </h3>
              <div className="space-y-1">
                {goals.map((goalItem, idx) => (
                  <div key={idx} className="flex items-center gap-2 text-sm text-muted-foreground">
                    <span className="w-1 h-1 rounded-full bg-primary" />
                    {goalItem}
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex flex-wrap gap-2">
            <Badge variant="secondary" className="flex items-center gap-1">
              <Building2 className="h-3 w-3" />
              {industry || 'Not specified'}
            </Badge>
            <Badge variant="secondary" className="flex items-center gap-1">
              <Briefcase className="h-3 w-3" />
              {department || 'Not specified'}
            </Badge>
            {currentBlueprint?.level && (
              <Badge variant="outline">{currentBlueprint.level}</Badge>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Expected ROI */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-green-500" />
              Expected ROI
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{expectedRoi}</p>
            <p className="text-xs text-muted-foreground mt-1">Cost reduction</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Clock className="h-4 w-4 text-blue-500" />
              Time Saved
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{timeSaved}</p>
            <p className="text-xs text-muted-foreground mt-1">Per week</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Zap className="h-4 w-4 text-yellow-500" />
              Efficiency Gain
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{efficiencyGain}</p>
            <p className="text-xs text-muted-foreground mt-1">Faster processing</p>
          </CardContent>
        </Card>
      </div>

      {/* Capabilities Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Capabilities Summary</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h4 className="text-sm font-medium mb-2">Core Capabilities</h4>
            <div className="flex flex-wrap gap-2">
              {capabilities.map((capability, idx) => (
                <Badge key={idx} variant="outline">{capability}</Badge>
              ))}
            </div>
          </div>

          <div>
            <h4 className="text-sm font-medium mb-2">Recommended Tools</h4>
            <div className="flex flex-wrap gap-2">
              {recommendedTools.map((tool, idx) => (
                <Badge key={idx} variant="secondary">{tool}</Badge>
              ))}
            </div>
          </div>

          <div>
            <h4 className="text-sm font-medium mb-2">Recommended Workflows</h4>
            <div className="space-y-2">
              {workflowSummary.map((workflowItem, idx) => (
                <div key={idx} className="flex items-center gap-2 text-sm text-muted-foreground">
                  <span className="w-1 h-1 rounded-full bg-primary" />
                  {workflowItem}
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Actions */}
      <Card className="bg-muted/50">
        <CardContent className="pt-6">
          <p className="text-sm text-muted-foreground mb-4">
            Ready to configure this agent? Click "Next" to set up intelligence, tools, and workflows.
          </p>
          <div className="flex gap-3">
            <Button variant="outline" className="flex-1" onClick={handleOpenEdit}>
              <Pencil className="h-4 w-4 mr-2" />
              Edit Summary
            </Button>
            <Button variant="outline" className="flex-1" onClick={() => setIsSwitchOpen(true)}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Switch Agent
            </Button>
          </div>
          
          {/* Co-Pilot Quick Actions */}
          <div className="mt-4 pt-4 border-t">
            <p className="text-xs text-muted-foreground mb-2">Ask Co-Pilot:</p>
            <div className="flex flex-wrap gap-2">
              <Button 
                variant="ghost" 
                size="sm" 
                className="text-xs"
                onClick={() => handleAskCoPilot(`Rewrite this summary for a ${industry || 'business'} executive.`)}
              >
                Rewrite for executive
              </Button>
              <Button 
                variant="ghost" 
                size="sm" 
                className="text-xs"
                onClick={() => handleAskCoPilot(`Suggest 3 KPI ideas for this ${type || 'agent'} in ${industry || 'this industry'}.`)}
              >
                Suggest KPIs
              </Button>
              <Button 
                variant="ghost" 
                size="sm" 
                className="text-xs"
                onClick={() => handleAskCoPilot(`What are the key risks for deploying ${agentName}?`)}
              >
                Identify risks
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Edit Summary Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit Agent/Twin Summary</DialogTitle>
            <DialogDescription>
              Update the name, description, and classification for this agent.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-name">Name</Label>
              <Input 
                id="edit-name" 
                value={editName} 
                onChange={(e) => setEditName(e.target.value)}
                placeholder="Agent name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-description">Description</Label>
              <Textarea 
                id="edit-description" 
                value={editDescription} 
                onChange={(e) => setEditDescription(e.target.value)}
                placeholder="What does this agent do?"
                rows={3}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-industry">Industry</Label>
                <Input 
                  id="edit-industry" 
                  value={editIndustry} 
                  onChange={(e) => setEditIndustry(e.target.value)}
                  placeholder="e.g. Banking"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-department">Department</Label>
                <Input 
                  id="edit-department" 
                  value={editDepartment} 
                  onChange={(e) => setEditDepartment(e.target.value)}
                  placeholder="e.g. Operations"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-type">Type</Label>
              <Select value={editType} onValueChange={(v) => setEditType(v as any)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="agent">AI Agent</SelectItem>
                  <SelectItem value="process_twin">Process Twin</SelectItem>
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

      {/* Switch Agent Dialog */}
      <Dialog open={isSwitchOpen} onOpenChange={setIsSwitchOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Switch Agent/Template</DialogTitle>
            <DialogDescription>
              Start fresh with a different template or create a new agent from scratch.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <Button 
              variant="outline" 
              className="w-full justify-start"
              onClick={() => {
                setIsSwitchOpen(false);
                window.location.href = '/marketplace';
              }}
            >
              <FileText className="h-4 w-4 mr-2" />
              Browse Template Marketplace
            </Button>
            <Button 
              variant="outline" 
              className="w-full justify-start"
              onClick={() => {
                setIsSwitchOpen(false);
                window.location.href = '/builder';
              }}
            >
              <Bot className="h-4 w-4 mr-2" />
              Create New Agent from Scratch
            </Button>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setIsSwitchOpen(false)}>Cancel</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

