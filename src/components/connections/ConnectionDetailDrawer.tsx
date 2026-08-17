/**
 * Connection detail drawer. Every panel renders persisted evidence for one
 * connection record. Credential values are never requested or displayed:
 * only vault metadata (method, fingerprint, version, rotation date).
 */
import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowUpRight, Loader2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { ConnectionStatusBadge } from './ConnectionStatusBadge';
import {
  activateConnection,
  deactivateConnection,
  deleteConnection,
  runHealthCheck,
  type AuditEventRecord,
  type CredentialMetadata,
  type DataContractRecord,
  type FacilityOption,
} from '@/connections/api';
import { canRunHealthCheck, type HealthCheckRecord, type IngestRunRecord, type TwinMappingRecord } from '@/connections/model';
import { formatDateTime, type ConnectionRow } from '@/connections/presentation';

interface Props {
  row: ConnectionRow | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isAdmin: boolean;
  credential: CredentialMetadata | null;
  contracts: DataContractRecord[];
  mappings: TwinMappingRecord[];
  healthChecks: HealthCheckRecord[];
  ingestRuns: IngestRunRecord[];
  auditEvents: AuditEventRecord[];
  facilities: FacilityOption[];
  onRefresh: () => void;
  onManageCredential: () => void;
  onMapData: () => void;
}

const PANELS = [
  { id: 'overview', label: 'Overview' },
  { id: 'configuration', label: 'Configuration' },
  { id: 'contracts', label: 'Contracts and signals' },
  { id: 'mappings', label: 'Mappings' },
  { id: 'health', label: 'Health and ingest' },
  { id: 'audit', label: 'Audit and access' },
];

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className="text-xs uppercase tracking-wide text-muted-foreground">{label}</dt>
      <dd className="break-words text-sm">{value}</dd>
    </div>
  );
}

export function ConnectionDetailDrawer(props: Props) {
  const {
    row, open, onOpenChange, isAdmin, credential, contracts, mappings,
    healthChecks, ingestRuns, auditEvents, facilities, onRefresh, onManageCredential, onMapData,
  } = props;
  const { toast } = useToast();
  const [panel, setPanel] = useState('overview');
  const [busy, setBusy] = useState<string | null>(null);

  const connection = row?.connection ?? null;
  const scoped = useMemo(() => {
    if (!connection) return { contracts: [], mappings: [], checks: [], runs: [], audit: [] };
    return {
      contracts: contracts.filter((c) => c.connection_id === connection.id),
      mappings: mappings.filter((m) => m.connection_id === connection.id),
      checks: healthChecks.filter((h) => h.connection_id === connection.id),
      runs: ingestRuns.filter((r) => r.connection_id === connection.id),
      audit: auditEvents.filter((a) => a.connection_id === connection.id),
    };
  }, [connection, contracts, mappings, healthChecks, ingestRuns, auditEvents]);

  const builderUsage = useMemo(() => {
    const ids = new Set(scoped.mappings.map((m) => m.target_facility_id).filter(Boolean) as string[]);
    return facilities.filter((f) => ids.has(f.id));
  }, [scoped.mappings, facilities]);

  if (!row || !connection) return null;

  async function act(kind: 'test' | 'activate' | 'deactivate' | 'delete') {
    if (!connection) return;
    if (kind === 'delete' && !window.confirm(`Delete "${connection.display_name}"? The audit trail is retained.`)) return;
    setBusy(kind);
    try {
      if (kind === 'test') {
        const result = await runHealthCheck(connection.id);
        toast({
          title: result.status === 'PASSED' ? 'Health check passed' : 'Health check failed',
          description: `${result.safe_message ?? ''} A passing check proves reachability, not data flow.`,
        });
      } else if (kind === 'activate') {
        const status = await activateConnection(connection.id);
        toast({ title: 'Connection activated', description: `Status is now ${status}.` });
      } else if (kind === 'deactivate') {
        await deactivateConnection(connection.id);
        toast({ title: 'Connection disabled', description: 'Ingestion stops for this connection.' });
      } else {
        await deleteConnection(connection.id);
        toast({ title: 'Connection deleted', description: 'The connection record was removed.' });
        onOpenChange(false);
      }
      onRefresh();
    } catch (error) {
      toast({
        title: 'Action refused',
        description: error instanceof Error ? error.message : 'The server rejected the request.',
        variant: 'destructive',
      });
    } finally {
      setBusy(null);
    }
  }

  const testable = canRunHealthCheck(connection);
  const config = (connection.configuration ?? {}) as Record<string, unknown>;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="flex w-full flex-col gap-0 overflow-y-auto p-0 sm:max-w-2xl lg:max-w-3xl"
      >
        <SheetHeader className="space-y-3 border-b border-border p-6 text-left">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="flex min-w-0 items-start gap-3">
              <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-md text-xs font-semibold ${row.glyph.className}`} aria-hidden>
                {row.glyph.mark}
              </span>
              <div className="min-w-0">
                <SheetTitle className="truncate text-lg">{connection.display_name}</SheetTitle>
                <SheetDescription className="text-sm">
                  {row.definition?.name ?? connection.connector_id} · {connection.environment} · {connection.data_direction}
                </SheetDescription>
              </div>
            </div>
            <ConnectionStatusBadge status={connection.status} />
          </div>
          <p className="text-sm text-muted-foreground">{row.statusMeaning}</p>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" className="h-10" disabled={!isAdmin || !testable || busy !== null} onClick={() => act('test')}>
              {busy === 'test' ? <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden /> : null}
              Test connection
            </Button>
            <Button size="sm" variant="outline" className="h-10" disabled={!isAdmin} onClick={onManageCredential}>
              {credential ? 'Rotate credential' : 'Store credential'}
            </Button>
            <Button size="sm" variant="outline" className="h-10" disabled={!isAdmin} onClick={onMapData}>
              Map data
            </Button>
            {connection.enabled ? (
              <Button size="sm" variant="outline" className="h-10" disabled={!isAdmin || connection.is_system || busy !== null} onClick={() => act('deactivate')}>
                Disable
              </Button>
            ) : (
              <Button size="sm" variant="outline" className="h-10" disabled={!isAdmin || busy !== null} onClick={() => act('activate')}>
                Re-enable
              </Button>
            )}
            <Button
              size="sm"
              variant="ghost"
              className="h-10"
              disabled={!isAdmin || connection.is_system || busy !== null}
              onClick={() => act('delete')}
            >
              Delete
            </Button>
          </div>
          {!testable && (
            <p className="text-sm text-muted-foreground">
              Test unavailable: no server-side probe exists for this connector.
            </p>
          )}
          {connection.is_system && (
            <p className="text-sm text-muted-foreground">
              This is a system connection created by the platform. It cannot be disabled or deleted because
              platform services depend on it.
            </p>
          )}
          {!isAdmin && (
            <p className="text-sm text-muted-foreground">Actions require an administrator or owner role.</p>
          )}
        </SheetHeader>

        <Tabs value={panel} onValueChange={setPanel} className="min-w-0 flex-1">
          <div className="-mx-1 overflow-x-auto px-6 pt-4">
            <TabsList className="inline-flex w-max">
              {PANELS.map((p) => (
                <TabsTrigger key={p.id} value={p.id} className="min-h-[36px] text-sm">{p.label}</TabsTrigger>
              ))}
            </TabsList>
          </div>

          <div className="space-y-4 p-6">
            <TabsContent value="overview" className="mt-0 space-y-4">
              <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Field label="Connector" value={row.definition?.name ?? connection.connector_id} />
                <Field label="Category" value={row.definition?.category ?? 'Uncategorised'} />
                <Field label="Environment" value={connection.environment} />
                <Field label="Direction" value={connection.data_direction} />
                <Field label="Last health check" value={formatDateTime(connection.last_tested_at)} />
                <Field label="Last data received" value={formatDateTime(connection.last_ingest_at)} />
                <Field label="Throughput" value={row.throughput.label} />
                <Field label="Mapping coverage" value={row.coverage.label} />
              </dl>
              <div className="rounded-lg border border-border p-4">
                <p className="text-sm font-semibold">Builder usage</p>
                {builderUsage.length === 0 ? (
                  <p className="mt-1 text-sm text-muted-foreground">
                    No twin currently consumes this connection. A mapping to a facility creates the link.
                  </p>
                ) : (
                  <ul className="mt-2 space-y-2">
                    {builderUsage.map((f) => (
                      <li key={f.id} className="flex flex-wrap items-center justify-between gap-2 text-sm">
                        <span className="min-w-0 truncate">{f.name}</span>
                        <Link
                          to={`/builder?twinId=${f.id}&connection=${connection.id}`}
                          className="inline-flex items-center gap-1 underline underline-offset-4"
                        >
                          View in Builder <ArrowUpRight className="h-3.5 w-3.5" aria-hidden />
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
                <p className="mt-2 text-sm text-muted-foreground">
                  {builderUsage.length} twin{builderUsage.length === 1 ? '' : 's'} · {scoped.mappings.length} mapping
                  {scoped.mappings.length === 1 ? '' : 's'} · capabilities: {(row.definition?.supported_data_classes ?? []).join(', ') || 'none declared'}
                </p>
              </div>
            </TabsContent>

            <TabsContent value="configuration" className="mt-0 space-y-4">
              <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Field label="Endpoint reference" value={connection.endpoint_reference ?? 'Not set'} />
                <Field label="Protocols" value={(row.definition?.supported_protocols ?? []).join(', ') || 'None declared'} />
                <Field label="Owner" value={connection.owner_id ?? 'Platform'} />
                <Field label="Created" value={formatDateTime(connection.created_at)} />
                {Object.entries(config).map(([key, value]) => (
                  <Field key={key} label={key.replace(/_/g, ' ')} value={Array.isArray(value) ? value.join(', ') : String(value ?? '-')} />
                ))}
              </dl>
              <div className="rounded-lg border border-border p-4">
                <p className="text-sm font-semibold">Credential status</p>
                {!isAdmin ? (
                  <p className="mt-1 text-sm text-muted-foreground">Credential metadata is visible to administrators only.</p>
                ) : credential ? (
                  <dl className="mt-2 grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <Field label="Method" value={credential.auth_method} />
                    <Field label="Version" value={`v${credential.version}`} />
                    <Field label="Fingerprint" value={credential.fingerprint} />
                    <Field label="Last rotated" value={formatDateTime(credential.last_rotated_at)} />
                    <Field label="Expires" value={formatDateTime(credential.expires_at)} />
                    <Field label="Status" value={credential.status} />
                  </dl>
                ) : (
                  <p className="mt-1 text-sm text-muted-foreground">No credential is stored in the vault for this connection.</p>
                )}
                <p className="mt-2 text-sm text-muted-foreground">
                  Credential values are held server-side and are never returned to the browser.
                </p>
              </div>
            </TabsContent>

            <TabsContent value="contracts" className="mt-0 space-y-4">
              <section className="space-y-2">
                <h3 className="text-sm font-semibold">Data contracts</h3>
                {scoped.contracts.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No data contract is attached to this connection.</p>
                ) : (
                  scoped.contracts.map((c) => (
                    <div key={c.id} className="rounded-md border border-border p-3 text-sm">
                      <p className="font-medium">{c.name} {c.version ? `· ${c.version}` : ''}</p>
                      <p className="text-muted-foreground">
                        {c.direction ?? 'direction not declared'} · validation {c.validation_status ?? 'not evaluated'} · schema {c.schema_reference ?? 'none'}
                      </p>
                    </div>
                  ))
                )}
              </section>
              <section className="space-y-2">
                <h3 className="text-sm font-semibold">Discovered signals</h3>
                {scoped.mappings.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    No signal has been observed from this connection. Signals appear once the source publishes
                    data or a mapping declares an identifier. Sample values are never fabricated.
                  </p>
                ) : (
                  <ul className="space-y-1 text-sm">
                    {scoped.mappings.map((m) => (
                      <li key={m.id} className="rounded-md bg-muted/50 p-2 font-mono text-xs">{m.source_identifier}</li>
                    ))}
                  </ul>
                )}
              </section>
            </TabsContent>

            <TabsContent value="mappings" className="mt-0 space-y-2">
              {scoped.mappings.length === 0 ? (
                <p className="text-sm text-muted-foreground">No mapping is defined for this connection.</p>
              ) : (
                scoped.mappings.map((m) => (
                  <div key={m.id} className="rounded-md border border-border p-3 text-sm">
                    <p className="font-medium break-words">{m.source_identifier}</p>
                    <p className="text-muted-foreground break-words">
                      to {m.target_prim_path ?? m.target_entity ?? 'unmapped'}{m.target_property ? `.${m.target_property}` : ''}
                      {m.source_unit || m.target_unit ? ` (${m.source_unit ?? '?'} to ${m.target_unit ?? '?'})` : ''}
                    </p>
                    <div className="mt-1 flex flex-wrap gap-2">
                      <Badge variant="outline" className="text-xs">{m.validation_status.replace(/_/g, ' ').toLowerCase()}</Badge>
                      <Badge variant="outline" className="text-xs">{m.active ? 'Active' : 'Inactive'}</Badge>
                    </div>
                  </div>
                ))
              )}
              <Button size="sm" variant="outline" className="h-10" disabled={!isAdmin} onClick={onMapData}>
                Open data flows editor
              </Button>
            </TabsContent>

            <TabsContent value="health" className="mt-0 space-y-4">
              <section className="space-y-2">
                <h3 className="text-sm font-semibold">Health checks</h3>
                {scoped.checks.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No health check has been executed for this connection.</p>
                ) : (
                  scoped.checks.slice(0, 10).map((h) => (
                    <div key={h.id} className="rounded-md border border-border p-3 text-sm">
                      <p className="font-medium">{h.status} · {h.check_type}</p>
                      <p className="text-muted-foreground">
                        {formatDateTime(h.started_at)} · network {h.network_result ?? 'n/a'} · auth {h.auth_result ?? 'n/a'} · data {h.data_availability ?? 'n/a'} · {h.latency_ms ?? '-'} ms
                      </p>
                      {h.safe_message && <p className="text-muted-foreground">{h.safe_message}</p>}
                    </div>
                  ))
                )}
              </section>
              <section className="space-y-2">
                <h3 className="text-sm font-semibold">Ingest runs</h3>
                {scoped.runs.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No ingest run has been recorded.</p>
                ) : (
                  scoped.runs.slice(0, 10).map((r) => (
                    <div key={r.id} className="rounded-md border border-border p-3 text-sm text-muted-foreground">
                      {formatDateTime(r.started_at)} · received {r.records_received} · accepted {r.records_accepted} · rejected {r.records_rejected} · {r.final_status}
                    </div>
                  ))
                )}
              </section>
            </TabsContent>

            <TabsContent value="audit" className="mt-0 space-y-2">
              {scoped.audit.length === 0 ? (
                <p className="text-sm text-muted-foreground">No audited action has been recorded for this connection.</p>
              ) : (
                scoped.audit.slice(0, 25).map((a) => (
                  <div key={a.id} className="rounded-md border border-border p-3 text-sm">
                    <p className="font-medium">{a.action}</p>
                    <p className="text-muted-foreground">
                      {formatDateTime(a.created_at)} · {a.previous_state ?? '-'} to {a.new_state ?? '-'} · correlation {a.correlation_id ?? '-'}
                    </p>
                  </div>
                ))
              )}
            </TabsContent>
          </div>
        </Tabs>
      </SheetContent>
    </Sheet>
  );
}
