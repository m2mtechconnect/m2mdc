import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Activity, CheckCircle2, CircleAlert, ExternalLink, History, Loader2, Server } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { DCCard, DCSectionHeader } from '@/components/dc-ui';
import { modelDisplayLabel } from '@/lib/llm/modelLabels';
import { listDeploymentEvents, type DeploymentEventRecord } from '@/workspace/deploymentRecords';

interface ActivationRecord {
  id: string;
  system_id: string;
  version: string;
  status: string;
  region: string;
  model: string | null;
  grounding: boolean | null;
  runtime_url: string | null;
  health: string | null;
  error_message: string | null;
  deployed_by: string | null;
  created_at: string;
  updated_at: string;
  system_name: string;
}

type EvidenceState = 'configuration_active' | 'runtime_verified' | 'in_progress' | 'failed';

function evidenceState(record: ActivationRecord): EvidenceState {
  if (record.status === 'failed') return 'failed';
  if (record.status === 'pending') return 'in_progress';
  if (record.status === 'active' && record.runtime_url && record.health) return 'runtime_verified';
  return 'configuration_active';
}

function stateLabel(state: EvidenceState): string {
  if (state === 'runtime_verified') return 'Runtime verified';
  if (state === 'configuration_active') return 'Configuration active';
  if (state === 'in_progress') return 'In progress';
  return 'Failed';
}

function stateVariant(state: EvidenceState): 'default' | 'secondary' | 'destructive' | 'outline' {
  if (state === 'runtime_verified') return 'default';
  if (state === 'failed') return 'destructive';
  if (state === 'in_progress') return 'secondary';
  return 'outline';
}

export default function ActivationHistory() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [records, setRecords] = useState<ActivationRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [events, setEvents] = useState<DeploymentEventRecord[]>([]);
  const [eventsLoading, setEventsLoading] = useState(false);

  useEffect(() => {
    document.title = 'Activation & Runtime History | AURA DC';
    let cancelled = false;
    void (async () => {
      try {
        setLoading(true);
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        if (userError || !user) throw new Error('Authentication required.');
        const { data: deployments, error: deploymentError } = await supabase
          .from('deployments')
          .select('*')
          .eq('deployed_by', user.id)
          .order('created_at', { ascending: false });
        if (deploymentError) throw deploymentError;

        const systemIds = [...new Set((deployments ?? []).map((record) => record.system_id))];
        const { data: systems, error: systemsError } = systemIds.length
          ? await supabase.from('agents').select('id, name').in('id', systemIds)
          : { data: [], error: null };
        if (systemsError) throw systemsError;
        const names = new Map((systems ?? []).map((system) => [system.id, system.name]));
        if (!cancelled) {
          setRecords((deployments ?? []).map((record) => ({
            ...record,
            system_name: names.get(record.system_id) ?? 'Unknown system',
          })) as ActivationRecord[]);
        }
      } catch (cause) {
        if (!cancelled) {
          toast({
            title: 'History could not be loaded',
            description: cause instanceof Error ? cause.message : 'Unknown history error.',
            variant: 'destructive',
          });
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [toast]);

  const counts = useMemo(() => {
    const values = records.map(evidenceState);
    return {
      configuration: values.filter((value) => value === 'configuration_active').length,
      verified: values.filter((value) => value === 'runtime_verified').length,
      progress: values.filter((value) => value === 'in_progress').length,
      failed: values.filter((value) => value === 'failed').length,
    };
  }, [records]);

  async function toggleEvidence(recordId: string) {
    if (expandedId === recordId) {
      setExpandedId(null);
      setEvents([]);
      return;
    }
    setExpandedId(recordId);
    setEvents([]);
    setEventsLoading(true);
    try {
      setEvents(await listDeploymentEvents(recordId));
    } catch (cause) {
      toast({
        title: 'Activation evidence could not be loaded',
        description: cause instanceof Error ? cause.message : 'Unknown evidence error.',
        variant: 'destructive',
      });
    } finally {
      setEventsLoading(false);
    }
  }

  if (loading) {
    return (
      <main className="flex min-h-[60vh] items-center justify-center" role="status" aria-live="polite">
        <Loader2 className="h-8 w-8 animate-spin text-primary" aria-hidden="true" />
      </main>
    );
  }

  return (
    <div className="w-full min-w-0 space-y-6 py-8" data-testid="activation-history-workspace">
      <DCSectionHeader
        as="h1"
        title="Activation & Runtime History"
        subtitle="Evidence-backed lifecycle records. AURA configuration activation and externally verified runtime deployment are deliberately separate states."
        icon={<History className="h-5 w-5 text-primary" />}
      />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <DCCard title="Configuration active" status="neutral"><p className="text-2xl font-semibold">{counts.configuration}</p></DCCard>
        <DCCard title="Runtime verified" status={counts.verified > 0 ? 'operational' : 'neutral'}><p className="text-2xl font-semibold">{counts.verified}</p></DCCard>
        <DCCard title="In progress" status={counts.progress > 0 ? 'warning' : 'neutral'}><p className="text-2xl font-semibold">{counts.progress}</p></DCCard>
        <DCCard title="Failed" status={counts.failed > 0 ? 'critical' : 'neutral'}><p className="text-2xl font-semibold">{counts.failed}</p></DCCard>
      </div>

      {records.length === 0 ? (
        <DCCard title="No activation evidence yet" status="neutral">
          <div className="space-y-3 text-sm text-muted-foreground">
            <p>Activate a saved AURA configuration to create the first durable lifecycle record.</p>
            <Button onClick={() => navigate('/builder')}>Open Build</Button>
          </div>
        </DCCard>
      ) : (
        <div className="space-y-3">
          {records.map((record) => {
            const state = evidenceState(record);
            const runtimeEvidence = Boolean(record.runtime_url && record.health);
            return (
              <DCCard key={record.id} title={record.system_name} status={state === 'failed' ? 'critical' : state === 'runtime_verified' ? 'operational' : 'neutral'}>
                <div className="space-y-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant={stateVariant(state)}>{stateLabel(state)}</Badge>
                    <Badge variant="outline">{modelDisplayLabel(record.model)}</Badge>
                    {record.grounding && <Badge variant="outline">Grounded</Badge>}
                    {record.region && record.region !== 'unassigned' && <Badge variant="outline">Region: {record.region}</Badge>}
                  </div>

                  <div className="grid gap-3 text-sm md:grid-cols-3">
                    <div>
                      <p className="text-xs text-muted-foreground">Created</p>
                      <p>{new Date(record.created_at).toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">External runtime</p>
                      <p className="flex items-center gap-1.5">
                        <Server className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                        {runtimeEvidence ? 'Evidence present' : 'No runtime evidence'}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Health</p>
                      <p>{runtimeEvidence ? record.health : 'Not verified'}</p>
                    </div>
                  </div>

                  {record.error_message && (
                    <div className="flex items-start gap-2 rounded-md border border-destructive/40 bg-destructive/5 p-3 text-sm text-destructive">
                      <CircleAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                      <span>{record.error_message}</span>
                    </div>
                  )}

                  <div className="flex flex-wrap gap-2">
                    {runtimeEvidence && record.runtime_url && (
                      <Button variant="outline" size="sm" onClick={() => window.open(record.runtime_url!, '_blank', 'noopener,noreferrer')}>
                        <ExternalLink className="mr-2 h-4 w-4" aria-hidden="true" /> Open verified runtime
                      </Button>
                    )}
                    <Button variant="outline" size="sm" onClick={() => { void toggleEvidence(record.id); }}>
                      <Activity className="mr-2 h-4 w-4" aria-hidden="true" />
                      {expandedId === record.id ? 'Hide evidence' : 'View evidence'}
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => navigate('/analytics')}>Operate</Button>
                    <Button variant="ghost" size="sm" onClick={() => navigate('/evidence/overview')}>Evidence workspace</Button>
                  </div>

                  {expandedId === record.id && (
                    <div className="rounded-md border border-border p-3">
                      {eventsLoading ? (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Loading evidence...</div>
                      ) : events.length === 0 ? (
                        <p className="text-sm text-muted-foreground">No immutable step evidence is available for this record.</p>
                      ) : (
                        <ol className="space-y-2">
                          {events.map((event) => (
                            <li key={event.id} className="grid gap-1 rounded-md bg-muted/30 p-2 text-xs md:grid-cols-[48px_1fr_auto] md:items-center">
                              <span className="font-mono text-muted-foreground">#{event.sequence}</span>
                              <span>{event.stage}</span>
                              <Badge variant={event.status === 'failed' ? 'destructive' : 'outline'}>{event.status}</Badge>
                            </li>
                          ))}
                        </ol>
                      )}
                    </div>
                  )}
                </div>
              </DCCard>
            );
          })}
        </div>
      )}

      <DCCard title="Runtime verification rule" status="neutral">
        <p className="text-sm text-muted-foreground">
          A record is labelled Runtime verified only when both an external runtime URL and health evidence are retained. An AURA configuration marked active without that evidence remains Configuration active.
        </p>
      </DCCard>
    </div>
  );
}
