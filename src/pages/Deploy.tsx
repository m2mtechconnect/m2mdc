import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Activity, ArrowLeft, CheckCircle2, CircleAlert, Loader2, Rocket, Server, Wrench } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useRBAC } from '@/contexts/RBACContext';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { DCCard } from '@/components/dc-ui/DCCard';
import { DCKPITile } from '@/components/dc-ui/DCKPITile';
import { SectionCard, WorkspaceHeader } from '@/components/workspace-system';
import { DeploymentEvidenceCard } from '@/components/deploy/DeploymentEvidenceCard';
import {
  appendDeploymentEvent,
  closeDeployment,
  openDeployment,
} from '@/workspace/deploymentRecords';

interface SystemSummary {
  name: string;
  status: string;
  model: string | null;
  grounding: boolean;
  workflowId: string | null;
  connectorCount: number;
  toolCount: number;
}

interface ActivationStage {
  name: string;
  status: 'pending' | 'running' | 'complete' | 'failed';
}

const STAGE_NAMES = [
  'Validate saved configuration',
  'Inspect saved workflow',
  'Activate configuration in AURA',
  'Resolve configured connections',
  'Record activation evidence',
];

export default function Deploy() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const systemId = searchParams.get('id');
  const { toast } = useToast();
  const { can } = useRBAC();

  const [summary, setSummary] = useState<SystemSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [activating, setActivating] = useState(false);
  const [stages, setStages] = useState<ActivationStage[]>([]);
  const [error, setError] = useState<string | null>(null);

  const canActivate = can('deployment.execute');

  useEffect(() => {
    if (!systemId) {
      setLoading(false);
      return;
    }

    let cancelled = false;
    void (async () => {
      try {
        setLoading(true);
        setError(null);

        const { data: agent, error: agentError } = await supabase
          .from('agents')
          .select('id, name, status, config, connector_ids')
          .eq('id', systemId)
          .maybeSingle();
        if (agentError) throw agentError;
        if (!agent) throw new Error('The selected system is not available in this organization.');

        const { data: workflow, error: workflowError } = await supabase
          .from('workflows')
          .select('id')
          .eq('system_id', systemId)
          .maybeSingle();
        if (workflowError) throw workflowError;

        const { data: intelligence, error: intelligenceError } = await supabase
          .from('intelligence_settings')
          .select('mcp_servers')
          .eq('system_id', systemId)
          .maybeSingle();
        if (intelligenceError) throw intelligenceError;

        const config = agent.config && typeof agent.config === 'object' && !Array.isArray(agent.config)
          ? agent.config as Record<string, unknown>
          : {};
        const selectedModel = typeof config.selectedModel === 'string'
          ? config.selectedModel
          : typeof config.model === 'string'
            ? config.model
            : null;
        const grounding = config.grounding === true;
        const tools = Array.isArray(intelligence?.mcp_servers) ? intelligence.mcp_servers.length : 0;

        if (!cancelled) {
          setSummary({
            name: agent.name ?? 'Untitled system',
            status: agent.status ?? 'draft',
            model: selectedModel,
            grounding,
            workflowId: workflow?.id ?? null,
            connectorCount: Array.isArray(agent.connector_ids) ? agent.connector_ids.length : 0,
            toolCount: tools,
          });
        }
      } catch (cause) {
        if (!cancelled) setError(cause instanceof Error ? cause.message : 'System configuration could not be loaded.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, [systemId]);

  function setStage(index: number, status: ActivationStage['status']) {
    setStages((current) => current.map((stage, stageIndex) => stageIndex === index ? { ...stage, status } : stage));
  }

  async function activateInAura() {
    if (!systemId || !summary || activating || !canActivate) return;

    setActivating(true);
    setError(null);
    setStages(STAGE_NAMES.map((name) => ({ name, status: 'pending' })));

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
        model: summary.model,
        grounding: summary.grounding,
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
        system_status_before: summary.status,
        workflow_present: Boolean(summary.workflowId),
      });
      setStage(0, 'complete');

      currentStage = 1;
      setStage(1, 'running');
      await record(2, 'inspect-workflow', summary.workflowId ? 'succeeded' : 'skipped', {
        workflow_id: summary.workflowId,
      });
      setStage(1, 'complete');

      currentStage = 2;
      setStage(2, 'running');
      const { error: activationError } = await supabase
        .from('agents')
        .update({ status: 'active', deployed_at: new Date().toISOString() })
        .eq('id', systemId);
      if (activationError) {
        await record(3, 'activate-configuration', 'failed', { message: activationError.message });
        throw activationError;
      }
      await record(3, 'activate-configuration', 'succeeded', {
        external_runtime_provisioned: false,
      });
      setStage(2, 'complete');

      currentStage = 3;
      setStage(3, 'running');
      await record(4, 'resolve-connections', 'succeeded', {
        connector_count: summary.connectorCount,
        tool_count: summary.toolCount,
        data_flow_verified: false,
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
      await record(5, 'activation-complete', 'succeeded', {
        configuration_active: true,
        runtime_url: null,
        runtime_health: null,
        runtime_verified: false,
      });
      await supabase.from('audit_logs').insert({
        user_id: user.id,
        action: 'activate_configuration',
        entity_type: 'system',
        entity_id: systemId,
        details: {
          deployment_id: deployment.id,
          configuration_active: true,
          external_runtime_provisioned: false,
          runtime_verified: false,
        },
      });
      setStage(4, 'complete');

      toast({
        title: 'Configuration active in AURA',
        description: 'Activation evidence was recorded. No external cloud or model runtime was provisioned by this action.',
      });
      navigate('/deployments');
    } catch (cause) {
      setStage(currentStage, 'failed');
      const message = cause instanceof Error ? cause.message : 'Activation failed.';
      setError(message);

      if (deploymentId && actorId && systemId) {
        await appendDeploymentEvent({
          deploymentId,
          systemId,
          actorId,
          sequence: 99,
          stage: 'activation-failed',
          status: 'failed',
          detail: { message },
        });
        try {
          await closeDeployment({ deploymentId, status: 'failed', errorMessage: message });
        } catch (closeError) {
          console.error('[Deploy] Failed to close activation record', closeError);
        }
      }

      toast({ title: 'Activation failed', description: message, variant: 'destructive' });
    } finally {
      setActivating(false);
    }
  }

  if (!systemId) {
    return (
      <div className="container mx-auto max-w-2xl py-16">
        <DCCard title="No system selected">
          <div className="space-y-4 p-1">
            <p className="text-sm text-muted-foreground">
              Activation applies to one configured system. Open the Builder and select the system you want to activate in AURA.
            </p>
            <Button onClick={() => navigate('/builder')}>Open Builder</Button>
          </div>
        </DCCard>
      </div>
    );
  }

  if (loading) {
    return (
      <main className="flex min-h-[60vh] items-center justify-center" role="status" aria-busy="true">
        <Loader2 className="h-8 w-8 animate-spin text-primary" aria-hidden="true" />
      </main>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto max-w-6xl p-6">
        <WorkspaceHeader
          eyebrow="Operate"
          title="Activate in AURA"
          icon={Rocket}
          capabilityId="governance.controls"
          description="Activate the saved AURA configuration and record immutable evidence. This transaction does not provision an external runtime."
          badges={<Badge variant="outline">Configuration activation</Badge>}
          actions={
            <>
              <Button variant="ghost" size="sm" onClick={() => navigate(`/builder?id=${systemId}`)}>
                <ArrowLeft className="mr-2 h-4 w-4" aria-hidden="true" />
                Back to Builder
              </Button>
              <Button variant="outline" size="sm" onClick={() => navigate('/deployments')}>Activation history</Button>
            </>
          }
        />

        <Alert className="mb-6">
          <CircleAlert className="h-4 w-4" aria-hidden="true" />
          <AlertDescription>
            <strong>Runtime boundary:</strong> this action does not provision AWS, Azure, GCP, Kubernetes, GPU capacity, NVIDIA NIM, Omniverse, webhooks, or model-serving infrastructure. Runtime verification requires separate URL and health evidence.
          </AlertDescription>
        </Alert>

        {error && (
          <Alert variant="destructive" className="mb-6">
            <CircleAlert className="h-4 w-4" aria-hidden="true" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <SectionCard
          title="Activation readiness"
          description="Facts read from the saved AURA system configuration. Managed AI model serving is configured separately from runtime activation."
          icon={Activity}
          className="mb-6"
        >
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <DCKPITile label="System" value={summary?.name ?? 'Unavailable'} sublabel={summary?.status ?? 'unknown'} status="info" icon={<Server className="h-4 w-4" />} />
            <DCKPITile label="Workflow" value={summary?.workflowId ? 'Configured' : 'Not configured'} sublabel="Saved workflow record" status={summary?.workflowId ? 'normal' : 'info'} icon={<Wrench className="h-4 w-4" />} />
            <DCKPITile label="Connections" value={(summary?.connectorCount ?? 0).toString()} sublabel="Configured connector references" status="info" icon={<Activity className="h-4 w-4" />} />
            <DCKPITile label="Runtime evidence" value="Not provided" sublabel="No URL or health evidence" status="warning" icon={<CircleAlert className="h-4 w-4" />} />
          </div>
        </SectionCard>

        <div className="grid gap-6 lg:grid-cols-[1fr_0.9fr]">
          <DCCard title="Configuration activation" status="info" className="p-6">
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Activating marks this saved AURA configuration active, resolves its configured connection references, and writes an immutable activation event trail.
              </p>
              <div className="rounded-lg border border-border bg-muted/20 p-4 text-sm">
                <p><span className="font-medium">System:</span> {summary?.name}</p>
                <p><span className="font-medium">Grounding requested:</span> {summary?.grounding ? 'Yes' : 'No'}</p>
                <p><span className="font-medium">External runtime:</span> Not provisioned by this action</p>
                <p><span className="font-medium">Runtime health:</span> Not verified</p>
              </div>
              <Button className="w-full" size="lg" disabled={!canActivate || activating || !summary} onClick={() => { void activateInAura(); }}>
                {activating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" /> : <CheckCircle2 className="mr-2 h-4 w-4" aria-hidden="true" />}
                {activating ? 'Activating...' : 'Activate in AURA'}
              </Button>
              {!canActivate && <p className="text-center text-sm text-muted-foreground">Your current role cannot activate configurations.</p>}
            </div>
          </DCCard>

          <DCCard title="Observed activation stages" status="neutral" className="p-6">
            <div className="space-y-3">
              {(stages.length ? stages : STAGE_NAMES.map((name) => ({ name, status: 'pending' as const }))).map((stage) => (
                <div key={stage.name} className="flex items-center justify-between gap-3 rounded-md border border-border p-3 text-sm">
                  <span>{stage.name}</span>
                  <Badge variant={stage.status === 'failed' ? 'destructive' : stage.status === 'complete' ? 'default' : 'outline'}>
                    {stage.status}
                  </Badge>
                </div>
              ))}
            </div>
          </DCCard>
        </div>

        <div className="mt-6">
          <DeploymentEvidenceCard systemId={systemId} />
        </div>
      </div>
    </div>
  );
}
