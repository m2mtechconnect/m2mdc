import { useState, useEffect, useCallback } from 'react';
import { Brain, BookOpen, MessageSquare, Settings, Upload, Link2, Database, Info, Sparkles, Search, Users, Zap } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useWizardBuilderStore } from '@/stores/wizardBuilderStore';
import { useBlueprintStore } from '@/stores/blueprintStore';
import { useCoPilotContext } from '@/contexts/CoPilotContext';
import { ModernFileUploadWizard } from '@/components/dashboard/ModernFileUploadWizard';
import { toast } from 'sonner';

export function Step2Intelligence() {
  const { modelConfig, setModelConfig, builderId } = useWizardBuilderStore();
  const { currentBlueprint, updateBlueprint } = useBlueprintStore();
  const { openWithQuestion } = useCoPilotContext();
  
  // Intelligence config state
  const [temperature, setTemperature] = useState([modelConfig?.rag?.temperature ?? 0.7]);
  const [topK, setTopK] = useState(50);
  const [topP, setTopP] = useState(0.95);
  const [memoryType, setMemoryType] = useState<'none' | 'short' | 'long'>('short');
  
  // Agent modes
  const [supervisorEnabled, setSupervisorEnabled] = useState(false);
  const [deepResearchEnabled, setDeepResearchEnabled] = useState(false);
  
  // Behavior state
  const [systemPrompt, setSystemPrompt] = useState('');
  const [persona, setPersona] = useState('professional');
  const [formalTone, setFormalTone] = useState(false);
  const [useEmojis, setUseEmojis] = useState(false);
  const [detailedExplanations, setDetailedExplanations] = useState(true);
  
  // Safety state
  const [hallucinationPrevention, setHallucinationPrevention] = useState(true);
  const [knowledgeRestrictions, setKnowledgeRestrictions] = useState(true);
  const [requireCitations, setRequireCitations] = useState(false);
  
  const [showUploadWizard, setShowUploadWizard] = useState(false);
  const [urlInput, setUrlInput] = useState('');
  const [isAddingUrl, setIsAddingUrl] = useState(false);
  
  // Load initial state from blueprint
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

  // Debounced save to backend
  const saveIntelligenceConfig = useCallback(async (updates: Record<string, any>) => {
    console.log('[Builder:Step2] Saving intelligence config', updates);
    try {
      await setModelConfig({
        ...modelConfig,
        ...updates,
        rag: {
          ...modelConfig?.rag,
          ...updates.rag,
        },
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
    console.log('[Builder:Step2] Model changed:', model);
    await setModelConfig({ model, provider: model.split('/')[0] });
    toast.success(`Model updated to ${model.split('/')[1]}`);
  };

  const handleSystemPromptChange = (value: string) => {
    setSystemPrompt(value);
    // Update blueprint
    if (currentBlueprint) {
      updateBlueprint({
        behavior: {
          ...currentBlueprint.behavior,
          systemPrompt: value,
        },
      });
    }
  };

  const handleSystemPromptBlur = async () => {
    await saveIntelligenceConfig({ systemPrompt });
  };

  const handleSupervisorToggle = async (enabled: boolean) => {
    setSupervisorEnabled(enabled);
    console.log('[Builder:Step2] Supervisor Agent toggled:', enabled);
    await saveIntelligenceConfig({ supervisorEnabled: enabled });
    if (currentBlueprint) {
      updateBlueprint({
        model: { ...currentBlueprint.model, supervisorEnabled: enabled },
      });
    }
    toast.success(enabled ? 'Supervisor Agent enabled' : 'Supervisor Agent disabled');
  };

  const handleDeepResearchToggle = async (enabled: boolean) => {
    setDeepResearchEnabled(enabled);
    console.log('[Builder:Step2] Deep Research Agent toggled:', enabled);
    await saveIntelligenceConfig({ deepResearchEnabled: enabled });
    if (currentBlueprint) {
      updateBlueprint({
        model: { ...currentBlueprint.model, deepResearchEnabled: enabled },
      });
    }
    toast.success(enabled ? 'Deep Research Agent enabled' : 'Deep Research Agent disabled');
  };

  const handleAddUrl = async () => {
    if (!urlInput.trim()) return;
    setIsAddingUrl(true);
    console.log('[Builder:Step2] Adding URL to knowledge:', urlInput);
    
    try {
      // TODO: Call backend to index URL
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
      case 'hallucination':
        setHallucinationPrevention(value);
        break;
      case 'knowledge':
        setKnowledgeRestrictions(value);
        break;
      case 'citations':
        setRequireCitations(value);
        break;
    }
    await saveIntelligenceConfig({
      policies: {
        hallucinationPrevention: key === 'hallucination' ? value : hallucinationPrevention,
        knowledgeRestrictions: key === 'knowledge' ? value : knowledgeRestrictions,
        requireCitations: key === 'citations' ? value : requireCitations,
      },
    });
  };

  return (
    <>
    <div className="space-y-8 max-w-[880px] mx-auto">
      <div>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
                Intelligence Setup
                <Info className="h-5 w-5 text-muted-foreground" />
              </h1>
            </TooltipTrigger>
            <TooltipContent className="max-w-sm">
              <p>Configure how your agent thinks: select AI model, add knowledge sources, define behavior and personality, and fine-tune advanced parameters.</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
        <p className="text-muted-foreground mt-2">
          Configure AI model, knowledge, behavior, and reasoning
        </p>
      </div>

      {/* Agent Modes - Supervisor & Deep Research */}
      <Card className="border-primary/50 bg-primary/5">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            Agent Modes
          </CardTitle>
          <CardDescription>
            Enable advanced capabilities for complex reasoning and research tasks
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-purple-500/10 flex items-center justify-center">
                <Users className="h-5 w-5 text-purple-500" />
              </div>
              <div>
                <p className="font-medium text-sm">Supervisor Agent</p>
                <p className="text-xs text-muted-foreground">
                  Orchestrates multiple sub-agents for complex multi-step tasks
                </p>
              </div>
            </div>
            <Switch 
              checked={supervisorEnabled} 
              onCheckedChange={handleSupervisorToggle}
            />
          </div>
          
          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                <Search className="h-5 w-5 text-blue-500" />
              </div>
              <div>
                <p className="font-medium text-sm">Deep Research Agent</p>
                <p className="text-xs text-muted-foreground">
                  Performs thorough web research and synthesizes findings
                </p>
              </div>
            </div>
            <Switch 
              checked={deepResearchEnabled} 
              onCheckedChange={handleDeepResearchToggle}
            />
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="model" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="model" className="flex items-center gap-2">
            <Brain className="h-4 w-4" />
            <span className="hidden sm:inline">Model</span>
          </TabsTrigger>
          <TabsTrigger value="knowledge" className="flex items-center gap-2">
            <BookOpen className="h-4 w-4" />
            <span className="hidden sm:inline">Knowledge</span>
          </TabsTrigger>
          <TabsTrigger value="behavior" className="flex items-center gap-2">
            <MessageSquare className="h-4 w-4" />
            <span className="hidden sm:inline">Behavior</span>
          </TabsTrigger>
          <TabsTrigger value="advanced" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            <span className="hidden sm:inline">Advanced</span>
          </TabsTrigger>
        </TabsList>

        {/* MODEL TAB */}
        <TabsContent value="model" className="space-y-4 mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Brain className="h-4 w-4" />
                AI Model Selection
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Model</Label>
                <Select value={modelConfig.model} onValueChange={handleModelChange}>
                  <SelectTrigger>
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

              <div className="grid gap-3 p-4 bg-muted/50 rounded-lg">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Context Window:</span>
                  <span className="font-medium">128K tokens</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Pricing:</span>
                  <span className="font-medium">$0.15 / 1M tokens</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Reasoning Mode:</span>
                  <Badge variant="secondary">Fast & Balanced</Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* KNOWLEDGE TAB */}
        <TabsContent value="knowledge" className="space-y-4 mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <BookOpen className="h-4 w-4" />
                Knowledge Sources (RAG)
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Upload Documents */}
              <div className="space-y-2">
                <Label>Upload Documents</Label>
                <div 
                  onClick={() => setShowUploadWizard(true)}
                  className="border-2 border-dashed rounded-lg p-6 text-center hover:bg-muted/50 transition-colors cursor-pointer"
                >
                  <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">
                    Drop files here or click to browse
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    PDF, DOCX, TXT, MD (Max 50MB)
                  </p>
                </div>
              </div>

              {/* URL Ingestion */}
              <div className="space-y-2">
                <Label>Ingest URLs</Label>
                <div className="flex gap-2">
                  <Input 
                    placeholder="https://example.com/docs" 
                    value={urlInput}
                    onChange={(e) => setUrlInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleAddUrl()}
                  />
                  <Button variant="outline" onClick={handleAddUrl} disabled={isAddingUrl}>
                    <Link2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {/* Cloud Drives */}
              <div className="space-y-2">
                <Label>Connect Cloud Drives</Label>
                <div className="grid gap-2">
                  <Button variant="outline" className="justify-start">
                    <Database className="h-4 w-4 mr-2" />
                    Connect Notion
                  </Button>
                  <Button variant="outline" className="justify-start">
                    <Database className="h-4 w-4 mr-2" />
                    Connect Google Drive
                  </Button>
                  <Button variant="outline" className="justify-start">
                    <Database className="h-4 w-4 mr-2" />
                    Connect Confluence
                  </Button>
                </div>
              </div>

              {/* RAG Settings */}
              <div className="p-4 bg-muted/50 rounded-lg space-y-3">
                <h4 className="text-sm font-medium">RAG Quality Score</h4>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Retrieval Accuracy</span>
                  <Badge variant="secondary">85%</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Sources Indexed</span>
                  <Badge variant="secondary">0 documents</Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* BEHAVIOR TAB */}
        <TabsContent value="behavior" className="space-y-4 mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <MessageSquare className="h-4 w-4" />
                System Behavior
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* System Prompt */}
              <div className="space-y-2">
                <Label>System Prompt</Label>
                <Textarea
                  placeholder="You are a helpful AI assistant specialized in..."
                  value={systemPrompt}
                  onChange={(e) => handleSystemPromptChange(e.target.value)}
                  onBlur={handleSystemPromptBlur}
                  rows={6}
                  className="resize-none font-mono text-sm"
                />
                <p className="text-xs text-muted-foreground">
                  Define how your agent behaves, its role, personality, and constraints.
                  {currentBlueprint && ' (Pre-filled from template)'}
                </p>
              </div>

              {/* Persona Templates */}
              <div className="space-y-2">
                <Label>Persona Template</Label>
                <Select value={persona} onValueChange={setPersona}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="professional">Professional Assistant</SelectItem>
                    <SelectItem value="friendly">Friendly & Casual</SelectItem>
                    <SelectItem value="technical">Technical Expert</SelectItem>
                    <SelectItem value="concise">Concise & Direct</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Tone & Style */}
              <div className="space-y-2">
                <Label>Communication Style</Label>
                <div className="grid gap-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Formal Tone</span>
                    <Switch checked={formalTone} onCheckedChange={setFormalTone} />
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Use Emojis</span>
                    <Switch checked={useEmojis} onCheckedChange={setUseEmojis} />
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Detailed Explanations</span>
                    <Switch checked={detailedExplanations} onCheckedChange={setDetailedExplanations} />
                  </div>
                </div>
              </div>

              {/* Safety Constraints */}
              <div className="space-y-2">
                <Label>Safety & Restrictions</Label>
                <div className="grid gap-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Hallucination Prevention</span>
                    <Switch 
                      checked={hallucinationPrevention} 
                      onCheckedChange={(v) => handleSafetyToggle('hallucination', v)} 
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Knowledge-Based Restrictions</span>
                    <Switch 
                      checked={knowledgeRestrictions} 
                      onCheckedChange={(v) => handleSafetyToggle('knowledge', v)} 
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Require Citations</span>
                    <Switch 
                      checked={requireCitations} 
                      onCheckedChange={(v) => handleSafetyToggle('citations', v)} 
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ADVANCED TAB */}
        <TabsContent value="advanced" className="space-y-4 mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Settings className="h-4 w-4" />
                Advanced Settings
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Temperature */}
              <div className="space-y-3">
                <div className="flex justify-between">
                  <Label>Temperature</Label>
                  <span className="text-sm text-muted-foreground">{temperature[0]}</span>
                </div>
                <Slider
                  value={temperature}
                  onValueChange={setTemperature}
                  min={0}
                  max={2}
                  step={0.1}
                  className="w-full"
                />
                <p className="text-xs text-muted-foreground">
                  Lower = more focused, Higher = more creative
                </p>
              </div>

              {/* Top-K and Top-P */}
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Top-K</Label>
                  <Input 
                    type="number" 
                    value={topK} 
                    onChange={(e) => setTopK(Number(e.target.value))} 
                  />
                </div>
                <div className="space-y-2">
                  <Label>Top-P</Label>
                  <Input 
                    type="number" 
                    value={topP} 
                    onChange={(e) => setTopP(Number(e.target.value))} 
                    step="0.01" 
                  />
                </div>
              </div>

              {/* Memory Settings */}
              <div className="space-y-2">
                <Label>Memory Settings</Label>
                <Select value={memoryType} onValueChange={(v) => setMemoryType(v as any)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No Memory</SelectItem>
                    <SelectItem value="short">Short-term (Session)</SelectItem>
                    <SelectItem value="long">Long-term (Persistent)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Context Window Override */}
              <div className="space-y-2">
                <Label>Context Window Override</Label>
                <Input type="number" placeholder="128000" />
                <p className="text-xs text-muted-foreground">
                  Leave empty to use model default
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Co-Pilot Integration */}
      <Card className="bg-muted/50">
        <CardContent className="pt-4">
          <div className="flex items-center gap-2 mb-2">
            <Sparkles className="h-4 w-4 text-primary" />
            <span className="text-sm font-medium">Ask Co-Pilot:</span>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button 
              variant="ghost" 
              size="sm" 
              className="text-xs"
              onClick={() => openWithQuestion('What models are configured for this agent and what are their capabilities?')}
            >
              Explain models
            </Button>
            <Button 
              variant="ghost" 
              size="sm" 
              className="text-xs"
              onClick={() => openWithQuestion("What's the difference between Supervisor Agent and Deep Research Agent?")}
            >
              Compare agent modes
            </Button>
            <Button 
              variant="ghost" 
              size="sm" 
              className="text-xs"
              onClick={() => openWithQuestion('Generate an optimal system prompt for this agent based on its industry and use case.')}
            >
              Generate system prompt
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
    
    {/* Unified Upload Wizard Modal */}
    <ModernFileUploadWizard 
      open={showUploadWizard} 
      onOpenChange={setShowUploadWizard}
      source="builder"
      agentId={builderId || 'draft'}
      onAnalysisComplete={(result) => {
        console.log('[Builder:Step2] Document analysis complete:', result);
        toast.success('Document added to knowledge base');
      }}
    />
    </>
  );
}