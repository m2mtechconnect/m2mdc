/**
 * Data & Storage tab (manifest capability `data.storage`).
 *
 * A first-class view of where facility data enters AURA, where it is retained
 * and where it is sent onward. Every figure here is derived from persisted
 * connection, ingest, contract and event records - nothing is fabricated and
 * no provider/implementation name is rendered.
 */
import { useMemo } from 'react';
import { Database, Download, FileCheck2, Upload } from 'lucide-react';
import { SectionCard, WorkspaceEmptyState } from '@/components/workspace-system';
import { ConnectionStatusBadge } from './ConnectionStatusBadge';
import { formatDateTime, formatRelative, type ConnectionRow } from '@/connections/presentation';
import type { IngestRunRecord } from '@/connections/model';
import type { DataContractRecord } from '@/connections/api';
import { stackCopy } from '@/config/auraStackManifest';

/** Inbound directions bring data into AURA; outbound directions send it out. */
function isInbound(direction: string): boolean {
  const value = direction.toUpperCase();
  return value.includes('IN') || value.includes('BIDIRECTIONAL');
}

function isOutbound(direction: string): boolean {
  const value = direction.toUpperCase();
  return value.includes('OUT') || value.includes('BIDIRECTIONAL');
}

export interface DataStorageTabProps {
  rows: ConnectionRow[];
  ingestRuns: IngestRunRecord[];
  contracts: DataContractRecord[];
  retainedEventCount: number;
  loading: boolean;
  onOpenConnection: (id: string) => void;
}

export function DataStorageTab({
  rows,
  ingestRuns,
  contracts,
  retainedEventCount,
  loading,
  onOpenConnection,
}: DataStorageTabProps) {
  const capability = stackCopy('data.storage');

  const sources = useMemo(
    () => rows.filter((row) => isInbound(row.connection.data_direction)),
    [rows],
  );
  const destinations = useMemo(
    () => rows.filter((row) => isOutbound(row.connection.data_direction)),
    [rows],
  );

  const accepted = ingestRuns.reduce((total, run) => total + (run.records_accepted ?? 0), 0);
  const rejected = ingestRuns.reduce((total, run) => total + (run.records_rejected ?? 0), 0);
  const lastRun = ingestRuns
    .slice()
    .sort((a, b) => (b.started_at ?? '').localeCompare(a.started_at ?? ''))[0] ?? null;

  return (
    <div className="min-w-0 space-y-4" data-testid="data-storage-tab">
      <SectionCard
        title="Data & Storage"
        icon={Database}
        description={capability.description}
        actions={
          <span className="aura-ws-chip" data-variant="qualifier">
            {capability.qualifier ?? 'CONFIGURED'}
          </span>
        }
      >
        <dl className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <div>
            <dt className="text-xs font-medium text-muted-foreground">Data sources</dt>
            <dd className="mt-1 text-2xl font-semibold tabular-nums">{sources.length}</dd>
            <p className="text-[13px] text-muted-foreground">Configured inbound connections</p>
          </div>
          <div>
            <dt className="text-xs font-medium text-muted-foreground">Storage destinations</dt>
            <dd className="mt-1 text-2xl font-semibold tabular-nums">{destinations.length}</dd>
            <p className="text-[13px] text-muted-foreground">Configured outbound destinations</p>
          </div>
          <div>
            <dt className="text-xs font-medium text-muted-foreground">Retained events</dt>
            <dd className="mt-1 text-2xl font-semibold tabular-nums">{retainedEventCount}</dd>
            <p className="text-[13px] text-muted-foreground">Persisted under tenant isolation</p>
          </div>
          <div>
            <dt className="text-xs font-medium text-muted-foreground">Data contracts</dt>
            <dd className="mt-1 text-2xl font-semibold tabular-nums">{contracts.length}</dd>
            <p className="text-[13px] text-muted-foreground">Declared exchange schemas</p>
          </div>
        </dl>
      </SectionCard>

      <div className="grid min-w-0 gap-4 lg:grid-cols-2">
        <SectionCard title="Data sources" icon={Download} description="Where facility data enters AURA.">
          {loading ? (
            <p className="text-[13px] text-muted-foreground">Loading connection register…</p>
          ) : sources.length === 0 ? (
            <WorkspaceEmptyState
              icon={Download}
              title="No inbound data source configured"
              status="NOT CONFIGURED"
              description="Add a connection with an inbound direction to start receiving facility data."
            />
          ) : (
            <ul className="min-w-0 divide-y divide-border">
              {sources.map((row) => (
                <li key={row.connection.id} className="flex min-w-0 items-center justify-between gap-3 py-2.5">
                  <button
                    type="button"
                    className="min-w-0 text-left"
                    onClick={() => onOpenConnection(row.connection.id)}
                  >
                    <span className="block truncate text-sm font-medium">{row.connection.display_name}</span>
                    <span className="block text-xs text-muted-foreground">
                      Last data received {formatRelative(row.connection.last_ingest_at)}
                    </span>
                  </button>
                  <ConnectionStatusBadge status={row.connection.status} />
                </li>
              ))}
            </ul>
          )}
        </SectionCard>

        <SectionCard title="Storage destinations" icon={Upload} description="Where AURA sends retained data onward.">
          {loading ? (
            <p className="text-[13px] text-muted-foreground">Loading connection register…</p>
          ) : destinations.length === 0 ? (
            <WorkspaceEmptyState
              icon={Upload}
              title="No outbound destination configured"
              status="NOT CONFIGURED"
              description="Facility data is retained inside AURA only. Configure an outbound connection to export it."
            />
          ) : (
            <ul className="min-w-0 divide-y divide-border">
              {destinations.map((row) => (
                <li key={row.connection.id} className="flex min-w-0 items-center justify-between gap-3 py-2.5">
                  <button
                    type="button"
                    className="min-w-0 text-left"
                    onClick={() => onOpenConnection(row.connection.id)}
                  >
                    <span className="block truncate text-sm font-medium">{row.connection.display_name}</span>
                    <span className="block text-xs text-muted-foreground">
                      Last successful exchange {formatRelative(row.connection.last_success_at)}
                    </span>
                  </button>
                  <ConnectionStatusBadge status={row.connection.status} />
                </li>
              ))}
            </ul>
          )}
        </SectionCard>
      </div>

      <SectionCard
        title="Retention & evidence health"
        icon={FileCheck2}
        description="Recorded ingestion outcomes and declared contracts. Values are counted from stored records only."
      >
        {ingestRuns.length === 0 && contracts.length === 0 ? (
          <WorkspaceEmptyState
            icon={FileCheck2}
            title="No ingestion or contract evidence recorded"
            status="NOT MEASURED"
            description="Evidence appears here once an ingest run completes or a data contract is registered."
          />
        ) : (
          <dl className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <div>
              <dt className="text-xs font-medium text-muted-foreground">Records accepted</dt>
              <dd className="mt-1 text-xl font-semibold tabular-nums">{accepted}</dd>
            </div>
            <div>
              <dt className="text-xs font-medium text-muted-foreground">Records rejected</dt>
              <dd className="mt-1 text-xl font-semibold tabular-nums">{rejected}</dd>
            </div>
            <div>
              <dt className="text-xs font-medium text-muted-foreground">Ingest runs</dt>
              <dd className="mt-1 text-xl font-semibold tabular-nums">{ingestRuns.length}</dd>
            </div>
            <div>
              <dt className="text-xs font-medium text-muted-foreground">Last ingest run</dt>
              <dd className="mt-1 text-sm font-medium">
                {lastRun ? `${lastRun.final_status} · ${formatDateTime(lastRun.started_at)}` : 'Not recorded'}
              </dd>
            </div>
          </dl>
        )}
      </SectionCard>
    </div>
  );
}

export default DataStorageTab;
