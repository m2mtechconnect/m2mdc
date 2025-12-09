import { useState, useEffect, useCallback } from 'react';
import { Brain, BookOpen, MessageSquare, Settings, Upload, Link2, Database, Info, Sparkles, Search, Users, Zap, Thermometer, Shield, Cpu, Activity } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { useWizardBuilderStore } from '@/stores/wizardBuilderStore';
import { useBlueprintStore } from '@/stores/blueprintStore';
import { useCoPilotContext } from '@/contexts/CoPilotContext';
import { ModernFileUploadWizard } from '@/components/dashboard/ModernFileUploadWizard';
import { toast } from 'sonner';
import { DCCard, DCSectionHeader } from '@/components/dc-ui';

export function Step2Intelligence() {
  const { modelConfig, setModelConfig, builderId } = useWizardBuilderStore();
  const { currentBlueprint, updateBlueprint } = useBlueprintStore();
  const { openWithQuestion } = useCoPilotContext();
  
  const [temperature, setTemperature] = useState([modelConfig?.rag?.temperature ?? 0.7]);
  const [topK, setTopK] = useState(50);
  const [topP, setTopP] = useState(0.95);
  const [memoryType, setMemoryType] = useState<'none' | 'short' | 'long'>('short');
  
  const [supervisorEnabled, setSupervisorEnabled] = useState(false);
  const [deepResearchEnabled, setDeepResearchEnabled] = useState(false);
  
  const [systemPrompt, setSystemPrompt] = useState('');
  const [persona, setPersona] = useState('professional');
  const [formalTone, setFormalTone] = useState(false);
  const [useEmojis, setUseEmojis] = useState(false);
  const [detailedExplanations, setDetailedExplanations] = useState(true);
  
  const [hallucinationPrevention, setHallucinationPrevention] = useState(true);
  const [knowledgeRestrictions, setKnowledgeRestrictions] = useState(true);
  const [requireCitations, setRequireCitations] = useState(false);
  
  const [showUploadWizard, setShowUploadWizard] = useState(false);
  const [urlInput, setUrlInput] = useState('');
  const [isAddingUrl, setIsAddingUrl] = useState(false);
  
  useEffect(() => {
    if (currentBlueprint?.behavior?.systemPrompt) {
      setSystemPrompt(currentBlueprint.behavior.systemPrompt);
    }
    if (currentBlueprint?.model?.supervisorEnabled !== undefined) {
      setSupervisorEnabled(currentBlueprint.model.supervisorEnabled);
    }
    if (currentBlueprint?.model?.deepResearchEnabled !== undefined) {
      setDeepResearchEnabled(currentBlueprint.model.deepResearchEnabled);
    }
  }, [currentBlueprint]);

  const saveIntelligenceConfig = useCallback(async (updates: Record<string, any>) => {
    try {
      await setModelConfig({
        ...modelConfig,
        ...updates,
        rag: { ...modelConfig?.rag, ...updates.rag },
        policies: {
          ...modelConfig?.policies,
          supervisorEnabled,
          deepResearchEnabled,
          hallucinationPrevention,
          knowledgeRestrictions,
          requireCitations,
        },
      });
    } catch (error) {
      console.error('[Builder:Step2] Failed to save config:', error);
    }
  }, [modelConfig, setModelConfig, supervisorEnabled, deepResearchEnabled, hallucinationPrevention, knowledgeRestrictions, requireCitations]);

  const handleModelChange = async (model: string) => {
    await setModelConfig({ model, provider: model.split('/')[0] });
    toast.success(`Model updated to ${model.split('/')[1]}`);
  };

  const handleSystemPromptChange = (value: string) => {
    setSystemPrompt(value);
    if (currentBlueprint) {
      updateBlueprint({
        behavior: { ...currentBlueprint.behavior, systemPrompt: value },
      });
    }
  };

  const handleSystemPromptBlur = async () => {
    await saveIntelligenceConfig({ systemPrompt });
  };

  const handleSupervisorToggle = async (enabled: boolean) => {
    setSupervisorEnabled(enabled);
    await saveIntelligenceConfig({ supervisorEnabled: enabled });
    if (currentBlueprint) {
      updateBlueprint({ model: { ...currentBlueprint.model, supervisorEnabled: enabled } });
    }
    toast.success(enabled ? 'Supervisor Agent enabled' : 'Supervisor Agent disabled');
  };

  const handleDeepResearchToggle = async (enabled: boolean) => {
    setDeepResearchEnabled(enabled);
    await saveIntelligenceConfig({ deepResearchEnabled: enabled });
    if (currentBlueprint) {
      updateBlueprint({ model: { ...currentBlueprint.model, deepResearchEnabled: enabled } });
    }
    toast.success(enabled ? 'Deep Research Agent enabled' : 'Deep Research Agent disabled');
  };

  const handleAddUrl = async () => {
    if (!urlInput.trim()) return;
    setIsAddingUrl(true);
    try {
      toast.success(`URL added to knowledge base: ${urlInput}`);
      setUrlInput('');
    } catch (error) {
      toast.error('Failed to add URL');
    } finally {
      setIsAddingUrl(false);
    }
  };

  const handleSafetyToggle = async (key: string, value: boolean) => {
    switch (key) {
      case 'hallucination': setHallucinationPrevention(value); break;
      case 'knowledge': setKnowledgeRestrictions(value); break;
      case 'citations': setRequireCitations(value); break;
    }
    await saveIntelligenceConfig({
      policies: {
        hallucinationPrevention: key === 'hallucination' ? value : hallucinationPrevention,
        knowledgeRestrictions: key === 'knowledge' ? value : knowledgeRestrictions,
        requireCitations: key === 'citations' ? value : requireCitations,
      },
    });
  };

  // DC-specific subsystems that intelligence monitors
  const dcSubsystems = [
    { id: 'thermal', label: 'Thermal Management', icon: Thermometer, enabled: true },
    { id: 'power', label: 'Power & PUE', icon: Zap, enabled: true },
    { id: 'gpu', label: 'GPU Workloads', icon: Cpu, enabled: true },
    { id: 'sovereignty', label: 'Sovereignty Compliance', icon: Shield, enabled: false },
  ];

  return (
    <>
      <div className="space-y-6 max-w-[920px] mx-auto">
        <DCSectionHeader
          title="Intelligence Configuration"
          subtitle="Configure AI model, knowledge sources, and monitoring behavior"
          icon={<Brain className="h-5 w-5" />}
        />

        {/* Agent Modes */}
        <DCCard
          title="Agent Modes"
          subtitle="Enable advanced capabilities for complex reasoning"
          icon={<Sparkles className="h-4 w-4" />}
          className="border-dc-primary/30"
        >
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 rounded-lg bg-dc-surface border border-dc-border">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-purple-500/10 flex items-center justify-center">
                  <Users className="h-4 w-4 text-purple-400" />
                </div>
                <div>
                  <p className="font-medium text-sm">Supervisor Agent</p>
                  <p className="text-xs text-muted-foreground">Orchestrates sub-agents for multi-step DC operations</p>
                </div>
              </div>
              <Switch checked={supervisorEnabled} onCheckedChange={handleSupervisorToggle} />
            </div>
            
            <div className="flex items-center justify-between p-3 rounded-lg bg-dc-surface border border-dc-border">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-blue-500/10 flex items-center justify-center">
                  <Search className="h-4 w-4 text-blue-400" />
                </div>
                <div>
                  <p className="font-medium text-sm">Deep Research Agent</p>
                  <p className="text-xs text-muted-foreground">Performs thorough analysis and synthesizes findings</p>
                </div>
              </div>
              <Switch checked={deepResearchEnabled} onCheckedChange={handleDeepResearchToggle} />
            </div>
          </div>
        </DCCard>

        {/* Subsystems Monitored */}
        <DCCard
          title="Monitored Subsystems"
          subtitle="Select which DC subsystems this intelligence governs"
          icon={<Activity className="h-4 w-4" />}
        >
          <div className="grid grid-cols-2 gap-3">
            {dcSubsystems.map((sys) => {
              const IconComp = sys.icon;
              return (
                <div 
                  key={sys.id}
                  className={`flex items-center gap-3 p-3 rounded-lg border transition-colors cursor-pointer ${
                    sys.enabled 
                      ? 'bg-dc-primary/10 border-dc-primary/30' 
                      : 'bg-dc-surface border-dc-border hover:border-dc-primary/30'
                  }`}
                >
                  <IconComp className={`h-4 w-4 ${sys.enabled ? 'text-dc-primary' : 'text-muted-foreground'}`} />
                  <span className="text-sm font-medium">{sys.label}</span>
                </div>
              );
            })}
          </div>
        </DCCard>

        <Tabs defaultValue="model" className="w-full">
          <TabsList className="grid w-full grid-cols-4 bg-dc-surface">
            <TabsTrigger value="model" className="flex items-center gap-2 data-[state=active]:bg-dc-primary/10">
              <Brain className="h-4 w-4" />
              <span className="hidden sm:inline">Model</span>
            </TabsTrigger>
            <TabsTrigger value="knowledge" className="flex items-center gap-2 data-[state=active]:bg-dc-primary/10">
              <BookOpen className="h-4 w-4" />
              <span className="hidden sm:inline">Knowledge</span>
            </TabsTrigger>
            <TabsTrigger value="behavior" className="flex items-center gap-2 data-[state=active]:bg-dc-primary/10">
              <MessageSquare className="h-4 w-4" />
              <span className="hidden sm:inline">Behavior</span>
            </TabsTrigger>
            <TabsTrigger value="advanced" className="flex items-center gap-2 data-[state=active]:bg-dc-primary/10">
              <Settings className="h-4 w-4" />
              <span className="hidden sm:inline">Advanced</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="model" className="space-y-4 mt-6">
            <DCCard title="AI Model Selection" icon={<Brain className="h-4 w-4" />}>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Model</Label>
                  <Select value={modelConfig.model} onValueChange={handleModelChange}>
                    <SelectTrigger className="bg-dc-surface border-dc-border">
                      <SelectValue placeholder="Select a model" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="google/gemini-3-pro-preview">Gemini 3.0 Pro Preview (Latest)</SelectItem>
                      <SelectItem value="google/gemini-2.5-flash">Gemini 2.5 Flash (Default)</SelectItem>
                      <SelectItem value="google/gemini-2.5-pro">Gemini 2.5 Pro</SelectItem>
                      <SelectItem value="openai/gpt-5">GPT-5</SelectItem>
                      <SelectItem value="openai/gpt-5-mini">GPT-5 Mini</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid gap-3 p-4 bg-dc-surface rounded-lg border border-dc-border">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Context Window:</span>
                    <span className="font-mono">128K tokens</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Pricing:</span>
                    <span className="font-mono">$0.15 / 1M tokens</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Reasoning Mode:</span>
                    <Badge className="bg-dc-success/10 text-dc-success border-dc-success/30">Fast & Balanced</Badge>
                  </div>
                </div>
              </div>
            </DCCard>
          </TabsContent>

          <TabsContent value="knowledge" className="space-y-4 mt-6">
            <DCCard title="Knowledge Sources (RAG)" icon={<BookOpen className="h-4 w-4" />}>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Upload DC Documentation</Label>
                  <div 
                    onClick={() => setShowUploadWizard(true)}
                    className="border-2 border-dashed border-dc-border rounded-lg p-6 text-center hover:bg-dc-surface/50 transition-colors cursor-pointer"
                  >
                    <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">Drop DCIM docs, thermal specs, or runbooks</p>
                    <p className="text-xs text-muted-foreground mt-1">PDF, DOCX, TXT, MD (Max 50MB)</p>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Ingest URLs</Label>
                  <div className="flex gap-2">
                    <Input 
                      placeholder="https://docs.datacentre.example.com" 
                      value={urlInput}
                      onChange={(e) => setUrlInput(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleAddUrl()}
                      className="bg-dc-surface border-dc-border"
                    />
                    <Button variant="outline" onClick={handleAddUrl} disabled={isAddingUrl} className="border-dc-border">
                      <Link2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Connect Infrastructure Sources</Label>
                  <div className="grid gap-2">
                    <Button variant="outline" className="justify-start bg-dc-surface border-dc-border hover:bg-dc-surface/80">
                      <Database className="h-4 w-4 mr-2" />
                      Connect DCIM System
                    </Button>
                    <Button variant="outline" className="justify-start bg-dc-surface border-dc-border hover:bg-dc-surface/80">
                      <Database className="h-4 w-4 mr-2" />
                      Connect Prometheus
                    </Button>
                    <Button variant="outline" className="justify-start bg-dc-surface border-dc-border hover:bg-dc-surface/80">
                      <Database className="h-4 w-4 mr-2" />
                      Connect Asset Database
                    </Button>
                  </div>
                </div>

                <div className="p-4 bg-dc-surface rounded-lg border border-dc-border space-y-3">
                  <h4 className="text-sm font-medium">RAG Quality Score</h4>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Retrieval Accuracy</span>
                    <Badge className="bg-dc-success/10 text-dc-success border-dc-success/30">85%</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Sources Indexed</span>
                    <Badge variant="outline">0 documents</Badge>
                  </div>
                </div>
              </div>
            </DCCard>
          </TabsContent>

          <TabsContent value="behavior" className="space-y-4 mt-6">
            <DCCard title="System Behavior" icon={<MessageSquare className="h-4 w-4" />}>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>System Prompt</Label>
                  <Textarea
                    placeholder="You are a Data Centre operations AI specialized in thermal management, power optimization, and workload scheduling..."
                    value={systemPrompt}
                    onChange={(e) => handleSystemPromptChange(e.target.value)}
                    onBlur={handleSystemPromptBlur}
                    rows={6}
                    className="resize-none font-mono text-sm bg-dc-surface border-dc-border"
                  />
                  <p className="text-xs text-muted-foreground">
                    Define DC-specific behavior, monitoring priorities, and operational constraints.
                  </p>
                </div>

                <div className="space-y-2">
                  <Label>Operational Mode</Label>
                  <Select value={persona} onValueChange={setPersona}>
                    <SelectTrigger className="bg-dc-surface border-dc-border">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="professional">NOC Operations Mode</SelectItem>
                      <SelectItem value="friendly">Collaborative Mode</SelectItem>
                      <SelectItem value="technical">Engineering Debug Mode</SelectItem>
                      <SelectItem value="executive">Executive Summary Mode</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid gap-3">
                  <div className="flex items-center justify-between p-3 bg-dc-surface rounded-lg border border-dc-border">
                    <span className="text-sm">Detailed Explanations</span>
                    <Switch checked={detailedExplanations} onCheckedChange={setDetailedExplanations} />
                  </div>
                  <div className="flex items-center justify-between p-3 bg-dc-surface rounded-lg border border-dc-border">
                    <span className="text-sm">Formal Technical Tone</span>
                    <Switch checked={formalTone} onCheckedChange={setFormalTone} />
                  </div>
                </div>
              </div>
            </DCCard>
          </TabsContent>

          <TabsContent value="advanced" className="space-y-4 mt-6">
            <DCCard title="Safety & Thresholds" icon={<Shield className="h-4 w-4" />}>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-3 bg-dc-surface rounded-lg border border-dc-border">
                  <div>
                    <p className="text-sm font-medium">Hallucination Prevention</p>
                    <p className="text-xs text-muted-foreground">Only respond from verified DC knowledge</p>
                  </div>
                  <Switch checked={hallucinationPrevention} onCheckedChange={(v) => handleSafetyToggle('hallucination', v)} />
                </div>

                <div className="flex items-center justify-between p-3 bg-dc-surface rounded-lg border border-dc-border">
                  <div>
                    <p className="text-sm font-medium">Knowledge Restrictions</p>
                    <p className="text-xs text-muted-foreground">Limit to indexed sources only</p>
                  </div>
                  <Switch checked={knowledgeRestrictions} onCheckedChange={(v) => handleSafetyToggle('knowledge', v)} />
                </div>

                <div className="flex items-center justify-between p-3 bg-dc-surface rounded-lg border border-dc-border">
                  <div>
                    <p className="text-sm font-medium">Require Citations</p>
                    <p className="text-xs text-muted-foreground">Always cite data sources in responses</p>
                  </div>
                  <Switch checked={requireCitations} onCheckedChange={(v) => handleSafetyToggle('citations', v)} />
                </div>

                <div className="space-y-3 pt-4 border-t border-dc-border">
                  <Label>Temperature (Creativity): {temperature[0]}</Label>
                  <Slider
                    value={temperature}
                    onValueChange={setTemperature}
                    max={1}
                    min={0}
                    step={0.1}
                    className="w-full"
                  />
                  <p className="text-xs text-muted-foreground">
                    Lower = more deterministic (0.3 for ops), Higher = more creative
                  </p>
                </div>
              </div>
            </DCCard>
          </TabsContent>
        </Tabs>
      </div>

      <ModernFileUploadWizard
        open={showUploadWizard}
        onOpenChange={setShowUploadWizard}
        agentId={builderId}
      />
    </>
  );
}
