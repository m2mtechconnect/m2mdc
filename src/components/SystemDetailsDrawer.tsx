import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Activity, Bot, Clock, Link2, Loader2, Pause, Play } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { formatDuration, formatRelativeTime } from '@/lib/formatters';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { DCCard } from '@/components/dc-ui/DCCard';
import { useToast } from '@/hooks/use-toast';

interface SystemDetailsDrawerProps {
  systemId: string | null;
  open: boolean;
  onClose: () => void;
}

export const SystemDetailsDrawer = ({ systemId, open, onClose }: SystemDetailsDrawerProps) => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const systemQuery = useQuery({
    queryKey: ['agent', systemId],
    queryFn: async () => {
      if (!systemId) return null;
      const { data, error } = await supabase
        .from('agents')
        .select('*')
        .eq('id', systemId)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: Boolean(systemId && open),
  });

  const runsQuery = useQuery({
    queryKey: ['agent-runs', systemId],
    queryFn: async () => {
      if (!systemId) return [];
      const { data, error } = await supabase
        .from('agent_runs')
        .select('id,status,duration_ms,created_at')
        .eq('agent_id', systemId)
        .order('created_at', { ascending: false })
        .limit(10);
      if (error) throw error;
      return data ?? [];
    },
    enabled: Boolean(systemId && open),
  });

  const integrationCountQuery = useQuery({
    queryKey: ['agent-configured-integrations', systemId],
    queryFn: async () => {
      if (!systemId) return 0;
      const { count, error } = await supabase
        .from('agent_integrations')
        .select('*', { count: 'exact', head: true })
        .eq('system_id', systemId)
        .eq('status', 'active');
      if (error) throw error;
      return count ?? 0;
    },
    enabled: Boolean(systemId && open),
  });

  const statusMutation = useMutation({
    mutationFn: async (status: 'active' | 'paused') => {
      if (!systemId) throw new Error('Agent is unavailable.');
      const { error } = await supabase.from('agents').update({ status }).eq('id', systemId);
      if (error) throw error;
      return status;
    },
    onSuccess: (status) => {
      queryClient.invalidateQueries({ queryKey: ['agent', systemId] });
      queryClient.invalidateQueries({ queryKey: ['ai-systems'] });
      toast({
        title: 'Agent status updated',
        description: `Configured status is now ${status}. Runtime health is reported separately from Connections and run evidence.`,
      });
    },
    onError: (error) => {
      toast({
        title: 'Status update failed',
        description: error instanceof Error ? error.message : 'The agent status could not be updated.',
        variant: 'destructive',
      });
    },
  });

  const system = systemQuery.data;
  const loading = systemQuery.isLoading;
  const configuredStatus = typeof system?.status === 'string' ? system.status : 'unknown';

  return (
    <Sheet open={open} onOpenChange={(nextOpen) => { if (!nextOpen) onClose(); }}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-xl">
        <SheetHeader>
          <SheetTitle>{loading ? 'Loading agent…' : system?.name ?? 'Agent details'}</SheetTitle>
          <SheetDescription>
            {system?.description || 'Configuration and evidence for this AURA agent.'}
          </SheetDescription>
        </SheetHeader>

        {loading ? (
          <div className="flex min-h-56 items-center justify-center" role="status" aria-live="polite">
            <Loader2 className="h-7 w-7 animate-spin text-muted-foreground" aria-hidden />
            <span className="sr-only">Loading agent details</span>
          </div>
        ) : systemQuery.error ? (
          <div role="alert" className="mt-6 rounded-md border border-destructive/40 bg-destructive/5 p-4 text-sm text-destructive">
            Agent details could not be loaded. No status or runtime state is being inferred.
          </div>
        ) : !system ? (
          <div role="status" className="mt-6 rounded-md border border-border bg-muted/30 p-4 text-sm text-muted-foreground">
            This agent is unavailable or is outside your current access scope.
          </div>
        ) : (
          <div className="mt-6 space-y-5">
            <DCCard title="Configuration" icon={<Bot className="h-4 w-4" />}>
              <div className="space-y-4">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm text-muted-foreground">Configured status</span>
                  <Badge variant="outline" className="capitalize">{configuredStatus}</Badge>
                  {system.version && <Badge variant="secondary">Version {system.version}</Badge>}
                </div>

                <p className="text-xs text-muted-foreground">
                  Configured status is not a runtime-health claim. Connection health and data-flow evidence are maintained in AURA Connections.
                </p>

                <div className="flex flex-wrap gap-2">
                  <Button size="sm" onClick={() => navigate(`/agents/${system.id}/chat`)}>
                    <Bot className="mr-2 h-4 w-4" aria-hidden />
                    Open agent chat
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => navigate('/manage/integrations')}>
                    <Link2 className="mr-2 h-4 w-4" aria-hidden />
                    Connections
                  </Button>
                  {configuredStatus === 'active' ? (
                    <Button size="sm" variant="outline" disabled={statusMutation.isPending} onClick={() => statusMutation.mutate('paused')}>
                      <Pause className="mr-2 h-4 w-4" aria-hidden />
                      Pause configuration
                    </Button>
                  ) : (
                    <Button size="sm" variant="outline" disabled={statusMutation.isPending} onClick={() => statusMutation.mutate('active')}>
                      <Play className="mr-2 h-4 w-4" aria-hidden />
                      Set active
                    </Button>
                  )}
                </div>
              </div>
            </DCCard>

            <DCCard title="Connection assignment" icon={<Link2 className="h-4 w-4" />}>
              <div className="space-y-2">
                <p className="text-2xl font-semibold tabular-nums">{integrationCountQuery.data ?? '—'}</p>
                <p className="text-sm text-muted-foreground">
                  Configured integration assignments. This count does not imply authentication, health or active data flow.
                </p>
              </div>
            </DCCard>

            <DCCard title="Recent run evidence" icon={<Activity className="h-4 w-4" />}>
              {runsQuery.isLoading ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground" role="status">
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> Loading run evidence…
                </div>
              ) : (runsQuery.data?.length ?? 0) === 0 ? (
                <p className="text-sm text-muted-foreground">No recorded runs are available for this agent.</p>
              ) : (
                <ul className="space-y-2">
                  {runsQuery.data?.map((run) => (
                    <li key={run.id} className="rounded-md border border-border bg-muted/20 p-3">
                      <div className="flex items-center justify-between gap-3">
                        <Badge variant="outline" className="capitalize">{run.status ?? 'unknown'}</Badge>
                        <span className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Clock className="h-3.5 w-3.5" aria-hidden />
                          {formatRelativeTime(run.created_at)}
                        </span>
                      </div>
                      <p className="mt-2 text-xs text-muted-foreground">
                        {typeof run.duration_ms === 'number' ? `Recorded duration: ${formatDuration(run.duration_ms)}` : 'No duration recorded'}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </DCCard>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
};
