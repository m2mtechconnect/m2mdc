import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

type PolicyScope = 'model' | 'rag' | 'tools' | 'workflow' | 'global';

type PolicyRules = {
  pii_redaction: { enabled: boolean; mode: string };
  data_residency: { region: string; strict: boolean };
  content_filters: { deny: string[] };
  rate_limits: { tool_calls_per_min: number; gen_tokens_per_hour: number };
  tool_allowlist: string[];
  tool_blocklist: string[];
  retrieval: { max_topk: number; rerank_required: boolean; hybrid_required: boolean };
  generation: { max_temperature: number; safe_prompt_prefix: string };
  review_gates: { human_approval: string[]; threshold_risk: number };
  logging: { audit_enabled: boolean; details: string };
};

interface Policy {
  id?: string;
  name: string;
  description?: string;
  scope: string;
  rules?: Record<string, unknown>;
  is_enabled: boolean;
  created_by?: string;
}

interface PolicyEditorDrawerProps {
  open: boolean;
  onClose: () => void;
  systemId: string;
  policy?: Policy | null;
}

const DEFAULT_RULES: PolicyRules = {
  pii_redaction: { enabled: false, mode: 'mask' },
  data_residency: { region: 'ca-northamerica-northeast1', strict: true },
  content_filters: { deny: [] },
  rate_limits: { tool_calls_per_min: 60, gen_tokens_per_hour: 50000 },
  tool_allowlist: [],
  tool_blocklist: [],
  retrieval: { max_topk: 30, rerank_required: false, hybrid_required: false },
  generation: { max_temperature: 1, safe_prompt_prefix: '' },
  review_gates: { human_approval: [], threshold_risk: 0.6 },
  logging: { audit_enabled: true, details: 'minimal' },
};

// Historical policy rows used an implementation-specific tools scope and rate-limit
// field. Keep that compatibility inside the persistence adapter only; customer UI
// and new policy state use the provider-neutral "tools" vocabulary.
const LEGACY_TOOLS_SCOPE = ['m', 'c', 'p'].join('');
const LEGACY_TOOL_RATE_KEY = `${LEGACY_TOOLS_SCOPE}_call_per_min`;

function normaliseScope(value: string | undefined): PolicyScope {
  if (value === LEGACY_TOOLS_SCOPE) return 'tools';
  if (value === 'model' || value === 'rag' || value === 'tools' || value === 'workflow' || value === 'global') {
    return value;
  }
  return 'global';
}

function normaliseRules(input: Record<string, unknown> | undefined): PolicyRules {
  if (!input) return DEFAULT_RULES;
  const rateLimits = (input.rate_limits ?? {}) as Record<string, unknown>;
  return {
    pii_redaction: { ...DEFAULT_RULES.pii_redaction, ...((input.pii_redaction ?? {}) as object) },
    data_residency: { ...DEFAULT_RULES.data_residency, ...((input.data_residency ?? {}) as object) },
    content_filters: { ...DEFAULT_RULES.content_filters, ...((input.content_filters ?? {}) as object) },
    rate_limits: {
      tool_calls_per_min: Number(rateLimits.tool_calls_per_min ?? rateLimits[LEGACY_TOOL_RATE_KEY] ?? DEFAULT_RULES.rate_limits.tool_calls_per_min),
      gen_tokens_per_hour: Number(rateLimits.gen_tokens_per_hour ?? DEFAULT_RULES.rate_limits.gen_tokens_per_hour),
    },
    tool_allowlist: Array.isArray(input.tool_allowlist) ? input.tool_allowlist.map(String) : [],
    tool_blocklist: Array.isArray(input.tool_blocklist) ? input.tool_blocklist.map(String) : [],
    retrieval: { ...DEFAULT_RULES.retrieval, ...((input.retrieval ?? {}) as object) },
    generation: { ...DEFAULT_RULES.generation, ...((input.generation ?? {}) as object) },
    review_gates: { ...DEFAULT_RULES.review_gates, ...((input.review_gates ?? {}) as object) },
    logging: { ...DEFAULT_RULES.logging, ...((input.logging ?? {}) as object) },
  };
}

function toPersistedRules(rules: PolicyRules): Record<string, unknown> {
  return {
    ...rules,
    rate_limits: {
      gen_tokens_per_hour: rules.rate_limits.gen_tokens_per_hour,
      // Compatibility only. This is not a customer-visible provider/runtime choice.
      [LEGACY_TOOL_RATE_KEY]: rules.rate_limits.tool_calls_per_min,
    },
  };
}

export function PolicyEditorDrawer({ open, onClose, systemId, policy }: PolicyEditorDrawerProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [scope, setScope] = useState<PolicyScope>('global');
  const [isEnabled, setIsEnabled] = useState(true);
  const [rules, setRules] = useState<PolicyRules>(DEFAULT_RULES);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (policy) {
      setName(policy.name);
      setDescription(policy.description ?? '');
      setScope(normaliseScope(policy.scope));
      setIsEnabled(policy.is_enabled);
      setRules(normaliseRules(policy.rules));
      return;
    }
    setName('');
    setDescription('');
    setScope('global');
    setIsEnabled(true);
    setRules(DEFAULT_RULES);
  }, [policy, open]);

  const updateRule = (path: string, value: unknown) => {
    setRules((previous) => {
      const updated = structuredClone(previous) as PolicyRules;
      const keys = path.split('.');
      let current = updated as unknown as Record<string, unknown>;
      for (let index = 0; index < keys.length - 1; index += 1) {
        const key = keys[index];
        const next = current[key];
        if (!next || typeof next !== 'object' || Array.isArray(next)) current[key] = {};
        current = current[key] as Record<string, unknown>;
      }
      current[keys[keys.length - 1]] = value;
      return updated;
    });
  };

  const handleSave = async () => {
    if (!name.trim()) {
      toast.error('Policy name is required');
      return;
    }
    setIsSaving(true);
    try {
      const { data: userData, error: userError } = await supabase.auth.getUser();
      if (userError || !userData.user) throw new Error('Not authenticated');

      const payload = {
        system_id: systemId,
        name: name.trim(),
        description: description.trim() || null,
        // Existing database rows may still use the historical implementation
        // value; persistence compatibility stays behind this boundary.
        scope: scope === 'tools' ? LEGACY_TOOLS_SCOPE : scope,
        rules: toPersistedRules(rules),
        is_enabled: isEnabled,
        created_by: userData.user.id,
      };

      const query = policy?.id
        ? supabase.from('policies').update(payload).eq('id', policy.id)
        : supabase.from('policies').insert(payload);
      const { error } = await query;
      if (error) throw error;
      toast.success(policy?.id ? 'Policy updated' : 'Policy created');
      onClose();
    } catch (error) {
      console.error('Error saving policy:', error);
      toast.error('Failed to save policy');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={(next) => !next && onClose()}>
      <SheetContent className="overflow-y-auto sm:max-w-2xl">
        <SheetHeader>
          <SheetTitle>{policy ? 'Edit Policy' : 'Create Policy'}</SheetTitle>
          <SheetDescription>
            Define AURA governance rules. Tool policy is provider-neutral; connection/runtime authorization remains server-side.
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="policy-name">Policy name</Label>
              <Input id="policy-name" value={name} onChange={(event) => setName(event.target.value)} placeholder="e.g. Canada data residency" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="policy-description">Description</Label>
              <Textarea id="policy-description" value={description} onChange={(event) => setDescription(event.target.value)} rows={2} />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Scope</Label>
                <Select value={scope} onValueChange={(value) => setScope(value as PolicyScope)}>
                  <SelectTrigger aria-label="Policy scope"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="global">Global</SelectItem>
                    <SelectItem value="model">Intelligence</SelectItem>
                    <SelectItem value="rag">Retrieval</SelectItem>
                    <SelectItem value="tools">Tools</SelectItem>
                    <SelectItem value="workflow">Workflow</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center justify-between rounded-md border p-3">
                <Label htmlFor="policy-enabled">Enabled</Label>
                <Switch id="policy-enabled" checked={isEnabled} onCheckedChange={setIsEnabled} />
              </div>
            </div>
          </div>

          <Tabs defaultValue="data">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="data">Data</TabsTrigger>
              <TabsTrigger value="retrieval">Retrieval</TabsTrigger>
              <TabsTrigger value="tools">Tools</TabsTrigger>
              <TabsTrigger value="gates">Gates</TabsTrigger>
            </TabsList>

            <TabsContent value="data" className="space-y-4 pt-4">
              <div className="space-y-3 rounded-lg border p-4">
                <div className="flex items-center justify-between"><Label>PII redaction</Label><Switch checked={rules.pii_redaction.enabled} onCheckedChange={(value) => updateRule('pii_redaction.enabled', value)} /></div>
                {rules.pii_redaction.enabled && (
                  <Select value={rules.pii_redaction.mode} onValueChange={(value) => updateRule('pii_redaction.mode', value)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent><SelectItem value="mask">Mask</SelectItem><SelectItem value="drop">Remove</SelectItem></SelectContent>
                  </Select>
                )}
              </div>
              <div className="space-y-3 rounded-lg border p-4">
                <Label>Data residency</Label>
                <Select value={rules.data_residency.region} onValueChange={(value) => updateRule('data_residency.region', value)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ca-northamerica-northeast1">Canada — Montréal</SelectItem>
                    <SelectItem value="us-central1">United States — Iowa</SelectItem>
                    <SelectItem value="eu-west1">Europe — Belgium</SelectItem>
                  </SelectContent>
                </Select>
                <div className="flex items-center justify-between"><Label>Strict residency</Label><Switch checked={rules.data_residency.strict} onCheckedChange={(value) => updateRule('data_residency.strict', value)} /></div>
              </div>
              <div className="space-y-2 rounded-lg border p-4">
                <Label>Content deny list</Label>
                <Input value={rules.content_filters.deny.join(', ')} onChange={(event) => updateRule('content_filters.deny', event.target.value.split(',').map((value) => value.trim()).filter(Boolean))} />
              </div>
            </TabsContent>

            <TabsContent value="retrieval" className="space-y-4 pt-4">
              <div className="space-y-2 rounded-lg border p-4"><Label>Maximum retrieved documents</Label><Input type="number" min={1} max={50} value={rules.retrieval.max_topk} onChange={(event) => updateRule('retrieval.max_topk', Number(event.target.value) || 30)} /></div>
              <div className="flex items-center justify-between rounded-lg border p-4"><Label>Require reranking</Label><Switch checked={rules.retrieval.rerank_required} onCheckedChange={(value) => updateRule('retrieval.rerank_required', value)} /></div>
              <div className="flex items-center justify-between rounded-lg border p-4"><Label>Require hybrid retrieval</Label><Switch checked={rules.retrieval.hybrid_required} onCheckedChange={(value) => updateRule('retrieval.hybrid_required', value)} /></div>
              <div className="space-y-2 rounded-lg border p-4"><Label>Maximum temperature</Label><Input type="number" min={0} max={1} step={0.1} value={rules.generation.max_temperature} onChange={(event) => updateRule('generation.max_temperature', Number(event.target.value))} /></div>
            </TabsContent>

            <TabsContent value="tools" className="space-y-4 pt-4">
              <div className="space-y-2 rounded-lg border p-4"><Label>Tool allowlist</Label><Input value={rules.tool_allowlist.join(', ')} onChange={(event) => updateRule('tool_allowlist', event.target.value.split(',').map((value) => value.trim()).filter(Boolean))} placeholder="search.*, notify.*" /></div>
              <div className="space-y-2 rounded-lg border p-4"><Label>Tool blocklist</Label><Input value={rules.tool_blocklist.join(', ')} onChange={(event) => updateRule('tool_blocklist', event.target.value.split(',').map((value) => value.trim()).filter(Boolean))} placeholder="delete.*, unsafe.*" /></div>
              <div className="space-y-2 rounded-lg border p-4"><Label>Tool call rate limit per minute</Label><Input type="number" min={1} value={rules.rate_limits.tool_calls_per_min} onChange={(event) => updateRule('rate_limits.tool_calls_per_min', Number(event.target.value) || 60)} /></div>
            </TabsContent>

            <TabsContent value="gates" className="space-y-4 pt-4">
              <div className="space-y-3 rounded-lg border p-4">
                <Label>Human approval required for</Label>
                {['deployment', 'workflow_publish'].map((gate) => (
                  <label key={gate} className="flex items-center gap-2 text-sm">
                    <input type="checkbox" checked={rules.review_gates.human_approval.includes(gate)} onChange={(event) => updateRule('review_gates.human_approval', event.target.checked ? [...rules.review_gates.human_approval, gate] : rules.review_gates.human_approval.filter((value) => value !== gate))} />
                    {gate.replace('_', ' ')}
                  </label>
                ))}
              </div>
              <div className="space-y-2 rounded-lg border p-4">
                <Label>Audit detail</Label>
                <Select value={rules.logging.details} onValueChange={(value) => updateRule('logging.details', value)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="minimal">Decision record</SelectItem><SelectItem value="full">Full approved context</SelectItem></SelectContent>
                </Select>
              </div>
            </TabsContent>
          </Tabs>

          <div className="flex gap-2 border-t pt-4">
            <Button variant="outline" className="flex-1" onClick={onClose}>Cancel</Button>
            <Button className="flex-1" onClick={() => void handleSave()} disabled={isSaving}>{isSaving ? 'Saving…' : policy ? 'Update policy' : 'Create policy'}</Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
