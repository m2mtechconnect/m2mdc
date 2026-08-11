/**
 * Capacity quarantine.
 *
 * A capacity figure is only publishable when it is numeric, positive, carries
 * the canonical unit (kW) and does not contradict another record for the same
 * object. Anything else is QUARANTINED: it is never rendered as a fact, never
 * used to derive a KPI, and is instead listed with the reason it is blocked.
 *
 * This module is pure. It classifies; it never repairs a record and never
 * writes. Repair happens at the source of the data, not in the UI.
 */

import { MAX_PLAUSIBLE_FACILITY_KW, formatPower } from './power';

/** The only unit AURA publishes capacity in. */
export const CANONICAL_CAPACITY_UNIT = 'kW' as const;

export type CapacityRecordKind = 'facility' | 'asset';

export interface CapacityRecord {
  /** Stable id of the record inside its source system. */
  id: string;
  /** Object the capacity is attributed to, e.g. a facility or a rack. */
  label: string;
  kind: CapacityRecordKind;
  /** Value exactly as stored. No coercion is applied before classification. */
  storedValue: unknown;
  /**
   * Unit recorded alongside the value. `null` means the source carries no
   * unit at all - the value is unitless and therefore unusable.
   */
  storedUnit: string | null;
  /** Where the value came from, e.g. `data_centre_twins.capacity_kw`. */
  source: string;
  /**
   * Objects sharing a `conflictKey` must agree. Two records for the same key
   * that disagree are both quarantined as a source conflict.
   */
  conflictKey?: string;
}

export type QuarantineReason =
  | 'missing_value'
  | 'unitless'
  | 'non_numeric'
  | 'non_positive'
  | 'unit_conflict'
  | 'source_conflict';

export interface QuarantinedCapacity {
  record: CapacityRecord;
  reason: QuarantineReason;
  /** Short reason title, safe to render as a badge. */
  title: string;
  /** Why the value cannot be trusted. */
  explanation: string;
  /** What the platform does instead, so the block is never silent. */
  consequence: string;
  /** The stored value rendered verbatim for provenance, never converted. */
  storedDisplay: string;
}

const REASON_TITLE: Record<QuarantineReason, string> = {
  missing_value: 'No capacity recorded',
  unitless: 'Unitless value',
  non_numeric: 'Not a number',
  non_positive: 'Zero or negative',
  unit_conflict: 'Unit conflict',
  source_conflict: 'Conflicting sources',
};

function displayStored(value: unknown, unit: string | null): string {
  const raw =
    value === null || value === undefined
      ? 'not recorded'
      : typeof value === 'number'
        ? value.toLocaleString()
        : `"${String(value)}"`;
  return unit ? `${raw} ${unit}` : `${raw} (no unit)`;
}

/** Numeric kW value for a record, or null when it cannot be interpreted. */
export function usableKw(record: CapacityRecord): number | null {
  if (record.storedUnit !== CANONICAL_CAPACITY_UNIT) return null;
  const v = record.storedValue;
  if (typeof v !== 'number' || !Number.isFinite(v) || v <= 0) return null;
  if (v > MAX_PLAUSIBLE_FACILITY_KW) return null;
  return v;
}

/** Classify one record in isolation. Returns null when it is publishable. */
export function classifyCapacityRecord(record: CapacityRecord): QuarantinedCapacity | null {
  const storedDisplay = displayStored(record.storedValue, record.storedUnit);
  const base = { record, storedDisplay };
  const v = record.storedValue;

  if (v === null || v === undefined || v === '') {
    return {
      ...base,
      reason: 'missing_value',
      title: REASON_TITLE.missing_value,
      explanation: `${record.source} holds no capacity value for this ${record.kind}.`,
      consequence: 'Capacity, density and power-derived KPIs are withheld for this object.',
    };
  }

  if (typeof v !== 'number' || !Number.isFinite(v)) {
    return {
      ...base,
      reason: 'non_numeric',
      title: REASON_TITLE.non_numeric,
      explanation: `${record.source} holds a value that is not a finite number, so it cannot be converted to ${CANONICAL_CAPACITY_UNIT}.`,
      consequence: 'The value is never rendered and never feeds a calculation.',
    };
  }

  if (record.storedUnit === null) {
    return {
      ...base,
      reason: 'unitless',
      title: REASON_TITLE.unitless,
      explanation: `${record.source} records ${v.toLocaleString()} with no unit. Watts, kilowatts and megawatts differ by three orders of magnitude, so the figure is ambiguous.`,
      consequence: `The value is blocked until it is re-recorded in the canonical unit (${CANONICAL_CAPACITY_UNIT}).`,
    };
  }

  if (v <= 0) {
    return {
      ...base,
      reason: 'non_positive',
      title: REASON_TITLE.non_positive,
      explanation: `${record.source} records ${v.toLocaleString()} ${record.storedUnit}. A facility or asset cannot have zero or negative design capacity.`,
      consequence: 'The object is excluded from capacity roll-ups.',
    };
  }

  if (record.storedUnit !== CANONICAL_CAPACITY_UNIT) {
    return {
      ...base,
      reason: 'unit_conflict',
      title: REASON_TITLE.unit_conflict,
      explanation: `${record.source} declares "${record.storedUnit}" but the canonical unit is ${CANONICAL_CAPACITY_UNIT}. No implicit conversion is applied.`,
      consequence: 'The value is shown only here, as stored, and is excluded from every published surface.',
    };
  }

  if (v > MAX_PLAUSIBLE_FACILITY_KW) {
    return {
      ...base,
      reason: 'unit_conflict',
      title: REASON_TITLE.unit_conflict,
      explanation:
        `${record.source} records ${v.toLocaleString()} ${CANONICAL_CAPACITY_UNIT}, above the ` +
        `${MAX_PLAUSIBLE_FACILITY_KW.toLocaleString()} ${CANONICAL_CAPACITY_UNIT} plausibility limit ` +
        `(${formatPower(MAX_PLAUSIBLE_FACILITY_KW)}). The unit label and the magnitude disagree.`,
      consequence: 'Published surfaces fall back to the reference model until the record is corrected at source.',
    };
  }

  return null;
}

/**
 * Classify a set of records, adding cross-record conflicts. Records sharing a
 * `conflictKey` must agree within 1 percent; otherwise every record for that
 * key is quarantined so no surface can silently pick a winner.
 */
export function collectQuarantinedCapacity(records: CapacityRecord[]): QuarantinedCapacity[] {
  const out: QuarantinedCapacity[] = [];
  const conflicted = new Set<string>();

  const byKey = new Map<string, CapacityRecord[]>();
  for (const r of records) {
    if (!r.conflictKey) continue;
    const list = byKey.get(r.conflictKey) ?? [];
    list.push(r);
    byKey.set(r.conflictKey, list);
  }

  for (const [key, list] of byKey) {
    const usable = list.filter((r) => usableKw(r) !== null);
    if (usable.length < 2) continue;
    const values = usable.map((r) => usableKw(r) as number);
    const min = Math.min(...values);
    const max = Math.max(...values);
    if (max - min <= min * 0.01) continue;
    conflicted.add(key);
    for (const r of usable) {
      out.push({
        record: r,
        storedDisplay: displayStored(r.storedValue, r.storedUnit),
        reason: 'source_conflict',
        title: REASON_TITLE.source_conflict,
        explanation:
          `Sources disagree on the capacity of this ${r.kind}: ` +
          usable.map((u) => `${u.source} = ${formatPower(usableKw(u) as number)}`).join(', ') +
          '.',
        consequence: 'No capacity is published for this object until the sources are reconciled.',
      });
    }
  }

  for (const r of records) {
    if (r.conflictKey && conflicted.has(r.conflictKey) && usableKw(r) !== null) continue;
    const q = classifyCapacityRecord(r);
    if (q) out.push(q);
  }

  return out;
}
