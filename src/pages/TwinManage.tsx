import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Loader2, ArrowLeft, AlertCircle } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import type { DeployedSystem } from '@/types/system';
import { AOCUnifiedHeader } from '@/components/aoc/AOCUnifiedHeader';
import { AOCLiveTab } from '@/components/aoc/AOCLiveTab';
import { AOCWorkflowTab } from '@/components/aoc/AOCWorkflowTab';
import { AOCDesignTab } from '@/components/aoc/AOCDesignTab';
import { AOCSimulationTab } from '@/components/aoc/AOCSimulationTab';
import { AOCMetricsTab } from '@/components/aoc/AOCMetricsTab';
import { AOCDeployTab } from '@/components/aoc/AOCDeployTab';
import { AOCGovernanceTab } from '@/components/aoc/AOCGovernanceTab';
import { useCoPilotContext } from '@/contexts/CoPilotContext';
import { isUuid } from '@/lib/identifiers';

/**
 * AURA Agent Operations Center (AOC)
 * Enterprise-grade management console for deployed agents
 * Canonical Route: /app/agents/:agentId/manage
 */
export default function TwinManage() {
  const { t } = useTranslation();
  const { instanceId, agentId } = useParams<{ instanceId?: string; agentId?: string }>();
  const resolvedId = agentId || instanceId;
  const navigate = useNavigate();
  const { toast } = useToast();
  const { updateContext } = useCoPilotContext();
  const [activeTab, setActiveTab] = useState('live');

  // Sample/placeholder ids (e.g. `agent-1`, `twin-1`) are not UUIDs. Querying
  // with them makes Postgres reject the request with HTTP 400, so guard first
  // and render a truthful empty state instead of a failed network call.
  const hasValidId = isUuid(resolvedId);

  // Fetch deployed instance data
  const { data: instance, isLoading, error } = useQuery({
    queryKey: ['aoc-instance', resolvedId],
    queryFn: async () => {
      if (!resolvedId) throw new Error('Agent ID is required');

      // Fetch agent from agents table
      const { data: agent, error: agentError } = await supabase
        .from('agents')
        .select('*')
        .eq('id', resolvedId)
        .single();

      if (agentError) throw agentError;
      if (!agent) throw new Error('Agent not found');

      // Fetch recent runs
      const { data: runs } = await supabase
        .from('agent_runs')
        .select('*')
        .eq('agent_id', resolvedId)
        .order('created_at', { ascending: false })
        .limit(10);

      // Transform to DeployedSystem format
      const system: DeployedSystem = {
        id: agent.id,
        name: agent.name,
        description: agent.description || '',
        department: 'Operations',
        category: 'Digital Twin',
        type: 'system',
        status: agent.status as 'active' | 'draft' | 'paused' | 'archived',
        version: agent.version,
        templateId: agent.template_id,
        createdAt: agent.created_at,
        updatedAt: agent.updated_at,
        deployedAt: agent.deployed_at,
        roi: 0,
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
    enabled: hasValidId,
    retry: false,
  });

  // Update Co-Pilot context when tab or agent changes
  useEffect(() => {
    if (resolvedId && instance) {
      updateContext({
        activePage: 'agent_detail',
        activeTab,
        agentId: resolvedId,
        agentName: instance.name,
        agentStatus: instance.status,
      });
    }
  }, [resolvedId, activeTab, instance, updateContext]);

  const handleEdit = () => {
    if (instance) {
      navigate(`/builder?systemId=${instance.id}`);
    }
  };

  if (!hasValidId) {
    return (
      <div className="min-h-screen flex items-center justify-center p-8">
        <div className="max-w-md text-center">
          <div className="mb-4 p-4 rounded-full bg-muted w-16 h-16 flex items-center justify-center mx-auto">
            <AlertCircle aria-hidden="true" className="h-8 w-8 text-muted-foreground" />
          </div>
          <h1 className="text-lg font-semibold mb-2">Invalid agent reference</h1>
          <p className="text-muted-foreground mb-4">
            {resolvedId
              ? `"${resolvedId}" is not a valid agent identifier. This link may be a sample or demo URL.`
              : 'No agent identifier was provided in this link.'}
          </p>
          <Button onClick={() => navigate('/app/agents')}>
            <ArrowLeft aria-hidden="true" className="h-4 w-4 mr-2" />
            Back to Agents
          </Button>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !instance) {
    return (
      <div className="min-h-screen flex items-center justify-center p-8">
        <div className="max-w-md text-center">
          <div className="mb-4 p-4 rounded-full bg-destructive/10 w-16 h-16 flex items-center justify-center mx-auto">
            <AlertCircle className="h-8 w-8 text-destructive" />
          </div>
          <h3 className="text-lg font-semibold mb-2">Instance Not Found</h3>
          <p className="text-muted-foreground mb-4">
            {error instanceof Error ? error.message : 'The instance you are looking for does not exist or you do not have access to it.'}
          </p>
          <Button onClick={() => navigate('/app/agents')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Agents
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Back Button */}
      <div className="sticky top-0 z-20 bg-background border-b">
        <div className="container mx-auto px-6 py-3 max-w-7xl">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/app/agents')}
            className="gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Agents
          </Button>
        </div>
      </div>

      {/* AOC Unified Header */}
      <div className="container mx-auto px-6 max-w-7xl py-6">
        <AOCUnifiedHeader
          instance={instance}
          icon="🤖"
          onEdit={handleEdit}
          onClone={() => navigate(`/builder?cloneFrom=${resolvedId}`)}
        />
      </div>

      {/* AOC Tabs */}
      <div className="container mx-auto px-6 max-w-7xl pb-8">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-7 mb-6 sticky top-[60px] z-10 bg-background">
            <TabsTrigger value="live">Live</TabsTrigger>
            <TabsTrigger value="workflow">Workflow</TabsTrigger>
            <TabsTrigger value="design">Design</TabsTrigger>
            <TabsTrigger value="simulation">Simulation</TabsTrigger>
            <TabsTrigger value="metrics">Metrics</TabsTrigger>
            <TabsTrigger value="deploy">Deploy</TabsTrigger>
            <TabsTrigger value="governance">Governance</TabsTrigger>
          </TabsList>

          <div className="min-h-[600px]">
            <TabsContent value="live" className="mt-0">
              <AOCLiveTab agentId={resolvedId!} />
            </TabsContent>

            <TabsContent value="workflow" className="mt-0">
              <AOCWorkflowTab agentId={resolvedId!} />
            </TabsContent>

            <TabsContent value="design" className="mt-0">
              <AOCDesignTab instance={instance} />
            </TabsContent>

            <TabsContent value="simulation" className="mt-0">
              <AOCSimulationTab agentId={resolvedId!} />
            </TabsContent>

            <TabsContent value="metrics" className="mt-0">
              <AOCMetricsTab instance={instance} />
            </TabsContent>

            <TabsContent value="deploy" className="mt-0">
              <AOCDeployTab agentId={resolvedId!} currentVersion={instance.version} />
            </TabsContent>

            <TabsContent value="governance" className="mt-0">
              <AOCGovernanceTab agentId={resolvedId!} />
            </TabsContent>
          </div>
        </Tabs>
      </div>
    </div>
  );
}
