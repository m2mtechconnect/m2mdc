/**
 * Connections — the operational control plane for customer-facing hybrid-stack
 * systems. Canonical route: /manage/integrations
 * Alias: /manage/connections
 *
 * Internal platform capability assessment lives at /admin/platform-readiness.
 * This workspace is for configured systems, data flows and connectors that
 * exchange facility, twin, storage or enterprise-workflow data with AURA.
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { AlertTriangle, Cable, Plus, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { useRBAC } from '@/contexts/RBACContext';
import { PagePurpose } from '@/components/capability/PagePurpose';
import { CommandHeader } from '@/components/v2';
import { OverviewTab } from '@/components/connections/OverviewTab';
import { ConnectionsTab } from '@/components/connections/ConnectionsTab';
import { CatalogueTab } from '@/components/connections/CatalogueTab';
import { DataFlowsTab } from '@/components/connections/DataFlowsTab';
import { ActivityTab } from '@/components/connections/ActivityTab';
import { ConnectionDetailDrawer } from '@/components/connections/ConnectionDetailDrawer';
import { ConnectionSetupWizard } from '@/components/connections/ConnectionSetupWizard';
import { CredentialVaultDialog } from '@/components/connections/CredentialVaultDialog';
import { buildConnectionRows } from '@/connections/presentation';
import {
  runHealthCheck,
  useAuditEvents,
  useConnectionCredentials,
  useConnectionInstances,
  useConnectorDefinitions,
  useDataContracts,
  useDsxEventCount,
  useFacilityOptions,
  useHealthChecks,
  useIngestRuns,
  useTwinMappings,
} from '@/connections/api';

const TABS = [
  { value: 'overview', label: 'Overview' },
  { value: 'connections', label: 'Connected systems' },
  { value: 'data-flows', label: 'Data flows' },
  { value: 'catalogue', label: 'Available connectors' },
  { value: 'activity', label: 'Health & audit' },
];

function errorMessage(error: unknown): string | null {
  return error instanceof Error && error.message ? error.message : null;
}

export default function Connections() {
  const [params, setParams] = useSearchParams();
  const tab = TABS.some((t) => t.value === params.get('tab')) ? (params.get('tab') as string) : 'overview';
  const { toast } = useToast();
  const { role, can } = useRBAC();
  const isAdmin = role === 'admin' || role === 'owner' || can('twin.edit');

  const definitions = useConnectorDefinitions();
  const connections = useConnectionInstances();
  const mappings = useTwinMappings();
  const healthChecks = useHealthChecks();
  const ingestRuns = useIngestRuns();
  const auditEvents = useAuditEvents();
  const eventCount = useDsxEventCount();
  const contracts = useDataContracts();
  const credentials = useConnectionCredentials();
  const facilities = useFacilityOptions();

  const [lastRefreshedAt, setLastRefreshedAt] = useState<number | null>(null);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [wizardOpen, setWizardOpen] = useState(false);
  const [credentialFor, setCredentialFor] = useState<string | null>(null);
  const [mapRequestFor, setMapRequestFor] = useState<string | null>(null);
  const [testingConnectionId, setTestingConnectionId] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    document.title = 'Connections | AURA DC';
  }, []);

  const setTab = useCallback((value: string) => {
    setParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set('tab', value);
      return next;
    }, { replace: true });
  }, [setParams]);

  const primaryFailed = connections.isError || definitions.isError;
  const secondaryFailed =
    mappings.isError ||
    healthChecks.isError ||
    ingestRuns.isError ||
    auditEvents.isError ||
    eventCount.isError ||
    contracts.isError ||
    credentials.isError ||
    facilities.isError;
  const firstLoadError =
    errorMessage(connections.error) ??
    errorMessage(definitions.error) ??
    errorMessage(mappings.error) ??
    errorMessage(healthChecks.error) ??
    errorMessage(ingestRuns.error) ??
    errorMessage(auditEvents.error) ??
    errorMessage(eventCount.error) ??
    errorMessage(contracts.error) ??
    errorMessage(credentials.error) ??
    errorMessage(facilities.error);

  useEffect(() => {
    if (lastRefreshedAt !== null || primaryFailed) return;
    if (connections.isLoading || definitions.isLoading) return;
    if (connections.data === undefined || definitions.data === undefined) return;
    setLastRefreshedAt(Date.now());
  }, [connections.data, connections.isLoading, definitions.data, definitions.isLoading, lastRefreshedAt, primaryFailed]);

  const refresh = useCallback(async () => {
    if (refreshing) return;
    setRefreshing(true);
    try {
      const results = await Promise.all([
        definitions.refetch(),
        connections.refetch(),
        healthChecks.refetch(),
        ingestRuns.refetch(),
        auditEvents.refetch(),
        mappings.refetch(),
        contracts.refetch(),
        credentials.refetch(),
        facilities.refetch(),
        eventCount.refetch(),
      ]);
      if (results.every((result) => !result.isError)) {
        setLastRefreshedAt(Date.now());
      }
    } finally {
      setRefreshing(false);
    }
  }, [definitions, connections, healthChecks, ingestRuns, auditEvents, mappings, contracts, credentials, facilities, eventCount, refreshing]);

  const rows = useMemo(
    () => buildConnectionRows(
      connections.data ?? [],
      definitions.data ?? [],
      healthChecks.data ?? [],
      mappings.data ?? [],
      ingestRuns.data ?? [],
    ),
    [connections.data, definitions.data, healthChecks.data, mappings.data, ingestRuns.data],
  );

  const detailRow = rows.find((r) => r.connection.id === detailId) ?? null;
  const credentialConnection = (connections.data ?? []).find((c) => c.id === credentialFor) ?? null;

  async function handleTest(connectionId: string) {
    if (testingConnectionId !== null) {
      toast({
        title: 'Health check already running',
        description: 'Wait for the current connection check to finish before starting another.',
      });
      return;
    }
    setTestingConnectionId(connectionId);
    try {
      const result = await runHealthCheck(connectionId);
      toast({
        title: `Health check ${result.status.toLowerCase()}`,
        description: result.safe_message ?? 'The check completed and its evidence was recorded.',
        variant: result.status === 'PASSED' ? 'default' : 'destructive',
      });
      await refresh();
    } catch (error) {
      toast({
        title: 'Health check could not run',
        description: error instanceof Error ? error.message : 'The server rejected the request.',
        variant: 'destructive',
      });
    } finally {
      setTestingConnectionId(null);
    }
  }

  function handleMap(connectionId: string) {
    setDetailId(null);
    setMapRequestFor(connectionId);
    setTab('data-flows');
  }

  const loading = connections.isLoading || definitions.isLoading;
  const addConnectionReason = !isAdmin
    ? 'Requires permission to edit the twin and manage connection configuration.'
    : primaryFailed
      ? 'Reload connection data before adding a connection.'
      : undefined;

  const tabs = (
    <Tabs value={tab} onValueChange={setTab} className="min-w-0">
      <div className="-mx-1 overflow-x-auto px-1 pb-1">
        <TabsList className="inline-flex w-max bg-transparent p-0">
          {TABS.map((t) => (
            <TabsTrigger
              key={t.value}
              value={t.value}
              className="min-h-[40px] rounded-none border-b-2 border-transparent px-4 text-[13px] uppercase tracking-[0.06em] data-[state=active]:border-[hsl(var(--v2-simulated))] data-[state=active]:bg-transparent data-[state=active]:shadow-none"
            >
              {t.label}
            </TabsTrigger>
          ))}
        </TabsList>
      </div>

      <TabsContent value="overview" className="mt-4 min-w-0">
        <OverviewTab
          rows={rows}
          mappings={mappings.data ?? []}
          ingestRuns={ingestRuns.data ?? []}
          auditEvents={auditEvents.data ?? []}
          eventCount={eventCount.data ?? 0}
          loading={loading}
          lastRefreshedAt={lastRefreshedAt}
          onOpenConnection={setDetailId}
          onGoToTab={setTab}
        />
      </TabsContent>

      <TabsContent value="connections" className="mt-4 min-w-0">
        <ConnectionsTab
          rows={rows}
          loading={loading}
          isAdmin={isAdmin}
          testingConnectionId={testingConnectionId}
          onOpen={setDetailId}
          onAdd={() => setWizardOpen(true)}
          onTest={handleTest}
          onMap={handleMap}
          onCredential={setCredentialFor}
        />
      </TabsContent>

      <TabsContent value="data-flows" className="mt-4 min-w-0">
        <DataFlowsTab
          mappings={mappings.data ?? []}
          connections={connections.data ?? []}
          onRefresh={() => { void mappings.refetch(); }}
          requestedConnectionId={mapRequestFor}
          onRequestHandled={() => setMapRequestFor(null)}
        />
      </TabsContent>

      <TabsContent value="catalogue" className="mt-4 min-w-0">
        <CatalogueTab
          definitions={definitions.data ?? []}
          connections={connections.data ?? []}
          onRefresh={() => { void refresh(); }}
        />
      </TabsContent>

      <TabsContent value="activity" className="mt-4 min-w-0">
        <ActivityTab
          connections={connections.data ?? []}
          healthChecks={healthChecks.data ?? []}
          ingestRuns={ingestRuns.data ?? []}
          auditEvents={auditEvents.data ?? []}
        />
      </TabsContent>
    </Tabs>
  );

  return (
    <div className="min-w-0 space-y-5 pb-10" data-testid="connections-page">
      <CommandHeader
        eyebrow="Operations · Control plane"
        title={
          <span className="flex items-center gap-2">
            <Cable className="h-5 w-5 text-muted-foreground" aria-hidden />
            Connections
          </span>
        }
        subtitle={
          <>
            Runtime status is evidence-derived; internal platform dependencies and capability assessment live on{' '}
            <Link className="underline underline-offset-4" to="/admin/platform-readiness">
              platform readiness
            </Link>
            .
          </>
        }
        actions={
          <>
            <Button variant="outline" className="h-10" onClick={() => { void refresh(); }} disabled={refreshing} aria-busy={refreshing}>
              <RefreshCw className={`mr-2 h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} aria-hidden />
              {refreshing ? 'Refreshing…' : 'Refresh'}
            </Button>
            <span title={addConnectionReason}>
              <Button
                className="h-10"
                disabled={!isAdmin || primaryFailed}
                onClick={() => setWizardOpen(true)}
                aria-label={addConnectionReason ? `Add connection unavailable. ${addConnectionReason}` : 'Add connection'}
              >
                <Plus className="mr-2 h-4 w-4" aria-hidden />
                Add connection
              </Button>
            </span>
          </>
        }
      />
      <PagePurpose route="/manage/integrations" />

      {primaryFailed ? (
        <div role="alert" className="v2-panel flex min-w-0 flex-col gap-3 border-destructive/30 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 items-start gap-3">
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-destructive" aria-hidden />
            <div className="min-w-0">
              <p className="text-sm font-semibold text-foreground">Connections could not be loaded</p>
              <p className="mt-1 break-words text-sm text-muted-foreground">
                {firstLoadError ?? 'The connection register or connector catalogue is unavailable. Retry before treating an empty list as current state.'}
              </p>
            </div>
          </div>
          <Button variant="outline" className="h-10 shrink-0" onClick={() => { void refresh(); }} disabled={refreshing}>
            Retry
          </Button>
        </div>
      ) : (
        <>
          {secondaryFailed && (
            <div role="status" className="flex min-w-0 items-start gap-3 rounded-lg border border-warning/30 bg-warning/5 p-4 text-sm">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-warning" aria-hidden />
              <div className="min-w-0 flex-1">
                <p className="font-medium text-foreground">Some connection evidence could not be loaded</p>
                <p className="mt-1 text-muted-foreground">Metrics, health, mappings, activity, credentials or facility options may be incomplete. Retry before making an operational decision.</p>
              </div>
              <Button size="sm" variant="outline" onClick={() => { void refresh(); }} disabled={refreshing}>Retry</Button>
            </div>
          )}
          {tabs}
        </>
      )}

      <ConnectionDetailDrawer
        row={detailRow}
        open={detailRow !== null}
        onOpenChange={(open) => { if (!open) setDetailId(null); }}
        isAdmin={isAdmin}
        credential={(credentials.data ?? []).find((c) => c.connection_id === detailRow?.connection.id) ?? null}
        contracts={(contracts.data ?? []).filter((c) => c.connection_id === detailRow?.connection.id)}
        mappings={(mappings.data ?? []).filter((m) => m.connection_id === detailRow?.connection.id)}
        healthChecks={(healthChecks.data ?? []).filter((h) => h.connection_id === detailRow?.connection.id)}
        ingestRuns={(ingestRuns.data ?? []).filter((r) => r.connection_id === detailRow?.connection.id)}
        auditEvents={(auditEvents.data ?? []).filter((a) => a.connection_id === detailRow?.connection.id)}
        facilities={facilities.data ?? []}
        onRefresh={() => { void refresh(); }}
        onManageCredential={() => detailRow && setCredentialFor(detailRow.connection.id)}
        onMapData={() => detailRow && handleMap(detailRow.connection.id)}
      />

      <ConnectionSetupWizard
        open={wizardOpen}
        onOpenChange={setWizardOpen}
        definitions={definitions.data ?? []}
        connections={connections.data ?? []}
        onCompleted={() => { void refresh(); }}
      />

      <CredentialVaultDialog
        connection={credentialConnection}
        open={credentialConnection !== null}
        onOpenChange={(open) => { if (!open) setCredentialFor(null); }}
        onChanged={() => { void refresh(); }}
      />
    </div>
  );
}
