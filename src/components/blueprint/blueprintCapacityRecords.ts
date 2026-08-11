/**
 * Builds the capacity records in scope for a Blueprint, from the stored twin
 * row and from the rendered model. Pure: it reads, never writes.
 */

import type { CapacityRecord } from '@/lib/units/capacityQuarantine';
import type { DataCentreBlueprint } from '@/types/dataCentreBlueprint';

interface BuildArgs {
  blueprint: DataCentreBlueprint;
  /** Raw `data_centre_twins` row when the blueprint was loaded from the database. */
  dbTwin?: { id?: string; name?: string | null; capacity_kw?: unknown } | null;
  /** Capacity declared by the Builder draft for this blueprint, if any. */
  builderCapacityKw?: number | null;
}

export function buildBlueprintCapacityRecords({
  blueprint,
  dbTwin,
  builderCapacityKw,
}: BuildArgs): CapacityRecord[] {
  const facilityLabel = dbTwin?.name || blueprint.name;
  const conflictKey = `facility:${dbTwin?.id ?? blueprint.id}`;
  const records: CapacityRecord[] = [];

  if (dbTwin) {
    records.push({
      id: String(dbTwin.id ?? blueprint.id),
      label: facilityLabel,
      kind: 'facility',
      storedValue: dbTwin.capacity_kw ?? null,
      // The column name declares the unit; a null value is unitless as well.
      storedUnit: dbTwin.capacity_kw == null ? null : 'kW',
      source: 'data_centre_twins.capacity_kw',
      conflictKey,
    });
  }

  if (builderCapacityKw != null) {
    records.push({
      id: `${conflictKey}:builder`,
      label: `${facilityLabel} (Builder draft)`,
      kind: 'facility',
      storedValue: builderCapacityKw,
      storedUnit: 'kW',
      source: 'builder.overview.capacityKw',
      conflictKey,
    });
  }

  return records;
}
