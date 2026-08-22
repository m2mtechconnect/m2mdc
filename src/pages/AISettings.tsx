import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, Brain, Database, Loader2, Settings, ShieldCheck, Zap } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { DCCard, DCSectionHeader } from '@/components/dc-ui';
import { KnowledgeSourceReadiness } from '@/components/agent/KnowledgeSourceReadiness';
import { useRBAC } from '@/contexts/RBACContext';

const DEFAULT_SYSTEM_PROMPT = `You are the AURA Co-Pilot inside an enterprise control center.
Be concise and business-ready.
Ground material claims in supplied evidence and cite sources when grounding is available.
Distinguish measured facts, reference data, simulations and recommendations.
If evidence is missing, say so.
Never expose secrets or claim to actuate infrastructure.`;

type ModelProfile = 'fast' | 'reasoning' | 'supervisor';

interface ProviderStatus {
  active_provider?: string;
  ready?: boolean;
  primary?: {
    models?: Record<string, { available?: boolean; provider?: string; model?: string; reason?: string }>;
  };
  disclosure?: {
    agent_authority?: string;
    nvidia_runtime?: string;
    secrets_returned?: boolean;
  };
}

function unwrapFunctionData<T>(value: unknown): T | null {
  if (!value || typeof value !== 'object') return null;
  const record = value as Record<string, unknown>;
  if (record.data && typeof record.data === 'object') return record.data as T;
  return value as T;
}

function legacyModelToProfile(value: unknown): ModelProfile {
  const model = typeof value === 'string' ? value.toLowerCase() : '';
  if (model.includes('flash')) return 'fast';
  if (model.includes('supervisor') || model.includes('nemotron-3-super')) return 'supervisor';
  return 'reasoning';
}

export default function AISettings() {
  const { t } = useTranslation();
  const { can } = useRBAC();
  const [profile, setProfile] = useState<ModelProfile>('reasoning');
  const [groundingEnabled, setGroundingEnabled] = useState(false);
  const [projectId, setProjectId] = useState('');
  const [region, setRegion] = useState('northamerica-northeast1');
  const [dataStoreId, setDataStoreId] = useState('');
  const [topK, setTopK] = useState(20);
  const [topN, setTopN] = useState(6);
  const [maxTokens, setMaxTokens] = useState(2048);
  const [temperature, setTemperature] = useState(0.3);
  const [systemPrompt, setSystemPrompt] = useState(DEFAULT_SYSTEM_PROMPT);
  const [providerStatus, setProviderStatus] = useState<ProviderStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isChecking, setIsChecking] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const stored = localStorage.getItem('copilot_settings');
        if (stored) {
          const settings = JSON.parse(stored) as Record<string, unknown>;
          const storedProfile = settings.modelProfile;
          setProfile(
            storedProfile === 'fast' || storedProfile === 'reasoning' || storedProfile === 'supervisor'
              ? storedProfile
              : legacyModelToProfile(settings.model),
          );
          if (typeof settings.groundingEnabled === 'boolean') setGroundingEnabled(settings.groundingEnabled);
          if (typeof settings.projectId === 'string') setProjectId(settings.projectId);
          if (typeof settings.region === 'string') setRegion(settings.region);
          if (typeof settings.dataStoreId === 'string') setDataStoreId(settings.dataStoreId);
          if (typeof settings.topK === 'number') setTopK(settings.topK);
          if (typeof settings.topN === 'number') setTopN(settings.topN);
          if (typeof settings.maxTokens === 'number') setMaxTokens(settings.maxTokens);
          if (typeof settings.temperature === 'number') setTemperature(settings.temperature);
          if (typeof settings.systemPrompt === 'string') setSystemPrompt(settings.systemPrompt);
        }
      } catch {
        localStorage.removeItem('copilot_settings');
        setLoadError('Stored browser configuration was unreadable and has been reset.');
      }

      try {
        const { data, error } = await supabase.functions.invoke('ai-config', { body: {} });
        if (error) throw error;
        if (!cancelled) setProviderStatus(unwrapFunctionData<ProviderStatus>(data));
      } catch {
        if (!cancelled) setProviderStatus(null);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };
    void load();
    return () => { cancelled = true; };
  }, []);

  const handleSave = async () => {
    if (isSaving) return;
    if (groundingEnabled && (!projectId.trim() || !dataStoreId.trim())) {
      toast.error('Google/Vertex grounding metadata requires both Project ID and Data Store ID.');
      return;
    }
    setIsSaving(true);
    try {
      localStorage.setItem('copilot_settings', JSON.stringify({
        modelProfile: profile,
        // Compatibility field for legacy readers. A profile alias is portable
        // and does not pretend one vendor model is active.
        model: `profile:${profile}`,
        groundingEnabled,
        projectId,
        region,
        dataStoreId,
        topK,
        topN,
        maxTokens,
        temperature,
        systemPrompt,
      }));
      toast.success('Browser AI preferences saved. Provider secrets and server routing were not changed.');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to save browser AI preferences.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleHealthCheck = async () => {
    if (!can('ai.model.test')) {
      toast.error('Model-test permission is required.');
      return;
    }
    setIsChecking(true);
    try {
      const { data, error } = await supabase.functions.invoke('models-test', {
        body: { modelId: `profile:${profile}`, targetRegion: region },
      });
      if (error) throw error;
      const result = unwrapFunctionData<{ provider?: string; model?: string; model_profile?: string; latency?: number }>(data);
      toast.success(
        `${result?.provider ?? 'Provider'} / ${result?.model ?? profile} responded in ${result?.latency ?? '?'} ms.`,
      );
      const { data: refresh } = await supabase.functions.invoke('ai-config', { body: {} });
      setProviderStatus(unwrapFunctionData<ProviderStatus>(refresh));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Runtime model test failed.');
    } finally {
      setIsChecking(false);
    }
  };

  if (isLoading) {
    return (
      <main className="flex min-h-[60vh] items-center justify-center" role="status" aria-busy="true">
        <Loader2 className="h-8 w-8 animate-spin text-primary" aria-hidden="true" />
        <span className="sr-only">Loading AI configuration</span>
      </main>
    );
  }

  const profileStatus = providerStatus?.primary?.models?.[profile];

  return (
    <div className="w-full min-w-0 space-y-8 py-8" data-testid="ai-settings-workspace">
      <DCSectionHeader
        as="h1"
        title={t('aiSettings.title')}
        subtitle="Provider-neutral model profiles, runtime readiness and optional grounding preferences"
        icon={<Settings className="h-5 w-5 text-primary" />}
      />

      <div role="note" className="rounded-md border border-border bg-muted/30 p-3 text-xs text-muted-foreground">
        Browser preferences do not configure provider credentials. Server-side model routing is owned by the AURA provider router. NVIDIA model availability is not proof of NIM, NeMo or self-hosted runtime execution.
      </div>

      {loadError && (
        <div role="alert" className="flex items-start gap-2 rounded-md border border-destructive/40 bg-destructive/5 p-3 text-sm text-destructive">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          <span>{loadError}</span>
        </div>
      )}

      <DCCard title="Active AURA model provider" icon={<Brain className="h-5 w-5 text-primary" />} status={providerStatus?.ready ? 'operational' : 'info'}>
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline">Provider: {providerStatus?.active_provider ?? 'Unavailable'}</Badge>
            <Badge variant={profileStatus?.available ? 'default' : 'secondary'}>
              {profileStatus?.available ? 'Selected profile executable' : 'Selected profile unavailable'}
            </Badge>
          </div>
          {profileStatus?.available ? (
            <p className="text-sm text-muted-foreground">
              {profile} resolves to {profileStatus.provider} / {profileStatus.model}.
            </p>
          ) : (
            <p className="text-sm text-muted-foreground">{profileStatus?.reason ?? 'Runtime readiness could not be resolved.'}</p>
          )}
          <div className="space-y-2">
            <Label>Model profile</Label>
            <Select value={profile} onValueChange={(value) => setProfile(value as ModelProfile)}>
              <SelectTrigger aria-label="AURA model profile"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="fast">AURA Fast — routine subsystem work</SelectItem>
                <SelectItem value="reasoning">AURA Reasoning — evidence-heavy analysis</SelectItem>
                <SelectItem value="supervisor">AURA Supervisor — cross-domain escalation</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">Profiles are portable across providers. Use the Model Marketplace only when you intentionally need a vendor-specific model ID.</p>
          </div>
        </div>
      </DCCard>

      <DCCard title="Optional Google / Vertex grounding metadata" icon={<Database className="h-5 w-5 text-primary" />} status="info">
        <div className="space-y-5">
          <div className="flex items-center justify-between gap-4">
            <div>
              <Label>Enable browser grounding preferences</Label>
              <p className="text-xs text-muted-foreground">This retains the existing Vertex Search preference fields. It does not configure or enable a server connector.</p>
            </div>
            <Switch checked={groundingEnabled} onCheckedChange={setGroundingEnabled} aria-label="Enable grounding preferences" />
          </div>
          {groundingEnabled && (
            <div className="grid gap-4 border-l-2 border-primary/20 pl-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="ai-project-id">Google Cloud Project ID</Label>
                <Input id="ai-project-id" value={projectId} onChange={(event) => setProjectId(event.target.value)} placeholder="your-project-id" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="ai-datastore-id">Vertex Data Store ID</Label>
                <Input id="ai-datastore-id" value={dataStoreId} onChange={(event) => setDataStoreId(event.target.value)} placeholder="your-data-store-id" />
              </div>
              <div className="space-y-2">
                <Label>Region</Label>
                <Select value={region} onValueChange={setRegion}>
                  <SelectTrigger aria-label="Grounding region"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="northamerica-northeast1">Canada — Montréal</SelectItem>
                    <SelectItem value="us-central1">United States — Iowa</SelectItem>
                    <SelectItem value="europe-west1">Europe — Belgium</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between"><Label>Top-K documents</Label><span className="font-mono text-sm">{topK}</span></div>
                <Slider value={[topK]} onValueChange={([value]) => setTopK(value)} min={5} max={50} step={5} aria-label="Top-K documents" />
                <div className="flex justify-between pt-2"><Label>Rerank Top-N</Label><span className="font-mono text-sm">{topN}</span></div>
                <Slider value={[topN]} onValueChange={([value]) => setTopN(value)} min={1} max={10} step={1} aria-label="Rerank Top-N" />
              </div>
            </div>
          )}
        </div>
      </DCCard>

      <KnowledgeSourceReadiness />

      <DCCard title="Generation preferences" icon={<ShieldCheck className="h-5 w-5 text-primary" />} status="operational">
        <div className="space-y-6">
          <div className="space-y-2">
            <div className="flex justify-between"><Label>Max tokens</Label><span className="font-mono text-sm">{maxTokens}</span></div>
            <Slider value={[maxTokens]} onValueChange={([value]) => setMaxTokens(value)} min={256} max={8192} step={256} aria-label="Maximum tokens" />
          </div>
          <div className="space-y-2">
            <div className="flex justify-between"><Label>Temperature</Label><span className="font-mono text-sm">{temperature.toFixed(1)}</span></div>
            <Slider value={[temperature * 10]} onValueChange={([value]) => setTemperature(value / 10)} min={0} max={10} step={1} aria-label="Temperature" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="ai-system-prompt">System prompt</Label>
            <Textarea id="ai-system-prompt" value={systemPrompt} onChange={(event) => setSystemPrompt(event.target.value)} rows={8} className="font-mono text-sm" />
          </div>
        </div>
      </DCCard>

      <div className="flex flex-col gap-3 sm:flex-row">
        <Button size="lg" className="flex-1" onClick={() => void handleSave()} disabled={isSaving}>
          {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Save browser preferences
        </Button>
        <Button size="lg" variant="outline" onClick={() => void handleHealthCheck()} disabled={isChecking || !can('ai.model.test')}>
          {isChecking ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Zap className="mr-2 h-4 w-4" />}
          Test selected profile
        </Button>
      </div>
    </div>
  );
}
