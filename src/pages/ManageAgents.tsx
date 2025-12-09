import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Bot, Wrench, ArrowLeft, Server, Activity, Zap, TrendingUp, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { AgentsGrid, Agent } from '@/components/agents/AgentsGrid';
import { SystemDetailsDrawer } from '@/components/SystemDetailsDrawer';
import { SystemDeleteDialog } from '@/components/SystemDeleteDialog';
import { useToast } from '@/hooks/use-toast';
import { AOCIntroCard } from '@/components/aoc/AOCIntroCard';
import { useCoPilotContext } from '@/contexts/CoPilotContext';
import { DCCard } from '@/components/dc-ui/DCCard';
import { DCSectionHeader } from '@/components/dc-ui/DCSectionHeader';
import { DCKPITile } from '@/components/dc-ui/DCKPITile';

export default function ManageAgents() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { updateContext } = useCoPilotContext();
  const [selectedAgent, setSelectedAgent] = useState<string | null>(null);
  const [deleteAgentId, setDeleteAgentId] = useState<string | null>(null);
  const [deleteAgentName, setDeleteAgentName] = useState<string>('');
  const [deleteAgentStatus, setDeleteAgentStatus] = useState<string>('');
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);

  // Update Co-Pilot context
  useEffect(() => {
    updateContext({
      activePage: 'manage_agents',
    });
  }, [updateContext]);

  // Check authentication
  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session }, error } = await supabase.auth.getSession();
      
      if (error || !session) {
        console.warn('Authentication check failed:', error?.message || 'No session');
        navigate('/auth', { replace: true });
        return;
      }
      
      setIsAuthenticated(true);
    };
    
    checkAuth();
    
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) {
        navigate('/auth', { replace: true });
      } else {
        setIsAuthenticated(!!session);
      }
    });
    
    return () => subscription.unsubscribe();
  }, [navigate]);

  // Fetch agents (draft + active)
  const { data: agentsData, isLoading, error } = useQuery({
    queryKey: ['manage-agents'],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke('ai-systems-unified', {
        body: {
          tab: 'agents', // Shows draft + active
          page: 1,
          pageSize: 100,
          sortBy: 'updated_at',
          sortOrder: 'desc',
        }
      });
      
      if (error) throw error;
      
      // Handle REST envelope if present
      let result = data;
      if (data && typeof data === 'object' && 'success' in data && 'data' in data) {
        const envelope = data as { success: boolean; data: any };
        if (!envelope.success) {
          throw new Error('API returned error');
        }
        result = envelope.data;
      }
      
      return result as {
        items: Agent[];
        stats: { total: number; active: number; draft: number; archived: number; avgRoi: number };
      };
    },
    enabled: isAuthenticated,
    refetchInterval: 30000,
    retry: 2,
  });

  // Real-time updates
  useEffect(() => {
    const channel = supabase
      .channel('agents-manage-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'agents'
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['manage-agents'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (agentId: string) => {
      const { data, error } = await supabase.functions.invoke('systems-delete', {
        body: { systemId: agentId }
      });
      if (error) throw error;
      
      // Handle REST envelope if present
      let result = data;
      if (data && typeof data === 'object' && 'success' in data && 'data' in data) {
        const envelope = data as { success: boolean; data: any };
        if (!envelope.success) {
          throw new Error('API returned error');
        }
        result = envelope.data;
      }
      
      return result;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['manage-agents'] });
      setDeleteAgentId(null);
      toast({
        title: '✅ Agent deleted successfully',
        description: `${data.systemName} has been permanently removed.`,
      });
    },
    onError: (error: any) => {
      toast({
        title: '❌ Error deleting agent',
        description: error?.message || 'Failed to delete agent',
        variant: 'destructive',
      });
    },
  });

  const handleRun = (agent: Agent) => {
    navigate(`/agents/${agent.id}/chat`);
  };

  const handleManage = (agent: Agent) => {
    // Navigate to unified AOC
    navigate(`/app/agents/${agent.id}/manage`);
  };

  const handleDelete = (agent: Agent) => {
    setDeleteAgentId(agent.id);
    setDeleteAgentName(agent.name);
    setDeleteAgentStatus(agent.status);
  };

  const handleDeleteConfirm = () => {
    if (deleteAgentId) {
      deleteMutation.mutate(deleteAgentId);
    }
  };

  const handleDeleteCancel = () => {
    setDeleteAgentId(null);
    setDeleteAgentName('');
    setDeleteAgentStatus('');
  };

  const stats = agentsData?.stats || { total: 0, active: 0, draft: 0, archived: 0, avgRoi: 0 };
  const healthPercentage = stats.total > 0 ? Math.round((stats.active / stats.total) * 100) : 0;

  return (
    <div className="min-h-screen bg-dc-bg-primary">
      <div className="container mx-auto py-6 sm:py-8 max-w-7xl px-4">
        {/* AOC Introduction Card */}
        <AOCIntroCard />
        
        {/* Header */}
        <div className="mb-8">
          <Button
            variant="ghost"
            onClick={() => navigate('/')}
            className="mb-4 -ml-2 text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Button>
          
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-semibold mb-2 flex items-center gap-3 text-foreground">
                <div className="p-2 rounded-lg bg-dc-cyan/10 border border-dc-cyan/30">
                  <Server className="h-6 w-6 text-dc-cyan" />
                </div>
                Agent Control Center
              </h1>
              <p className="text-sm text-muted-foreground">
                Manage AI agents and digital twin subsystems
              </p>
            </div>
            <Button
              onClick={() => navigate('/builder?source=manage-agents&template=blank')}
              className="bg-dc-cyan hover:bg-dc-cyan/80 text-dc-bg-primary font-medium"
            >
              <Wrench className="h-4 w-4 mr-2" />
              Deploy New Agent
            </Button>
          </div>
        </div>

        {/* DC-Style Stats Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 mb-8">
          <DCKPITile
            label="Total Agents"
            value={stats.total.toString()}
            sublabel="Registered subsystems"
            status="info"
            icon={<Bot className="h-4 w-4" />}
          />
          <DCKPITile
            label="Active"
            value={stats.active.toString()}
            sublabel="Running systems"
            status="normal"
            icon={<CheckCircle2 className="h-4 w-4" />}
            trend="up"
          />
          <DCKPITile
            label="Draft"
            value={stats.draft.toString()}
            sublabel="In development"
            status={stats.draft > 5 ? 'warning' : 'info'}
            icon={<Activity className="h-4 w-4" />}
          />
          <DCKPITile
            label="Fleet Health"
            value={`${healthPercentage}%`}
            sublabel="Active ratio"
            status={healthPercentage >= 80 ? 'normal' : healthPercentage >= 50 ? 'warning' : 'critical'}
            icon={<Zap className="h-4 w-4" />}
            thresholdValue={healthPercentage}
            threshold={{ value: healthPercentage, max: 100, showBar: true }}
          />
          <DCKPITile
            label="Avg ROI"
            value={`${stats.avgRoi}%`}
            sublabel="Performance index"
            status={stats.avgRoi >= 10 ? 'normal' : 'warning'}
            icon={<TrendingUp className="h-4 w-4" />}
            trend={stats.avgRoi > 0 ? 'up' : 'stable'}
          />
        </div>

        {/* Agents Grid */}
        <DCCard status="info" className="p-0 overflow-hidden">
          <div className="p-4 border-b border-dc-border bg-dc-bg-secondary">
            <DCSectionHeader 
              title="Agent Registry"
              subtitle="Active and draft subsystems in your data centre"
              icon={<Bot className="h-5 w-5 text-dc-cyan" />}
            />
          </div>
          <div className="p-6 bg-dc-bg-primary">
            <AgentsGrid
              agents={agentsData?.items || []}
              isLoading={isLoading}
              error={error instanceof Error ? error.message : null}
              onRun={handleRun}
              onManage={handleManage}
              onDelete={handleDelete}
              onRetry={() => queryClient.invalidateQueries({ queryKey: ['manage-agents'] })}
              mode="manage"
            />
          </div>
        </DCCard>
      </div>

      {/* Drawers & Dialogs */}
      <SystemDetailsDrawer
        systemId={selectedAgent}
        open={!!selectedAgent}
        onClose={() => setSelectedAgent(null)}
      />
      
      <SystemDeleteDialog
        systemName={deleteAgentName}
        systemStatus={deleteAgentStatus}
        open={!!deleteAgentId}
        onConfirm={handleDeleteConfirm}
        onCancel={handleDeleteCancel}
        isDeleting={deleteMutation.isPending}
      />
    </div>
  );
}
