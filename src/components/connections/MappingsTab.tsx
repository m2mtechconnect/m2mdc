import { useMemo, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { useRBAC } from '@/contexts/RBACContext';
import { deleteTwinMapping, setTwinMappingActive } from '@/connections/api';
import type { ConnectionInstance, TwinMappingRecord } from '@/connections/model';
import { MappingEditorDialog } from './MappingEditorDialog';

/**
 * Mapping workspace. A mapping cannot be active without a compatible source
 * type, an existing target property, compatible units and a facility.
 */
export function MappingsTab({
  mappings,
  connections,
  onRefresh,
}: {
  mappings: TwinMappingRecord[];
  connections: ConnectionInstance[];
  onRefresh: () => void;
}) {
  const [query, setQuery] = useState('');
  const [editorOpen, setEditorOpen] = useState(false);
  const [editing, setEditing] = useState<TwinMappingRecord | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const { toast } = useToast();
  const { role, can } = useRBAC();
  const canEdit = role === 'admin' || role === 'owner' || can('twin.edit');
  const connectionName = useMemo(
    () => new Map(connections.map((c) => [c.id, c.display_name])),
    [connections],
  );
  const filtered = mappings.filter((m) =>
    m.source_identifier.toLowerCase().includes(query.trim().toLowerCase()),
  );

  async function mutate(action: () => Promise<void>, id: string, failure: string) {
    setBusy(id);
    try {
      await action();
      onRefresh();
    } catch (error) {
      toast({
        title: failure,
        description: error instanceof Error ? error.message : 'The write was rejected by the server.',
        variant: 'destructive',
      });
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="max-w-3xl text-sm text-muted-foreground">
          Signal-to-twin mappings bind a source identifier to an AURA asset and, where a stage
          exists, an OpenUSD prim property. Units and timestamps are validated before a mapping
          may be activated.
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search source signals"
            aria-label="Search source signals"
            className="h-9 w-full max-w-xs text-sm"
          />
          <Button
            size="sm"
            className="min-h-[32px]"
            disabled={!canEdit || connections.length === 0}
            onClick={() => { setEditing(null); setEditorOpen(true); }}
          >
            New mapping
          </Button>
        </div>
      </div>
      {!canEdit && (
        <p className="text-xs text-muted-foreground">
          Creating or changing mappings requires an administrator or owner role.
        </p>
      )}

      {filtered.length === 0 ? (
        <Card>
          <CardContent className="space-y-2 p-6">
            <p className="text-sm font-medium">No mappings are defined.</p>
            <p className="text-sm text-muted-foreground">
              No connection currently supplies source signals, so there is nothing to map. A
              mapping example would take the form
              <code className="mx-1 rounded bg-muted px-1 py-0.5 text-xs">bms/crah-03/supply_temp → /World/Hall/CRAH_03.supplyTemperature (°C → °C)</code>
              once a telemetry source is connected.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {filtered.map((m) => (
            <Card key={m.id} className="min-w-0">
              <CardContent className="flex flex-wrap items-center justify-between gap-3 p-4 text-sm">
                <div className="min-w-0">
                  <p className="font-medium">{m.source_identifier}</p>
                  <p className="text-xs text-muted-foreground">
                    → {m.target_prim_path ?? m.target_entity ?? 'unmapped'}
                    {m.target_property ? `.${m.target_property}` : ''}
                    {m.source_unit || m.target_unit ? ` (${m.source_unit ?? '?'} → ${m.target_unit ?? '?'})` : ''}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Connection: {connectionName.get(m.connection_id) ?? m.connection_id}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="outline" className="text-xs">{m.validation_status.replace(/_/g, ' ').toLowerCase()}</Badge>
                  <Badge variant="outline" className="text-xs">{m.active ? 'Active' : 'Inactive'}</Badge>
                  <Button
                    size="sm"
                    variant="outline"
                    className="min-h-[32px]"
                    disabled={!canEdit}
                    onClick={() => { setEditing(m); setEditorOpen(true); }}
                  >
                    Edit
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="min-h-[32px]"
                    disabled={!canEdit || busy === m.id || (!m.active && m.validation_status !== 'VALID')}
                    onClick={() => mutate(() => setTwinMappingActive(m.id, !m.active), m.id, 'Mapping state could not change')}
                  >
                    {m.active ? 'Deactivate' : 'Activate'}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="min-h-[32px]"
                    disabled={!canEdit || busy === m.id}
                    onClick={() => mutate(() => deleteTwinMapping(m.id), m.id, 'Mapping could not be deleted')}
                  >
                    Delete
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <MappingEditorDialog
        open={editorOpen}
        onOpenChange={setEditorOpen}
        mapping={editing}
        connections={connections}
        onSaved={onRefresh}
      />
    </div>
  );
}