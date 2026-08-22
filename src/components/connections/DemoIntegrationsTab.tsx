import { useMemo, useState, type ReactNode } from 'react';
import { BarChart3, FileText, MessageSquare, Play, ShieldCheck, Unplug } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Panel, SubPanel } from '@/components/v2';
import { invokeManagedRead, useManagedConnectorCapabilities } from '@/connections/managedConnectorApi';
import { connectManagedUserConnector, disconnectManagedUserConnector } from '@/connections/managedUserBinding';
import { managedReadDemoMode, type DemoIntegrationMode } from '@/connections/demoIntegrationPolicy';
import type { ConnectionInstance, ConnectorDefinition } from '@/connections/model';

interface DemoIntegrationsTabProps {
  definitions: ConnectorDefinition[];
  connections: ConnectionInstance[];
}

interface DemoResult {
  mode: DemoIntegrationMode;
  title: string;
  summary: string;
  details: string[];
  correlationId?: string;
}

const SEARCH_DEMO: DemoResult = {
  mode: 'DEMO_DATA',
  title: 'Search performance example',
  summary: 'Example web-presence insight for an AURA demonstration property.',
  details: [
    'Organic clicks: 12,480 over the selected example period',
    'Top-performing topic: sovereign AI infrastructure',
    'Highest-growth region: Canada',
  ],
};

const DRIVE_DEMO: DemoResult = {
  mode: 'DEMO_DATA',
  title: 'Workspace knowledge example',
  summary: 'Example approved-document retrieval for an AURA knowledge workflow.',
  details: [
    '3 approved runbooks found for the reference facility',
    'Latest document: Cooling Operations Runbook',
    'Retrieval mode: read only',
  ],
};

const COLLAB_DEMO: DemoResult = {
  mode: 'DEMO_DATA',
  title: 'Team collaboration example',
  summary: 'Example notification preview for an AURA operational workflow.',
  details: [
    'Channel: Data Centre Operations',
    'Event: Cooling threshold review requested',
    'Action mode: preview only; no external message is sent',
  ],
};

const CONNECTED_USER_STATES = new Set(['CONNECTED_NO_DATA', 'HEALTHY', 'SYNCING', 'DEGRADED']);

function formatLiveSearchResult(result: unknown): string[] {
  if (!result || typeof result !== 'object') return ['AURA received a live read-only response.'];
  const payload = result as Record<string, unknown>;
  const sites = Array.isArray(payload.siteEntry) ? payload.siteEntry : [];
  if (sites.length === 0) return ['AURA reached the live read-only connector; no sites were returned.'];
  return sites.slice(0, 5).map((row) => {
    if (!row || typeof row !== 'object') return 'Verified site';
    const site = row as Record<string, unknown>;
    const url = typeof site.siteUrl === 'string' ? site.siteUrl : 'Verified site';
    const permission = typeof site.permissionLevel === 'string' ? site.permissionLevel : 'read';
    return `${url} · ${permission}`;
  });
}

export function DemoIntegrationsTab({ definitions, connections }: DemoIntegrationsTabProps) {
  const capabilities = useManagedConnectorCapabilities();
  const [running, setRunning] = useState(false);
  const [authorizing, setAuthorizing] = useState(false);
  const [searchResult, setSearchResult] = useState<DemoResult | null>(null);

  const interactiveOAuthEnabled = import.meta.env.VITE_AURA_DEMO_MANAGED_OAUTH === 'true';
  const searchEntry = capabilities.data?.entries.find((entry) => entry.connector_definition_id === 'search_analytics');
  const driveEntry = capabilities.data?.entries.find((entry) => entry.connector_definition_id === 'workspace_documents');
  const searchConnection = useMemo(
    () => connections.find((connection) => connection.connector_id === 'search_analytics' && connection.enabled),
    [connections],
  );
  const searchDefinition = definitions.find((definition) => definition.id === 'search_analytics');

  const searchMode = managedReadDemoMode({
    runtimeSelectable: Boolean(searchEntry?.runtime_selectable),
    whiteLabelReady: Boolean(searchEntry?.white_label_ready),
    connection: searchConnection,
  });
  const liveSearchReady = searchMode === 'LIVE_READ_ONLY';

  const driveBindingStatus = driveEntry?.user_binding?.status ?? '';
  const driveConnected = CONNECTED_USER_STATES.has(driveBindingStatus) && !driveEntry?.user_binding?.revoked_at;
  const driveCanConnect = Boolean(
    interactiveOAuthEnabled && driveEntry?.user_bindable && driveEntry?.user_client_configured && !driveConnected,
  );

  async function runSearchDemo() {
    if (!liveSearchReady || !searchConnection) {
      setSearchResult(SEARCH_DEMO);
      return;
    }

    setRunning(true);
    try {
      const response = await invokeManagedRead({
        connectionId: searchConnection.id,
        operationId: 'search_analytics.sites.list',
        facilityId: searchConnection.facility_id,
      });
      setSearchResult({
        mode: 'LIVE_READ_ONLY',
        title: 'Live search connection',
        summary: 'AURA completed a live read-only request through the approved gateway boundary.',
        details: formatLiveSearchResult(response.result),
        correlationId: response.correlation_id,
      });
    } catch (error) {
      setSearchResult({
        mode: 'UNAVAILABLE',
        title: 'Live read-only connection unavailable',
        summary: error instanceof Error ? error.message : 'The AURA managed connection is temporarily unavailable.',
        details: ['No write was attempted and no example result was represented as live data.'],
      });
    } finally {
      setRunning(false);
    }
  }

  async function connectDrive() {
    if (!driveCanConnect) return;
    setAuthorizing(true);
    try {
      await connectManagedUserConnector('workspace_documents');
      await capabilities.refetch();
      setSearchResult({
        mode: 'DEMO_DATA',
        title: 'Google account connected',
        summary: 'AURA recorded a read-only managed user connection for this user.',
        details: [
          'Account: Connected · read only',
          'Scope: Google Drive read-only',
          'Data: Demo data until a live retrieval probe is separately verified.',
        ],
      });
    } catch (error) {
      setSearchResult({
        mode: 'UNAVAILABLE',
        title: 'Google connection unavailable',
        summary: error instanceof Error ? error.message : 'The authorization could not be completed.',
        details: ['No provider credential or connection token was stored in the browser.'],
      });
    } finally {
      setAuthorizing(false);
    }
  }

  async function disconnectDrive() {
    if (!driveConnected || authorizing) return;
    setAuthorizing(true);
    try {
      await disconnectManagedUserConnector('workspace_documents');
      await capabilities.refetch();
      setSearchResult({
        mode: 'DEMO_DATA',
        title: 'Google account disconnected',
        summary: 'The managed user connection was revoked and AURA returned this card to example-data mode.',
        details: ['Account: Disconnected', 'Data: Demo data'],
      });
    } catch (error) {
      setSearchResult({
        mode: 'UNAVAILABLE',
        title: 'Disconnect could not complete',
        summary: error instanceof Error ? error.message : 'The managed connection could not be revoked.',
        details: ['AURA did not claim the connection was revoked without server confirmation.'],
      });
    } finally {
      setAuthorizing(false);
    }
  }

  return (
    <div className="space-y-5" data-testid="demo-integrations-tab">
      <Panel>
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="max-w-3xl space-y-1">
            <p className="text-sm font-semibold">Featured connection experiences</p>
            <p className="text-sm text-muted-foreground">
              Account authorization and data verification are shown separately. A connected account is never presented as live data until AURA has runtime evidence.
            </p>
          </div>
          <Badge variant="outline" className="w-fit gap-1.5">
            <ShieldCheck className="h-3.5 w-3.5" aria-hidden />
            Read-only demonstration policy
          </Badge>
        </div>
      </Panel>

      <div className="grid gap-4 xl:grid-cols-3">
        <IntegrationCard
          icon={<BarChart3 className="h-4 w-4" aria-hidden />}
          title={searchDefinition?.name ?? 'Search Analytics'}
          provider="Google Search Console"
          accountStatus={liveSearchReady ? 'Verified connection' : 'Not connected'}
          accountTone={liveSearchReady ? 'verified' : 'neutral'}
          dataMode={searchMode}
          description={liveSearchReady
            ? 'Server evidence permits an approved live read-only request through the AURA gateway.'
            : 'Uses clearly labeled example data until an approved read-only runtime connection is verified.'}
          actionLabel={running ? 'Running…' : liveSearchReady ? 'Run live read-only' : 'Preview example data'}
          disabled={running}
          onRun={() => void runSearchDemo()}
        />

        <IntegrationCard
          icon={<FileText className="h-4 w-4" aria-hidden />}
          title="Workspace Documents"
          provider="Google Drive"
          accountStatus={driveConnected ? 'Connected · read only' : 'Not connected'}
          accountTone={driveConnected ? 'verified' : 'neutral'}
          dataMode="DEMO_DATA"
          description={driveConnected
            ? 'Your Google account is authorized read-only. Document content stays explicitly example data until live retrieval is verified.'
            : interactiveOAuthEnabled
              ? 'Connect a Google account for read-only authorization. Until server configuration is ready, data remains in example mode.'
              : 'Shows an approved-document retrieval example. Interactive authorization is disabled in this build.'}
          actionLabel={authorizing ? 'Working…' : driveCanConnect ? 'Connect Google' : 'Preview example data'}
          disabled={authorizing}
          onRun={() => driveCanConnect ? void connectDrive() : setSearchResult(DRIVE_DEMO)}
          secondaryActionLabel={driveConnected ? 'Disconnect' : driveCanConnect ? 'Preview example data' : undefined}
          onSecondaryAction={driveConnected ? () => void disconnectDrive() : driveCanConnect ? () => setSearchResult(DRIVE_DEMO) : undefined}
        />

        <IntegrationCard
          icon={<MessageSquare className="h-4 w-4" aria-hidden />}
          title="Team Collaboration"
          provider="Slack"
          accountStatus="Preview only"
          accountTone="neutral"
          dataMode="DEMO_DATA"
          description="Shows an operational notification preview. No external account is represented as connected and no message is sent."
          actionLabel="Preview example data"
          onRun={() => setSearchResult(COLLAB_DEMO)}
        />
      </div>

      {searchResult && (
        <Panel>
          <div className="space-y-4" data-testid="demo-integration-result">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-sm font-semibold">{searchResult.title}</p>
                <p className="mt-1 text-sm text-muted-foreground">{searchResult.summary}</p>
              </div>
              <DataStatusBadge mode={searchResult.mode} />
            </div>
            <SubPanel>
              <ul className="space-y-2 text-sm">
                {searchResult.details.map((detail) => <li key={detail}>• {detail}</li>)}
              </ul>
            </SubPanel>
            {searchResult.correlationId && (
              <p className="font-mono text-xs text-muted-foreground">Evidence ID: {searchResult.correlationId}</p>
            )}
          </div>
        </Panel>
      )}
    </div>
  );
}

function IntegrationCard({
  icon,
  title,
  provider,
  accountStatus,
  accountTone,
  dataMode,
  description,
  actionLabel,
  disabled = false,
  onRun,
  secondaryActionLabel,
  onSecondaryAction,
}: {
  icon: ReactNode;
  title: string;
  provider: string;
  accountStatus: string;
  accountTone: 'verified' | 'neutral';
  dataMode: DemoIntegrationMode;
  description: string;
  actionLabel: string;
  disabled?: boolean;
  onRun: () => void;
  secondaryActionLabel?: string;
  onSecondaryAction?: () => void;
}) {
  return (
    <Panel className="flex h-full min-w-0 flex-col gap-4">
      <div className="flex items-start gap-3">
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-md bg-muted">{icon}</span>
        <div className="min-w-0">
          <p className="text-sm font-semibold">{title}</p>
          <p className="text-xs text-muted-foreground">{provider}</p>
        </div>
      </div>

      <dl className="grid gap-2 rounded-md border border-border bg-muted/20 p-3 text-xs">
        <div className="flex items-center justify-between gap-3">
          <dt className="font-medium text-muted-foreground">Account</dt>
          <dd>
            <Badge variant="outline" className={accountTone === 'verified' ? 'v2-surface-verified v2-text-verified' : ''}>
              {accountStatus}
            </Badge>
          </dd>
        </div>
        <div className="flex items-center justify-between gap-3">
          <dt className="font-medium text-muted-foreground">Data</dt>
          <dd><DataStatusBadge mode={dataMode} /></dd>
        </div>
      </dl>

      <p className="flex-1 text-sm text-muted-foreground">{description}</p>
      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="outline" disabled={disabled} onClick={onRun}>
          <Play className="mr-2 h-4 w-4" aria-hidden />
          {actionLabel}
        </Button>
        {secondaryActionLabel && onSecondaryAction ? (
          <Button type="button" variant="ghost" disabled={disabled} onClick={onSecondaryAction}>
            {secondaryActionLabel === 'Disconnect' ? <Unplug className="mr-2 h-4 w-4" aria-hidden /> : null}
            {secondaryActionLabel}
          </Button>
        ) : null}
      </div>
    </Panel>
  );
}

function DataStatusBadge({ mode }: { mode: DemoIntegrationMode }) {
  if (mode === 'LIVE_READ_ONLY') {
    return <Badge variant="outline" className="w-fit v2-surface-verified v2-text-verified">Live · verified</Badge>;
  }
  if (mode === 'UNAVAILABLE') {
    return <Badge variant="outline" className="w-fit">Unavailable</Badge>;
  }
  return <Badge variant="secondary" className="w-fit">Demo data</Badge>;
}
