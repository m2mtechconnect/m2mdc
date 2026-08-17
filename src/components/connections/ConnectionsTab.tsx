import { useMemo, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { useRBAC } from '@/contexts/RBACContext';
import { ConnectionStatusBadge } from './ConnectionStatusBadge';
import { ConnectionSetupWizard } from './ConnectionSetupWizard';
import {
  canRunHealthCheck,
  summariseConnections,
  STATUS_DESCRIPTORS,
  type ConnectionInstance,
  type ConnectorDefinition,
  type HealthCheckRecord,
} from '@/connections/model';
import { runHealthCheck, deactivateConnection, deleteConnection, activateConnection } from '@/connections/api';

interface Props {
  connections: ConnectionInstance[];
  definitions: ConnectorDefinition[];
  healthChecks: HealthCheckRecord[];
  eventCount: number;
  loading: boolean;
  onRefresh: () => void;
}

function fmt(value: string | null) {
  if (!value) return 'Never';
  return new Date(value).toLocaleString();
}

export function ConnectionsTab({ connections, definitions, healthChecks, eventCount, loading, onRefresh }: Props) {
  const { can, role } = useRBAC();
  const { toast } = useToast();
  const [query, setQuery] = useState('');
  const [testing, setTesting] = useState<string | null>(null);
  const [wizardOpen, setWizardOpen] = useState(false);
  const [mutating, setMutating] = useState<string | null>(null);
  const isAdmin = role === 'admin' || role === 'owner' || can('twin.edit');

  const byId = useMemo(() => new Map(definitions.map((d) => [d.id, d])), [definitions]);
  const summary = useMemo(
    () => summariseConnections(connections, definitions, eventCount),
    [connections, definitions, eventCount],
  );
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return connections;
    return connections.filter(
      (c) => c.display_name.toLowerCase().includes(q) || c.connector_id.toLowerCase().includes(q),
    );
  }, [connections, query]);

  const lastCheckFor = (id: string) => healthChecks.find((h) => h.connection_id === id) ?? null;

  async function handleTest(connection: ConnectionInstance) {
    setTesting(connection.id);
    try {
      const result = await runHealthCheck(connection.id);
      toast({
        title: result.status === 'PASSED' ? 'Health check passed' : 'Health check failed',
        description: `${result.safe_message ?? ''} A passing check proves reachability, not data flow.`,
      });
      onRefresh();
    } catch (error) {
      toast({
        title: 'Health check could not run',
        description: error instanceof Error ? error.message : 'The server-side probe was rejected.',
        variant: 'destructive',
      });
    } finally {
      setTesting(null);
    }
  }

  async function handleLifecycle(connection: ConnectionInstance, action: 'activate' | 'deactivate' | 'delete') {
    if (action === 'delete' && !window.confirm(`Delete "${connection.display_name}"? The audit trail is retained.`)) return;
    setMutating(connection.id);
    try {
      if (action === 'activate') {
        const status = await activateConnection(connection.id);
        toast({ title: 'Connection activated', description: `Status is now ${status}.` });
      } else if (action === 'deactivate') {
        await deactivateConnection(connection.id);
        toast({ title: 'Connection disabled', description: 'The connection is no longer enabled.' });
      } else {
        await deleteConnection(connection.id);
        toast({ title: 'Connection deleted', description: 'The connection record was removed.' });
      }
      onRefresh();
    } catch (error) {
      toast({
        title: 'Action refused',
        description: error instanceof Error ? error.message : 'The server rejected the request.',
        variant: 'destructive',
      });
    } finally {
      setMutating(null);
    }
  }

  const cards = [
    { label: 'Operational data sources', value: summary.operationalDataSources, hint: 'Facility/OT sources supplying data now.' },
    { label: 'Platform services', value: summary.platformServices, hint: 'Application-plane services proven healthy.' },
    { label: 'Healthy', value: summary.healthy, hint: 'Last check passed and data observed.' },
    { label: 'Degraded', value: summary.degraded, hint: 'Partially working.' },
    { label: 'Needs attention', value: summary.needsAttention, hint: 'Blocked, failed or awaiting configuration.' },
    { label: 'DSX events received', value: summary.events, hint: 'Total events accepted by the DSX ingest gateway.' },
  ];

  return (
    <div className="space-y-6">
      <section aria-labelledby="connections-summary-heading" className="space-y-3">
        <h2 id="connections-summary-heading" className="text-base font-semibold">Evidence summary</h2>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
          {cards.map((c) => (
            <Card key={c.label} className="min-w-0">
              <CardContent className="space-y-1 p-4">
                <p className="text-xs font-medium text-muted-foreground">{c.label}</p>
                <p className="text-2xl font-semibold tabular-nums">{c.value}</p>
                <p className="text-xs text-muted-foreground">{c.hint}</p>
              </CardContent>
            </Card>
          ))}
        </div>
        <p className="text-xs text-muted-foreground">
          Last successful ingest: {fmt(summary.lastIngestAt)}. Catalogue definitions are not counted as connected systems.
        </p>
      </section>

      <section aria-labelledby="connections-list-heading" className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 id="connections-list-heading" className="text-base font-semibold">Configured connections</h2>
          <div className="flex flex-wrap items-center gap-2">
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search connections"
              aria-label="Search connections"
              className="h-9 w-full max-w-xs text-sm"
            />
            <Button
              size="sm"
              className="min-h-[32px]"
              onClick={() => setWizardOpen(true)}
              disabled={!isAdmin}
            >
              Add connection
            </Button>
            {!isAdmin && (
              <span className="text-xs text-muted-foreground">Creating a connection requires an administrator role.</span>
            )}
          </div>
        </div>

        {loading && <p className="text-sm text-muted-foreground">Loading connection records…</p>}
        {!loading && filtered.length === 0 && (
          <Card><CardContent className="p-6 text-sm text-muted-foreground">No connection instance matches this filter.</CardContent></Card>
        )}

        <div className="space-y-3">
          {filtered.map((connection) => {
            const definition = byId.get(connection.connector_id);
            const check = lastCheckFor(connection.id);
            const testable = canRunHealthCheck(connection);
            return (
              <Card key={connection.id} className="min-w-0">
                <CardHeader className="gap-2 pb-3">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <CardTitle className="text-base">{connection.display_name}</CardTitle>
                      <CardDescription className="text-xs">
                        {definition?.name ?? connection.connector_id} · {definition?.category ?? 'Uncategorised'} · {connection.environment}
                      </CardDescription>
                    </div>
                    <ConnectionStatusBadge status={connection.status} />
                  </div>
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                  <dl className="grid grid-cols-1 gap-x-6 gap-y-2 sm:grid-cols-2 xl:grid-cols-4">
                    <div><dt className="text-xs text-muted-foreground">Direction</dt><dd className="text-sm">{connection.data_direction}</dd></div>
                    <div><dt className="text-xs text-muted-foreground">Authentication</dt><dd className="text-sm">{definition?.supported_auth_methods?.join(', ') || 'None'}</dd></div>
                    <div><dt className="text-xs text-muted-foreground">Last check</dt><dd className="text-sm">{fmt(connection.last_tested_at)}</dd></div>
                    <div><dt className="text-xs text-muted-foreground">Last data received</dt><dd className="text-sm">{fmt(connection.last_ingest_at)}</dd></div>
                  </dl>
                  <p className="text-xs text-muted-foreground">
                    {connection.status_reason ?? STATUS_DESCRIPTORS[connection.status]?.meaning}
                  </p>
                  {check && (
                    <p className="text-xs text-muted-foreground">
                      Last probe: {check.status} · network {check.network_result ?? 'n/a'} · auth {check.auth_result ?? 'n/a'} · data {check.data_availability ?? 'n/a'} · {check.latency_ms ?? '—'} ms
                    </p>
                  )}
                  <div className="flex flex-wrap items-center gap-2">
                    {testable ? (
                      <Button
                        size="sm"
                        variant="outline"
                        className="min-h-[32px]"
                        disabled={!isAdmin || testing === connection.id}
                        onClick={() => handleTest(connection)}
                      >
                        {testing === connection.id ? 'Testing…' : 'Test connection'}
                      </Button>
                    ) : (
                      <Badge variant="outline" className="text-xs">
                        Test unavailable: no server-side probe for this connector
                      </Badge>
                    )}
                    {!isAdmin && (
                      <span className="text-xs text-muted-foreground">
                        Testing requires an administrator role.
                      </span>
                    )}
                    {connection.is_system && (
                      <Badge variant="outline" className="text-xs">System connection: cannot be removed</Badge>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </section>
    </div>
  );
}