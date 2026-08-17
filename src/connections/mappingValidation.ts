/**
 * Signal-to-twin mapping validation. A mapping may only be activated when the
 * evidence is complete: a source identifier, a target, a facility, compatible
 * units and a declared timestamp rule. Nothing here guesses a conversion.
 */

export type MappingValidationStatus = 'VALID' | 'INCOMPLETE' | 'INVALID';

export interface MappingDraft {
  connection_id: string;
  source_identifier: string;
  target_facility_id: string | null;
  target_entity: string | null;
  target_prim_path: string | null;
  target_property: string | null;
  source_unit: string | null;
  target_unit: string | null;
  conversion_rule: string | null;
  data_type: string;
  direction: string;
  quality_rule: string | null;
  timestamp_rule: string | null;
  active: boolean;
}

export const MAPPING_DATA_TYPES = ['number', 'boolean', 'string', 'enum'] as const;
export const MAPPING_DIRECTIONS = ['INBOUND', 'OUTBOUND', 'BIDIRECTIONAL'] as const;
export const MAPPING_TIMESTAMP_RULES = [
  'source_timestamp',
  'ingest_timestamp',
  'source_timestamp_with_ingest_fallback',
] as const;

/** Unit families. Conversion between families is never inferred. */
export const UNIT_FAMILIES: Record<string, string[]> = {
  temperature: ['degC', 'degF', 'K'],
  power: ['W', 'kW', 'MW'],
  energy: ['Wh', 'kWh', 'MWh'],
  pressure: ['Pa', 'kPa', 'bar', 'inH2O'],
  flow: ['l/s', 'm3/h', 'cfm'],
  ratio: ['%', 'ratio'],
  dimensionless: ['none'],
};

export function unitFamily(unit: string | null): string | null {
  if (!unit) return null;
  const needle = unit.trim();
  for (const [family, units] of Object.entries(UNIT_FAMILIES)) {
    if (units.some((u) => u.toLowerCase() === needle.toLowerCase())) return family;
  }
  return null;
}

export function unitsCompatible(source: string | null, target: string | null): boolean {
  const a = unitFamily(source);
  const b = unitFamily(target);
  if (!a || !b) return false;
  return a === b;
}

export interface MappingValidationResult {
  status: MappingValidationStatus;
  errors: string[];
  warnings: string[];
  /** A mapping may only be activated when this is true. */
  canActivate: boolean;
}

export function validateMapping(draft: MappingDraft): MappingValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!draft.connection_id) errors.push('Select the connection that supplies this signal.');
  if (!draft.source_identifier.trim()) errors.push('A source identifier is required.');
  if (!draft.target_facility_id) errors.push('A target facility is required.');
  if (!draft.target_entity && !draft.target_prim_path) {
    errors.push('Provide a target asset or an OpenUSD prim path.');
  }
  if (!draft.target_property?.trim()) errors.push('A target property is required.');
  if (!draft.timestamp_rule) errors.push('Declare which timestamp is authoritative.');
  if (!(MAPPING_DATA_TYPES as readonly string[]).includes(draft.data_type)) {
    errors.push('Select a supported data type.');
  }
  if (!(MAPPING_DIRECTIONS as readonly string[]).includes(draft.direction)) {
    errors.push('Select a supported direction.');
  }

  if (draft.data_type === 'number') {
    if (!draft.source_unit || !draft.target_unit) {
      errors.push('Numeric mappings require both a source and a target unit.');
    } else if (!unitsCompatible(draft.source_unit, draft.target_unit)) {
      if (!unitFamily(draft.source_unit) || !unitFamily(draft.target_unit)) {
        errors.push('Unit not recognised. Use a unit from a known family.');
      } else if (!draft.conversion_rule?.trim()) {
        errors.push('Source and target units belong to different families. An explicit conversion rule is required.');
      } else {
        warnings.push('Cross-family conversion relies on the supplied conversion rule and is not verified by AURA.');
      }
    } else if (draft.source_unit.trim().toLowerCase() !== draft.target_unit.trim().toLowerCase() && !draft.conversion_rule?.trim()) {
      warnings.push('Units differ within the same family. A conversion is applied at ingest time.');
    }
  } else if (draft.source_unit || draft.target_unit) {
    warnings.push('Units are ignored for non-numeric mappings.');
  }

  if (draft.target_prim_path && !draft.target_prim_path.startsWith('/')) {
    errors.push('An OpenUSD prim path must be absolute, for example /World/Hall/CRAH_03.');
  }
  if (!draft.quality_rule) {
    warnings.push('No quality rule set: values will be accepted without a staleness or range guard.');
  }

  const status: MappingValidationStatus = errors.length
    ? (draft.source_identifier.trim() ? 'INVALID' : 'INCOMPLETE')
    : 'VALID';

  return { status, errors, warnings, canActivate: errors.length === 0 };
}

export function emptyMappingDraft(connectionId = ''): MappingDraft {
  return {
    connection_id: connectionId,
    source_identifier: '',
    target_facility_id: null,
    target_entity: null,
    target_prim_path: null,
    target_property: null,
    source_unit: null,
    target_unit: null,
    conversion_rule: null,
    data_type: 'number',
    direction: 'INBOUND',
    quality_rule: null,
    timestamp_rule: 'source_timestamp_with_ingest_fallback',
    active: false,
  };
}