import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Brain, Database, Save, Settings, ShieldCheck } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { DCCard, DCSectionHeader } from '@/components/dc-ui';
import { KnowledgeSourceReadiness } from '@/components/agent/KnowledgeSourceReadiness';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import {
  AURA_INTELLIGENCE_PROFILES,
  intelligenceProfileById,
  type AuraIntelligenceProfileId,
} from '@/config/auraRuntimeCatalog';

const STORAGE_KEY = 'copilot_settings';
const DEFAULT_SYSTEM_PROMPT = `You are the AURA Co-Pilot inside an enterprise control center.
Be concise and business-ready.
Ground material claims in supplied evidence and cite sources when grounding is available.
Distinguish measured facts, reference data, simulations and recommendations.
If evidence is missing, say so.
Never expose secrets or claim to actuate infrastructure.`;

interface BrowserAiPreferences {
  modelProfile: AuraIntelligenceProfileId;
  groundingEnabled: boolean;
  topK: number;
  topN: number;
  maxTokens: number;
  temperature: number;
  systemPrompt: string;
}

function profileFromLegacyValue(value: unknown): AuraIntelligenceProfileId {
  if (typeof value !== 'string') return 'balanced';
  if (value.startsWith('profile:')) {
    const id = value.slice('profile:'.length);
    if (AURA_INTELLIGENCE_PROFILES.some((profile) => profile.id === id)) {
      return id as AuraIntelligenceProfileId;
    }
  }
  const normalized = value.toLowerCase();
  if (normalized.includes('flash-lite')) return 'fast';
  if (normalized.includes('pro')) return 'reasoning';
  return 'balanced';
}

export default function AISettings() {
  const { t } = useTranslation();
  const [profileId, setProfileId] = useState<AuraIntelligenceProfileId>('balanced');
  const [groundingEnabled, setGroundingEnabled] = useState(true);
  const [topK, setTopK] = useState(20);
  const [topN, setTopN] = useState(6);
  const [maxTokens, setMaxTokens] = useState(2048);
  const [temperature, setTemperature] = useState(0.3);
  const [systemPrompt, setSystemPrompt] = useState(DEFAULT_SYSTEM_PROMPT);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (!stored) return;
      const settings = JSON.parse(stored) as Partial<BrowserAiPreferences> & { model?: unknown };
      setProfileId(
        settings.modelProfile && AURA_INTELLIGENCE_PROFILES.some((profile) => profile.id === settings.modelProfile)
          ? settings.modelProfile
          : profileFromLegacyValue(settings.model),
      );
      if (typeof settings.groundingEnabled === 'boolean') setGroundingEnabled(settings.groundingEnabled);
      if (typeof settings.topK === 'number') setTopK(settings.topK);
      if (typeof settings.topN === 'number') setTopN(settings.topN);
      if (typeof settings.maxTokens === 'number') setMaxTokens(settings.maxTokens);
      if (typeof settings.temperature === 'number') setTemperature(settings.temperature);
      if (typeof settings.systemPrompt === 'string' && settings.systemPrompt.trim()) setSystemPrompt(settings.systemPrompt);
    } catch {
      localStorage.removeItem(STORAGE_KEY);
      toast.error('Stored AI preferences were unreadable and have been reset.');
    }
  }, []);

  const profile = intelligenceProfileById(profileId);

  async function handleSave() {
    if (isSaving) return;
    setIsSaving(true);
    try {
      const preferences: BrowserAiPreferences & { model: string } = {
        modelProfile: profileId,
        // Compatibility alias only. Server routing must resolve this profile;
        // customer preferences never persist a provider/model identifier.
        model: `profile:${profileId}`,
        groundingEnabled,
        topK,
        topN,
        maxTokens,
        temperature,
        systemPrompt,
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(preferences));
      toast.success('AURA AI preferences saved in this browser.');
    } catch {
      toast.error('Could not save AURA AI preferences.');
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="w-full min-w-0 space-y-8 py-8" data-testid="ai-settings-workspace">
      <DCSectionHeader
        as="h1"
        title={t('aiSettings.title', 'AI Settings')}
        subtitle="Configure AURA intelligence behavior without exposing infrastructure providers or credentials."
        icon={<Settings className="h-5 w-5 text-primary" />}
      />

      <div role="note" className="rounded-md border border-border bg-muted/30 p-4 text-sm text-muted-foreground">
        These are user-level browser preferences only. Runtime providers, credentials, tenancy, approved connectors and deployment health are controlled server-side. Selecting a profile does not prove that a runtime is connected or available.
      </div>

      <DCCard title="AURA Intelligence" icon={<Brain className="h-5 w-5 text-primary" />}>
        <div className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="aura-intelligence-profile">Intelligence profile</Label>
            <Select value={profileId} onValueChange={(value) => setProfileId(value as AuraIntelligenceProfileId)}>
              <SelectTrigger id="aura-intelligence-profile" aria-label="AURA Intelligence profile">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {AURA_INTELLIGENCE_PROFILES.map((option) => (
                  <SelectItem key={option.id} value={option.id}>{option.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="rounded-md border border-border bg-muted/20 p-3">
              <p className="text-sm font-medium">{profile.name}</p>
              <p className="mt-1 text-sm text-muted-foreground">{profile.description}</p>
              <p className="mt-2 text-xs text-muted-foreground">Best for: {profile.bestFor}</p>
            </div>
          </div>
        </div>
      </DCCard>

      <DCCard title="Grounding policy" icon={<Database className="h-5 w-5 text-primary" />}>
        <div className="space-y-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <Label htmlFor="grounding-toggle">Use approved knowledge sources</Label>
              <p className="mt-1 text-sm text-muted-foreground">
                Prefer evidence from sources already approved and connected through AURA. This preference does not create, authorize or configure a connector.
              </p>
            </div>
            <Switch id="grounding-toggle" checked={groundingEnabled} onCheckedChange={setGroundingEnabled} />
          </div>

          {groundingEnabled && (
            <div className="grid gap-5 md:grid-cols-2">
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-3">
                  <Label>Candidate evidence</Label>
                  <span className="font-mono text-sm text-muted-foreground">{topK}</span>
                </div>
                <Slider value={[topK]} onValueChange={([value]) => setTopK(value)} min={5} max={50} step={5} aria-label="Candidate evidence count" />
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-3">
                  <Label>Evidence used in answer</Label>
                  <span className="font-mono text-sm text-muted-foreground">{topN}</span>
                </div>
                <Slider value={[topN]} onValueChange={([value]) => setTopN(value)} min={1} max={10} step={1} aria-label="Evidence used in answer" />
              </div>
            </div>
          )}

          <KnowledgeSourceReadiness />
          <Button variant="outline" asChild>
            <Link to="/manage/integrations">Manage approved connections</Link>
          </Button>
        </div>
      </DCCard>

      <DCCard title="Response policy" icon={<ShieldCheck className="h-5 w-5 text-primary" />}>
        <div className="space-y-6">
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-3">
              <Label>Maximum response tokens</Label>
              <span className="font-mono text-sm text-muted-foreground">{maxTokens}</span>
            </div>
            <Slider value={[maxTokens]} onValueChange={([value]) => setMaxTokens(value)} min={256} max={8192} step={256} aria-label="Maximum response tokens" />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between gap-3">
              <Label>Response variability</Label>
              <span className="font-mono text-sm text-muted-foreground">{temperature.toFixed(1)}</span>
            </div>
            <Slider value={[temperature * 10]} onValueChange={([value]) => setTemperature(value / 10)} min={0} max={10} step={1} aria-label="Response variability" />
            <p className="text-xs text-muted-foreground">Lower values favor repeatability; higher values permit more variation.</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="aura-system-prompt">Operator guidance</Label>
            <Textarea id="aura-system-prompt" value={systemPrompt} onChange={(event) => setSystemPrompt(event.target.value)} rows={8} className="font-mono text-sm" />
          </div>
        </div>
      </DCCard>

      <div className="flex flex-wrap items-center gap-3">
        <Button size="lg" onClick={() => void handleSave()} disabled={isSaving}>
          <Save className="mr-2 h-4 w-4" aria-hidden />
          {isSaving ? 'Saving…' : 'Save preferences'}
        </Button>
        <p className="text-xs text-muted-foreground">
          Runtime readiness remains evidence-derived in Connections and Platform Readiness.
        </p>
      </div>
    </div>
  );
}
