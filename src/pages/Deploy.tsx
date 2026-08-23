import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { AlertTriangle, ArrowLeft, CheckCircle2, Loader2, Rocket, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { DCCard, DCSectionHeader, DCKPITile } from '@/components/dc-ui';
import { useRBAC } from '@/contexts/RBACContext';
import { supabase } from '@/integrations/supabase/client';
import { builderService } from '@/services/builderService';
import { intelligenceProfileForModel } from '@/config/auraRuntimeCatalog';
import { useToast } from '@/hooks/use-toast';

interface DeploymentSystem {
  id: string;
  name: string;
  status: string | null;
  deployed_at: string | null;
  config: Record<string, unknown>;
}

interface DeploymentEvidence {
  id: string;
  status: string;
  health: string | null;
  error_message: string | null;
  runtime_url: string | null;
  version: string;
  created_at: string | null;
  updated_at: string | null;
}

export default function Deploy() {
  const [searchParams] = useSearchParams();
  const systemId = searchParams.get('id');
  const navigate = useNavigate();
  const { toast } = useToast();
  const { can, loading: authorizationLoading } = useRBAC();
  const [system, setSystem] = useState<DeploymentSystem | null>(null);
  const [latestDeployment, setLatestDeployment] = useState<DeploymentEvidence | null>(null);
  const [loading, setLoading] = useState(true);
  const [activating, setActivating] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!systemId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setLoadError(null);
    try {
      const [systemResult, deploymentResult] = await Promise.all([
        supabase
          .from('agents')
          .select('id, name, status, deployed_at, config')
          .eq('id', systemId)
          .maybeSingle(),
        supabase
          .from('deployments')
          .select('id, status, health, error_message, runtime_url, version, created_at, updated_at')
          .eq('system_id', systemId)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle(),
      ]);

      if (systemResult.error) throw systemResult.error;
      if (!systemResult.data) throw new Error('System not found or not accessible.');
      if (deploymentResult.error) throw deploymentResult.error;

      setSystem({
        id: systemResult.data.id,
        name: systemResult.data.name,
        status: systemResult.data.status,
        deployed_at: systemResult.data.deployed_at,
        config: (systemResult.data.config ?? {}) as Record<string, unknown>,
      });
      setLatestDeployment(deploymentResult.data as DeploymentEvidence | null);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Deployment review could not be loaded.';
      setLoadError(message);
      setSystem(null);
      setLatestDeployment(null);
    } finally {
      setLoading(false);
    }
  }, [systemId]);

  useEffect(() => { void load(); }, [load]);

  const config = system?.config ?? {};
  const modelConfig = (config.model_config ?? {}) as Record<string, unknown>;
  const workflow = (config.workflow ?? {}) as Record<string, unknown>;
  const workflowActions = Array.isArray(workflow.actions) ? workflow.actions : [];
  const dcWorkflows = Array.isArray(config.workflows) ? config.workflows : [];
  const overview = (config.overview ?? {}) as Record<string, unknown>;
  const intelligence = (config.intelligence ?? {}) as Record<string, unknown>;
  const modelId = String(modelConfig.model ?? intelligence.modelId ?? '');
  const profile = intelligenceProfileForModel(modelId || null);

  const checks = useMemo(() => {
    if (!system) return [];
    const goal = String(config.goal ?? overview.twinSummary ?? overview.description ?? '').trim();
    const industryValue = config.industry ?? overview.industry ?? (Array.isArray(overview.industries) ? overview.industries[0] : null);
    const departmentValue = config.department ?? (config.overview ? 'Data Centre Operations' : null);
    const typeValue = config.type ?? (config.overview ? '3d_twin' : null);
    return [
      { label: 'Objective recorded', pass: Boolean(goal) },
      { label: 'Industry recorded', pass: Boolean(industryValue) },
      { label: 'Department recorded', pass: Boolean(departmentValue) },
      { label: 'Build type recorded', pass: Boolean(typeValue) },
      { label: 'Intelligence configuration recorded', pass: Boolean(modelId) },
      { label: 'Workflow recorded', pass: workflowActions.length > 0 || dcWorkflows.length > 0 },
    ];
  }, [config, dcWorkflows.length, modelId, overview, system, workflowActions.length]);

  const blockers = checks.filter((check) => !check.pass);
  const canExecuteDeployment = can('deployment.execute');

  const activate = async () => {
    if (!systemId || activating) return;
    if (!canExecuteDeployment) {
      toast({
        title: 'Deployment permission required',
        description: 'Your active authorization grants do not include deployment execution.',
        variant: 'destructive',
      });
      return;
    }
    if (blockers.length > 0) {
      toast({
        title: 'Configuration incomplete',
        description: 'Resolve the recorded configuration blockers before activation.',
        variant: 'destructive',
      });
      return;
    }

    setActivating(true);
    try {
      const result = await builderService.deploy(systemId);
      if (result.status !== 'success') throw new Error(result.message ?? 'Server rejected activation.');
      toast({
        title: 'Activation recorded',
        description: 'The server authorized the request and recorded the deployment result. Runtime health remains a separate evidence state.',
      });
      await load();
    } catch (error) {
      toast({
        title: 'Activation blocked',
        description: error instanceof Error ? error.message : 'The server rejected the deployment request.',
        variant: 'destructive',
      });
    } finally {
      setActivating(false);
    }
  };

  if (!systemId) {
    return (
      <div className="mx-auto max-w-2xl py-16">
        <DCCard title="No system selected">
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">Deployment review is scoped to one saved AURA system. Open a build and use its Review & Deployment Controls handoff.</p>
            <Button onClick={() => navigate('/builder')}>Open Builder</Button>
          </div>
        </DCCard>
      </div>
    );
  }

  if (loading || authorizationLoading) {
    return <div className="flex min-h-[50vh] items-center justify-center" role="status"><Loader2 className="h-7 w-7 animate-spin" aria-hidden /><span className="sr-only">Loading deployment review</span></div>;
  }

  if (loadError || !system) {
    return (
      <div className="mx-auto max-w-2xl py-16">
        <DCCard title="Deployment review unavailable">
          <div className="space-y-4">
            <p className="text-sm text-destructive">{loadError ?? 'System unavailable.'}</p>
            <Button variant="outline" onClick={() => navigate('/builder')}><ArrowLeft className="mr-2 h-4 w-4" />Return to Builder</Button>
          </div>
        </DCCard>
      </div>
    );
  }

  return (
    <div className="min-w-0 space-y-6 pb-10" data-testid="deployment-review-page">
      <DCSectionHeader
        as="h1"
        title="Deployment Review"
        subtitle="Server-authorized activation for one configured AURA system. This page does not deploy AURA application source code."
        icon={<Rocket className="h-5 w-5" />}
      />

      <div className="rounded-md border bg-muted/30 p-4 text-sm text-muted-foreground">
        Application release to the AURA production website remains controlled by the repository release-governance process. This workflow activates a tenant-scoped AURA system only.
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <DCKPITile label="System state" value={system.status ?? 'Unknown'} sublabel="persisted agent record" status="info" icon={<ShieldCheck className="h-4 w-4" />} />
        <DCKPITile label="Design checks" value={`${checks.length - blockers.length}/${checks.length}`} sublabel="persisted configuration" status={blockers.length ? 'warning' : 'normal'} icon={<CheckCircle2 className="h-4 w-4" />} />
        <DCKPITile label="Intelligence" value={`AURA ${profile.name}`} sublabel="design profile" status="info" icon={<ShieldCheck className="h-4 w-4" />} />
        <DCKPITile label="Runtime health" value={latestDeployment?.health ?? 'Not verified'} sublabel="latest deployment evidence" status={latestDeployment?.health ? 'info' : 'warning'} icon={<ShieldCheck className="h-4 w-4" />} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <DCCard title="Persisted configuration">
          <div className="space-y-3 text-sm">
            <div className="flex justify-between gap-4"><span className="text-muted-foreground">System</span><span className="font-medium">{system.name}</span></div>
            <div className="flex justify-between gap-4"><span className="text-muted-foreground">Intelligence profile</span><span className="font-medium">AURA {profile.name}</span></div>
            <div className="flex justify-between gap-4"><span className="text-muted-foreground">Workflow actions</span><span className="font-medium tabular-nums">{workflowActions.length || dcWorkflows.length}</span></div>
            <div className="flex justify-between gap-4"><span className="text-muted-foreground">Last activated</span><span className="font-medium">{system.deployed_at ? new Date(system.deployed_at).toLocaleString() : 'Never recorded'}</span></div>
          </div>
        </DCCard>

        <DCCard title="Latest deployment evidence">
          {latestDeployment ? (
            <div className="space-y-3 text-sm">
              <div className="flex flex-wrap gap-2"><Badge variant="outline">{latestDeployment.status}</Badge><Badge variant="secondary">{latestDeployment.version}</Badge></div>
              <p className="text-muted-foreground">Health: {latestDeployment.health ?? 'Not verified'}</p>
              <p className="text-muted-foreground">Runtime URL: {latestDeployment.runtime_url ?? 'Not recorded'}</p>
              {latestDeployment.error_message && <p className="text-destructive">{latestDeployment.error_message}</p>}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No deployment record exists for this system.</p>
          )}
        </DCCard>
      </div>

      {blockers.length > 0 && (
        <DCCard title="Configuration blockers" icon={<AlertTriangle className="h-4 w-4" />}>
          <div className="space-y-2">{blockers.map((blocker) => <div key={blocker.label} className="rounded-md border bg-muted/20 p-3 text-sm">{blocker.label}</div>)}</div>
        </DCCard>
      )}

      {!canExecuteDeployment && (
        <div role="alert" className="flex items-start gap-3 rounded-md border border-amber-500/30 bg-amber-500/5 p-4 text-sm">
          <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
          <p>Your current active role grants do not authorize deployment execution. The server independently enforces the same rule.</p>
        </div>
      )}

      <DCCard title="Activation control" icon={<ShieldCheck className="h-4 w-4" />}>
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Activation re-reads the saved system on the server, verifies caller approval and active global deployment permission, validates the persisted configuration, then records the result. A successful request does not imply runtime health until health evidence is observed.
          </p>
          <div className="flex flex-wrap gap-3">
            <Button variant="outline" onClick={() => navigate(`/builder?draft=${encodeURIComponent(systemId)}`)}><ArrowLeft className="mr-2 h-4 w-4" />Back to Builder</Button>
            <Button onClick={() => void activate()} disabled={activating || blockers.length > 0 || !canExecuteDeployment}>
              {activating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Rocket className="mr-2 h-4 w-4" />}
              {activating ? 'Authorizing activation…' : 'Activate system'}
            </Button>
          </div>
        </div>
      </DCCard>
    </div>
  );
}
