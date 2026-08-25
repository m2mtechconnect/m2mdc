/**
 * Customer-facing hybrid-stack connector catalogue.
 * A catalogue entry describes what AURA can connect to; it never implies an
 * authenticated, healthy or data-flowing connection.
 */
import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowUpRight, CloudCog } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Panel, SubPanel } from '@/components/v2';
import { Input } from '@/components/ui/input';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { useRBAC } from '@/contexts/RBACContext';
import { ConnectionSetupWizard } from './ConnectionSetupWizard';
import { canAddConnection, type ConnectionInstance, type ConnectorDefinition } from '@/connections/model';
import { AVAILABILITY_LABEL, availabilityOf, connectorGlyph } from '@/connections/presentation';
import {
  HYBRID_STACK_GROUPS,
  connectorStackNote,
  customerConnectorGroupOf,
  isCustomerVisibleConnector,
  type CustomerConnectorGroupId,
} from '@/connections/catalogueTaxonomy';
import { useManagedConnectorCapabilities } from '@/connections/managedConnectorApi';
import { CONNECTION_CLASS_LABEL, ELIGIBILITY_LABEL, type ManagedCapabilityEntry } from '@/connections/managedConnectors';

const AVAILABILITY_TONE: Record<string, string> = {
  AVAILABLE: 'v2-surface-verified v2-text-verified',
  REQUIRES_GATEWAY: 'v2-surface-simulated v2-text-simulated',
  REQUIRES_DEPLOYMENT: 'v2-surface-simulated v2-text-simulated',
  PLANNED: 'v2-surface-neutral v2-text-neutral',
  UNSUPPORTED: 'v2-surface-neutral v2-text-neutral',
};

type CatalogueFilter = 'all' | 'available' | CustomerConnectorGroupId;

function isManaged(entry: ManagedCapabilityEntry): boolean {
  return entry.connection_class === 'MANAGED_SHARED' || entry.connection_class === 'MANAGED_USER';
}

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
  const managedCapabilities = useManagedConnectorCapabilities();
  const [filter, setFilter] = useState<CatalogueFilter>('all');
  const [query, setQuery] = useState('');
  const [wizardFor, setWizardFor] = useState<string | null>(null);
  const [details, setDetails] = useState<ConnectorDefinition | null>(null);

  const managedByDefinitionId = useMemo(() => {
    const map = new Map<string, ManagedCapabilityEntry>();
    for (const entry of managedCapabilities.data?.entries ?? []) {
      if (isManaged(entry)) map.set(entry.connector_definition_id, entry);
    }
    return map;
  }, [managedCapabilities.data?.entries]);

  const configuredCounts = useMemo(() => {
    const map = new Map<string, number>();
    connections.forEach((connection) => map.set(connection.connector_id, (map.get(connection.connector_id) ?? 0) + 1));
    return map;
  }, [connections]);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return definitions.filter((definition) => {
      if (!isCustomerVisibleConnector(definition)) return false;
      if (filter === 'available' && availabilityOf(definition) !== 'AVAILABLE') return false;
      if (filter !== 'all' && filter !== 'available' && customerConnectorGroupOf(definition) !== filter) return false;
      return !q || `${definition.name} ${definition.provider} ${definition.supported_protocols.join(' ')} ${definition.supported_data_classes.join(' ')}`.toLowerCase().includes(q);
    });
  }, [definitions, filter, query]);

  const grouped = useMemo(
    () => HYBRID_STACK_GROUPS.map((group) => ({
      ...group,
      definitions: visible.filter((definition) => customerConnectorGroupOf(definition) === group.id),
    })).filter((group) => group.definitions.length > 0),
    [visible],
  );

  const detailsManaged = details ? managedByDefinitionId.get(details.id) ?? null : null;

  return (
    <div className="space-y-5">
      <Panel>
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="max-w-3xl space-y-1">
            <p className="text-sm font-semibold">Connectors</p>
            <p className="text-sm text-muted-foreground">
              Browse AURA-managed and AURA-native connectors in one catalogue. Availability describes what can be configured; it never means authenticated, healthy or moving data.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" className="h-10" asChild>
              <Link to="/blueprint/default">Design imports in Blueprint<ArrowUpRight className="ml-1.5 h-3.5 w-3.5" aria-hidden /></Link>
            </Button>
            <Button variant="outline" size="sm" className="h-10" asChild>
              <Link to="/admin/platform-readiness">Platform readiness<ArrowUpRight className="ml-1.5 h-3.5 w-3.5" aria-hidden /></Link>
            </Button>
          </div>
        </div>
      </Panel>

      <div className="flex flex-wrap items-center gap-2">
        <Input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search connectors"
          aria-label="Search connectors"
          className="h-10 w-full max-w-xs text-sm"
        />
        <div className="flex flex-wrap gap-2" role="group" aria-label="Connector groups">
          <FilterButton active={filter === 'all'} onClick={() => setFilter('all')}>All</FilterButton>
          <FilterButton active={filter === 'available'} onClick={() => setFilter('available')}>Available now</FilterButton>
          {HYBRID_STACK_GROUPS.map((group) => (
            <FilterButton key={group.id} active={filter === group.id} onClick={() => setFilter(group.id)}>{group.label}</FilterButton>
          ))}
        </div>
      </div>

      {managedCapabilities.isLoading && (
        <p className="text-xs text-muted-foreground" role="status">Loading managed-connector evidence…</p>
      )}

      {grouped.length === 0 ? (
        <Panel className="p-8 text-center text-sm text-muted-foreground">No connector matches this filter.</Panel>
      ) : (
        <div className="space-y-7">
          {grouped.map((group) => (
            <section key={group.id} aria-labelledby={`connector-group-${group.id}`} className="space-y-3">
              <div className="space-y-1">
                <h3 id={`connector-group-${group.id}`} className="text-base font-semibold tracking-tight">{group.label}</h3>
                <p className="text-sm text-muted-foreground">{group.description}</p>
              </div>
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
                {group.definitions.map((definition) => {
                  const availability = availabilityOf(definition);
                  const glyph = connectorGlyph(definition);
                  const addable = canAddConnection(definition);
                  const configured = configuredCounts.get(definition.id) ?? 0;
                  const stackNote = connectorStackNote(definition);
                  const managed = managedByDefinitionId.get(definition.id) ?? null;

                  return (
                    <Panel key={definition.id} className="flex min-w-0 flex-col">
                      <div className="flex flex-1 flex-col gap-3">
                        <div className="flex items-start gap-3">
                          <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-md text-xs font-semibold ${glyph.className}`} aria-hidden>{glyph.mark}</span>
                          <div className="min-w-0">
                            <p className="truncate text-sm font-semibold">{definition.name}</p>
                            <p className="truncate text-xs text-muted-foreground">{definition.category}</p>
                          </div>
                        </div>

                        <p className="text-sm text-muted-foreground">
                          {definition.supported_data_classes.length > 0
                            ? `Exchanges ${definition.supported_data_classes.slice(0, 3).join(', ')}.`
                            : 'No runtime data class is declared yet.'}
                        </p>

                        <div className="flex flex-wrap gap-1.5">
                          <Badge variant="outline" className={`text-xs ${AVAILABILITY_TONE[availability]}`}>{AVAILABILITY_LABEL[availability]}</Badge>
                          {managed && (
                            <Badge variant="outline" className="gap-1 text-xs">
                              <CloudCog className="h-3 w-3" aria-hidden />
                              {CONNECTION_CLASS_LABEL[managed.connection_class]}
                            </Badge>
                          )}
                          {managed && <Badge variant="outline" className="text-xs">{ELIGIBILITY_LABEL[managed.eligibility]}</Badge>}
                          {managed?.runtime_selectable && <Badge variant="outline" className="v2-surface-verified v2-text-verified text-xs">Runtime selectable</Badge>}
                          {configured > 0 && <Badge variant="outline" className="v2-mono text-xs">{configured} configured</Badge>}
                        </div>

                        {stackNote && <p className="text-xs text-muted-foreground">{stackNote}</p>}

                        <div className="mt-auto flex flex-wrap items-center gap-2 pt-1">
                          {addable ? (
                            <Button size="sm" className="h-10" disabled={!isAdmin} onClick={() => setWizardFor(definition.id)}>Connect</Button>
                          ) : (
                            <Button size="sm" variant="outline" className="h-10" onClick={() => setDetails(definition)}>View requirements</Button>
                          )}
                          <Button size="sm" variant="ghost" className="h-10" onClick={() => setDetails(definition)}>Details</Button>
                        </div>
                        {addable && !isAdmin && <p className="text-xs text-muted-foreground">Connecting a system requires an administrator role.</p>}
                      </div>
                    </Panel>
                  );
                })}
              </div>
            </section>
          ))}
        </div>
      )}

      <Sheet open={details !== null} onOpenChange={(open) => { if (!open) setDetails(null); }}>
        <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-lg">
          {details && (
            <>
              <SheetHeader className="text-left">
                <SheetTitle className="text-lg">{details.name}</SheetTitle>
                <SheetDescription className="text-sm">{details.category} · v{details.version} · {AVAILABILITY_LABEL[availabilityOf(details)]}</SheetDescription>
              </SheetHeader>

              {detailsManaged && (
                <SubPanel className="mt-5 space-y-2">
                  <div className="flex flex-wrap gap-1.5">
                    <Badge variant="outline">{CONNECTION_CLASS_LABEL[detailsManaged.connection_class]}</Badge>
                    <Badge variant="outline">{ELIGIBILITY_LABEL[detailsManaged.eligibility]}</Badge>
                    <Badge variant="outline">{detailsManaged.linked_to_project ? 'Project linked' : 'Project not linked'}</Badge>
                    {detailsManaged.runtime_selectable && <Badge variant="outline" className="v2-surface-verified v2-text-verified">Runtime selectable</Badge>}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {detailsManaged.operations.length > 0
                      ? `${detailsManaged.operations.length} allowlisted operation${detailsManaged.operations.length === 1 ? '' : 's'} are exposed by the AURA policy boundary.`
                      : 'No allowlisted runtime operation is currently exposed.'}
                  </p>
                  {detailsManaged.evidence_note && <p className="text-xs text-muted-foreground">{detailsManaged.evidence_note}</p>}
                </SubPanel>
              )}

              <dl className="mt-6 space-y-4 text-sm">
                <Detail label="Group" value={HYBRID_STACK_GROUPS.find((group) => group.id === customerConnectorGroupOf(details))?.label ?? 'Custom'} />
                <Detail label="Direction" value={details.supported_directions.join(', ') || 'None'} />
                <Detail label="Authentication" value={details.supported_auth_methods.join(', ') || 'None'} />
                <Detail label="Data classes" value={details.supported_data_classes.join(', ') || 'None'} />
                <Detail label="Protocols" value={details.supported_protocols.join(', ') || 'None'} />
                <Detail label="Runtime requirement" value={details.runtime_adapter ? `AURA runtime adapter ${details.runtime_adapter}` : 'No runtime adapter exists, so a connection cannot be created.'} />
                <Detail label="Validation" value={details.validation_status.replace(/_/g, ' ').toLowerCase()} />
                {connectorStackNote(details) && <Detail label="Stack status" value={connectorStackNote(details) ?? ''} />}
                {details.capability_evidence?.length > 0 && (
                  <div>
                    <dt className="text-xs uppercase tracking-wide text-muted-foreground">Capability evidence</dt>
                    <dd><ul className="list-disc space-y-1 pl-4">{details.capability_evidence.map((e, i) => <li key={i}>{e.note}</li>)}</ul></dd>
                  </div>
                )}
              </dl>

              <div className="mt-6 flex flex-wrap gap-2">
                {canAddConnection(details) && (
                  <Button className="h-10" disabled={!isAdmin} onClick={() => { setWizardFor(details.id); setDetails(null); }}>Connect</Button>
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

function FilterButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <Button size="sm" variant={active ? 'default' : 'outline'} className="h-10" aria-pressed={active} onClick={onClick}>
      {children}
    </Button>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return <div><dt className="text-xs uppercase tracking-wide text-muted-foreground">{label}</dt><dd>{value}</dd></div>;
}
