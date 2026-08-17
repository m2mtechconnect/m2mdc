/**
 * Connector catalogue. A catalogue entry describes what AURA knows how to
 * connect to; it is never counted as a configured connection. Low-value
 * metadata is behind a details drawer rather than printed on every tile.
 */
import { useMemo, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { useRBAC } from '@/contexts/RBACContext';
import { ConnectionSetupWizard } from './ConnectionSetupWizard';
import { canAddConnection, type ConnectionInstance, type ConnectorDefinition } from '@/connections/model';
import {
  AVAILABILITY_LABEL,
  CATALOGUE_FILTERS,
  availabilityOf,
  connectorGlyph,
  matchesCatalogueFilter,
  type CatalogueFilterId,
} from '@/connections/presentation';

const AVAILABILITY_TONE: Record<string, string> = {
  AVAILABLE: 'border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300',
  REQUIRES_GATEWAY: 'border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-300',
  REQUIRES_DEPLOYMENT: 'border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-300',
  PLANNED: 'border-border bg-muted text-muted-foreground',
  UNSUPPORTED: 'border-border bg-muted text-muted-foreground',
};

export function CatalogueTab({
  definitions,
  connections,
  onRefresh,
}: {
  definitions: ConnectorDefinition[];
  connections: ConnectionInstance[];
  onRefresh?: () => void;
}) {
  const { can, role } = useRBAC();
  const isAdmin = role === 'admin' || role === 'owner' || can('twin.edit');
  const [filter, setFilter] = useState<CatalogueFilterId>('all');
  const [query, setQuery] = useState('');
  const [wizardFor, setWizardFor] = useState<string | null>(null);
  const [details, setDetails] = useState<ConnectorDefinition | null>(null);

  const configuredCounts = useMemo(() => {
    const map = new Map<string, number>();
    connections.forEach((c) => map.set(c.connector_id, (map.get(c.connector_id) ?? 0) + 1));
    return map;
  }, [connections]);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return definitions.filter(
      (d) =>
        matchesCatalogueFilter(d, filter) &&
        (!q || `${d.name} ${d.provider} ${d.supported_protocols.join(' ')}`.toLowerCase().includes(q)),
    );
  }, [definitions, filter, query]);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-2">
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search connectors"
          aria-label="Search connectors"
          className="h-10 w-full max-w-xs text-sm"
        />
        <div className="flex flex-wrap gap-2" role="group" aria-label="Catalogue filters">
          <Button
            size="sm"
            variant={filter === 'all' ? 'default' : 'outline'}
            className="h-10"
            aria-pressed={filter === 'all'}
            onClick={() => setFilter('all')}
          >
            All connectors
          </Button>
          {CATALOGUE_FILTERS.map((f) => (
            <Button
              key={f.id}
              size="sm"
              variant={filter === f.id ? 'default' : 'outline'}
              className="h-10"
              aria-pressed={filter === f.id}
              onClick={() => setFilter(f.id as CatalogueFilterId)}
            >
              {f.label}
            </Button>
          ))}
        </div>
      </div>

      {visible.length === 0 ? (
        <Card><CardContent className="p-8 text-center text-sm text-muted-foreground">No connector matches this filter.</CardContent></Card>
      ) : (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
          {visible.map((definition) => {
            const availability = availabilityOf(definition);
            const glyph = connectorGlyph(definition);
            const addable = canAddConnection(definition);
            const configured = configuredCounts.get(definition.id) ?? 0;
            return (
              <Card key={definition.id} className="flex min-w-0 flex-col">
                <CardContent className="flex flex-1 flex-col gap-3 p-4">
                  <div className="flex items-start gap-3">
                    <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-md text-xs font-semibold ${glyph.className}`} aria-hidden>
                      {glyph.mark}
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold">{definition.name}</p>
                      <p className="truncate text-xs text-muted-foreground">{definition.provider} · {definition.category}</p>
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {definition.supported_data_classes.length > 0
                      ? `Exchanges ${definition.supported_data_classes.slice(0, 3).join(', ')}.`
                      : 'No data class is declared for this connector.'}
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    <Badge variant="outline" className={`text-xs ${AVAILABILITY_TONE[availability]}`}>
                      {AVAILABILITY_LABEL[availability]}
                    </Badge>
                    {configured > 0 && <Badge variant="outline" className="text-xs">{configured} configured</Badge>}
                  </div>
                  <div className="mt-auto flex flex-wrap items-center gap-2 pt-1">
                    {addable ? (
                      <Button size="sm" className="h-10" disabled={!isAdmin} onClick={() => setWizardFor(definition.id)}>
                        Add connection
                      </Button>
                    ) : (
                      <Button size="sm" variant="outline" className="h-10" onClick={() => setDetails(definition)}>
                        View requirements
                      </Button>
                    )}
                    <Button size="sm" variant="ghost" className="h-10" onClick={() => setDetails(definition)}>
                      Details
                    </Button>
                  </div>
                  {addable && !isAdmin && (
                    <p className="text-xs text-muted-foreground">Creating a connection requires an administrator role.</p>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <Sheet open={details !== null} onOpenChange={(open) => { if (!open) setDetails(null); }}>
        <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-lg">
          {details && (
            <>
              <SheetHeader className="text-left">
                <SheetTitle className="text-lg">{details.name}</SheetTitle>
                <SheetDescription className="text-sm">
                  {details.provider} · v{details.version} · {AVAILABILITY_LABEL[availabilityOf(details)]}
                </SheetDescription>
              </SheetHeader>
              <dl className="mt-6 space-y-4 text-sm">
                <div><dt className="text-xs uppercase tracking-wide text-muted-foreground">Category</dt><dd>{details.category}</dd></div>
                <div><dt className="text-xs uppercase tracking-wide text-muted-foreground">Direction</dt><dd>{details.supported_directions.join(', ') || 'None'}</dd></div>
                <div><dt className="text-xs uppercase tracking-wide text-muted-foreground">Authentication methods</dt><dd>{details.supported_auth_methods.join(', ') || 'None'}</dd></div>
                <div><dt className="text-xs uppercase tracking-wide text-muted-foreground">Data classes</dt><dd>{details.supported_data_classes.join(', ') || 'None'}</dd></div>
                <div><dt className="text-xs uppercase tracking-wide text-muted-foreground">Protocols</dt><dd>{details.supported_protocols.join(', ') || 'None'}</dd></div>
                <div><dt className="text-xs uppercase tracking-wide text-muted-foreground">Runtime requirement</dt><dd>{details.runtime_adapter ? `Adapter ${details.runtime_adapter}` : 'No runtime adapter exists, so a connection cannot be created.'}</dd></div>
                <div><dt className="text-xs uppercase tracking-wide text-muted-foreground">Validation</dt><dd>{details.validation_status.replace(/_/g, ' ').toLowerCase()}</dd></div>
                {details.capability_evidence?.length > 0 && (
                  <div>
                    <dt className="text-xs uppercase tracking-wide text-muted-foreground">Capability evidence</dt>
                    <dd>
                      <ul className="list-disc space-y-1 pl-4">
                        {details.capability_evidence.map((e, i) => <li key={i}>{e.note}</li>)}
                      </ul>
                    </dd>
                  </div>
                )}
              </dl>
              <div className="mt-6 flex flex-wrap gap-2">
                {canAddConnection(details) && (
                  <Button className="h-10" disabled={!isAdmin} onClick={() => { setWizardFor(details.id); setDetails(null); }}>
                    Add connection
                  </Button>
                )}
                {details.documentation_url && (
                  <Button variant="outline" className="h-10" asChild>
                    <a href={details.documentation_url} target="_blank" rel="noreferrer">Documentation</a>
                  </Button>
                )}
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>

      <ConnectionSetupWizard
        open={Boolean(wizardFor)}
        onOpenChange={(open) => { if (!open) setWizardFor(null); }}
        definitions={definitions}
        connections={connections}
        presetConnectorId={wizardFor ?? undefined}
        onCompleted={() => onRefresh?.()}
      />
    </div>
  );
}
