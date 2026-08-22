import { useMemo, useState } from 'react';
import { BarChart3, FileText, MessageSquare, Play, ShieldCheck } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Panel, SubPanel } from '@/components/v2';
import { invokeManagedRead, useManagedConnectorCapabilities } from '@/connections/managedConnectorApi';
import type { ConnectionInstance, ConnectorDefinition } from '@/connections/model';

interface DemoIntegrationsTabProps {
  definitions: ConnectorDefinition[];
  connections: ConnectionInstance[];
}

type DemoMode = 'LIVE_READ_ONLY' | 'DEMO_DATA' | 'UNAVAILABLE';

interface DemoResult {
  mode: DemoMode;
  title: string;
  summary: string;
  details: string[];
  correlationId?: string;
}

const SEARCH_DEMO: DemoResult = {
  mode: 'DEMO_DATA',
  title: 'Search performance demo',
  summary: 'Example web-presence insight for an AURA demonstration property.',
  details: [
    'Organic clicks: 12,480 over the selected demo period',
    'Top-performing topic: sovereign AI infrastructure',
    'Highest-growth region: Canada',
  ],
};

const DRIVE_DEMO: DemoResult = {
  mode: 'DEMO_DATA',
  title: 'Workspace knowledge demo',
  summary: 'Example approved-document retrieval for an AURA knowledge workflow.',
  details: [
    '3 approved runbooks found for the reference facility',
    'Latest document: Cooling Operations Runbook',
    'Retrieval mode: read only',
  ],
};

const COLLAB_DEMO: DemoResult = {
  mode: 'DEMO_DATA',
  title: 'Team collaboration demo',
  summary: 'Example notification preview for an AURA operational workflow.',
  details: [
    'Channel: Data Centre Operations',
    'Event: Cooling threshold review requested',
    'Action mode: preview only; no external message is sent',
  ],
};

const LIVE_CONNECTION_STATES = new Set([
  'READY_TO_TEST',
  'CONNECTED_NO_DATA',
  'HEALTHY',
  'SYNCING',
  'DEGRADED',
]);

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
  const [searchResult, setSearchResult] = useState<DemoResult | null>(null);

  const searchEntry = capabilities.data?.entries.find((entry) => entry.connector_definition_id === 'search_analytics');
  const searchConnection = useMemo(
    () => connections.find((connection) => connection.connector_id === 'search_analytics' && connection.enabled),
    [connections],
  );
  const searchDefinition = definitions.find((definition) => definition.id === 'search_analytics');

  const liveSearchReady = Boolean(
    searchEntry?.runtime_selectable &&
    searchEntry.white_label_ready &&
    searchConnection &&
    LIVE_CONNECTION_STATES.has(searchConnection.status),
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
        path: '/webmasters/v3/sites',
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
        details: ['No write was attempted and no demo result was represented as live data.'],
      });
    } finally {
      setRunning(false);
    }
  }

  return (
    <div className="space-y-5" data-testid="demo-integrations-tab">
      <Panel>
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="max-w-3xl space-y-1">
            <p className="text-sm font-semibold">AURA demo integrations</p>
            <p className="text-sm text-muted-foreground">
              Demonstrate enterprise data and workflow capabilities without exposing implementation infrastructure.
              Live status is server-derived; demo datasets are always labeled as demo data.
            </p>
          </div>
          <Badge variant="outline" className="w-fit gap-1.5">
            <ShieldCheck className="h-3.5 w-3.5" aria-hidden />
            Read-only demo policy
          </Badge>
        </div>
      </Panel>

      <div className="grid gap-4 xl:grid-cols-3">
        <DemoCard
          icon={<BarChart3 className="h-4 w-4" aria-hidden />}
          title={searchDefinition?.name ?? 'Search Analytics'}
          provider="Google Search Console"
          mode={liveSearchReady ? 'LIVE_READ_ONLY' : 'DEMO_DATA'}
          description={liveSearchReady
            ? 'Server evidence indicates the approved read-only demo path is selectable through the AURA gateway.'
            : 'Uses a clearly labeled demo dataset until an approved read-only runtime connection is verified.'}
          actionLabel={running ? 'Running…' : liveSearchReady ? 'Run live read-only demo' : 'Preview demo data'}
          disabled={running}
          onRun={() => void runSearchDemo()}
        />

        <DemoCard
          icon={<FileText className="h-4 w-4" aria-hidden />}
          title="Workspace Documents"
          provider="Google Drive"
          mode="DEMO_DATA"
          description="Demonstrates approved-document retrieval. No external account is represented as connected until runtime evidence exists."
          actionLabel="Preview demo data"
          onRun={() => setSearchResult(DRIVE_DEMO)}
        />

        <DemoCard
          icon={<MessageSquare className="h-4 w-4" aria-hidden />}
          title="Team Collaboration"
          provider="Slack"
          mode="DEMO_DATA"
          description="Demonstrates an operational notification workflow in preview-only mode. No external message is sent."
          actionLabel="Preview demo data"
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
              <ModeBadge mode={searchResult.mode} />
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

function DemoCard({
  icon,
  title,
  provider,
  mode,
  description,
  actionLabel,
  disabled = false,
  onRun,
}: {
  icon: React.ReactNode;
  title: string;
  provider: string;
  mode: DemoMode;
  description: string;
  actionLabel: string;
  disabled?: boolean;
  onRun: () => void;
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
      <ModeBadge mode={mode} />
      <p className="flex-1 text-sm text-muted-foreground">{description}</p>
      <Button type="button" variant="outline" disabled={disabled} onClick={onRun}>
        <Play className="mr-2 h-4 w-4" aria-hidden />
        {actionLabel}
      </Button>
    </Panel>
  );
}

function ModeBadge({ mode }: { mode: DemoMode }) {
  if (mode === 'LIVE_READ_ONLY') {
    return <Badge variant="outline" className="w-fit v2-surface-verified v2-text-verified">Live · read only</Badge>;
  }
  if (mode === 'UNAVAILABLE') {
    return <Badge variant="outline" className="w-fit">Unavailable</Badge>;
  }
  return <Badge variant="secondary" className="w-fit">Demo data</Badge>;
}
