import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
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
import { Shield, Lock, Filter, Zap, CheckCircle, AlertTriangle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface PolicyRules {
  pii_redaction: { enabled: boolean; mode: string };
  data_residency: { region: string; strict: boolean };
  content_filters: { deny: string[] };
  rate_limits: { mcp_call_per_min: number; gen_tokens_per_hour: number };
  tool_allowlist: string[];
  tool_blocklist: string[];
  retrieval: { max_topk: number; rerank_required: boolean; hybrid_required: boolean };
  generation: { max_temperature: number; safe_prompt_prefix: string };
  review_gates: { human_approval: string[]; threshold_risk: number };
  logging: { audit_enabled: boolean; details: string };
}

interface Policy {
  id?: string;
  name: string;
  description?: string;
  scope: 'model' | 'rag' | 'mcp' | 'workflow' | 'global';
  rules?: Partial<PolicyRules>;
  is_enabled: boolean;
  created_by?: string;
}

interface PolicyEditorDrawerProps {
  open: boolean;
  onClose: () => void;
  systemId: string;
  policy?: Policy | null;
}

const defaultRules = {
  pii_redaction: { enabled: false, mode: 'mask' },
  data_residency: { region: 'ca-northamerica-northeast1', strict: true },
  content_filters: { deny: [] },
  rate_limits: { mcp_call_per_min: 60, gen_tokens_per_hour: 50000 },
  tool_allowlist: [],
  tool_blocklist: [],
  retrieval: { max_topk: 30, rerank_required: false, hybrid_required: false },
  generation: { max_temperature: 1.0, safe_prompt_prefix: '' },
  review_gates: { human_approval: [], threshold_risk: 0.6 },
  logging: { audit_enabled: true, details: 'minimal' },
};

export function PolicyEditorDrawer({ open, onClose, systemId, policy }: PolicyEditorDrawerProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [scope, setScope] = useState<'model' | 'rag' | 'mcp' | 'workflow' | 'global'>('global');
  const [isEnabled, setIsEnabled] = useState(true);
  const [rules, setRules] = useState(defaultRules);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (policy) {
      setName(policy.name);
      setDescription(policy.description || '');
      setScope(policy.scope);
      setIsEnabled(policy.is_enabled);
      setRules({ ...defaultRules, ...(policy.rules || {}) });
    } else {
      // Reset for new policy
      setName('');
      setDescription('');
      setScope('global');
      setIsEnabled(true);
      setRules(defaultRules);
    }
  }, [policy, open]);

  const handleSave = async () => {
    if (!name.trim()) {
      toast.error('Policy name is required');
      return;
    }

    setIsSaving(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error('Not authenticated');

      const policyData = {
        system_id: systemId,
        name: name.trim(),
        description: description.trim() || null,
        scope,
        rules,
        is_enabled: isEnabled,
        created_by: userData.user.id,
      };

      if (policy) {
        // Update existing
        const { error } = await supabase
          .from('policies')
          .update(policyData)
          .eq('id', policy.id);

        if (error) throw error;
        toast.success('Policy updated');
      } else {
        // Create new
        const { error } = await supabase
          .from('policies')
          .insert(policyData);

        if (error) throw error;
        toast.success('Policy created');
      }

      onClose();
    } catch (error) {
      console.error('Error saving policy:', error);
      toast.error('Failed to save policy');
    } finally {
      setIsSaving(false);
    }
  };

  const updateRule = (path: string, value: unknown) => {
    setRules(prev => {
      const updated = { ...prev };
      const keys = path.split('.');
      
      type NestedRecord = Record<string, unknown>;
      let current: NestedRecord = updated as NestedRecord;
      
      for (let i = 0; i < keys.length - 1; i++) {
        const key = keys[i];
        if (typeof current[key] !== 'object' || current[key] === null) {
          current[key] = {};
        }
        current = current[key] as NestedRecord;
      }
      
      const finalKey = keys[keys.length - 1];
      current[finalKey] = value;
      return updated as typeof defaultRules;
    });
  };

  return (
    <Sheet open={open} onOpenChange={onClose}>
      <SheetContent className="sm:max-w-2xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{policy ? 'Edit Policy' : 'Create Policy'}</SheetTitle>
          <SheetDescription>
            Define governance rules for {scope === 'global' ? 'all resources' : scope}
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-6 mt-6">
          {/* Basic Info */}
          <div className="space-y-4">
            <div>
              <Label htmlFor="name">Policy Name *</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., Canada Data Residency"
              />
            </div>

            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Brief description of this policy's purpose..."
                rows={2}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="scope">Scope</Label>
                <Select value={scope} onValueChange={(v: any) => setScope(v)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="global">Global (All Resources)</SelectItem>
                    <SelectItem value="model">Model (Generation)</SelectItem>
                    <SelectItem value="rag">RAG (Retrieval)</SelectItem>
                    <SelectItem value="mcp">MCP (Tools)</SelectItem>
                    <SelectItem value="workflow">Workflow</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center justify-between">
                <Label htmlFor="enabled">Enabled</Label>
                <Switch
                  id="enabled"
                  checked={isEnabled}
                  onCheckedChange={setIsEnabled}
                />
              </div>
            </div>
          </div>

          {/* Rules */}
          <Tabs defaultValue="data" className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="data">Data</TabsTrigger>
              <TabsTrigger value="retrieval">Retrieval</TabsTrigger>
              <TabsTrigger value="tools">Tools</TabsTrigger>
              <TabsTrigger value="gates">Gates</TabsTrigger>
            </TabsList>

            <TabsContent value="data" className="space-y-4">
              {/* PII Redaction */}
              <div className="p-4 border rounded-lg space-y-3">
                <div className="flex items-center justify-between">
                  <Label>PII Redaction</Label>
                  <Switch
                    checked={rules.pii_redaction.enabled}
                    onCheckedChange={(v) => updateRule('pii_redaction.enabled', v)}
                  />
                </div>
                {rules.pii_redaction.enabled && (
                  <Select
                    value={rules.pii_redaction.mode}
                    onValueChange={(v) => updateRule('pii_redaction.mode', v)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="mask">Mask (e.g., ***-**-1234)</SelectItem>
                      <SelectItem value="drop">Drop (Remove entirely)</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              </div>

              {/* Data Residency */}
              <div className="p-4 border rounded-lg space-y-3">
                <Label>Data Residency</Label>
                <Select
                  value={rules.data_residency.region}
                  onValueChange={(v) => updateRule('data_residency.region', v)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ca-northamerica-northeast1">🇨🇦 Canada (Montreal)</SelectItem>
                    <SelectItem value="us-central1">🇺🇸 USA (Iowa)</SelectItem>
                    <SelectItem value="eu-west1">🇪🇺 Europe (Belgium)</SelectItem>
                  </SelectContent>
                </Select>
                <div className="flex items-center justify-between">
                  <Label className="text-sm">Strict (Block other regions)</Label>
                  <Switch
                    checked={rules.data_residency.strict}
                    onCheckedChange={(v) => updateRule('data_residency.strict', v)}
                  />
                </div>
              </div>

              {/* Content Filters */}
              <div className="p-4 border rounded-lg space-y-3">
                <Label>Content Filters (Deny List)</Label>
                <Input
                  placeholder="credit_card, ssn, secrets (comma-separated)"
                  value={rules.content_filters?.deny?.join(', ') || ''}
                  onChange={(e) => updateRule('content_filters.deny', e.target.value?.split(',').map(s => s.trim()).filter(Boolean) || [])}
                />
              </div>
            </TabsContent>

            <TabsContent value="retrieval" className="space-y-4">
              <div className="p-4 border rounded-lg space-y-3">
                <Label>Max Top-K Documents</Label>
                <Input
                  type="number"
                  min="1"
                  max="50"
                  value={rules.retrieval.max_topk}
                  onChange={(e) => updateRule('retrieval.max_topk', parseInt(e.target.value) || 30)}
                />
              </div>

              <div className="p-4 border rounded-lg space-y-3">
                <div className="flex items-center justify-between">
                  <Label>Require Reranking</Label>
                  <Switch
                    checked={rules.retrieval.rerank_required}
                    onCheckedChange={(v) => updateRule('retrieval.rerank_required', v)}
                  />
                </div>
              </div>

              <div className="p-4 border rounded-lg space-y-3">
                <div className="flex items-center justify-between">
                  <Label>Require Hybrid Search</Label>
                  <Switch
                    checked={rules.retrieval.hybrid_required}
                    onCheckedChange={(v) => updateRule('retrieval.hybrid_required', v)}
                  />
                </div>
              </div>

              <div className="p-4 border rounded-lg space-y-3">
                <Label>Max Temperature</Label>
                <Input
                  type="number"
                  min="0"
                  max="1"
                  step="0.1"
                  value={rules.generation.max_temperature}
                  onChange={(e) => updateRule('generation.max_temperature', parseFloat(e.target.value) || 1.0)}
                />
              </div>
            </TabsContent>

            <TabsContent value="tools" className="space-y-4">
              <div className="p-4 border rounded-lg space-y-3">
                <Label>Tool Allowlist (Empty = Allow All)</Label>
                <Input
                  placeholder="gmail.search, github.search (comma-separated)"
                  value={rules.tool_allowlist?.join(', ') || ''}
                  onChange={(e) => updateRule('tool_allowlist', e.target.value?.split(',').map(s => s.trim()).filter(Boolean) || [])}
                />
              </div>

              <div className="p-4 border rounded-lg space-y-3">
                <Label>Tool Blocklist</Label>
                <Input
                  placeholder="*dangerous*, delete.* (comma-separated)"
                  value={rules.tool_blocklist?.join(', ') || ''}
                  onChange={(e) => updateRule('tool_blocklist', e.target.value?.split(',').map(s => s.trim()).filter(Boolean) || [])}
                />
              </div>

              <div className="p-4 border rounded-lg space-y-3">
                <Label>MCP Call Rate Limit (per minute)</Label>
                <Input
                  type="number"
                  min="1"
                  value={rules.rate_limits.mcp_call_per_min}
                  onChange={(e) => updateRule('rate_limits.mcp_call_per_min', parseInt(e.target.value) || 60)}
                />
              </div>
            </TabsContent>

            <TabsContent value="gates" className="space-y-4">
              <div className="p-4 border rounded-lg space-y-3">
                <Label>Require Human Approval For</Label>
                <div className="space-y-2">
                  {['deployment', 'workflow_publish'].map((gate) => (
                    <label key={gate} className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={rules.review_gates.human_approval.includes(gate)}
                        onChange={(e) => {
                          const current = rules.review_gates.human_approval;
                          updateRule('review_gates.human_approval', 
                            e.target.checked 
                              ? [...current, gate]
                              : current.filter((g: string) => g !== gate)
                          );
                        }}
                      />
                      <span className="text-sm capitalize">{gate.replace('_', ' ')}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="p-4 border rounded-lg space-y-3">
                <Label>Audit Logging</Label>
                <Select
                  value={rules.logging.details}
                  onValueChange={(v) => updateRule('logging.details', v)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="minimal">Minimal (Decisions only)</SelectItem>
                    <SelectItem value="full">Full (All context)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </TabsContent>
          </Tabs>

          {/* Actions */}
          <div className="flex gap-2 pt-4 border-t">
            <Button onClick={onClose} variant="outline" className="flex-1">
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={isSaving} className="flex-1">
              {isSaving ? 'Saving...' : (policy ? 'Update Policy' : 'Create Policy')}
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
