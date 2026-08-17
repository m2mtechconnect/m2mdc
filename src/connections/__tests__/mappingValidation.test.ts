import { describe, expect, it } from 'vitest';
import {
  emptyMappingDraft,
  unitsCompatible,
  validateMapping,
} from '../mappingValidation';

function validDraft() {
  return {
    ...emptyMappingDraft('conn-1'),
    source_identifier: 'bms/crah-03/supply_temp',
    target_facility_id: 'fac-1',
    target_entity: 'CRAH_03',
    target_prim_path: '/World/Hall/CRAH_03',
    target_property: 'supplyTemperature',
    source_unit: 'degC',
    target_unit: 'degC',
    quality_rule: 'range:0..60',
  };
}

describe('mapping validation', () => {
  it('accepts a complete numeric mapping', () => {
    const result = validateMapping(validDraft());
    expect(result.status).toBe('VALID');
    expect(result.canActivate).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('marks an empty draft incomplete and non-activatable', () => {
    const result = validateMapping(emptyMappingDraft());
    expect(result.status).toBe('INCOMPLETE');
    expect(result.canActivate).toBe(false);
  });

  it('requires units on numeric mappings', () => {
    const result = validateMapping({ ...validDraft(), source_unit: null, target_unit: null });
    expect(result.canActivate).toBe(false);
    expect(result.errors.join(' ')).toMatch(/source and a target unit/i);
  });

  it('blocks cross-family units without an explicit conversion rule', () => {
    const result = validateMapping({ ...validDraft(), target_unit: 'kW' });
    expect(result.canActivate).toBe(false);
    const withRule = validateMapping({ ...validDraft(), target_unit: 'kW', conversion_rule: 'v * 1' });
    expect(withRule.canActivate).toBe(true);
    expect(withRule.warnings.join(' ')).toMatch(/not verified/i);
  });

  it('rejects relative prim paths', () => {
    const result = validateMapping({ ...validDraft(), target_prim_path: 'World/Hall' });
    expect(result.errors.join(' ')).toMatch(/absolute/i);
  });

  it('warns when no quality rule is set', () => {
    const result = validateMapping({ ...validDraft(), quality_rule: null });
    expect(result.canActivate).toBe(true);
    expect(result.warnings.join(' ')).toMatch(/quality rule/i);
  });

  it('treats same-family units as compatible only', () => {
    expect(unitsCompatible('degC', 'degF')).toBe(true);
    expect(unitsCompatible('degC', 'kW')).toBe(false);
    expect(unitsCompatible('degC', 'unknown-unit')).toBe(false);
  });
});