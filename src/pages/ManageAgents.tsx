import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Bot, Wrench, ArrowLeft } from 'lucide-react';
import { AgentsGrid, Agent } from '@/components/agents/AgentsGrid';
import { SystemDetailsDrawer } from '@/components/SystemDetailsDrawer';
import { SystemDeleteDialog } from '@/components/SystemDeleteDialog';
import { useToast } from '@/hooks/use-toast';
import { AOCIntroCard } from '@/components/aoc/AOCIntroCard';
import { useCoPilotContext } from '@/contexts/CoPilotContext';

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

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto py-6 sm:py-8 max-w-7xl px-4">
        {/* AOC Introduction Card */}
        <AOCIntroCard />
        
        {/* Header */}
        <div className="mb-8">
          <Button
            variant="ghost"
            onClick={() => navigate('/')}
            className="mb-4 -ml-2"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Button>
          
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-semibold mb-2 flex items-center gap-3">
                <Bot className="h-8 w-8 text-primary" />
                Manage Agents
              </h1>
              <p className="text-sm text-muted-foreground">
                View and manage all your AI agents and digital twins
              </p>
            </div>
            <Button
              onClick={() => navigate('/builder?source=manage-agents&template=blank')}
              className="glow-purple"
            >
              <Wrench className="h-4 w-4 mr-2" />
              Create New Agent
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        {agentsData && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <Card className="p-4">
              <div className="space-y-1">
                <p className="text-sm text-body">Total Agents</p>
                <p className="text-2xl font-display font-bold text-foreground">
                  {agentsData.stats.total}
                </p>
              </div>
            </Card>
            <Card className="p-4">
              <div className="space-y-1">
                <p className="text-sm text-body">Active</p>
                <p className="text-2xl font-display font-bold text-success">
                  {agentsData.stats.active}
                </p>
              </div>
            </Card>
            <Card className="p-4">
              <div className="space-y-1">
                <p className="text-sm text-body">Draft</p>
                <p className="text-2xl font-display font-bold text-muted-foreground">
                  {agentsData.stats.draft}
                </p>
              </div>
            </Card>
            <Card className="p-4">
              <div className="space-y-1">
                <p className="text-sm text-body">Avg ROI</p>
                <p className="text-2xl font-display font-bold text-accent">
                  {agentsData.stats.avgRoi}%
                </p>
              </div>
            </Card>
          </div>
        )}

        {/* Agents Grid */}
        <Card className="p-6">
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
        </Card>
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
