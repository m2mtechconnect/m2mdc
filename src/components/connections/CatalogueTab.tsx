import { useMemo, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useRBAC } from '@/contexts/RBACContext';
import { ConnectionSetupWizard } from './ConnectionSetupWizard';
import { canAddConnection, CATALOGUE_CATEGORIES, type ConnectionInstance, type ConnectorDefinition } from '@/connections/model';

const IMPLEMENTATION_LABEL: Record<string, string> = {
  IMPLEMENTED: 'Implemented',
  IMPLEMENTED_NOT_WIRED: 'Implemented, not wired',
  PLANNED: 'Planned',
  UNSUPPORTED: 'Unsupported',
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
  const [wizardFor, setWizardFor] = useState<string | null>(null);
  const configuredCounts = useMemo(() => {
    const map = new Map<string, number>();
    connections.forEach((c) => map.set(c.connector_id, (map.get(c.connector_id) ?? 0) + 1));
    return map;
  }, [connections]);

  return (
    <div className="space-y-8">
      <p className="max-w-3xl text-sm text-muted-foreground">
        A catalogue entry describes what AURA knows how to connect to. It is not a configured
        connection and it does not imply a vendor partnership, certification or deployed adapter.
      </p>
      {CATALOGUE_CATEGORIES.map((category) => {
        const rows = definitions.filter((d) => d.category === category);
        if (rows.length === 0) return null;
        return (
          <section key={category} className="space-y-3" aria-labelledby={`cat-${category.replace(/\s+/g, '-')}`}>
            <h2 id={`cat-${category.replace(/\s+/g, '-')}`} className="text-base font-semibold">{category}</h2>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
              {rows.map((definition) => {
                const configured = configuredCounts.get(definition.id) ?? 0;
                const addable = canAddConnection(definition);
                return (
                  <Card key={definition.id} className="min-w-0">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm">{definition.name}</CardTitle>
                      <CardDescription className="text-xs">
                        {definition.provider} · v{definition.version}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-2 text-xs">
                      <div className="flex flex-wrap gap-1.5">
                        <Badge variant="outline" className="text-xs">{IMPLEMENTATION_LABEL[definition.implementation_status]}</Badge>
                        <Badge variant="outline" className="text-xs">{definition.validation_status.replace(/_/g, ' ').toLowerCase()}</Badge>
                        {configured > 0 && <Badge variant="outline" className="text-xs">{configured} configured</Badge>}
                      </div>
                      <dl className="space-y-1 text-muted-foreground">
                        <div><dt className="inline font-medium">Direction: </dt><dd className="inline">{definition.supported_directions.join(', ') || 'None'}</dd></div>
                        <div><dt className="inline font-medium">Authentication: </dt><dd className="inline">{definition.supported_auth_methods.join(', ') || 'None'}</dd></div>
                        <div><dt className="inline font-medium">Data classes: </dt><dd className="inline">{definition.supported_data_classes.join(', ') || 'None'}</dd></div>
                        <div><dt className="inline font-medium">Protocols: </dt><dd className="inline">{definition.supported_protocols.join(', ') || 'None'}</dd></div>
                        <div><dt className="inline font-medium">Runtime adapter: </dt><dd className="inline">{definition.runtime_adapter ?? 'None'}</dd></div>
                      </dl>
                      {definition.capability_evidence?.length > 0 && (
                        <ul className="list-disc space-y-0.5 pl-4 text-muted-foreground">
                          {definition.capability_evidence.map((e, i) => (
                            <li key={i}>{e.note}</li>
                          ))}
                        </ul>
                      )}
                      <div className="flex flex-wrap items-center gap-2 pt-1">
                        {addable ? (
                          <Button size="sm" variant="outline" className="min-h-[32px]" disabled>
                            Add connection
                          </Button>
                        ) : (
                          <Button size="sm" variant="ghost" className="min-h-[32px]" asChild={Boolean(definition.documentation_url)}>
                            {definition.documentation_url ? (
                              <a href={definition.documentation_url} target="_blank" rel="noreferrer">View requirements</a>
                            ) : (
                              <span>View requirements</span>
                            )}
                          </Button>
                        )}
                        <span className="text-xs text-muted-foreground">
                          {addable
                            ? 'Setup wizard is not enabled yet: system connections are provisioned server-side.'
                            : 'No runtime adapter exists, so a connection cannot be created.'}
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </section>
        );
      })}
    </div>
  );
}