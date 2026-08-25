import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Activity, ArrowRight, CheckCircle2, CircleAlert, Database, Loader2, Server, ShieldCheck } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useRBAC } from '@/contexts/RBACContext';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { DCCard, DCSectionHeader } from '@/components/dc-ui';
import { modelDisplayLabel } from '@/lib/llm/modelLabels';
import {
  appendDeploymentEvent,
  closeDeployment,
  openDeployment,
} from '@/workspace/deploymentRecords';

interface SystemRecord {
  id: string;
  name: string;
  status: string | null;
  config: Record<string, unknown> | null;
  connector_ids: string[] | null;
}

interface ActivationStage {
  label: string;
  status: 'pending' | 'running' | 'complete' | 'failed';
}

const STAGE_LABELS = [
  'Validate saved configuration',
  'Inspect saved workflow',
  'Activate AURA configuration',
  'Resolve configured integrations',
  'Record activation evidence',
] as const;

export default function ActivateInAura() {
  const [searchParams] = useSearchParams();
  const systemId = searchParams.get('id');
  const navigate = useNavigate();
  const { toast } = useToast();
  const { can } = useRBAC();

  const [system, setSystem] = useState<SystemRecord | null>(null);
  const [workflowId, setWorkflowId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [activating, setActivating] = useState(false);
  const [activated, setActivated] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [stages, setStages] = useState<ActivationStage[]>(
    STAGE_LABELS.map((label) => ({ label, status: 'pending' })),
  );

  const modelId = useMemo(() => {
    const config = system?.config ?? {};
    const selected = config.selectedModel ?? config.model;
    return typeof selected === 'string' ? selected : null;
  }, [system]);

  useEffect(() => {
    document.title = 'Activate in AURA | AURA DC';
    if (!systemId) {
      setLoading(false);
      return;
    }

    let cancelled = false;
    void (async () => {
      try {
        setLoading(true);
        setError(null);
        const [{ data: agent, error: agentError }, { data: workflow, error: workflowError }] = await Promise.all([
          supabase
            .from('agents')
            .select('id, name, status, config, connector_ids')
            .eq('id', systemId)
            .maybeSingle(),
          supabase
            .from('workflows')
            .select('id')
            .eq('system_id', systemId)
            .maybeSingle(),
        ]);
        if (agentError) throw agentError;
        if (workflowError) throw workflowError;
        if (!agent) throw new Error('The selected AURA configuration was not found or is not accessible.');
        if (cancelled) return;
        setSystem(agent as unknown as SystemRecord);
        setWorkflowId(workflow?.id ?? null);
      } catch (cause) {
        if (!cancelled) setError(cause instanceof Error ? cause.message : 'Configuration could not be loaded.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [systemId]);

  const setStage = (index: number, status: ActivationStage['status']) => {
    setStages((current) => current.map((stage, stageIndex) => stageIndex === index ? { ...stage, status } : stage));
  };

  async function activate() {
    if (!systemId || !system || activating || !can('deployment.execute')) return;

    setActivating(true);
    setActivated(false);
    setError(null);
    setStages(STAGE_LABELS.map((label) => ({ label, status: 'pending' })));

    let deploymentId: string | null = null;
    let actorId: string | null = null;
    let currentStage = 0;

    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) throw new Error('Authentication required.');
      actorId = user.id;

      const deployment = await openDeployment({
        systemId,
        actorId: user.id,
        model: modelId,
        grounding: typeof system.config?.grounding === 'boolean' ? system.config.grounding : null,
      });
      deploymentId = deployment.id;

      const record = (
        sequence: number,
        stage: string,
        status: 'started' | 'succeeded' | 'failed' | 'skipped',
        detail?: Record<string, unknown>,
      ) => appendDeploymentEvent({
        deploymentId: deployment.id,
        systemId,
        actorId: user.id,
        sequence,
        stage,
        status,
        detail,
      });

      currentStage = 0;
      setStage(0, 'running');
      await record(1, 'validate-configuration', 'succeeded', {
        system_id: systemId,
        system_name: system.name,
      });
      setStage(0, 'complete');

      currentStage = 1;
      setStage(1, 'running');
      await record(2, 'inspect-workflow', workflowId ? 'succeeded' : 'skipped', {
        workflow_id: workflowId,
        reason: workflowId ? null : 'No workflow record is configured for this system.',
      });
      setStage(1, 'complete');

      currentStage = 2;
      setStage(2, 'running');
      const { error: activationError } = await supabase
        .from('agents')
        .update({ status: 'active', deployed_at: new Date().toISOString() })
        .eq('id', systemId);
      if (activationError) {
        await record(3, 'activate-aura-configuration', 'failed', { message: activationError.message });
        throw activationError;
      }
      await record(3, 'activate-aura-configuration', 'succeeded', {
        runtime_provisioned: false,
      });
      setStage(2, 'complete');

      currentStage = 3;
      setStage(3, 'running');
      const connectorCount = system.connector_ids?.length ?? 0;
      const { data: intelligence, error: intelligenceError } = await supabase
        .from('intelligence_settings')
        .select('mcp_servers')
        .eq('system_id', systemId)
        .maybeSingle();
      if (intelligenceError) throw intelligenceError;
      const mcpServers = Array.isArray(intelligence?.mcp_servers) ? intelligence.mcp_servers : [];
      await record(4, 'resolve-configured-integrations', 'succeeded', {
        connector_count: connectorCount,
        mcp_server_count: mcpServers.length,
      });
      setStage(3, 'complete');

      currentStage = 4;
      setStage(4, 'running');
      await closeDeployment({
        deploymentId: deployment.id,
        status: 'active',
        runtimeUrl: null,
        health: null,
      });
      await record(5, 'aura-activation-complete', 'succeeded', {
        configuration_active: true,
        runtime_provisioned: false,
        runtime_verified: false,
        runtime_url: null,
        runtime_health: null,
      });
      await supabase.from('audit_logs').insert({
        user_id: user.id,
        action: 'activate_configuration',
        entity_type: 'system',
        entity_id: systemId,
        details: {
          deployment_id: deployment.id,
          runtime_provisioned: false,
          runtime_verified: false,
        },
      });
      setStage(4, 'complete');
      setActivated(true);
      toast({
        title: 'AURA configuration activated',
        description: 'The configuration is active in AURA. No external runtime has been provisioned or verified.',
      });
    } catch (cause) {
      setStage(currentStage, 'failed');
      const message = cause instanceof Error ? cause.message : 'Activation failed.';
      setError(message);
      if (deploymentId && actorId) {
        try {
          await appendDeploymentEvent({
            deploymentId,
            systemId,
            actorId,
            sequence: 99,
            stage: 'aura-activation-failed',
            status: 'failed',
            detail: { message },
          });
          await closeDeployment({ deploymentId, status: 'failed', errorMessage: message });
        } catch (evidenceError) {
          console.error('[ActivateInAura] failed to persist terminal evidence', evidenceError);
        }
      }
      toast({ title: 'Activation failed', description: message, variant: 'destructive' });
    } finally {
      setActivating(false);
    }
  }

  if (!systemId) {
    return (
      <div className="mx-auto max-w-2xl py-16">
        <DCCard title="No system selected" status="neutral">
          <div className="space-y-4 text-sm text-muted-foreground">
            <p>Activation requires a saved AURA system. Open Build and choose the configuration you want to activate.</p>
            <Button onClick={() => navigate('/builder')}>Open Build</Button>
          </div>
        </DCCard>
      </div>
    );
  }

  if (loading) {
    return (
      <main className="flex min-h-[60vh] items-center justify-center" role="status" aria-live="polite">
        <Loader2 className="h-8 w-8 animate-spin text-primary" aria-hidden="true" />
      </main>
    );
  }

  return (
    <div className="w-full min-w-0 space-y-6 py-8" data-testid="aura-activation-workspace">
      <DCSectionHeader
        as="h1"
        title="Activate in AURA"
        subtitle="Make a validated configuration active inside AURA and retain evidence of exactly what occurred. External infrastructure provisioning is a separate, evidence-gated capability."
        icon={<ShieldCheck className="h-5 w-5 text-primary" />}
      />

      {error && (
        <Alert variant="destructive">
          <CircleAlert className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        <DCCard title="Configuration" status={system ? 'operational' : 'critical'}>
          <div className="space-y-3 text-sm">
            <div className="flex items-center justify-between gap-3">
              <span className="text-muted-foreground">System</span>
              <span className="font-medium text-foreground">{system?.name ?? 'Unavailable'}</span>
            </div>
            <div className="flex items-center justify-between gap-3">
              <span className="text-muted-foreground">AI profile</span>
              <span className="font-medium text-foreground">{modelId ? modelDisplayLabel(modelId) : 'Server-managed / not selected'}</span>
            </div>
            <div className="flex items-center justify-between gap-3">
              <span className="text-muted-foreground">Workflow</span>
              <Badge variant="outline">{workflowId ? 'Configured' : 'Not configured'}</Badge>
            </div>
            <div className="flex items-center justify-between gap-3">
              <span className="text-muted-foreground">Configured connections</span>
              <Badge variant="outline">{system?.connector_ids?.length ?? 0}</Badge>
            </div>
          </div>
        </DCCard>

        <DCCard title="External runtime" status="neutral">
          <div className="space-y-3 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <Server className="h-4 w-4" aria-hidden="true" />
              <Badge variant="outline">Not connected</Badge>
            </div>
            <p>
              This action does not provision AWS, Azure, GCP, Kubernetes, GPU capacity, NVIDIA NIM, Omniverse, webhooks, or another external runtime.
            </p>
            <p>
              A runtime becomes verified only when AURA retains a runtime URL and health evidence from an approved deployment integration.
            </p>
          </div>
        </DCCard>
      </div>

      <DCCard title="Activation evidence" icon={<Database className="h-5 w-5 text-primary" />} status={activated ? 'operational' : 'neutral'}>
        <div className="space-y-3">
          {stages.map((stage) => (
            <div key={stage.label} className="flex items-center gap-3 rounded-md border border-border px-3 py-2 text-sm">
              {stage.status === 'running' ? (
                <Loader2 className="h-4 w-4 animate-spin text-primary" aria-hidden="true" />
              ) : stage.status === 'complete' ? (
                <CheckCircle2 className="h-4 w-4 text-green-600" aria-hidden="true" />
              ) : stage.status === 'failed' ? (
                <CircleAlert className="h-4 w-4 text-destructive" aria-hidden="true" />
              ) : (
                <Activity className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
              )}
              <span>{stage.label}</span>
            </div>
          ))}
        </div>
      </DCCard>

      {!activated ? (
        <div className="flex flex-wrap items-center gap-3">
          <Button onClick={() => { void activate(); }} disabled={activating || !system || !can('deployment.execute')} aria-busy={activating}>
            {activating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" /> : <ShieldCheck className="mr-2 h-4 w-4" aria-hidden="true" />}
            {activating ? 'Activating in AURA...' : 'Activate in AURA'}
          </Button>
          <Button variant="outline" onClick={() => navigate(`/builder?id=${systemId}`)}>Back to Build</Button>
        </div>
      ) : (
        <DCCard title="Continue the lifecycle" status="operational">
          <div className="flex flex-wrap gap-3">
            <Button onClick={() => navigate('/analytics')}>
              Continue to Operate <ArrowRight className="ml-2 h-4 w-4" aria-hidden="true" />
            </Button>
            <Button variant="outline" onClick={() => navigate('/evidence/overview')}>View Evidence</Button>
            <Button variant="outline" onClick={() => navigate('/deployments')}>View Activation History</Button>
          </div>
        </DCCard>
      )}
    </div>
  );
}
