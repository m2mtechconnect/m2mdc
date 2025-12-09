import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Bot, Wrench, ArrowLeft, Server, Activity, Zap, TrendingUp, CheckCircle2 } from 'lucide-react';
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
          tab: 'agents',
          page: 1,
          pageSize: 100,
          sortBy: 'updated_at',
          sortOrder: 'desc',
        }
      });
      
      if (error) throw error;
      
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

  // DC-specific agent types
  const dcAgentTypes = [
    { name: 'Thermal Guardian', description: 'Monitors temperature across all racks and zones', status: 'active' },
    { name: 'Power & UPS Monitor', description: 'Tracks power distribution and battery health', status: 'active' },
    { name: 'Workload Orchestrator', description: 'Optimizes GPU/CPU workload distribution', status: 'active' },
    { name: 'Sovereignty Sentinel', description: 'Ensures data residency compliance', status: 'active' },
    { name: 'Cooling Optimization Agent', description: 'Manages cooling efficiency and PUE', status: 'active' },
  ];

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
            className="mb-4 -ml-2 text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Command
          </Button>
          
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-semibold mb-2 flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <Server className="h-6 w-6 text-primary" />
                </div>
                Subsystem Agents
              </h1>
              <p className="text-sm text-muted-foreground">
                Manage Data Centre subsystem agents and automation
              </p>
            </div>
            <Button
              onClick={() => navigate('/builder?source=manage-agents&template=blank')}
            >
              <Wrench className="h-4 w-4 mr-2" />
              Deploy New Agent
            </Button>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
          <Card className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <Bot className="h-4 w-4 text-muted-foreground" />
              <span className="text-xs text-muted-foreground uppercase">Total Agents</span>
            </div>
            <div className="text-2xl font-bold">{stats.total}</div>
            <div className="text-xs text-muted-foreground">Registered subsystems</div>
          </Card>
          
          <Card className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <CheckCircle2 className="h-4 w-4 text-green-500" />
              <span className="text-xs text-muted-foreground uppercase">Active</span>
            </div>
            <div className="text-2xl font-bold text-green-600">{stats.active}</div>
            <div className="text-xs text-muted-foreground">Running systems</div>
          </Card>
          
          <Card className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <Activity className="h-4 w-4 text-amber-500" />
              <span className="text-xs text-muted-foreground uppercase">Draft</span>
            </div>
            <div className="text-2xl font-bold text-amber-600">{stats.draft}</div>
            <div className="text-xs text-muted-foreground">In development</div>
          </Card>
          
          <Card className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <Zap className="h-4 w-4 text-blue-500" />
              <span className="text-xs text-muted-foreground uppercase">Fleet Health</span>
            </div>
            <div className="text-2xl font-bold">{healthPercentage}%</div>
            <div className="text-xs text-muted-foreground">Active ratio</div>
          </Card>
          
          <Card className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <TrendingUp className="h-4 w-4 text-purple-500" />
              <span className="text-xs text-muted-foreground uppercase">Avg ROI</span>
            </div>
            <div className="text-2xl font-bold">{stats.avgRoi}%</div>
            <div className="text-xs text-muted-foreground">Performance index</div>
          </Card>
        </div>

        {/* DC-Specific Agent Types */}
        {stats.total === 0 && (
          <Card className="mb-8 p-6">
            <h3 className="font-semibold mb-4">Recommended Subsystem Agents</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {dcAgentTypes.map((agent) => (
                <Card key={agent.name} className="p-4 hover:border-primary/50 cursor-pointer transition-colors" onClick={() => navigate('/builder')}>
                  <h4 className="font-medium mb-1">{agent.name}</h4>
                  <p className="text-sm text-muted-foreground">{agent.description}</p>
                </Card>
              ))}
            </div>
          </Card>
        )}

        {/* Agents Grid */}
        <Card className="overflow-hidden">
          <div className="p-4 border-b">
            <h3 className="font-semibold">Agent Registry</h3>
            <p className="text-sm text-muted-foreground">Active and draft subsystems in your data centre</p>
          </div>
          <div className="p-6">
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
