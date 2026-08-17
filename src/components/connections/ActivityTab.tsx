import { useMemo, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { ConnectionInstance, HealthCheckRecord, IngestRunRecord } from '@/connections/model';
import type { AuditEventRecord } from '@/connections/api';

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

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-2">
        <label htmlFor="activity-connection" className="text-xs font-medium text-muted-foreground">
          Connection
        </label>
        <select
          id="activity-connection"
          value={connectionFilter}
          onChange={(e) => setConnectionFilter(e.target.value)}
          className="h-9 min-h-[32px] rounded-md border border-input bg-background px-2 text-sm"
        >
          <option value="all">All connections</option>
          {connections.map((c) => (
            <option key={c.id} value={c.id}>{c.display_name}</option>
          ))}
        </select>
      </div>

      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-base">Health checks</CardTitle></CardHeader>
        <CardContent className="space-y-2 text-sm">
          {checks.length === 0 ? (
            <p className="text-sm text-muted-foreground">No health check has been executed for this selection.</p>
          ) : (
            checks.slice(0, 25).map((h) => (
              <div key={h.id} className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-border p-3">
                <div className="min-w-0">
                  <p className="text-sm font-medium">{names.get(h.connection_id) ?? h.connection_id}</p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(h.started_at).toLocaleString()} · {h.check_type} · network {h.network_result ?? 'n/a'} · auth {h.auth_result ?? 'n/a'} · data {h.data_availability ?? 'n/a'} · {h.latency_ms ?? '—'} ms
                  </p>
                  {h.safe_message && <p className="text-xs text-muted-foreground">{h.safe_message}</p>}
                </div>
                <Badge variant="outline" className="text-xs">{h.status}</Badge>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-base">Ingest runs</CardTitle></CardHeader>
        <CardContent className="text-sm">
          {runs.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No events have been received from this connection. No trend is rendered for a zero-event history.
            </p>
          ) : (
            <ul className="space-y-2">
              {runs.slice(0, 25).map((r) => (
                <li key={r.id} className="rounded-md border border-border p-3 text-xs">
                  {new Date(r.started_at).toLocaleString()} · received {r.records_received} · accepted {r.records_accepted} · rejected {r.records_rejected} · mapping failures {r.mapping_failures} · dead letters {r.dead_letter_count} · {r.final_status}
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-base">Audit events</CardTitle></CardHeader>
        <CardContent className="text-sm">
          {audit.length === 0 ? (
            <p className="text-sm text-muted-foreground">No audited connection action has been recorded for this selection.</p>
          ) : (
            <ul className="space-y-2">
              {audit.slice(0, 25).map((a) => (
                <li key={a.id} className="rounded-md border border-border p-3 text-xs">
                  {new Date(a.created_at).toLocaleString()} · {a.action} · {names.get(a.connection_id ?? '') ?? '—'} · {a.previous_state ?? '—'} → {a.new_state ?? '—'} · correlation {a.correlation_id ?? '—'}
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}