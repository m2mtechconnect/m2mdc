/**
 * Builder — Connected systems selection.
 *
 * Truth rules enforced here:
 *  - The catalogue is the canonical `connector_definitions` control-plane table,
 *    never a hardcoded SaaS fixture list.
 *  - Account authorization and data flow are two separate, independently
 *    labelled facts. An authorized account with no ingest is never shown as
 *    "connected".
 *  - Connect / disconnect lifecycle is owned by the Connections workspace at
 *    /manage/integrations; the Builder links there instead of forking it.
 */
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Info, Search, Folder, FolderOpen, ExternalLink } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { useConnectorDefinitions, useConnectionInstances, useIngestRuns } from '@/connections/api';
import { availabilityOf, AVAILABILITY_LABEL, connectorGlyph } from '@/connections/presentation';
import type { ConnectionInstance, ConnectorDefinition } from '@/connections/model';

interface BuilderIntegrationsHubProps {
  systemId: string | null;
}

type AccountState = 'not_configured' | 'configured' | 'authorized' | 'error';
type DataState = 'no_flow' | 'awaiting_data' | 'flowing' | 'error';

const ACCOUNT_LABEL: Record<AccountState, string> = {
  not_configured: 'Not configured',
  configured: 'Configured, not authorized',
  authorized: 'Account authorized',
  error: 'Authorization error',
};

const DATA_LABEL: Record<DataState, string> = {
  no_flow: 'No data flow',
  awaiting_data: 'Configured, no data yet',
  flowing: 'Data flowing',
  error: 'Ingest error',
};

function accountStateOf(instance?: ConnectionInstance): AccountState {
  if (!instance) return 'not_configured';
  if (instance.status === 'ERROR' || instance.last_error) return 'error';
  if (instance.credential_reference) return 'authorized';
  return 'configured';
}

function dataStateOf(instance: ConnectionInstance | undefined, hasRecentRun: boolean): DataState {
  if (!instance) return 'no_flow';
  if (instance.last_error) return 'error';
  if (instance.last_ingest_at || hasRecentRun) return 'flowing';
  if (!instance.enabled) return 'no_flow';
  return 'awaiting_data';
}

function stateClass(ok: boolean, warn: boolean): string {
  if (ok) return 'border-transparent bg-[hsl(var(--v2-verified))]/12 text-[hsl(var(--v2-verified))]';
  if (warn) return 'border-transparent bg-[hsl(var(--v2-simulated))]/15 text-[hsl(var(--v2-simulated))]';
  return 'border-transparent bg-muted text-muted-foreground';
}

export function BuilderIntegrationsHub({ systemId }: BuilderIntegrationsHubProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const definitions = useConnectorDefinitions();
  const instances = useConnectionInstances();
  const ingestRuns = useIngestRuns();

  const isLoading = definitions.isLoading || instances.isLoading;
  const loadError = definitions.error ?? instances.error;

  const rows = useMemo(() => {
    const defs = (definitions.data ?? []) as ConnectorDefinition[];
    const conns = (instances.data ?? []) as ConnectionInstance[];
    const runs = ingestRuns.data ?? [];

    return defs.map((definition) => {
      const instance = conns.find((c) => c.connector_id === definition.id);
      const hasRun = !!instance && runs.some((r) => r.connection_id === instance.id && r.status === 'SUCCESS');
      return {
        definition,
        instance,
        account: accountStateOf(instance),
        data: dataStateOf(instance, hasRun),
        availability: availabilityOf(definition),
        glyph: connectorGlyph(definition),
      };
    });
  }, [definitions.data, instances.data, ingestRuns.data]);

  const categories = useMemo(() => {
    const counts = new Map<string, number>();
    rows.forEach((r) => counts.set(r.definition.category, (counts.get(r.definition.category) ?? 0) + 1));
    return Array.from(counts.entries()).map(([name, count]) => ({ name, count }));
  }, [rows]);

  const filtered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return rows.filter((r) => {
      const matchesSearch =
        !q ||
        r.definition.name.toLowerCase().includes(q) ||
        r.definition.provider.toLowerCase().includes(q) ||
        r.definition.category.toLowerCase().includes(q);
      const matchesCategory = !selectedCategory || r.definition.category === selectedCategory;
      return matchesSearch && matchesCategory;
    });
  }, [rows, searchQuery, selectedCategory]);

  const summary = useMemo(
    () => ({
      authorized: rows.filter((r) => r.account === 'authorized').length,
      flowing: rows.filter((r) => r.data === 'flowing').length,
      attention: rows.filter((r) => r.account === 'error' || r.data === 'error').length,
    }),
    [rows],
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h3 className="text-h3 font-display mb-2">Connected systems</h3>
          <p className="text-sm text-muted-foreground">
            Select the systems this build should read from. Connect and disconnect are managed in the
            Connections workspace so account status and data status stay authoritative.
          </p>
        </div>
        <Button asChild variant="outline" size="sm" className="gap-2">
          <Link to="/manage/integrations">
            Open Connections
            <ExternalLink className="h-4 w-4" />
          </Link>
        </Button>
      </div>

      <Alert className="border-primary/20 bg-primary/5">
        <Info className="h-4 w-4 text-primary" />
        <AlertDescription className="text-sm">
          Configured is not connected, and connected is not data flowing. Each connector below reports
          those two facts separately.
        </AlertDescription>
      </Alert>

      <div className="flex flex-col gap-6 lg:flex-row">
        <div className="w-full lg:w-64 flex-shrink-0 space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search connectors"
              aria-label="Search connectors"
              className="pl-9"
            />
          </div>

          <div className="space-y-1">
            <button
              onClick={() => setSelectedCategory(null)}
              className={cn(
                'w-full flex items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors',
                !selectedCategory ? 'bg-accent text-accent-foreground' : 'hover:bg-accent/50',
              )}
            >
              {!selectedCategory ? <FolderOpen className="h-4 w-4" /> : <Folder className="h-4 w-4" />}
              <span>All categories</span>
            </button>
            {categories.map((cat) => (
              <button
                key={cat.name}
                onClick={() => setSelectedCategory(cat.name)}
                className={cn(
                  'w-full flex items-center justify-between rounded-md px-3 py-2 text-sm transition-colors',
                  selectedCategory === cat.name ? 'bg-accent text-accent-foreground' : 'hover:bg-accent/50',
                )}
              >
                <span className="flex items-center gap-2">
                  {selectedCategory === cat.name ? <FolderOpen className="h-4 w-4" /> : <Folder className="h-4 w-4" />}
                  {cat.name}
                </span>
                <Badge variant="secondary" className="ml-2">{cat.count}</Badge>
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 min-w-0 space-y-4">
          {!isLoading && !loadError && (
            <div className="grid grid-cols-3 gap-3 rounded-lg border bg-muted/40 p-4">
              <div>
                <div className="text-2xl font-semibold">{summary.authorized}</div>
                <div className="text-xs text-muted-foreground">Accounts authorized</div>
              </div>
              <div>
                <div className="text-2xl font-semibold">{summary.flowing}</div>
                <div className="text-xs text-muted-foreground">Data flowing</div>
              </div>
              <div>
                <div className="text-2xl font-semibold">{summary.attention}</div>
                <div className="text-xs text-muted-foreground">Needs attention</div>
              </div>
            </div>
          )}

          {loadError ? (
            <div className="rounded-lg border border-destructive/40 bg-destructive/10 p-6 text-sm">
              The connector catalogue could not be loaded. Existing selections are unchanged.
            </div>
          ) : isLoading ? (
            <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-36" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="rounded-lg border border-dashed py-12 text-center text-sm text-muted-foreground">
              No connectors match this filter.
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
              {filtered.map(({ definition, instance, account, data, availability, glyph }) => (
                <div key={definition.id} className="rounded-lg border bg-card p-4 space-y-3">
                  <div className="flex items-start gap-3">
                    <span
                      className={cn(
                        'flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-md text-xs font-semibold',
                        glyph.className,
                      )}
                      aria-hidden
                    >
                      {glyph.mark}
                    </span>
                    <div className="min-w-0">
                      <div className="truncate text-sm font-medium">{definition.name}</div>
                      <div className="truncate text-xs text-muted-foreground">
                        {definition.provider} · {definition.category}
                      </div>
                    </div>
                    <Badge variant="outline" className="ml-auto text-xs">
                      {AVAILABILITY_LABEL[availability]}
                    </Badge>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <Badge
                      variant="outline"
                      className={cn('text-xs', stateClass(account === 'authorized', account === 'error'))}
                    >
                      {ACCOUNT_LABEL[account]}
                    </Badge>
                    <Badge
                      variant="outline"
                      className={cn('text-xs', stateClass(data === 'flowing', data === 'error'))}
                    >
                      {DATA_LABEL[data]}
                    </Badge>
                  </div>

                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs text-muted-foreground">
                      {instance ? instance.display_name : 'No connection instance yet'}
                    </span>
                    <Button asChild variant="ghost" size="sm" className="gap-1 text-xs">
                      <Link to="/manage/integrations">
                        {instance ? 'Manage' : 'Connect'}
                        <ExternalLink className="h-3.5 w-3.5" />
                      </Link>
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {systemId ? null : (
            <p className="text-xs text-muted-foreground">
              Save this build to associate the selected systems with it.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
