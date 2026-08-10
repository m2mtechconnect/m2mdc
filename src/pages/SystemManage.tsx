import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Loader2, ArrowLeft, AlertCircle } from 'lucide-react';
import { TwinDetailsLayout } from '@/components/system-manage/TwinDetailsLayout';
import { useToast } from '@/hooks/use-toast';
import type { DeployedSystem } from '@/types/system';

/**
 * System Management Page
 * Displays detailed information about a deployed system using the unified layout
 * that is shared with marketplace template previews
 */
export default function SystemManage() {
  const { t } = useTranslation();
  const { systemId } = useParams<{ systemId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();

  // Fetch system details
  const { data: systemData, isLoading, error } = useQuery({
    queryKey: ['system-manage', systemId],
    queryFn: async () => {
      if (!systemId) throw new Error('System ID is required');

      // Fetch system from agents table
      const { data: agent, error: agentError } = await supabase
        .from('agents')
        .select('*')
        .eq('id', systemId)
        .single();

      if (agentError) throw agentError;
      if (!agent) throw new Error('System not found');

      // Fetch recent runs
      const { data: runs } = await supabase
        .from('agent_runs')
        .select('*')
        .eq('agent_id', systemId)
        .order('created_at', { ascending: false })
        .limit(10);

      // Fetch intelligence settings
      const { data: intelligence } = await supabase
        .from('intelligence_settings')
        .select('*')
        .eq('system_id', systemId)
        .single();

      // Transform to DeployedSystem format
      const system: DeployedSystem = {
        id: agent.id,
        name: agent.name,
        description: agent.description || '',
        department: 'Operations', // TODO: get from agent config
        category: 'Digital Twin',
        type: 'system',
        status: agent.status as 'active' | 'draft' | 'paused' | 'archived',
        version: agent.version,
        templateId: agent.template_id,
        createdAt: agent.created_at,
        updatedAt: agent.updated_at,
        deployedAt: agent.deployed_at,
        roi: 0, // TODO: calculate from metrics
        successRate: agent.success_rate || 0,
        totalRuns: agent.total_runs || 0,
        avgDuration: undefined,
        connectedAppsCount: 0,
        lastRun: runs && runs.length > 0 ? {
          timestamp: runs[0].created_at,
          channel: 'API',
          status: runs[0].status,
        } : undefined,
        recentActivity: [],
        intelligence: intelligence ? {
          modelId: intelligence.model_id || 'Gemini 2.5 Flash',
          temperature: 0.7,
          knowledgeSources: [],
        } : undefined,
        tools: [],
        workflows: [],
        recentRuns: runs?.map(run => ({
          id: run.id,
          timestamp: run.created_at,
          status: run.status as 'success' | 'error',
          duration: run.duration_ms || 0,
          channel: 'API',
          user: run.user_id,
          error: run.error,
        })) || [],
        versions: [
          {
            version: agent.version,
            publishedAt: agent.deployed_at || agent.created_at,
            publishedBy: agent.owner_id,
          }
        ],
      };

      return system;
    },
    enabled: !!systemId,
  });

  const handleRun = () => {
    if (systemData) {
      navigate(`/agents/${systemData.id}/chat`);
    }
  };

  const handleEdit = () => {
    if (systemData) {
      navigate(`/builder?systemId=${systemData.id}`);
    }
  };

  const handleClone = async () => {
    if (systemData) {
      toast({
        title: 'Clone functionality',
        description: 'System cloning will be available soon',
      });
    }
  };

  const handleArchive = async () => {
    if (systemData) {
      const { error } = await supabase
        .from('agents')
        .update({ status: 'archived' })
        .eq('id', systemData.id);

      if (error) {
        toast({
          title: 'Error',
          description: 'Failed to archive system',
          variant: 'destructive',
        });
      } else {
        toast({
          title: 'Success',
          description: 'System archived successfully',
        });
        navigate('/dashboard');
      }
    }
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
    return (
      <div className="container mx-auto py-8 max-w-7xl">
        <div className="text-center py-12">
          <div className="max-w-md mx-auto">
            <div className="mb-4 p-4 rounded-full bg-destructive/10 w-16 h-16 flex items-center justify-center mx-auto">
              <AlertCircle className="h-8 w-8 text-destructive" />
            </div>
            <h3 className="text-lg font-semibold mb-2">System Not Found</h3>
            <p className="text-muted-foreground mb-4">
              {error instanceof Error ? error.message : 'The system you are looking for does not exist or you do not have access to it.'}
            </p>
            <Button onClick={() => navigate('/dashboard')}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Dashboard
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 max-w-7xl">
      {/* Header */}
      <div className="mb-6">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate('/dashboard')}
          className="mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Dashboard
        </Button>
        <h1 className="text-h1 font-display mb-2">System Management</h1>
        <p className="text-muted-foreground">
          View and manage your deployed digital twin or agent
        </p>
      </div>

      {/* Unified Layout with System Mode */}
      <TwinDetailsLayout
        mode="system"
        agentName={systemData.name}
        description={systemData.description}
        llmModel={systemData.intelligence?.modelId}
        llmProvider="Google"
        temperature={systemData.intelligence?.temperature}
        mcpServers={[]}
        toolsCount={systemData.tools?.length || 0}
        resourcesCount={systemData.intelligence?.knowledgeSources?.length || 0}
        promptsCount={0}
        features={[
          `${systemData.totalRuns} total runs`,
          `${Math.round(systemData.successRate)}% success rate`,
          `${systemData.roi}% ROI`,
        ]}
        setupInstructions={[]}
        compatibility={{
          mcpEnabled: true,
          llmCompatible: ['Gemini', 'OpenAI'],
          cloudReady: true,
          enterpriseSecure: true,
        }}
        system={systemData}
        onRun={handleRun}
        onEdit={handleEdit}
        onClone={handleClone}
        onArchive={handleArchive}
      />
    </div>
  );
}
