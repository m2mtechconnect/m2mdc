import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/lib/logger';
import { formatRelativeTime, formatDuration } from '@/lib/formatters';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from '@/hooks/use-toast';
import {
  Play,
  Pause,
  RotateCcw,
  TrendingUp,
  Clock,
  CheckCircle2,
  Loader2,
  Rocket,
  Bot,
  AlertCircle,
  Server,
  Sparkles,
  Activity,
  Settings,
  Info
} from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { UnifiedAgentPreview } from '@/components/agent-preview/UnifiedAgentPreview';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { AgentPlayground } from './AgentPlayground';
import { QuickRecommendations } from './shared/QuickRecommendations';
import { AgentMCPServers } from './agent-chat/AgentMCPServers';

interface SystemDetailsDrawerProps {
  systemId: string | null;
  open: boolean;
  onClose: () => void;
}

export const SystemDetailsDrawer = ({ systemId, open, onClose }: SystemDetailsDrawerProps) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [showRollbackDialog, setShowRollbackDialog] = useState(false);
  const [playgroundOpen, setPlaygroundOpen] = useState(false);

  const { data: system, isLoading, error: systemError } = useQuery({
    queryKey: ['agent', systemId],
    queryFn: async () => {
      if (!systemId) return null;
      
      console.log('Fetching agent with ID:', systemId);
      const { data, error } = await supabase
        .from('agents')
        .select('*')
        .eq('id', systemId)
        .maybeSingle();
      
      if (error) {
        console.error('Error fetching agent:', error);
        throw error;
      }
      
      if (!data) {
        console.warn('No agent found with ID:', systemId);
      }
      
      return data;
    },
    enabled: !!systemId && open,
  });

  const { data: recentRuns } = useQuery({
    queryKey: ['agent-runs', systemId],
    queryFn: async () => {
      if (!systemId) return [];
      const { data, error } = await supabase
        .from('agent_runs')
        .select('*')
        .eq('agent_id', systemId)
        .order('created_at', { ascending: false })
        .limit(10);
      
      if (error) throw error;
      return data;
    },
    enabled: !!systemId && open,
  });

  // Fetch connected apps count
  const { data: connectedAppsCount = 0 } = useQuery({
    queryKey: ['agent-connected-apps', systemId],
    queryFn: async () => {
      if (!systemId) return 0;
      const { count, error } = await supabase
        .from('agent_integrations')
        .select('*', { count: 'exact', head: true })
        .eq('system_id', systemId)
        .eq('status', 'active');
      
      if (error) throw error;
      return count || 0;
    },
    enabled: !!systemId && open,
  });

  const pauseResumeMutation = useMutation({
    mutationFn: async (newStatus: 'active' | 'paused') => {
      const { error } = await supabase
        .from('agents')
        .update({ status: newStatus })
        .eq('id', systemId!);
      
      if (error) throw error;
    },
    onSuccess: (_, newStatus) => {
      queryClient.invalidateQueries({ queryKey: ['agent', systemId] });
      queryClient.invalidateQueries({ queryKey: ['ai-systems'] });
      toast({
        title: newStatus === 'active' ? 'System Resumed' : 'System Paused',
        description: `AI system ${newStatus === 'active' ? 'activated' : 'paused'} successfully.`,
      });
    },
    onError: (error) => {
      toast({
        title: 'Action Failed',
        description: error instanceof Error ? error.message : 'Failed to update system status',
        variant: 'destructive',
      });
    },
  });

  const rollbackMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke('agents-rollback', {
        body: { agentId: systemId }
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agent', systemId] });
      queryClient.invalidateQueries({ queryKey: ['ai-systems'] });
      setShowRollbackDialog(false);
      toast({
        title: 'Rollback Successful',
        description: 'System rolled back to previous version.',
      });
    },
    onError: (error) => {
      toast({
        title: 'Rollback Failed',
        description: error instanceof Error ? error.message : 'Failed to rollback system',
        variant: 'destructive',
      });
    },
  });

  // Show error state if query failed
  if (systemError && !isLoading) {
    return (
      <Sheet open={open} onOpenChange={onClose}>
        <SheetContent className="w-full sm:max-w-xl">
          <SheetHeader>
            <SheetTitle className="text-2xl font-display">Error Loading Agent</SheetTitle>
            <SheetDescription>
              Failed to load agent details. Please try again.
            </SheetDescription>
          </SheetHeader>
          <div className="flex flex-col items-center justify-center py-12 space-y-4">
            <AlertCircle className="h-12 w-12 text-destructive" />
            <p className="text-sm text-muted-foreground text-center">
              {systemError instanceof Error ? systemError.message : 'An unknown error occurred'}
            </p>
            <Button onClick={onClose}>Close</Button>
          </div>
        </SheetContent>
      </Sheet>
    );
  }

  // Show not found state if no system data
  if (!system && !isLoading) {
    return (
      <Sheet open={open} onOpenChange={onClose}>
        <SheetContent className="w-full sm:max-w-xl">
          <SheetHeader>
            <SheetTitle className="text-2xl font-display">Agent Not Found</SheetTitle>
            <SheetDescription>
              This agent may have been deleted or you don't have access to it.
            </SheetDescription>
          </SheetHeader>
          <div className="flex flex-col items-center justify-center py-12 space-y-4">
            <Bot className="h-12 w-12 text-muted-foreground" />
            <p className="text-sm text-muted-foreground text-center">
              The requested agent could not be found.
            </p>
            <Button onClick={onClose}>Close</Button>
          </div>
        </SheetContent>
      </Sheet>
    );
  }

  const statusColor = system?.status === 'active' ? 'bg-secondary/10 text-secondary border-secondary/30' :
                      system?.status === 'paused' ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30' :
                      'bg-muted text-muted-foreground border-border';

  return (
    <>
      <Sheet open={open} onOpenChange={onClose}>
        <SheetContent className="w-full sm:max-w-xl overflow-y-auto">
          <SheetHeader>
            <SheetTitle className="text-2xl font-display">
              {isLoading ? 'Loading...' : system?.name}
            </SheetTitle>
            <SheetDescription>
              {system?.description || 'AI System Management'}
            </SheetDescription>
          </SheetHeader>

          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : system && (
            <TooltipProvider delayDuration={150}>
              <Tabs defaultValue="overview" className="w-full mt-6">
                <TabsList className="grid w-full grid-cols-3 mb-6">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <TabsTrigger value="overview" className="gap-2">
                        <Sparkles className="h-4 w-4" />
                        <span className="hidden sm:inline">Overview</span>
                        <span className="sm:hidden">Overview</span>
                      </TabsTrigger>
                    </TooltipTrigger>
                    <TooltipContent side="bottom">
                      <p className="max-w-xs">AI insights, recommendations, and recent activity tracking.</p>
                    </TooltipContent>
                  </Tooltip>

                  <Tooltip>
                    <TooltipTrigger asChild>
                      <TabsTrigger value="mcp" className="gap-2">
                        <Server className="h-4 w-4" />
                        <span className="hidden sm:inline">MCP Servers</span>
                        <span className="sm:hidden">MCP</span>
                      </TabsTrigger>
                    </TooltipTrigger>
                    <TooltipContent side="bottom">
                      <p className="max-w-xs">Connect compute or API servers to extend your agent's abilities.</p>
                    </TooltipContent>
                  </Tooltip>

                  <Tooltip>
                    <TooltipTrigger asChild>
                      <TabsTrigger value="settings" className="gap-2">
                        <Settings className="h-4 w-4" />
                        <span className="hidden sm:inline">Settings</span>
                        <span className="sm:hidden">Config</span>
                      </TabsTrigger>
                    </TooltipTrigger>
                    <TooltipContent side="bottom">
                      <p className="max-w-xs">Manage version, rollbacks, and deployment options.</p>
                    </TooltipContent>
                  </Tooltip>
                </TabsList>

                <TabsContent value="overview" className="space-y-6">
                  {/* Header with Chat Button */}
                  <div className="flex items-start justify-between gap-4">
                    <div className="space-y-2 flex-1">
                      <h3 className="text-lg font-semibold">Agent Overview</h3>
                      <p className="text-sm text-muted-foreground">
                        Performance metrics, AI insights, and recent activity tracking
                      </p>
                    </div>
                    <Button
                      variant="default"
                      size="sm"
                      onClick={() => navigate(`/agents/${system.id}/chat`)}
                      className="gap-2 shrink-0"
                    >
                      <Bot className="h-4 w-4" />
                      Chat with Agent
                    </Button>
                  </div>

                  {/* Metrics Overview - No Controls */}
                  <UnifiedAgentPreview
                    agentId={system.id}
                    agentName={system.name}
                    status={system.status || 'draft'}
                    version={system.version || 'v0'}
                    successRate={(system.success_rate || 0) * 100}
                    totalRuns={system.total_runs || 0}
                    roi={0}
                    connectedAppsCount={connectedAppsCount}
                    recentActivity={
                      recentRuns?.slice(0, 5).map((run) => ({
                        id: run.id,
                        timestamp: run.created_at,
                        description: `Run completed in ${run.duration_ms}ms with status: ${run.status}`,
                      })) || []
                    }
                    isLoading={pauseResumeMutation.isPending || rollbackMutation.isPending}
                    mode="overview"
                    onResume={() => pauseResumeMutation.mutate('active')}
                    onPause={() => pauseResumeMutation.mutate('paused')}
                  />

                  {/* AI-Driven Recommendations */}
                  <div className="space-y-2">
                    <h4 className="text-base font-semibold">AI Recommendations</h4>
                    <p className="text-sm text-muted-foreground">
                      Smart workflow suggestions based on your agent's behavior
                    </p>
                  </div>
                  <QuickRecommendations systemId={system.id} compact={false} />

                  {/* Recent Activity */}
                  <Card className="p-6">
                    <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                      <Activity className="h-5 w-5 text-primary" />
                      Recent Activity
                    </h3>
                    {recentRuns && recentRuns.length > 0 ? (
                      <div className="space-y-3">
                        {recentRuns.map((run) => (
                          <div
                            key={run.id}
                            className="flex items-start gap-3 p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-all duration-200"
                          >
                            <div className={`h-2 w-2 rounded-full mt-2 ${
                              run.status === 'completed' ? 'bg-secondary' :
                              run.status === 'failed' ? 'bg-destructive' :
                              'bg-amber-500'
                            }`} />
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium">
                                Run {run.status === 'completed' ? 'completed' : run.status}
                              </p>
                              <p className="text-xs text-muted-foreground mt-1">
                                Duration: {formatDuration(run.duration_ms)} • {formatRelativeTime(run.created_at)}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-8">
                        <Activity className="h-12 w-12 mx-auto mb-3 text-muted-foreground opacity-50" />
                        <p className="text-sm text-muted-foreground">No activity yet</p>
                      </div>
                    )}
                  </Card>
                </TabsContent>

                <TabsContent value="mcp" className="space-y-4">
                  <AgentMCPServers agentId={system.id} />
                </TabsContent>


                <TabsContent value="settings" className="space-y-4">
                  <Card className="p-6">
                    <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                      <Settings className="h-5 w-5 text-primary" />
                      Agent Settings
                    </h3>
                    <div className="space-y-4">
                      <div>
                        <label className="text-sm font-medium mb-2 block">Version Control</label>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setShowRollbackDialog(true)}
                            disabled={isLoading}
                          >
                            <RotateCcw className="h-4 w-4 mr-2" />
                            Rollback
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="glow-yellow"
                            disabled={isLoading}
                          >
                            <Rocket className="h-4 w-4 mr-2" />
                            Deploy New Version
                          </Button>
                        </div>
                      </div>

                      <div>
                        <label className="text-sm font-medium mb-2 block">Status Control</label>
                        <div className="flex gap-2">
                          {system.status === 'active' ? (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => pauseResumeMutation.mutate('paused')}
                              disabled={isLoading}
                            >
                              <Pause className="h-4 w-4 mr-2" />
                              Pause Agent
                            </Button>
                          ) : (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => pauseResumeMutation.mutate('active')}
                              disabled={isLoading}
                            >
                              <Play className="h-4 w-4 mr-2" />
                              Resume Agent
                            </Button>
                          )}
                        </div>
                      </div>

                      <div className="pt-4 border-t">
                        <h4 className="text-sm font-medium mb-2">Agent Information</h4>
                        <dl className="space-y-2 text-sm">
                          <div className="flex justify-between">
                            <dt className="text-muted-foreground">Agent ID</dt>
                            <dd className="font-mono text-xs">{system.id}</dd>
                          </div>
                          <div className="flex justify-between">
                            <dt className="text-muted-foreground">Current Version</dt>
                            <dd className="font-mono">{system.version || 'v0'}</dd>
                          </div>
                          <div className="flex justify-between">
                            <dt className="text-muted-foreground">Connected Apps</dt>
                            <dd>{connectedAppsCount}</dd>
                          </div>
                        </dl>
                      </div>
                    </div>
                  </Card>
                </TabsContent>
              </Tabs>
            </TooltipProvider>
          )}
        </SheetContent>
      </Sheet>

      {/* Agent Playground */}
      {system && playgroundOpen && (
        <AgentPlayground
          agentId={system.id}
          agentName={system.name}
          open={playgroundOpen}
          onClose={() => setPlaygroundOpen(false)}
        />
      )}

      {/* Rollback Confirmation Dialog */}
      <AlertDialog open={showRollbackDialog} onOpenChange={setShowRollbackDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Rollback</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to rollback this system? This will archive the current version and revert to the previous configuration.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => rollbackMutation.mutate()}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Rollback
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};