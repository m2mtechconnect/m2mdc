import { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { saveTwinMapping, useFacilityOptions } from '@/connections/api';
import type { ConnectionInstance, TwinMappingRecord } from '@/connections/model';
import {
  MAPPING_DATA_TYPES,
  MAPPING_DIRECTIONS,
  MAPPING_TIMESTAMP_RULES,
  UNIT_FAMILIES,
  emptyMappingDraft,
  validateMapping,
  type MappingDraft,
} from '@/connections/mappingValidation';

const ALL_UNITS = Object.values(UNIT_FAMILIES).flat();
const NONE = '__none__';

function toDraft(record: TwinMappingRecord): MappingDraft {
  return {
    connection_id: record.connection_id,
    source_identifier: record.source_identifier,
    target_facility_id: record.target_facility_id,
    target_entity: record.target_entity,
    target_prim_path: record.target_prim_path,
    target_property: record.target_property,
    source_unit: record.source_unit,
    target_unit: record.target_unit,
    conversion_rule: record.conversion_rule,
    data_type: record.data_type,
    direction: record.direction,
    quality_rule: record.quality_rule,
    timestamp_rule: record.timestamp_rule,
    active: record.active,
  };
}

export function MappingEditorDialog({
  open,
  onOpenChange,
  mapping,
  connections,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mapping: TwinMappingRecord | null;
  connections: ConnectionInstance[];
  onSaved: () => void;
}) {
  const { toast } = useToast();
  const facilities = useFacilityOptions();
  const [draft, setDraft] = useState<MappingDraft>(() => emptyMappingDraft(connections[0]?.id ?? ''));
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setDraft(mapping ? toDraft(mapping) : emptyMappingDraft(connections[0]?.id ?? ''));
  }, [open, mapping, connections]);

  const result = useMemo(() => validateMapping(draft), [draft]);
  const set = <K extends keyof MappingDraft>(key: K, value: MappingDraft[K]) =>
    setDraft((prev) => ({ ...prev, [key]: value }));

  async function handleSave(activate: boolean) {
    if (activate && !result.canActivate) return;
    setSaving(true);
    try {
      await saveTwinMapping(mapping?.id ?? null, {
        ...draft,
        active: activate ? true : draft.active && result.canActivate,
        validation_status: result.status,
      });
      toast({
        title: mapping ? 'Mapping updated' : 'Mapping created',
        description: activate
          ? 'The mapping is active and will bind values at the next ingest run.'
          : `Saved as ${result.status.toLowerCase()}. Activation requires a valid mapping.`,
      });
      onSaved();
      onOpenChange(false);
    } catch (error) {
      toast({
        title: 'Mapping could not be saved',
        description: error instanceof Error ? error.message : 'The write was rejected by the server.',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{mapping ? 'Edit mapping' : 'New signal-to-twin mapping'}</DialogTitle>
          <DialogDescription>
            Bind one source signal to one twin property. Validation must pass before a mapping can
            be activated.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="mapping-connection">Connection</Label>
            <Select value={draft.connection_id} onValueChange={(v) => set('connection_id', v)}>
              <SelectTrigger id="mapping-connection"><SelectValue placeholder="Select a connection" /></SelectTrigger>
              <SelectContent>
                {connections.map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.display_name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="mapping-source">Source identifier</Label>
            <Input
              id="mapping-source"
              value={draft.source_identifier}
              onChange={(e) => set('source_identifier', e.target.value)}
              placeholder="bms/crah-03/supply_temp"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="mapping-facility">Target facility</Label>
            <Select
              value={draft.target_facility_id ?? NONE}
              onValueChange={(v) => set('target_facility_id', v === NONE ? null : v)}
            >
              <SelectTrigger id="mapping-facility"><SelectValue placeholder="Select a facility" /></SelectTrigger>
              <SelectContent>
                {(facilities.data ?? []).map((f) => (
                  <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="mapping-entity">Target asset</Label>
            <Input
              id="mapping-entity"
              value={draft.target_entity ?? ''}
              onChange={(e) => set('target_entity', e.target.value || null)}
              placeholder="CRAH_03"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="mapping-prim">OpenUSD prim path</Label>
            <Input
              id="mapping-prim"
              value={draft.target_prim_path ?? ''}
              onChange={(e) => set('target_prim_path', e.target.value || null)}
              placeholder="/World/Hall/CRAH_03"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="mapping-property">Target property</Label>
            <Input
              id="mapping-property"
              value={draft.target_property ?? ''}
              onChange={(e) => set('target_property', e.target.value || null)}
              placeholder="supplyTemperature"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="mapping-datatype">Data type</Label>
            <Select value={draft.data_type} onValueChange={(v) => set('data_type', v)}>
              <SelectTrigger id="mapping-datatype"><SelectValue /></SelectTrigger>
              <SelectContent>
                {MAPPING_DATA_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="mapping-direction">Direction</Label>
            <Select value={draft.direction} onValueChange={(v) => set('direction', v)}>
              <SelectTrigger id="mapping-direction"><SelectValue /></SelectTrigger>
              <SelectContent>
                {MAPPING_DIRECTIONS.map((d) => <SelectItem key={d} value={d}>{d.toLowerCase()}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="mapping-source-unit">Source unit</Label>
            <Select
              value={draft.source_unit ?? NONE}
              onValueChange={(v) => set('source_unit', v === NONE ? null : v)}
            >
              <SelectTrigger id="mapping-source-unit"><SelectValue placeholder="None" /></SelectTrigger>
              <SelectContent>
                <SelectItem value={NONE}>None</SelectItem>
                {ALL_UNITS.map((u) => <SelectItem key={`s-${u}`} value={u}>{u}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="mapping-target-unit">Target unit</Label>
            <Select
              value={draft.target_unit ?? NONE}
              onValueChange={(v) => set('target_unit', v === NONE ? null : v)}
            >
              <SelectTrigger id="mapping-target-unit"><SelectValue placeholder="None" /></SelectTrigger>
              <SelectContent>
                <SelectItem value={NONE}>None</SelectItem>
                {ALL_UNITS.map((u) => <SelectItem key={`t-${u}`} value={u}>{u}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="mapping-timestamp">Authoritative timestamp</Label>
            <Select
              value={draft.timestamp_rule ?? NONE}
              onValueChange={(v) => set('timestamp_rule', v === NONE ? null : v)}
            >
              <SelectTrigger id="mapping-timestamp"><SelectValue placeholder="Select a rule" /></SelectTrigger>
              <SelectContent>
                {MAPPING_TIMESTAMP_RULES.map((r) => (
                  <SelectItem key={r} value={r}>{r.replace(/_/g, ' ')}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="mapping-quality">Quality rule</Label>
            <Input
              id="mapping-quality"
              value={draft.quality_rule ?? ''}
              onChange={(e) => set('quality_rule', e.target.value || null)}
              placeholder="range:0..60; max_age:120s"
            />
          </div>

          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="mapping-conversion">Conversion rule</Label>
            <Input
              id="mapping-conversion"
              value={draft.conversion_rule ?? ''}
              onChange={(e) => set('conversion_rule', e.target.value || null)}
              placeholder="(v - 32) * 5 / 9"
            />
          </div>

          <div className="flex items-center gap-3 sm:col-span-2">
            <Switch
              id="mapping-active"
              checked={draft.active}
              disabled={!result.canActivate}
              onCheckedChange={(v) => set('active', v)}
            />
            <Label htmlFor="mapping-active" className="text-sm font-normal">
              Active {result.canActivate ? '' : '(blocked until validation passes)'}
            </Label>
          </div>
        </div>

        <div aria-live="polite" className="space-y-2">
          {result.errors.length > 0 && (
            <div className="rounded-md border border-destructive/40 bg-destructive/10 p-3">
              <p className="text-xs font-medium">Validation errors</p>
              <ul className="mt-1 list-disc space-y-0.5 pl-4 text-xs text-muted-foreground">
                {result.errors.map((e) => <li key={e}>{e}</li>)}
              </ul>
            </div>
          )}
          {result.warnings.length > 0 && (
            <div className="rounded-md border border-border bg-muted/40 p-3">
              <p className="text-xs font-medium">Warnings</p>
              <ul className="mt-1 list-disc space-y-0.5 pl-4 text-xs text-muted-foreground">
                {result.warnings.map((w) => <li key={w}>{w}</li>)}
              </ul>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>Cancel</Button>
          <Button variant="outline" onClick={() => handleSave(false)} disabled={saving}>
            Save draft
          </Button>
          <Button onClick={() => handleSave(true)} disabled={saving || !result.canActivate}>
            {saving ? 'Saving…' : 'Save and activate'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}