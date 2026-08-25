import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Loader2, ArrowLeft, AlertCircle } from 'lucide-react';
import { TwinDetailsLayout } from '@/components/system-manage/TwinDetailsLayout';
import { useToast } from '@/hooks/use-toast';
import type { DeployedSystem } from '@/types/system';
import { describeDataError, isNotFoundError } from '@/lib/queryRetry';

/**
 * System Management Page.
 *
 * Truth contract: fields are populated only from persisted records queried on
 * this page. Missing runtime/configuration evidence remains unavailable. The
 * page does not infer an LLM provider, temperature, MCP support, cloud
 * readiness, enterprise-security certification, integrations, or ROI.
 */
export default function SystemManage() {
  const { systemId } = useParams<{ systemId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();

  const { data: systemData, isLoading, error } = useQuery({
    queryKey: ['system-manage', systemId],
    queryFn: async () => {
      if (!systemId) throw new Error('System ID is required');

      const { data: agent, error: agentError } = await supabase
        .from('agents')
        .select('*')
        .eq('id', systemId)
        .single();

      if (agentError) throw agentError;
      if (!agent) throw new Error('System not found');

      const runsResult = await supabase
        .from('agent_runs')
        .select('*')
        .eq('agent_id', systemId)
        .order('created_at', { ascending: false })
        .limit(10);

      const intelligenceResult = await supabase
        .from('intelligence_settings')
        .select('*')
        .eq('system_id', systemId)
        .maybeSingle();

      if (runsResult.error) {
        console.warn('SystemManage: recent run evidence unavailable:', runsResult.error.message);
      }
      if (intelligenceResult.error) {
        console.warn('SystemManage: intelligence configuration unavailable:', intelligenceResult.error.message);
      }

      const runs = runsResult.error ? undefined : runsResult.data ?? [];
      const intelligence = intelligenceResult.error ? undefined : intelligenceResult.data ?? undefined;

      const system: DeployedSystem = {
        id: agent.id,
        name: agent.name,
        description: agent.description ?? '',
        department: null,
        category: 'Managed system',
        type: 'system',
        status: agent.status as DeployedSystem['status'],
        version: agent.version,
        templateId: agent.template_id ?? undefined,
        createdAt: agent.created_at,
        updatedAt: agent.updated_at,
        deployedAt: agent.deployed_at ?? undefined,
        roi: null,
        successRate: typeof agent.success_rate === 'number' ? agent.success_rate : null,
        totalRuns: typeof agent.total_runs === 'number' ? agent.total_runs : null,
        lastRun: runs?.length ? {
          timestamp: runs[0].created_at,
          channel: null,
          status: runs[0].status,
        } : undefined,
        intelligence: intelligence ? {
          modelId: intelligence.model_id ?? null,
        } : undefined,
        recentRuns: runs?.map((run) => ({
          id: run.id,
          timestamp: run.created_at,
          status: run.status,
          duration: typeof run.duration_ms === 'number' ? run.duration_ms : null,
          channel: null,
          user: run.user_id ?? undefined,
          error: run.error ?? undefined,
        })),
        versions: agent.version && agent.owner_id ? [
          {
            version: agent.version,
            publishedAt: agent.deployed_at ?? agent.created_at,
            publishedBy: agent.owner_id,
          },
        ] : undefined,
      };

      return system;
    },
    enabled: Boolean(systemId),
  });

  const handleEdit = () => {
    if (systemData) navigate(`/builder?systemId=${systemData.id}`);
  };

  const handleArchive = async () => {
    if (!systemData) return;

    const { error: archiveError } = await supabase
      .from('agents')
      .update({ status: 'archived' })
      .eq('id', systemData.id);

    if (archiveError) {
      toast({ title: 'Error', description: 'Failed to archive system', variant: 'destructive' });
      return;
    }

    toast({ title: 'Success', description: 'System archived successfully' });
    navigate('/dashboard');
  };

  if (isLoading) {
    return (
      <div className="container mx-auto py-8 max-w-7xl">
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  if (error || !systemData) {
    const notFound = isNotFoundError(error);
    return (
      <div className="container mx-auto py-8 max-w-7xl">
        <div className="text-center py-12" role="alert" aria-live="polite">
          <div className="max-w-md mx-auto">
            <div className="mb-4 p-4 rounded-full bg-destructive/10 w-16 h-16 flex items-center justify-center mx-auto">
              <AlertCircle className="h-8 w-8 text-destructive" />
            </div>
            <h1 className="text-lg font-semibold mb-2">
              {notFound ? 'System not found' : 'System could not be loaded'}
            </h1>
            <p className="text-muted-foreground mb-4">{describeDataError(error)}</p>
            <Button onClick={() => navigate('/app/agents')}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to systems
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const featureEvidence = [
    ...(typeof systemData.totalRuns === 'number' ? [`${systemData.totalRuns} recorded runs`] : []),
    ...(typeof systemData.successRate === 'number' ? [`${Math.round(systemData.successRate)}% stored success rate`] : []),
    ...(typeof systemData.roi === 'number' ? [`${systemData.roi}% measured ROI`] : []),
  ];

  return (
    <div className="container mx-auto py-8 max-w-7xl">
      <div className="mb-6">
        <Button variant="ghost" size="sm" onClick={() => navigate('/dashboard')} className="mb-4">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Dashboard
        </Button>
        <h1 className="text-h1 font-display mb-2">System Management</h1>
        <p className="text-muted-foreground">Persisted configuration and available runtime evidence for this system.</p>
      </div>

      <TwinDetailsLayout
        mode="system"
        agentName={systemData.name}
        description={systemData.description}
        llmModel={systemData.intelligence?.modelId ?? undefined}
        temperature={systemData.intelligence?.temperature ?? undefined}
        features={featureEvidence}
        system={systemData}
        onEdit={handleEdit}
        onArchive={handleArchive}
      />
    </div>
  );
}
