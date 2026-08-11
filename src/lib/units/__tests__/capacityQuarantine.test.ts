import { describe, it, expect } from 'vitest';
import { collectQuarantinedCapacity, type CapacityRecord } from '../capacityQuarantine';

const base: CapacityRecord = { id: 'f1', label: 'F1', kind: 'facility', storedValue: 5000, storedUnit: 'kW', source: 'db.capacity_kw' };

describe('capacity quarantine', () => {
  it('publishes a valid record', () => {
    expect(collectQuarantinedCapacity([base])).toHaveLength(0);
  });
  it('blocks unitless, missing, non-numeric, non-positive and implausible values', () => {
    const rows = collectQuarantinedCapacity([
      { ...base, id: 'a', storedUnit: null },
      { ...base, id: 'b', storedValue: null },
      { ...base, id: 'c', storedValue: 'lots' },
      { ...base, id: 'd', storedValue: 0 },
      { ...base, id: 'e', storedValue: 10_000_000 },
    ]);
    expect(rows.map((r) => r.reason)).toEqual([
      'unitless', 'missing_value', 'non_numeric', 'non_positive', 'unit_conflict',
    ]);
  });
  it('blocks both sides of a source conflict', () => {
    const rows = collectQuarantinedCapacity([
      { ...base, id: 'x', conflictKey: 'k', storedValue: 5000 },
      { ...base, id: 'y', conflictKey: 'k', storedValue: 20000, source: 'builder' },
    ]);
    expect(rows).toHaveLength(2);
    expect(rows.every((r) => r.reason === 'source_conflict')).toBe(true);
  });
});
