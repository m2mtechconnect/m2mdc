import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, ArrowUpRight, ShieldAlert } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { DataTopology } from './DataTopology';
import type { AuditEventRecord } from '@/connections/api';
import type { IngestRunRecord, TwinMappingRecord } from '@/connections/model';
import {
  attentionQueue,
  buildTopology,
  formatDateTime,
  formatRelative,
  type ConnectionRow,
} from '@/connections/presentation';

interface Props {
  rows: ConnectionRow[];
  mappings: TwinMappingRecord[];
  ingestRuns: IngestRunRecord[];
  auditEvents: AuditEventRecord[];
  eventCount: number;
  loading: boolean;
  lastRefreshedAt: number;
  onOpenConnection: (id: string) => void;
  onGoToTab: (tab: string) => void;
}

function Metric({ label, value, hint }: { label: string; value: string | number; hint: string }) {
  return (
    <div className="min-w-0 rounded-lg border border-border/60 bg-card p-4">
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-1 text-2xl font-semibold tabular-nums">{value}</p>
      <p className="mt-1 text-sm text-muted-foreground">{hint}</p>
    </div>
  );
}

export function OverviewTab({
  rows,
  mappings,
  ingestRuns,
  auditEvents,
  eventCount,
  loading,
  lastRefreshedAt,
  onOpenConnection,
  onGoToTab,
}: Props) {
  const topology = useMemo(() => buildTopology(rows, eventCount, mappings), [rows, eventCount, mappings]);
  const attention = useMemo(() => attentionQueue(rows), [rows]);

  const healthy = rows.filter((r) => r.connection.status === 'HEALTHY').length;
  const operationalSources = rows.filter(
    (r) =>
      (r.definition?.category === 'Facility and OT' || r.definition?.category === 'DSX Exchange') &&
      (r.connection.status === 'HEALTHY' || r.connection.status === 'SYNCING'),
  ).length;
  const activeMappings = mappings.filter((m) => m.active).length;
  const unmapped = mappings.filter((m) => !m.active).length;
  const blockers = rows.filter((r) => r.connection.status === 'BLOCKED' || r.connection.status === 'NOT_DEPLOYED');
  const accepted = ingestRuns.reduce((t, r) => t + (r.records_accepted || 0), 0);
  const rejected = ingestRuns.reduce((t, r) => t + (r.records_rejected || 0), 0);
  const lastIngest = rows.map((r) => r.connection.last_ingest_at).filter(Boolean).sort().pop() ?? null;

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-6">
          {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-[104px] w-full rounded-lg" />)}
        </div>
        <Skeleton className="h-48 w-full rounded-lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <section aria-labelledby="overview-metrics" className="space-y-3">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 id="overview-metrics" className="text-base font-semibold">Operational summary</h2>
          <p className="text-sm text-muted-foreground">
            Evidence refreshed {formatRelative(new Date(lastRefreshedAt).toISOString())}
          </p>
        </div>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-6">
          <Metric label="Healthy" value={healthy} hint="Check passed and data observed." />
          <Metric label="Needs attention" value={attention.length} hint="Failed, degraded or awaiting setup." />
          <Metric label="Operational data sources" value={operationalSources} hint="Facility/OT and gateway sources supplying data." />
          <Metric label="Events received" value={eventCount} hint="Accepted by the ingest gateway." />
          <Metric label="Active mappings" value={activeMappings} hint="Signal-to-twin bindings executing." />
          <Metric label="Unmapped signals" value={unmapped} hint="Defined but not activated." />
        </div>
        <p className="text-sm text-muted-foreground">
          Last data received: {formatDateTime(lastIngest)}. Application services are counted separately from
          operational data sources.
        </p>
      </section>

      <section aria-labelledby="overview-topology" className="space-y-3">
        <h2 id="overview-topology" className="text-base font-semibold">Data topology</h2>
        <DataTopology nodes={topology.nodes} edges={topology.edges} />
      </section>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <Card className="min-w-0">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <AlertTriangle className="h-4 w-4 text-muted-foreground" aria-hidden />
              Needs attention
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {attention.length === 0 ? (
              <p className="text-sm text-muted-foreground">No connection currently requires an operator action.</p>
            ) : (
              attention.slice(0, 6).map((item) => (
                <div key={item.connectionId} className="flex flex-wrap items-start justify-between gap-3 rounded-md bg-muted/50 p-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium">{item.name}</p>
                    <p className="text-sm text-muted-foreground">{item.reason}</p>
                    <p className="text-sm text-foreground">Action: {item.action}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs">{item.status}</Badge>
                    <Button size="sm" variant="outline" className="h-10" onClick={() => onOpenConnection(item.connectionId)}>
                      Resolve
                    </Button>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card className="min-w-0">
          <CardHeader className="pb-3"><CardTitle className="text-base">Data health</CardTitle></CardHeader>
          <CardContent className="space-y-3 text-sm">
            <dl className="grid grid-cols-2 gap-3">
              <div><dt className="text-xs uppercase tracking-wide text-muted-foreground">Accepted records</dt><dd className="text-lg font-semibold tabular-nums">{accepted}</dd></div>
              <div><dt className="text-xs uppercase tracking-wide text-muted-foreground">Rejected records</dt><dd className="text-lg font-semibold tabular-nums">{rejected}</dd></div>
              <div><dt className="text-xs uppercase tracking-wide text-muted-foreground">Ingest runs</dt><dd className="text-lg font-semibold tabular-nums">{ingestRuns.length}</dd></div>
              <div><dt className="text-xs uppercase tracking-wide text-muted-foreground">Mapping coverage</dt><dd className="text-lg font-semibold tabular-nums">{mappings.length === 0 ? 'No mappings' : `${Math.round((activeMappings / mappings.length) * 100)}%`}</dd></div>
            </dl>
            <p className="text-sm text-muted-foreground">
              {ingestRuns.length === 0
                ? 'No ingest run has been recorded, so no trend is rendered. These are point-in-time values.'
                : 'Values are cumulative over all persisted ingest runs for this tenant.'}
            </p>
            <Button variant="outline" size="sm" className="h-10" onClick={() => onGoToTab('activity')}>
              Open activity and health
            </Button>
          </CardContent>
        </Card>

        <Card className="min-w-0">
          <CardHeader className="pb-3"><CardTitle className="text-base">Recent activity</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {auditEvents.length === 0 ? (
              <p className="text-sm text-muted-foreground">No audited connection action has been recorded yet.</p>
            ) : (
              auditEvents.slice(0, 6).map((event) => (
                <div key={event.id} className="rounded-md bg-muted/50 p-3 text-sm">
                  <p className="font-medium">{event.action}</p>
                  <p className="text-muted-foreground">
                    {formatDateTime(event.created_at)} · {event.previous_state ?? '-'} to {event.new_state ?? '-'}
                  </p>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card className="min-w-0">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <ShieldAlert className="h-4 w-4 text-muted-foreground" aria-hidden />
              Deployment blockers
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {blockers.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No configured connection is blocked by a deployment gap.
              </p>
            ) : (
              blockers.map((row) => (
                <div key={row.connection.id} className="rounded-md bg-muted/50 p-3">
                  <p className="font-medium">{row.connection.display_name}</p>
                  <p className="text-muted-foreground">{row.statusMeaning}</p>
                </div>
              ))
            )}
            <Link
              to="/admin/platform-readiness"
              className="inline-flex items-center gap-1 text-sm underline underline-offset-4"
            >
              Platform readiness, DSX Exchange and agent tooling
              <ArrowUpRight className="h-3.5 w-3.5" aria-hidden />
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
