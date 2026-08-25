import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Activity, AlertTriangle, ArrowUpRight, ShieldAlert } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Panel, SectionHeader, Instrument, InstrumentGrid } from '@/components/v2';
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

function Metric({
  label,
  value,
  hint,
  state = 'neutral',
}: {
  label: string;
  value: string | number;
  hint: string;
  state?: 'neutral' | 'verified' | 'simulated' | 'critical' | 'info';
}) {
  return <Instrument level="secondary" state={state} label={label} value={value} detail={hint} />;
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

  const healthy = rows.filter((row) => row.connection.status === 'HEALTHY').length;
  const operationalSources = rows.filter(
    (row) =>
      (row.definition?.category === 'Facility and OT' || row.definition?.category === 'DSX Exchange') &&
      (row.connection.status === 'HEALTHY' || row.connection.status === 'SYNCING'),
  ).length;
  const activeMappings = mappings.filter((mapping) => mapping.active).length;
  const unmapped = mappings.filter((mapping) => !mapping.active).length;
  const blockers = rows.filter((row) => row.connection.status === 'BLOCKED' || row.connection.status === 'NOT_DEPLOYED');
  const accepted = ingestRuns.reduce((total, run) => total + (run.records_accepted || 0), 0);
  const rejected = ingestRuns.reduce((total, run) => total + (run.records_rejected || 0), 0);
  const lastIngest = rows.map((row) => row.connection.last_ingest_at).filter(Boolean).sort().pop() ?? null;
  const latestAudit = auditEvents[0] ?? null;

  if (loading) {
    return (
      <div className="space-y-4" role="status" aria-label="Loading Connections overview">
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-6">
          {Array.from({ length: 6 }).map((_, index) => <Skeleton key={index} className="h-[104px] w-full rounded-lg" />)}
        </div>
        <Skeleton className="h-48 w-full rounded-lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <section aria-labelledby="overview-metrics" className="space-y-3">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 id="overview-metrics" className="v2-label">Operational summary</h2>
          <p className="v2-mono text-xs text-muted-foreground">
            Evidence refreshed {formatRelative(new Date(lastRefreshedAt).toISOString())}
          </p>
        </div>
        <InstrumentGrid className="grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          <Metric state={healthy > 0 ? 'verified' : 'neutral'} label="Healthy" value={healthy} hint="Check passed and data observed." />
          <Metric state={attention.length > 0 ? 'simulated' : 'neutral'} label="Needs attention" value={attention.length} hint="Failed, degraded or awaiting setup." />
          <Metric label="Operational sources" value={operationalSources} hint="Facility/OT and gateway sources supplying data." />
          <Metric label="Events received" value={eventCount} hint="Accepted by the ingest gateway." />
          <Metric label="Active mappings" value={activeMappings} hint="Signal-to-twin bindings executing." />
          <Metric label="Unmapped signals" value={unmapped} hint="Defined but not activated." />
        </InstrumentGrid>
        <p className="text-sm text-muted-foreground">
          Last data received: <span className="v2-mono">{formatDateTime(lastIngest)}</span>. Application services are counted separately from operational data sources.
        </p>
      </section>

      <section aria-labelledby="overview-topology" className="space-y-3">
        <h2 id="overview-topology" className="v2-label">Data topology</h2>
        <DataTopology nodes={topology.nodes} edges={topology.edges} />
      </section>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <Panel className="min-w-0">
          <SectionHeader
            title={
              <span className="flex items-center gap-2">
                <AlertTriangle className="h-3.5 w-3.5" aria-hidden />
                Needs attention
              </span>
            }
          />
          <div className="space-y-2">
            {attention.length === 0 ? (
              <p className="text-sm text-muted-foreground">No connection currently requires an operator action.</p>
            ) : (
              attention.slice(0, 4).map((item) => (
                <div key={item.connectionId} className="v2-subpanel flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium">{item.name}</p>
                    <p className="text-sm text-muted-foreground">{item.reason}</p>
                  </div>
                  <Button size="sm" variant="outline" className="h-9" onClick={() => onOpenConnection(item.connectionId)}>
                    Resolve
                  </Button>
                </div>
              ))
            )}
          </div>
        </Panel>

        <Panel className="min-w-0">
          <SectionHeader
            title={
              <span className="flex items-center gap-2">
                <Activity className="h-3.5 w-3.5" aria-hidden />
                Activity & health
              </span>
            }
          />
          <div className="space-y-4 text-sm">
            <dl className="grid grid-cols-2 gap-3">
              <div><dt className="text-xs uppercase tracking-wide text-muted-foreground">Accepted</dt><dd className="v2-mono text-lg font-semibold tabular-nums">{accepted}</dd></div>
              <div><dt className="text-xs uppercase tracking-wide text-muted-foreground">Rejected</dt><dd className="v2-mono text-lg font-semibold tabular-nums">{rejected}</dd></div>
              <div><dt className="text-xs uppercase tracking-wide text-muted-foreground">Ingest runs</dt><dd className="v2-mono text-lg font-semibold tabular-nums">{ingestRuns.length}</dd></div>
              <div><dt className="text-xs uppercase tracking-wide text-muted-foreground">Mapping coverage</dt><dd className="v2-mono text-lg font-semibold tabular-nums">{mappings.length === 0 ? 'No mappings' : `${Math.round((activeMappings / mappings.length) * 100)}%`}</dd></div>
            </dl>
            <div className="rounded-md border border-border bg-muted/20 p-3">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Latest audited action</p>
              <p className="mt-1 text-sm font-medium">{latestAudit?.action ?? 'No audited action yet'}</p>
              {latestAudit && <p className="v2-mono mt-1 text-xs text-muted-foreground">{formatDateTime(latestAudit.created_at)}</p>}
            </div>
            <Button variant="outline" size="sm" className="h-10" onClick={() => onGoToTab('activity')}>
              Open Activity
            </Button>
          </div>
        </Panel>

        <Panel className="min-w-0">
          <SectionHeader
            title={
              <span className="flex items-center gap-2">
                <ShieldAlert className="h-3.5 w-3.5" aria-hidden />
                Deployment blockers
              </span>
            }
          />
          <div className="space-y-2 text-sm">
            {blockers.length === 0 ? (
              <p className="text-sm text-muted-foreground">No configured connection is blocked by a deployment gap.</p>
            ) : (
              blockers.slice(0, 4).map((row) => (
                <div key={row.connection.id} className="v2-subpanel">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-medium">{row.connection.display_name}</p>
                      <p className="text-muted-foreground">{row.statusMeaning}</p>
                    </div>
                    <Badge variant="outline">{row.connection.status}</Badge>
                  </div>
                </div>
              ))
            )}
            <Link to="/admin/platform-readiness" className="inline-flex items-center gap-1 text-sm underline underline-offset-4">
              Platform readiness
              <ArrowUpRight className="h-3.5 w-3.5" aria-hidden />
            </Link>
          </div>
        </Panel>
      </div>
    </div>
  );
}
