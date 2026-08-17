/**
 * Activity and health. Throughput, ingest outcomes, health checks and audit
 * events for the selected connection. Counters are read from persisted
 * records only, so a zero-event history renders a zero, never a trend.
 */
import { useMemo, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import type { ConnectionInstance, HealthCheckRecord, IngestRunRecord } from '@/connections/model';
import type { AuditEventRecord } from '@/connections/api';
import { formatDateTime } from '@/connections/presentation';
import { RuntimeReadinessPanel } from './RuntimeReadinessPanel';
import { RuntimeDiagnosticsPanel } from './RuntimeDiagnosticsPanel';

function Metric({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="min-w-0 rounded-lg border border-border p-4">
      <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-1 text-2xl font-semibold tabular-nums">{value}</p>
      {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

export function ActivityTab({
  connections,
  healthChecks,
  ingestRuns,
  auditEvents,
}: {
  connections: ConnectionInstance[];
  healthChecks: HealthCheckRecord[];
  ingestRuns: IngestRunRecord[];
  auditEvents: AuditEventRecord[];
}) {
  const [connectionFilter, setConnectionFilter] = useState<string>('all');
  const names = useMemo(() => new Map(connections.map((c) => [c.id, c.display_name])), [connections]);

  const match = (id: string | null) => connectionFilter === 'all' || id === connectionFilter;
  const checks = healthChecks.filter((h) => match(h.connection_id));
  const runs = ingestRuns.filter((r) => match(r.connection_id));
  const audit = auditEvents.filter((a) => match(a.connection_id));

  const totals = runs.reduce(
    (acc, r) => ({
      received: acc.received + r.records_received,
      accepted: acc.accepted + r.records_accepted,
      rejected: acc.rejected + r.records_rejected,
      deadLetters: acc.deadLetters + r.dead_letter_count,
    }),
    { received: 0, accepted: 0, rejected: 0, deadLetters: 0 },
  );
  const lastRun = runs[0] ?? null;
  const lastCheck = checks[0] ?? null;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-2">
        <label htmlFor="activity-connection" className="text-sm font-medium text-muted-foreground">
          Connection
        </label>
        <Select value={connectionFilter} onValueChange={setConnectionFilter}>
          <SelectTrigger id="activity-connection" className="h-10 w-[260px] text-sm">
            <SelectValue placeholder="All connections" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All connections</SelectItem>
            {connections.map((c) => (
              <SelectItem key={c.id} value={c.id}>{c.display_name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Metric label="Messages received" value={totals.received.toLocaleString()} hint={`${runs.length} ingest runs recorded`} />
        <Metric label="Accepted" value={totals.accepted.toLocaleString()} hint="Passed contract validation" />
        <Metric label="Rejected" value={totals.rejected.toLocaleString()} hint={`${totals.deadLetters.toLocaleString()} dead lettered`} />
        <Metric
          label="Last activity"
          value={lastRun ? formatDateTime(lastRun.started_at) : 'None'}
          hint={lastCheck ? `Last check ${lastCheck.status.toLowerCase()} at ${formatDateTime(lastCheck.started_at)}` : 'No health check has been executed'}
        />
      </div>

      <RuntimeReadinessPanel connections={connections} />
      <RuntimeDiagnosticsPanel />

      <Tabs defaultValue="runs" className="min-w-0">
        <TabsList className="inline-flex w-max">
          <TabsTrigger value="runs" className="min-h-[40px] text-sm">Ingest runs</TabsTrigger>
          <TabsTrigger value="checks" className="min-h-[40px] text-sm">Health checks</TabsTrigger>
          <TabsTrigger value="audit" className="min-h-[40px] text-sm">Audit trail</TabsTrigger>
        </TabsList>

        <TabsContent value="runs" className="mt-4">
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-base">Ingest runs</CardTitle></CardHeader>
            <CardContent className="text-sm">
              {runs.length === 0 ? (
                <p className="text-muted-foreground">
                  No event has been received for this selection. No trend is rendered for a zero-event history.
                </p>
              ) : (
                <ul className="space-y-2">
                  {runs.slice(0, 25).map((r) => (
                    <li key={r.id} className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-border p-3">
                      <div className="min-w-0">
                        <p className="text-sm font-medium">{names.get(r.connection_id) ?? r.connection_id}</p>
                        <p className="text-xs text-muted-foreground">
                          {formatDateTime(r.started_at)} · received {r.records_received} · accepted {r.records_accepted} · rejected {r.records_rejected} · mapping failures {r.mapping_failures} · dead letters {r.dead_letter_count}
                        </p>
                      </div>
                      <Badge variant="outline" className="text-xs">{r.final_status}</Badge>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="checks" className="mt-4">
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-base">Health checks</CardTitle></CardHeader>
            <CardContent className="space-y-2 text-sm">
              {checks.length === 0 ? (
                <p className="text-muted-foreground">No health check has been executed for this selection.</p>
              ) : (
                checks.slice(0, 25).map((h) => (
                  <div key={h.id} className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-border p-3">
                    <div className="min-w-0">
                      <p className="text-sm font-medium">{names.get(h.connection_id) ?? h.connection_id}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatDateTime(h.started_at)} · {h.check_type} · network {h.network_result ?? 'n/a'} · auth {h.auth_result ?? 'n/a'} · data {h.data_availability ?? 'n/a'} · {h.latency_ms ?? 'no'} ms
                      </p>
                      {h.safe_message && <p className="text-xs text-muted-foreground">{h.safe_message}</p>}
                    </div>
                    <Badge variant="outline" className="text-xs">{h.status}</Badge>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="audit" className="mt-4">
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-base">Audit trail</CardTitle></CardHeader>
            <CardContent className="text-sm">
              {audit.length === 0 ? (
                <p className="text-muted-foreground">No audited connection action has been recorded for this selection.</p>
              ) : (
                <ul className="space-y-2">
                  {audit.slice(0, 25).map((a) => (
                    <li key={a.id} className="rounded-md border border-border p-3 text-xs">
                      {formatDateTime(a.created_at)} · {a.action} · {names.get(a.connection_id ?? '') ?? 'platform'} · {a.previous_state ?? 'none'} to {a.new_state ?? 'none'} · correlation {a.correlation_id ?? 'none'}
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
