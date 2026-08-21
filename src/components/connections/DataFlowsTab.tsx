/**
 * Data flows workspace. Three panels: source connection and its signals,
 * the transformation and validation applied, and the AURA/OpenUSD
 * destination. Signals and sample values are never fabricated: only
 * identifiers that exist in a persisted mapping or ingest record appear.
 */
import { useEffect, useMemo, useState } from 'react';
import { ArrowRight, CheckCircle2, Circle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Panel, SectionHeader } from '@/components/v2';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { useRBAC } from '@/contexts/RBACContext';
import { deleteTwinMapping, setTwinMappingActive } from '@/connections/api';
import type { ConnectionInstance, TwinMappingRecord } from '@/connections/model';
import { formatDateTime } from '@/connections/presentation';
import { MappingEditorDialog } from './MappingEditorDialog';

const GUIDE = [
  'Connect a source',
  'Receive a signal',
  'Select a destination',
  'Validate units and quality',
  'Activate the flow',
];

export function DataFlowsTab({
  mappings,
  connections,
  onRefresh,
  requestedConnectionId,
  onRequestHandled,
}: {
  mappings: TwinMappingRecord[];
  connections: ConnectionInstance[];
  onRefresh: () => void;
  requestedConnectionId?: string | null;
  onRequestHandled?: () => void;
}) {
  const { toast } = useToast();
  const { role, can } = useRBAC();
  const canEdit = role === 'admin' || role === 'owner' || can('twin.edit');
  const [query, setQuery] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editing, setEditing] = useState<TwinMappingRecord | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (requestedConnectionId) {
      setEditing(null);
      setEditorOpen(true);
      onRequestHandled?.();
    }
  }, [requestedConnectionId, onRequestHandled]);

  const connectionName = useMemo(
    () => new Map(connections.map((c) => [c.id, c.display_name])),
    [connections],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return mappings.filter((m) => !q || m.source_identifier.toLowerCase().includes(q));
  }, [mappings, query]);

  const selected = filtered.find((m) => m.id === selectedId) ?? filtered[0] ?? null;

  async function mutate(action: () => Promise<void>, failure: string) {
    setBusy(true);
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
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="max-w-2xl text-sm text-muted-foreground">
          A data flow binds one source signal to an AURA asset and, where a stage exists, an OpenUSD prim
          property. Units, quality and timestamps are validated before a flow can be activated.
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search source signals"
            aria-label="Search source signals"
            className="h-10 w-full max-w-xs text-sm"
          />
          <Button
            className="h-10"
            disabled={!canEdit || connections.length === 0}
            onClick={() => { setEditing(null); setEditorOpen(true); }}
          >
            New data flow
          </Button>
        </div>
      </div>
      {!canEdit && (
        <p className="text-sm text-muted-foreground">
          Creating or changing a data flow requires an administrator or owner role.
        </p>
      )}

      {mappings.length === 0 ? (
        <Panel className="p-8">
          <div className="space-y-4">
            <div>
              <p className="text-sm font-semibold">No data flow exists yet</p>
              <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
                Flows appear once a source is connected and a signal is received. A flow takes the form
                <code className="mx-1 rounded bg-muted px-1 py-0.5 text-xs">bms/crah-03/supply_temp to /World/Hall/CRAH_03.supplyTemperature (C to C)</code>
                . No source signal or sample value is invented before a source publishes one.
              </p>
            </div>
            <ol className="flex flex-wrap items-center gap-x-2 gap-y-2">
              {GUIDE.map((step, index) => (
                <li key={step} className="flex items-center gap-2 text-sm">
                  <span className="inline-flex items-center gap-1.5 rounded-md bg-muted px-2.5 py-1.5">
                    {index === 0 && connections.length > 0
                      ? <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" aria-hidden />
                      : <Circle className="h-4 w-4 text-muted-foreground" aria-hidden />}
                    {step}
                  </span>
                  {index < GUIDE.length - 1 && <ArrowRight className="h-4 w-4 text-muted-foreground" aria-hidden />}
                </li>
              ))}
            </ol>
            <Button className="h-10" disabled={!canEdit || connections.length === 0} onClick={() => { setEditing(null); setEditorOpen(true); }}>
              Create the first data flow
            </Button>
          </div>
        </Panel>
      ) : (
        <div className="grid min-w-0 grid-cols-1 gap-4 xl:grid-cols-3">
          <Panel className="min-w-0">
            <SectionHeader
              eyebrow="Stage 1 · Source"
              title="Source signal"
              actions={<span className="v2-mono text-xs text-muted-foreground">{filtered.length}</span>}
            />
            <div className="space-y-2">
              <ul className="space-y-1.5" role="listbox" aria-label="Source signals">
                {filtered.map((m) => {
                  const active = selected?.id === m.id;
                  return (
                    <li key={m.id}>
                      <button
                        type="button"
                        role="option"
                        aria-selected={active}
                        onClick={() => setSelectedId(m.id)}
                        className={`v2-subpanel w-full min-h-[44px] px-3 py-2 text-left text-sm ${active ? 'border-[hsl(var(--v2-simulated))]' : 'hover:bg-muted/50'}`}
                      >
                        <span className="v2-mono block truncate font-medium">{m.source_identifier}</span>
                        <span className="block truncate text-xs text-muted-foreground">
                          {connectionName.get(m.connection_id) ?? m.connection_id}
                        </span>
                      </button>
                    </li>
                  );
                })}
                {filtered.length === 0 && (
                  <li className="text-sm text-muted-foreground">No signal matches this search.</li>
                )}
              </ul>
            </div>
          </Panel>

          <Panel className="min-w-0">
            <SectionHeader eyebrow="Stage 2 · Edge / exchange" title="Transformation and validation" />
            <div className="space-y-3 text-sm">
              {!selected ? (
                <p className="text-muted-foreground">Select a signal to inspect its transformation.</p>
              ) : (
                <dl className="space-y-3">
                  <div><dt className="v2-label">Source unit</dt><dd className="v2-mono">{selected.source_unit ?? 'Not declared'}</dd></div>
                  <div><dt className="v2-label">Target unit</dt><dd className="v2-mono">{selected.target_unit ?? 'Not declared'}</dd></div>
                  <div><dt className="v2-label">Conversion</dt><dd className="v2-mono">{selected.conversion_rule ?? 'None (identity)'}</dd></div>
                  <div><dt className="v2-label">Quality rule</dt><dd className="v2-mono">{selected.quality_rule ?? 'None'}</dd></div>
                  <div><dt className="v2-label">Timestamp rule</dt><dd className="v2-mono">{selected.timestamp_rule ?? 'None'}</dd></div>
                  <div>
                    <dt className="v2-label">Validation</dt>
                    <dd><Badge variant="outline" className="text-xs">{selected.validation_status.replace(/_/g, ' ').toLowerCase()}</Badge></dd>
                  </div>
                  <div>
                    <dt className="v2-label">Last observed value</dt>
                    <dd className="v2-mono">
                      {selected.last_mapped_at
                        ? `${String(selected.last_mapped_value)} at ${formatDateTime(selected.last_mapped_at)}`
                        : 'No value has been received for this flow.'}
                    </dd>
                  </div>
                </dl>
              )}
            </div>
          </Panel>

          <Panel className="min-w-0">
            <SectionHeader eyebrow="Stage 3 · Twin / storage" title="Destination" />
            <div className="space-y-3 text-sm">
              {!selected ? (
                <p className="text-muted-foreground">Select a signal to inspect its destination.</p>
              ) : (
                <>
                  <dl className="space-y-3">
                    <div><dt className="v2-label">Facility</dt><dd className="v2-mono">{selected.target_facility_id ?? 'Not bound'}</dd></div>
                    <div><dt className="v2-label">Asset</dt><dd className="v2-mono break-words">{selected.target_entity ?? 'Not bound'}</dd></div>
                    <div><dt className="v2-label">OpenUSD prim</dt><dd className="v2-mono break-words">{selected.target_prim_path ?? 'No stage binding'}</dd></div>
                    <div><dt className="v2-label">Property</dt><dd className="v2-mono">{selected.target_property ?? 'Not selected'}</dd></div>
                    <div>
                      <dt className="v2-label">Activation</dt>
                      <dd><Badge variant="outline" className="text-xs">{selected.active ? 'Active' : 'Inactive'}</Badge></dd>
                    </div>
                  </dl>
                  <div className="flex flex-wrap gap-2 pt-1">
                    <Button size="sm" variant="outline" className="h-10" disabled={!canEdit} onClick={() => { setEditing(selected); setEditorOpen(true); }}>
                      Edit
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-10"
                      disabled={!canEdit || busy || (!selected.active && selected.validation_status !== 'VALID')}
                      onClick={() => mutate(() => setTwinMappingActive(selected.id, !selected.active), 'Flow state could not change')}
                    >
                      {selected.active ? 'Deactivate' : 'Activate'}
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-10"
                      disabled={!canEdit || busy}
                      onClick={() => mutate(() => deleteTwinMapping(selected.id), 'Flow could not be deleted')}
                    >
                      Delete
                    </Button>
                  </div>
                  {!selected.active && selected.validation_status !== 'VALID' && (
                    <p className="text-sm text-muted-foreground">
                      Activation is blocked until validation passes for units, quality and timestamps.
                    </p>
                  )}
                </>
              )}
            </div>
          </Panel>
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
