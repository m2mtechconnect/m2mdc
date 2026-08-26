import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Activity, AlertCircle, Calendar, CheckCircle2, ExternalLink, Search, Server, XCircle } from 'lucide-react';
import { format } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DCCard } from '@/components/dc-ui/DCCard';
import { DCKPITile } from '@/components/dc-ui/DCKPITile';
import { SectionCard, WorkspaceHeader } from '@/components/workspace-system';
import { PagePurpose } from '@/components/capability/PagePurpose';
import {
  classifyDeploymentTruth,
  deploymentTruthLabel,
  listDeploymentEvents,
  type DeploymentEventRecord,
  type DeploymentRecord,
  type DeploymentTruthState,
} from '@/workspace/deploymentRecords';

interface DeploymentView extends DeploymentRecord {
  agent_name: string;
}

const truthVariant = (truth: DeploymentTruthState): 'default' | 'secondary' | 'destructive' | 'outline' => {
  if (truth === 'runtime_verified') return 'default';
  if (truth === 'failed') return 'destructive';
  if (truth === 'configuration_active' || truth === 'runtime_connected') return 'secondary';
  return 'outline';
};

export default function DeploymentHistory() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [deployments, setDeployments] = useState<DeploymentView[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [truthFilter, setTruthFilter] = useState<DeploymentTruthState | 'all'>('all');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [events, setEvents] = useState<DeploymentEventRecord[]>([]);
  const [eventsLoading, setEventsLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        setLoading(true);
        const { data, error } = await supabase
          .from('deployments')
          .select('*')
          .order('created_at', { ascending: false });
        if (error) throw error;

        const rows = (data ?? []) as unknown as DeploymentRecord[];
        const ids = [...new Set(rows.map((row) => row.system_id).filter(Boolean))];
        const names = new Map<string, string>();
        if (ids.length > 0) {
          const { data: agents, error: agentError } = await supabase
            .from('agents')
            .select('id, name')
            .in('id', ids);
          if (agentError) throw agentError;
          for (const agent of agents ?? []) names.set(agent.id, agent.name ?? 'Unnamed system');
        }

        if (!cancelled) {
          setDeployments(rows.map((row) => ({
            ...row,
            agent_name: names.get(row.system_id) ?? 'Unknown system',
          })));
        }
      } catch (cause) {
        if (!cancelled) {
          toast({
            title: 'Failed to load activation history',
            description: cause instanceof Error ? cause.message : 'History could not be loaded.',
            variant: 'destructive',
          });
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [toast]);

  const filtered = useMemo(() => deployments.filter((deployment) => {
    const truth = classifyDeploymentTruth(deployment);
    const matchesTruth = truthFilter === 'all' || truth === truthFilter;
    const needle = query.trim().toLowerCase();
    const matchesQuery = !needle
      || deployment.agent_name.toLowerCase().includes(needle)
      || deployment.version.toLowerCase().includes(needle)
      || deployment.id.toLowerCase().includes(needle);
    return matchesTruth && matchesQuery;
  }), [deployments, query, truthFilter]);

  const counts = useMemo(() => {
    const result: Record<DeploymentTruthState, number> = {
      in_progress: 0,
      configuration_active: 0,
      runtime_connected: 0,
      runtime_verified: 0,
      failed: 0,
    };
    for (const deployment of deployments) result[classifyDeploymentTruth(deployment)] += 1;
    return result;
  }, [deployments]);

  async function toggleEvents(deploymentId: string) {
    if (expandedId === deploymentId) {
      setExpandedId(null);
      setEvents([]);
      return;
    }
    setExpandedId(deploymentId);
    setEvents([]);
    setEventsLoading(true);
    try {
      setEvents(await listDeploymentEvents(deploymentId));
    } catch (cause) {
      toast({
        title: 'Failed to load activation evidence',
        description: cause instanceof Error ? cause.message : 'Evidence could not be loaded.',
        variant: 'destructive',
      });
    } finally {
      setEventsLoading(false);
    }
  }

  if (loading) {
    return (
      <main className="flex min-h-[60vh] items-center justify-center" role="status" aria-busy="true">
        <Activity className="h-8 w-8 animate-pulse text-primary" aria-hidden="true" />
      </main>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto max-w-[1500px] p-6">
        <WorkspaceHeader
          eyebrow="Operate"
          title="Activation & Runtime Evidence"
          icon={Server}
          capabilityId="governance.controls"
          description="Configuration activation and external runtime evidence are tracked separately. A configuration-active record is not a verified runtime."
          meta={<PagePurpose route="/deployments" />}
          actions={<Button variant="outline" onClick={() => navigate('/builder')}>Open Builder</Button>}
        />

        <SectionCard
          title="Evidence summary"
          description="Counts are derived from persisted deployment fields, not inferred from an active status alone."
          className="mb-6"
        >
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <DCKPITile label="Configuration active" value={counts.configuration_active.toString()} sublabel="No verified runtime evidence" status="info" icon={<CheckCircle2 className="h-4 w-4" />} />
            <DCKPITile label="Runtime verified" value={counts.runtime_verified.toString()} sublabel="URL plus healthy evidence" status="normal" icon={<Activity className="h-4 w-4" />} />
            <DCKPITile label="Runtime connected" value={counts.runtime_connected.toString()} sublabel="Runtime evidence is present but not healthy" status={counts.runtime_connected > 0 ? 'warning' : 'normal'} icon={<AlertCircle className="h-4 w-4" />} />
            <DCKPITile label="Failed / in progress" value={(counts.failed + counts.in_progress).toString()} sublabel="Requires review or completion" status={counts.failed > 0 ? 'critical' : 'info'} icon={<XCircle className="h-4 w-4" />} />
          </div>
        </SectionCard>

        <DCCard status="info" className="mb-6 p-4">
          <div className="flex flex-col gap-3 md:flex-row">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
              <Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search system, version, or evidence ID" className="pl-9" />
            </div>
            <Select value={truthFilter} onValueChange={(value) => setTruthFilter(value as DeploymentTruthState | 'all')}>
              <SelectTrigger className="w-full md:w-56" aria-label="Evidence state">
                <SelectValue placeholder="Evidence state" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All evidence states</SelectItem>
                <SelectItem value="configuration_active">Configuration active</SelectItem>
                <SelectItem value="runtime_connected">Runtime connected</SelectItem>
                <SelectItem value="runtime_verified">Runtime verified</SelectItem>
                <SelectItem value="in_progress">In progress</SelectItem>
                <SelectItem value="failed">Failed</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </DCCard>

        <DCCard status="info" className="overflow-hidden">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>System</TableHead>
                  <TableHead>Evidence state</TableHead>
                  <TableHead>Runtime URL</TableHead>
                  <TableHead>Health evidence</TableHead>
                  <TableHead>Recorded</TableHead>
                  <TableHead className="text-right">Evidence</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="py-12 text-center text-muted-foreground">
                      No activation or runtime evidence matches this view.
                    </TableCell>
                  </TableRow>
                ) : filtered.map((deployment) => {
                  const truth = classifyDeploymentTruth(deployment);
                  return (
                    <React.Fragment key={deployment.id}>
                      <TableRow>
                        <TableCell>
                          <div className="font-medium">{deployment.agent_name}</div>
                          <div className="text-xs text-muted-foreground">v{deployment.version.replace(/^v/i, '')} · {deployment.id.slice(0, 8)}</div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={truthVariant(truth)}>{deploymentTruthLabel(truth)}</Badge>
                          {deployment.error_message && <p className="mt-1 text-xs text-destructive">{deployment.error_message}</p>}
                        </TableCell>
                        <TableCell>
                          {deployment.runtime_url ? (
                            <Button variant="link" className="h-auto p-0" onClick={() => window.open(deployment.runtime_url!, '_blank', 'noopener,noreferrer')}>
                              Open runtime <ExternalLink className="ml-1 h-3.5 w-3.5" aria-hidden="true" />
                            </Button>
                          ) : <span className="text-sm text-muted-foreground">Not provided</span>}
                        </TableCell>
                        <TableCell><span className="text-sm">{deployment.health ?? 'Not provided'}</span></TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1 text-sm">
                            <Calendar className="h-3.5 w-3.5 text-muted-foreground" aria-hidden="true" />
                            {format(new Date(deployment.created_at), 'MMM d, yyyy h:mm a')}
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button variant="outline" size="sm" onClick={() => { void toggleEvents(deployment.id); }}>
                            {expandedId === deployment.id ? 'Hide' : 'View'} events
                          </Button>
                        </TableCell>
                      </TableRow>
                      {expandedId === deployment.id && (
                        <TableRow>
                          <TableCell colSpan={6} className="bg-muted/20">
                            {eventsLoading ? (
                              <p className="py-4 text-sm text-muted-foreground">Loading immutable event evidence...</p>
                            ) : events.length === 0 ? (
                              <p className="py-4 text-sm text-muted-foreground">No event evidence was recorded for this legacy record.</p>
                            ) : (
                              <div className="space-y-2 py-3">
                                {events.map((event) => (
                                  <div key={event.id} className="grid gap-1 rounded-md border border-border bg-background p-3 text-sm md:grid-cols-[3rem_1fr_8rem]">
                                    <span className="text-muted-foreground">#{event.sequence}</span>
                                    <span>{event.stage}</span>
                                    <Badge variant={event.status === 'failed' ? 'destructive' : event.status === 'succeeded' ? 'default' : 'outline'}>{event.status}</Badge>
                                  </div>
                                ))}
                              </div>
                            )}
                          </TableCell>
                        </TableRow>
                      )}
                    </React.Fragment>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </DCCard>
      </div>
    </div>
  );
}
