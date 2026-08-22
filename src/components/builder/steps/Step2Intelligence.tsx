import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Activity,
  BookOpen,
  Brain,
  Cpu,
  Database,
  Search,
  Settings,
  Shield,
  Sparkles,
  Thermometer,
  Upload,
  Users,
  Zap,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { useWizardBuilderStore } from '@/stores/wizardBuilderStore';
import { useBlueprintStore } from '@/stores/blueprintStore';
import { ModernFileUploadWizard } from '@/components/dashboard/ModernFileUploadWizard';
import { toast } from 'sonner';
import { DCCard, DCSectionHeader } from '@/components/dc-ui';
import { BuilderToolsPanel } from '@/components/dc-tools';
import { SovereigntyConfigSection } from '@/components/builder/SovereigntyConfigSection';
import { CarbonFinancialConfigSection } from '@/components/builder/CarbonFinancialConfigSection';
import {
  AURA_INTELLIGENCE_PROFILES,
  intelligenceProfileById,
  intelligenceProfileForModel,
} from '@/config/auraRuntimeCatalog';

interface DcThresholds {
  gpuUtilizationPct: number;
  cpuThermalC: number;
  gpuThermalC: number;
  pueDrift: number;
  carbonIntensity: number;
}

const DEFAULT_THRESHOLDS: DcThresholds = {
  gpuUtilizationPct: 85,
  cpuThermalC: 75,
  gpuThermalC: 80,
  pueDrift: 0.1,
  carbonIntensity: 400,
};

const DEFAULT_SUBSYSTEMS: Record<string, boolean> = {
  thermal: true,
  power: true,
  gpu: true,
  sovereignty: false,
};

export function Step2Intelligence() {
  const { modelConfig, setModelConfig, builderId } = useWizardBuilderStore();
  const { currentBlueprint, updateBlueprint } = useBlueprintStore();

  const policies = modelConfig?.policies ?? {};
  const selectedProfile = useMemo(() => {
    const explicit = typeof policies.intelligenceProfile === 'string'
      ? intelligenceProfileById(policies.intelligenceProfile)
      : null;
    return explicit ?? intelligenceProfileForModel(modelConfig?.model);
  }, [modelConfig?.model, policies.intelligenceProfile]);

  const [supervisorEnabled, setSupervisorEnabled] = useState(Boolean(policies.supervisorEnabled));
  const [deepResearchEnabled, setDeepResearchEnabled] = useState(Boolean(policies.deepResearchEnabled));
  const [systemPrompt, setSystemPrompt] = useState(currentBlueprint?.behavior?.systemPrompt ?? '');
  const [hallucinationPrevention, setHallucinationPrevention] = useState(
    typeof policies.hallucinationPrevention === 'boolean' ? policies.hallucinationPrevention : true,
  );
  const [knowledgeRestrictions, setKnowledgeRestrictions] = useState(
    typeof policies.knowledgeRestrictions === 'boolean' ? policies.knowledgeRestrictions : true,
  );
  const [requireCitations, setRequireCitations] = useState(
    typeof policies.requireCitations === 'boolean' ? policies.requireCitations : false,
  );
  const [temperature, setTemperature] = useState<number[]>([
    typeof modelConfig?.rag?.temperature === 'number' ? modelConfig.rag.temperature : 0.3,
  ]);
  const [enabledSubsystems, setEnabledSubsystems] = useState<Record<string, boolean>>(
    (policies.monitoredSubsystems as Record<string, boolean> | undefined) ?? DEFAULT_SUBSYSTEMS,
  );
  const [thresholds, setThresholds] = useState<DcThresholds>(
    (policies.dcThresholds as DcThresholds | undefined) ?? DEFAULT_THRESHOLDS,
  );
  const [showUploadWizard, setShowUploadWizard] = useState(false);

  useEffect(() => {
    if (currentBlueprint?.behavior?.systemPrompt !== undefined) {
      setSystemPrompt(currentBlueprint.behavior.systemPrompt ?? '');
    }
  }, [currentBlueprint?.behavior?.systemPrompt]);

  useEffect(() => {
    setSupervisorEnabled(Boolean(policies.supervisorEnabled));
    setDeepResearchEnabled(Boolean(policies.deepResearchEnabled));
    if (typeof policies.hallucinationPrevention === 'boolean') {
      setHallucinationPrevention(policies.hallucinationPrevention);
    }
    if (typeof policies.knowledgeRestrictions === 'boolean') {
      setKnowledgeRestrictions(policies.knowledgeRestrictions);
    }
    if (typeof policies.requireCitations === 'boolean') {
      setRequireCitations(policies.requireCitations);
    }
    if (policies.monitoredSubsystems) {
      setEnabledSubsystems(policies.monitoredSubsystems as Record<string, boolean>);
    }
    if (policies.dcThresholds) {
      setThresholds(policies.dcThresholds as DcThresholds);
    }
  }, [policies]);

  const saveConfig = useCallback(async (updates: Record<string, unknown>) => {
    const policyUpdates = (updates.policies as Record<string, unknown> | undefined) ?? {};
    const ragUpdates = (updates.rag as Record<string, unknown> | undefined) ?? {};

    await setModelConfig({
      ...modelConfig,
      ...updates,
      rag: { ...modelConfig?.rag, ...ragUpdates },
      policies: { ...modelConfig?.policies, ...policyUpdates },
    });
  }, [modelConfig, setModelConfig]);

  const handleProfileChange = async (profileId: string) => {
    const profile = intelligenceProfileById(profileId);
    await saveConfig({
      provider: profile.runtimeProvider,
      model: profile.runtimeModel,
      policies: {
        intelligenceProfile: profile.id,
        deepResearchEnabled: profile.supportsResearch ? true : deepResearchEnabled,
      },
    });
    if (profile.supportsResearch) setDeepResearchEnabled(true);
    toast.success(`AURA Intelligence profile set to ${profile.name}`);
  };

  const handleSupervisorToggle = async (enabled: boolean) => {
    setSupervisorEnabled(enabled);
    if (currentBlueprint) {
      updateBlueprint({ model: { ...currentBlueprint.model, supervisorEnabled: enabled } });
    }
    await saveConfig({ policies: { supervisorEnabled: enabled } });
  };

  const handleResearchToggle = async (enabled: boolean) => {
    setDeepResearchEnabled(enabled);
    if (currentBlueprint) {
      updateBlueprint({ model: { ...currentBlueprint.model, deepResearchEnabled: enabled } });
    }
    await saveConfig({ policies: { deepResearchEnabled: enabled } });
  };

  const handleSystemPromptBlur = async () => {
    if (currentBlueprint) {
      updateBlueprint({ behavior: { ...currentBlueprint.behavior, systemPrompt } });
    }
    await saveConfig({ systemPrompt });
  };

  const updateSafety = async (
    key: 'hallucinationPrevention' | 'knowledgeRestrictions' | 'requireCitations',
    value: boolean,
  ) => {
    if (key === 'hallucinationPrevention') setHallucinationPrevention(value);
    if (key === 'knowledgeRestrictions') setKnowledgeRestrictions(value);
    if (key === 'requireCitations') setRequireCitations(value);
    await saveConfig({ policies: { [key]: value } });
  };

  const toggleSubsystem = async (id: string) => {
    const next = { ...enabledSubsystems, [id]: !enabledSubsystems[id] };
    setEnabledSubsystems(next);
    await saveConfig({ policies: { monitoredSubsystems: next } });
  };

  const updateThreshold = async <K extends keyof DcThresholds>(key: K, value: DcThresholds[K]) => {
    const next = { ...thresholds, [key]: value };
    setThresholds(next);
    await saveConfig({ policies: { dcThresholds: next } });
  };

  const dcSubsystems = [
    { id: 'thermal', label: 'Thermal Management', icon: Thermometer },
    { id: 'power', label: 'Power & PUE', icon: Zap },
    { id: 'gpu', label: 'GPU Workloads', icon: Cpu },
    { id: 'sovereignty', label: 'Sovereignty Compliance', icon: Shield },
  ];

  return (
    <>
      <div className="mx-auto max-w-[920px] space-y-6">
        <DCSectionHeader
          title="AURA Intelligence"
          subtitle="Choose the operational intelligence profile, knowledge policy and data-centre guardrails."
          icon={<Brain className="h-5 w-5" />}
        />

        <DCCard
          title="Intelligence Profile"
          subtitle="AURA selects and manages the approved underlying runtime for the job."
          icon={<Sparkles className="h-4 w-4" />}
        >
          <div className="grid gap-3 md:grid-cols-2">
            {AURA_INTELLIGENCE_PROFILES.map((profile) => {
              const active = selectedProfile.id === profile.id;
              return (
                <button
                  key={profile.id}
                  type="button"
                  onClick={() => void handleProfileChange(profile.id)}
                  className={`min-h-32 rounded-lg border p-4 text-left transition-colors ${
                    active ? 'border-primary bg-primary/10' : 'border-border bg-muted/30 hover:border-primary/40'
                  }`}
                  aria-pressed={active}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold">{profile.name}</p>
                      <p className="mt-1 text-xs text-muted-foreground">{profile.description}</p>
                    </div>
                    {active && <Badge variant="outline">Active</Badge>}
                  </div>
                  <p className="mt-3 text-xs text-muted-foreground">
                    <span className="font-medium text-foreground">Best for:</span> {profile.bestFor}
                  </p>
                </button>
              );
            })}
          </div>
          <div className="mt-4 rounded-md border border-border bg-muted/30 p-3 text-xs text-muted-foreground">
            Runtime providers and model versions are managed behind the AURA policy boundary and can change without changing your agent contract.
          </div>
        </DCCard>

        <DCCard
          title="Agent Modes"
          subtitle="Enable higher-level orchestration only when the workflow requires it."
          icon={<Users className="h-4 w-4" />}
        >
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-4 rounded-lg border border-border p-3">
              <div>
                <p className="text-sm font-medium">Supervisor Orchestration</p>
                <p className="text-xs text-muted-foreground">Coordinates multiple approved tools or sub-agents for multi-step operations.</p>
              </div>
              <Switch checked={supervisorEnabled} onCheckedChange={(value) => void handleSupervisorToggle(value)} />
            </div>
            <div className="flex items-center justify-between gap-4 rounded-lg border border-border p-3">
              <div>
                <p className="text-sm font-medium">Research Mode</p>
                <p className="text-xs text-muted-foreground">Enables evidence-oriented synthesis across approved research sources.</p>
              </div>
              <Switch checked={deepResearchEnabled} onCheckedChange={(value) => void handleResearchToggle(value)} />
            </div>
          </div>
        </DCCard>

        <DCCard
          title="Knowledge"
          subtitle="Attach governed knowledge without exposing connector or infrastructure vendors."
          icon={<BookOpen className="h-4 w-4" />}
        >
          <div className="grid gap-4 md:grid-cols-2">
            <button
              type="button"
              onClick={() => setShowUploadWizard(true)}
              className="rounded-lg border border-dashed border-border p-5 text-left hover:bg-muted/40"
            >
              <Upload className="mb-3 h-5 w-5 text-muted-foreground" aria-hidden />
              <p className="text-sm font-medium">Upload approved documents</p>
              <p className="mt-1 text-xs text-muted-foreground">Runbooks, specifications, standards and operational documentation.</p>
            </button>
            <div className="rounded-lg border border-border p-5">
              <Search className="mb-3 h-5 w-5 text-muted-foreground" aria-hidden />
              <p className="text-sm font-medium">Managed knowledge sources</p>
              <p className="mt-1 text-xs text-muted-foreground">Add approved web, enterprise-file and research sources through AURA Connections.</p>
              <Button variant="outline" size="sm" className="mt-4" asChild>
                <Link to="/manage/integrations?tab=catalogue">Manage knowledge sources</Link>
              </Button>
            </div>
          </div>
        </DCCard>

        <DCCard
          title="Behavior & Evidence Policy"
          subtitle="Define how the agent behaves and what evidence is required."
          icon={<Shield className="h-4 w-4" />}
        >
          <div className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="aura-system-prompt">System instructions</Label>
              <Textarea
                id="aura-system-prompt"
                rows={6}
                value={systemPrompt}
                onChange={(event) => setSystemPrompt(event.target.value)}
                onBlur={() => void handleSystemPromptBlur()}
                placeholder="Define operational role, allowed actions, evidence requirements and escalation rules…"
                className="resize-none font-mono text-sm"
              />
            </div>
            <div className="grid gap-3">
              <PolicyToggle
                label="Verified knowledge only"
                description="Constrain responses to approved knowledge and runtime evidence when the workflow requires it."
                checked={knowledgeRestrictions}
                onChange={(value) => void updateSafety('knowledgeRestrictions', value)}
              />
              <PolicyToggle
                label="Hallucination prevention"
                description="Prefer abstention or escalation when required evidence is unavailable."
                checked={hallucinationPrevention}
                onChange={(value) => void updateSafety('hallucinationPrevention', value)}
              />
              <PolicyToggle
                label="Require citations"
                description="Require source attribution in generated findings and recommendations."
                checked={requireCitations}
                onChange={(value) => void updateSafety('requireCitations', value)}
              />
            </div>
            <div className="space-y-3 border-t border-border pt-4">
              <div className="flex items-center justify-between">
                <Label>Response variability</Label>
                <span className="font-mono text-xs">{temperature[0].toFixed(1)}</span>
              </div>
              <Slider
                value={temperature}
                min={0}
                max={1}
                step={0.1}
                onValueChange={setTemperature}
                onValueCommit={(value) => void saveConfig({ rag: { temperature: value[0] } })}
              />
              <p className="text-xs text-muted-foreground">Lower values are recommended for operational and compliance workflows.</p>
            </div>
          </div>
        </DCCard>

        <DCCard
          title="Monitored Subsystems"
          subtitle="Choose which data-centre domains this intelligence can monitor."
          icon={<Activity className="h-4 w-4" />}
        >
          <div className="grid gap-3 sm:grid-cols-2">
            {dcSubsystems.map((subsystem) => {
              const Icon = subsystem.icon;
              const enabled = Boolean(enabledSubsystems[subsystem.id]);
              return (
                <button
                  key={subsystem.id}
                  type="button"
                  onClick={() => void toggleSubsystem(subsystem.id)}
                  aria-pressed={enabled}
                  className={`flex min-h-14 items-center gap-3 rounded-lg border p-3 text-left ${
                    enabled ? 'border-primary bg-primary/10' : 'border-border bg-muted/30'
                  }`}
                >
                  <Icon className="h-4 w-4" aria-hidden />
                  <span className="text-sm font-medium">{subsystem.label}</span>
                  <Badge variant="outline" className="ml-auto">{enabled ? 'On' : 'Off'}</Badge>
                </button>
              );
            })}
          </div>
        </DCCard>

        <DCCard
          title="Data Centre Guardrails"
          subtitle="Operational thresholds are stored as policy, not model-vendor configuration."
          icon={<Activity className="h-4 w-4" />}
        >
          <div className="space-y-6">
            <ThresholdControl label="GPU utilization alert" value={`${thresholds.gpuUtilizationPct}%`} min={0} max={100} step={5} numeric={thresholds.gpuUtilizationPct} onCommit={(value) => void updateThreshold('gpuUtilizationPct', value)} />
            <ThresholdControl label="CPU thermal limit" value={`${thresholds.cpuThermalC}°C`} min={50} max={100} step={5} numeric={thresholds.cpuThermalC} onCommit={(value) => void updateThreshold('cpuThermalC', value)} />
            <ThresholdControl label="GPU thermal limit" value={`${thresholds.gpuThermalC}°C`} min={60} max={100} step={5} numeric={thresholds.gpuThermalC} onCommit={(value) => void updateThreshold('gpuThermalC', value)} />
            <ThresholdControl label="PUE drift alert" value={thresholds.pueDrift.toFixed(2)} min={0.01} max={0.5} step={0.01} numeric={thresholds.pueDrift} onCommit={(value) => void updateThreshold('pueDrift', value)} />
            <ThresholdControl label="Carbon intensity alert" value={`${thresholds.carbonIntensity} gCO₂e/kWh`} min={100} max={800} step={50} numeric={thresholds.carbonIntensity} onCommit={(value) => void updateThreshold('carbonIntensity', value)} />
          </div>
        </DCCard>

        <SovereigntyConfigSection
          onConfigChange={(config) => {
            void saveConfig({ policies: { sovereignty: config } });
          }}
        />

        <CarbonFinancialConfigSection
          onConfigChange={(config) => {
            void saveConfig({ policies: { carbonFinancial: config } });
          }}
        />

        <div>
          <DCSectionHeader
            title="Recommended Capabilities"
            subtitle="Capabilities available from your approved AURA connections and runtime policy."
            icon={<Settings className="h-5 w-5" />}
          />
          <div className="mt-4">
            <BuilderToolsPanel />
          </div>
        </div>

        <div className="rounded-lg border border-border bg-muted/30 p-4 text-sm text-muted-foreground">
          <div className="flex items-start gap-3">
            <Database className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
            <p>
              Connection credentials, provider tokens and runtime implementation details remain behind the AURA control-plane boundary and are not exposed in this Builder.
            </p>
          </div>
        </div>
      </div>

      <ModernFileUploadWizard
        open={showUploadWizard}
        onOpenChange={setShowUploadWizard}
        agentId={builderId}
      />
    </>
  );
}

function PolicyToggle({
  label,
  description,
  checked,
  onChange,
}: {
  label: string;
  description: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-lg border border-border p-3">
      <div>
        <p className="text-sm font-medium">{label}</p>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
      <Switch checked={checked} onCheckedChange={onChange} />
    </div>
  );
}

function ThresholdControl({
  label,
  value,
  min,
  max,
  step,
  numeric,
  onCommit,
}: {
  label: string;
  value: string;
  min: number;
  max: number;
  step: number;
  numeric: number;
  onCommit: (value: number) => void;
}) {
  const [draft, setDraft] = useState([numeric]);

  useEffect(() => setDraft([numeric]), [numeric]);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-4">
        <Label>{label}</Label>
        <span className="font-mono text-xs">{value}</span>
      </div>
      <Slider
        value={draft}
        min={min}
        max={max}
        step={step}
        onValueChange={setDraft}
        onValueCommit={(next) => onCommit(next[0])}
      />
    </div>
  );
}
