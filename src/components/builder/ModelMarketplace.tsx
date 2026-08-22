import { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useRBAC } from '@/contexts/RBACContext';
import {
  AURA_MODEL_PROFILES,
  NVIDIA_AGENT_MODELS,
  mergeAgentModelConfig,
  modelCanBeSelected,
  runtimeStatusForModel,
  type AiProviderReadiness,
  type ModelRuntimeStatus,
} from '@/agents/modelPolicy';
import {
  AlertCircle,
  Brain,
  CheckCircle2,
  Loader2,
  Search,
  ShieldCheck,
  Zap,
} from 'lucide-react';

export interface ModelConfig {
  id: string;
  name: string;
  provider: string;
  description: string;
  pricing: 'free' | 'low' | 'medium' | 'high';
  pricingDetails: string;
  capabilities: string[];
  contextWindow: string;
  speed: 'fast' | 'medium' | 'slow';
  recommended?: boolean;
  supportedRegions: string[];
  requiresAuth: boolean;
  ragSettings: {
    topK: number;
    topN: number;
    temperature: number;
    hybridSearch: boolean;
  };
}

function model(
  partial: Pick<ModelConfig, 'id' | 'name' | 'provider' | 'description' | 'capabilities'> &
    Partial<Omit<ModelConfig, 'id' | 'name' | 'provider' | 'description' | 'capabilities'>>,
): ModelConfig {
  return {
    pricing: 'medium',
    pricingDetails: 'Provider pricing varies. Verify current provider terms before production use.',
    contextWindow: 'Provider/profile dependent',
    speed: 'medium',
    supportedRegions: ['global'],
    requiresAuth: true,
    ragSettings: { topK: 20, topN: 6, temperature: 0.3, hybridSearch: true },
    ...partial,
  };
}

const portableProfiles = AURA_MODEL_PROFILES.map((entry, index) => model({
  id: entry.id,
  name: entry.name,
  provider: entry.provider,
  description: entry.description,
  capabilities: [...entry.capabilities],
  pricing: 'medium',
  pricingDetails: 'Uses the active AURA provider. Cost depends on the resolved provider/model.',
  contextWindow: 'Resolved provider dependent',
  speed: entry.id === 'profile:fast' ? 'fast' : entry.id === 'profile:supervisor' ? 'slow' : 'medium',
  recommended: index < 2,
  requiresAuth: false,
}));

const nvidiaModels = NVIDIA_AGENT_MODELS.map((entry) => model({
  id: entry.id,
  name: entry.name,
  provider: entry.provider,
  description: entry.description,
  capabilities: [...entry.capabilities],
  pricing: 'medium',
  pricingDetails: 'NVIDIA provider or qualified self-hosted endpoint required. Verify current NVIDIA terms.',
  contextWindow: 'Up to 1M tokens for the qualified model profile; runtime limits depend on deployment.',
  speed: entry.profile === 'supervisor' ? 'slow' : 'medium',
  requiresAuth: true,
}));

/**
 * Runtime-compatible legacy selections. Prefer AURA portable profiles for new
 * agent definitions so changing provider does not misrepresent a vendor ID.
 */
const legacyGoogleModels: ModelConfig[] = [
  model({
    id: 'google/gemini-2.5-flash',
    name: 'Gemini 2.5 Flash (legacy direct selection)',
    provider: 'Google via managed gateway',
    description: 'Backward-compatible fast model selection. Prefer AURA Fast for new agents.',
    capabilities: ['Text', 'Fast responses'],
    pricing: 'low',
    speed: 'fast',
    requiresAuth: false,
  }),
  model({
    id: 'google/gemini-2.5-pro',
    name: 'Gemini 2.5 Pro (legacy direct selection)',
    provider: 'Google via managed gateway',
    description: 'Backward-compatible reasoning selection. Prefer AURA Reasoning for new agents.',
    capabilities: ['Text', 'Reasoning'],
    pricing: 'medium',
    requiresAuth: false,
  }),
  model({
    id: 'google/gemini-3-pro-preview',
    name: 'Gemini 3 Pro Preview (legacy direct selection)',
    provider: 'Google via managed gateway',
    description: 'Existing AURA reasoning model ID retained for compatibility with stored agent configurations.',
    capabilities: ['Text', 'Reasoning'],
    pricing: 'medium',
    requiresAuth: false,
  }),
];

/**
 * Discoverable only. These entries are intentionally NOT selectable until an
 * executable adapter is added to the canonical backend model router.
 */
const catalogOnlyModels: ModelConfig[] = [
  model({
    id: 'openai/gpt-5',
    name: 'GPT-5',
    provider: 'OpenAI',
    description: 'Catalog entry only. No qualified AURA runtime adapter is currently configured.',
    capabilities: ['Text', 'Reasoning', 'Code'],
    pricing: 'high',
  }),
  model({
    id: 'anthropic/claude-sonnet-4-5',
    name: 'Claude Sonnet 4.5',
    provider: 'Anthropic',
    description: 'Catalog entry only. No qualified AURA runtime adapter is currently configured.',
    capabilities: ['Text', 'Reasoning', 'Code'],
    pricing: 'high',
  }),
  model({
    id: 'deepseek/deepseek-v3',
    name: 'DeepSeek V3',
    provider: 'DeepSeek',
    description: 'Catalog entry only. No qualified AURA runtime adapter is currently configured.',
    capabilities: ['Text', 'Reasoning', 'Code'],
    pricing: 'low',
  }),
  model({
    id: 'cohere/command-r-plus',
    name: 'Command R+',
    provider: 'Cohere',
    description: 'Catalog entry only. No qualified AURA runtime adapter is currently configured.',
    capabilities: ['Text', 'RAG'],
    pricing: 'medium',
  }),
  model({
    id: 'mistral/mistral-large-2',
    name: 'Mistral Large 2',
    provider: 'Mistral',
    description: 'Catalog entry only. No qualified AURA runtime adapter is currently configured.',
    capabilities: ['Text', 'Reasoning', 'Code'],
    pricing: 'medium',
  }),
  model({
    id: 'huggingface/llama-3.3-70b',
    name: 'Llama 3.3 70B',
    provider: 'Hugging Face',
    description: 'Catalog entry only. Use an explicitly configured OpenAI-compatible endpoint before runtime use.',
    capabilities: ['Text', 'Open weights'],
    pricing: 'low',
  }),
];

export const models: ModelConfig[] = [
  ...portableProfiles,
  ...nvidiaModels,
  ...legacyGoogleModels,
  ...catalogOnlyModels,
];

interface ModelMarketplaceProps {
  selectedModelId: string | null;
  onSelectModel: (model: ModelConfig) => void;
  agentId?: string;
  targetRegion?: string;
}

type ReadinessEnvelope = {
  active_provider?: string;
  providers?: AiProviderReadiness;
};

function unwrapFunctionData<T>(value: unknown): T | null {
  if (!value || typeof value !== 'object') return null;
  const record = value as Record<string, unknown>;
  if (record.data && typeof record.data === 'object') return record.data as T;
  return value as T;
}

function statusLabel(status: ModelRuntimeStatus): string {
  if (status === 'runtime-supported') return 'Runtime supported';
  if (status === 'requires-provider') return 'Provider configuration required';
  return 'Catalog only';
}

function statusVariant(status: ModelRuntimeStatus): 'default' | 'secondary' | 'outline' {
  if (status === 'runtime-supported') return 'default';
  if (status === 'requires-provider') return 'secondary';
  return 'outline';
}

export function ModelMarketplace({
  selectedModelId,
  onSelectModel,
  agentId,
  targetRegion = 'northamerica-northeast1',
}: ModelMarketplaceProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [providerFilter, setProviderFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState<'all' | ModelRuntimeStatus>('all');
  const [testingModelId, setTestingModelId] = useState<string | null>(null);
  const [savingModelId, setSavingModelId] = useState<string | null>(null);
  const [readiness, setReadiness] = useState<AiProviderReadiness | null>(null);
  const [readinessLoading, setReadinessLoading] = useState(true);
  const { toast } = useToast();
  const { can, loading: rbacLoading } = useRBAC();

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const { data, error } = await supabase.functions.invoke('ai-config', { body: {} });
        if (error) throw error;
        const payload = unwrapFunctionData<ReadinessEnvelope>(data);
        if (!cancelled) {
          setReadiness({
            ...(payload?.providers ?? {}),
            selectedProvider: payload?.active_provider ?? payload?.providers?.selectedProvider ?? null,
          });
        }
      } catch {
        if (!cancelled) setReadiness(null);
      } finally {
        if (!cancelled) setReadinessLoading(false);
      }
    };
    void load();
    return () => { cancelled = true; };
  }, []);

  const providers = useMemo(
    () => ['all', ...Array.from(new Set(models.map((entry) => entry.provider)))],
    [],
  );

  const filteredModels = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return models.filter((entry) => {
      const status = runtimeStatusForModel(entry.id, readiness);
      const matchesSearch = !query ||
        entry.name.toLowerCase().includes(query) ||
        entry.provider.toLowerCase().includes(query) ||
        entry.description.toLowerCase().includes(query) ||
        entry.capabilities.some((capability) => capability.toLowerCase().includes(query));
      const matchesProvider = providerFilter === 'all' || entry.provider === providerFilter;
      const matchesStatus = statusFilter === 'all' || status === statusFilter;
      const matchesRegion = entry.supportedRegions.includes('global') || entry.supportedRegions.includes(targetRegion);
      return matchesSearch && matchesProvider && matchesStatus && matchesRegion;
    });
  }, [providerFilter, readiness, searchQuery, statusFilter, targetRegion]);

  const handleTestModel = async (entry: ModelConfig) => {
    if (!can('ai.model.test')) {
      toast({ title: 'Access denied', description: 'Model-test permission is required.', variant: 'destructive' });
      return;
    }
    if (!modelCanBeSelected(entry.id, readiness)) {
      toast({
        title: 'Model is not executable',
        description: `${entry.name} is ${statusLabel(runtimeStatusForModel(entry.id, readiness)).toLowerCase()}.`,
        variant: 'destructive',
      });
      return;
    }

    setTestingModelId(entry.id);
    try {
      const { data, error } = await supabase.functions.invoke('models-test', {
        body: { modelId: entry.id, targetRegion },
      });
      if (error) throw error;
      const result = unwrapFunctionData<{ latency?: number; provider?: string; model?: string }>(data);
      toast({
        title: 'Connectivity test passed',
        description: `${result?.provider ?? 'Provider'} / ${result?.model ?? entry.name} responded in ${result?.latency ?? '?'} ms.`,
      });
    } catch (error) {
      toast({
        title: 'Model test failed',
        description: error instanceof Error ? error.message : 'The runtime rejected the model test.',
        variant: 'destructive',
      });
    } finally {
      setTestingModelId(null);
    }
  };

  const handleSelectModel = async (entry: ModelConfig) => {
    if (!modelCanBeSelected(entry.id, readiness)) {
      toast({
        title: 'Cannot select this model',
        description: statusLabel(runtimeStatusForModel(entry.id, readiness)),
        variant: 'destructive',
      });
      return;
    }
    if (!can('ai.model.test') && !can('ai.model.configure')) {
      toast({ title: 'Access denied', description: 'AI model permission is required.', variant: 'destructive' });
      return;
    }

    if (!agentId) {
      onSelectModel(entry);
      toast({ title: 'Model profile selected', description: `${entry.name} will be used for this draft.` });
      return;
    }

    if (!can('ai.model.configure')) {
      toast({
        title: 'Configuration permission required',
        description: 'You may test models, but only AI model administrators can change a persisted agent configuration.',
        variant: 'destructive',
      });
      return;
    }

    setSavingModelId(entry.id);
    try {
      const { data: existing, error: fetchError } = await supabase
        .from('agents')
        .select('config')
        .eq('id', agentId)
        .maybeSingle();
      if (fetchError) throw fetchError;
      if (!existing) throw new Error('Agent not found or access denied');

      const nextConfig = mergeAgentModelConfig(existing.config, {
        model: entry.id,
        ragSettings: entry.ragSettings,
      });
      const { error: updateError } = await supabase
        .from('agents')
        .update({ config: nextConfig })
        .eq('id', agentId);
      if (updateError) throw updateError;

      onSelectModel(entry);
      toast({
        title: 'Model configuration saved',
        description: `${entry.name} was saved without replacing unrelated agent settings.`,
      });
    } catch (error) {
      toast({
        title: 'Failed to save model',
        description: error instanceof Error ? error.message : 'Configuration update failed.',
        variant: 'destructive',
      });
    } finally {
      setSavingModelId(null);
    }
  };

  if (rbacLoading) {
    return (
      <div className="flex items-center justify-center py-12" role="status">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="model-marketplace">
      <div className="rounded-lg border border-border bg-muted/30 p-4 text-sm">
        <div className="flex items-start gap-3">
          <ShieldCheck className="mt-0.5 h-5 w-5 text-primary" aria-hidden="true" />
          <div className="space-y-1">
            <p className="font-medium text-foreground">Model catalog is not runtime evidence</p>
            <p className="text-muted-foreground">
              AURA portable profiles are provider-neutral. Vendor-specific IDs are selectable only when the matching provider is configured and the backend router can execute them. NVIDIA model availability does not imply NIM, NeMo or self-hosted runtime execution.
            </p>
            <p className="text-xs text-muted-foreground">
              Active provider: {readinessLoading ? 'checking…' : readiness?.selectedProvider ?? 'unknown'}
            </p>
          </div>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-[1fr,220px,220px]">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
          <Input
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder="Search models, providers or capabilities"
            className="pl-9"
            aria-label="Search model catalog"
          />
        </div>
        <Select value={providerFilter} onValueChange={setProviderFilter}>
          <SelectTrigger aria-label="Filter by provider"><SelectValue /></SelectTrigger>
          <SelectContent>
            {providers.map((provider) => (
              <SelectItem key={provider} value={provider}>{provider === 'all' ? 'All providers' : provider}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as typeof statusFilter)}>
          <SelectTrigger aria-label="Filter by runtime status"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All runtime states</SelectItem>
            <SelectItem value="runtime-supported">Runtime supported</SelectItem>
            <SelectItem value="requires-provider">Requires provider</SelectItem>
            <SelectItem value="catalog-only">Catalog only</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {filteredModels.length === 0 ? (
        <Card>
          <CardContent className="flex items-center gap-3 py-8 text-sm text-muted-foreground">
            <AlertCircle className="h-5 w-5" /> No models match these filters.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filteredModels.map((entry) => {
            const status = runtimeStatusForModel(entry.id, readiness);
            const selected = selectedModelId === entry.id;
            const executable = status === 'runtime-supported';
            return (
              <Card
                key={entry.id}
                className={selected ? 'border-primary ring-1 ring-primary/30' : undefined}
                data-model-id={entry.id}
                data-runtime-status={status}
              >
                <CardHeader className="space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <CardTitle className="text-base">{entry.name}</CardTitle>
                      <CardDescription>{entry.provider}</CardDescription>
                    </div>
                    {selected && <CheckCircle2 className="h-5 w-5 text-primary" aria-label="Selected" />}
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    <Badge variant={statusVariant(status)}>{statusLabel(status)}</Badge>
                    {entry.recommended && <Badge variant="secondary">Recommended</Badge>}
                    <Badge variant="outline">{entry.speed}</Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-sm text-muted-foreground">{entry.description}</p>
                  <div className="flex flex-wrap gap-1">
                    {entry.capabilities.slice(0, 5).map((capability) => (
                      <Badge key={capability} variant="outline" className="font-normal">{capability}</Badge>
                    ))}
                  </div>
                  <div className="space-y-1 text-xs text-muted-foreground">
                    <p>Context: {entry.contextWindow}</p>
                    <p>{entry.pricingDetails}</p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={!executable || !can('ai.model.test') || testingModelId === entry.id}
                      onClick={() => void handleTestModel(entry)}
                    >
                      {testingModelId === entry.id ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Zap className="mr-2 h-4 w-4" />}
                      Test
                    </Button>
                    <Button
                      size="sm"
                      className="flex-1"
                      disabled={!executable || savingModelId === entry.id || (!can('ai.model.test') && !can('ai.model.configure'))}
                      onClick={() => void handleSelectModel(entry)}
                    >
                      {savingModelId === entry.id ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Brain className="mr-2 h-4 w-4" />}
                      {selected ? 'Selected' : agentId ? 'Use model' : 'Use profile'}
                    </Button>
                  </div>
                  {!executable && (
                    <p className="text-xs text-muted-foreground">
                      {status === 'requires-provider'
                        ? 'Configure the matching provider before testing or selecting this vendor-specific model.'
                        : 'This entry is informational until an AURA backend adapter is qualified.'}
                    </p>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default ModelMarketplace;
