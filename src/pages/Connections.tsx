/**
 * Connections & Data Exchange — the operational control plane for every
 * external system. Canonical route: /manage/integrations
 * Alias: /manage/connections
 *
 * Static DSX environment requirements and the platform capability assessment
 * now live at /admin/platform-readiness. This page is about configured,
 * configurable, degraded, unavailable or planned connections only.
 */
import { useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Cable } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PagePurpose } from '@/components/capability/PagePurpose';
import { ConnectionsTab } from '@/components/connections/ConnectionsTab';
import { CatalogueTab } from '@/components/connections/CatalogueTab';
import { MappingsTab } from '@/components/connections/MappingsTab';
import { ActivityTab } from '@/components/connections/ActivityTab';
import { DsxExchangeTab } from '@/components/connections/DsxExchangeTab';
import { AgentToolsTab } from '@/components/connections/AgentToolsTab';
import {
  useAuditEvents,
  useConnectionInstances,
  useConnectorDefinitions,
  useDsxEventCount,
  useHealthChecks,
  useIngestRuns,
  useTwinMappings,
} from '@/connections/api';

const TABS = [
  { value: 'connections', label: 'Connections' },
  { value: 'catalogue', label: 'Catalogue' },
  { value: 'mappings', label: 'Mappings' },
  { value: 'activity', label: 'Activity & health' },
  { value: 'dsx-exchange', label: 'DSX Exchange' },
  { value: 'agent-tools', label: 'Agent tools' },
];

export default function Connections() {
  const [params, setParams] = useSearchParams();
  const tab = TABS.some((t) => t.value === params.get('tab')) ? (params.get('tab') as string) : 'connections';

  const definitions = useConnectorDefinitions();
  const connections = useConnectionInstances();
  const mappings = useTwinMappings();
  const healthChecks = useHealthChecks();
  const ingestRuns = useIngestRuns();
  const auditEvents = useAuditEvents();
  const eventCount = useDsxEventCount();

  useEffect(() => {
    document.title = 'Connections & Data Exchange | AURA DC';
  }, []);

  const refresh = () => {
    connections.refetch();
    healthChecks.refetch();
    auditEvents.refetch();
  };

  return (
    <div className="min-w-0 space-y-6 pb-10" data-testid="connections-page">
      <header className="space-y-1">
        <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight">
          <Cable className="h-5 w-5 text-muted-foreground" aria-hidden />
          Connections &amp; Data Exchange
        </h1>
        <p className="max-w-3xl text-sm text-muted-foreground">
          Configure, test, map, monitor and govern every external connection. Status is derived
          from runtime evidence. Environment requirements and the platform capability assessment
          live on{' '}
          <Link className="underline underline-offset-4" to="/admin/platform-readiness">
            platform readiness
          </Link>
          .
        </p>
        <PagePurpose route="/manage/integrations" />
      </header>

      <Tabs
        value={tab}
        onValueChange={(value) => setParams((prev) => {
          const next = new URLSearchParams(prev);
          next.set('tab', value);
          return next;
        }, { replace: true })}
        className="min-w-0"
      >
        <div className="-mx-1 overflow-x-auto px-1 pb-1">
          <TabsList className="inline-flex w-max">
            {TABS.map((t) => (
              <TabsTrigger key={t.value} value={t.value} className="min-h-[32px] text-xs sm:text-sm">
                {t.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </div>

        <TabsContent value="connections" className="mt-4 min-w-0">
          <ConnectionsTab
            connections={connections.data ?? []}
            definitions={definitions.data ?? []}
            healthChecks={healthChecks.data ?? []}
            eventCount={eventCount.data ?? 0}
            loading={connections.isLoading || definitions.isLoading}
            onRefresh={refresh}
          />
        </TabsContent>
        <TabsContent value="catalogue" className="mt-4 min-w-0">
          <CatalogueTab
            definitions={definitions.data ?? []}
            connections={connections.data ?? []}
            onRefresh={refresh}
          />
        </TabsContent>
        <TabsContent value="mappings" className="mt-4 min-w-0">
          <MappingsTab
            mappings={mappings.data ?? []}
            connections={connections.data ?? []}
            onRefresh={() => { mappings.refetch(); }}
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
        <TabsContent value="dsx-exchange" className="mt-4 min-w-0">
          <DsxExchangeTab />
        </TabsContent>
        <TabsContent value="agent-tools" className="mt-4 min-w-0">
          <AgentToolsTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}