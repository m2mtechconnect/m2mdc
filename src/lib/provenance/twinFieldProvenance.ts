/**
 * Field-level provenance for blueprint-to-twin conversion (Stage 7H, item 8).
 *
 * Neutral defaults must never be presented as validated facility facts, must
 * carry their classification, and must not satisfy an evidence or readiness
 * gate.
 */

export type FieldClassification =
  | 'authoritative'
  | 'user-supplied'
  | 'derived'
  | 'modeled-assumption'
  | 'neutral-default'
  | 'synthetic'
  | 'calculated'
  | 'unavailable';

export interface FieldProvenance {
  field: string;
  classification: FieldClassification;
  /** Where the value came from. Never a fabricated measurement source. */
  source: string;
  /** Supporting evidence reference, or null when none exists. */
  evidence: string | null;
}

export type FieldProvenanceMap = Record<string, FieldProvenance>;

/** Classifications that may never be shown as a confirmed facility fact. */
const NON_AUTHORITATIVE: ReadonlySet<FieldClassification> = new Set<FieldClassification>([
  'modeled-assumption',
  'neutral-default',
  'synthetic',
  'unavailable',
]);

export function isAuthoritativeFact(p: FieldProvenance): boolean {
  return !NON_AUTHORITATIVE.has(p.classification) && p.evidence !== null;
}

/** A default can never satisfy an evidence or readiness gate. */
export function satisfiesReadinessGate(p: FieldProvenance): boolean {
  return isAuthoritativeFact(p);
}

/** Human-readable state label for UI badges. */
export const CLASSIFICATION_LABEL: Record<FieldClassification, string> = {
  authoritative: 'Validated',
  'user-supplied': 'User supplied',
  derived: 'Derived',
  'modeled-assumption': 'Modeled assumption',
  'neutral-default': 'Neutral default',
  synthetic: 'Synthetic',
  calculated: 'Calculated',
  unavailable: 'Unavailable',
};

export function describeProvenance(p: FieldProvenance): string {
  return `${CLASSIFICATION_LABEL[p.classification]} · Source: ${p.source} · Evidence: ${p.evidence ?? 'None'}`;
}

/**
 * Provenance for every field `ActiveTwinContext.createTwin` applies when a
 * blueprint is converted. `supplied` lists the fields the caller actually set;
 * everything else is a context-applied neutral default.
 */
export function classifyCreateTwinFields(supplied: {
  name?: unknown;
  city?: unknown;
  region_code?: unknown;
  tier?: unknown;
  capacity_kw?: unknown;
}): FieldProvenanceMap {
  const fromBlueprint = (field: string, blueprintId: string | null = null): FieldProvenance => ({
    field,
    classification: 'user-supplied',
    source: blueprintId ? `Blueprint ${blueprintId}` : 'Blueprint definition',
    evidence: null,
  });

  const neutral = (field: string): FieldProvenance => ({
    field,
    classification: 'neutral-default',
    source: 'Twin creation default',
    evidence: null,
  });

  const assumption = (field: string): FieldProvenance => ({
    field,
    classification: 'modeled-assumption',
    source: 'Default simulation configuration',
    evidence: null,
  });

  const map: FieldProvenanceMap = {
    // Context-applied defaults. None of these are measured facility values.
    sovereignty_level: neutral('sovereignty_level'),
    pue_target: assumption('pue_target'),
    renewable_target_pct: assumption('renewable_target_pct'),
    carbon_intensity: assumption('carbon_intensity'),
    industry: { field: 'industry', classification: 'unavailable', source: 'Not provided', evidence: null },
  };

  for (const field of ['name', 'city', 'region_code', 'tier', 'capacity_kw'] as const) {
    map[field] =
      supplied[field] === undefined || supplied[field] === null || supplied[field] === ''
        ? neutral(field)
        : fromBlueprint(field);
  }

  return map;
}
