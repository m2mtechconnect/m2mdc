/**
 * Canonical Builder build-kind contract.
 *
 * The backend `builders-create` / `builders-update` Edge Functions accept
 * exactly three build kinds. Template taxonomy values (`twin_type`:
 * "operational", "workforce", "compliance", ...) belong to a DIFFERENT
 * vocabulary and must never be forwarded as a build kind - doing so is
 * rejected server-side with HTTP 400 VALIDATION_ERROR.
 *
 * Every browser-side path that produces a build kind (template conversion,
 * URL parameters, stored drafts) must normalize through this module.
 */

export const BUILD_KINDS = ['agent', 'process_twin', '3d_twin'] as const;

export type BuildKind = (typeof BUILD_KINDS)[number];

/** Safe product default when no build kind can be determined. */
export const DEFAULT_BUILD_KIND: BuildKind = 'agent';

/** Build kind used for facility / data-centre digital-twin templates. */
export const FACILITY_BUILD_KIND: BuildKind = '3d_twin';

/** True only for values the backend contract accepts. */
export function isBuildKind(value: unknown): value is BuildKind {
  return typeof value === 'string' && (BUILD_KINDS as readonly string[]).includes(value);
}

/**
 * Normalize an arbitrary value to a valid build kind, or `null` when the value
 * is absent or not part of the contract. Unknown values are rejected, never
 * cast through.
 */
export function normalizeBuildKind(value: unknown): BuildKind | null {
  return isBuildKind(value) ? value : null;
}

/**
 * Resolve the build kind for a template.
 *
 * Precedence:
 * 1. An already-valid build kind on the template config.
 * 2. Facility / data-centre digital-twin templates -> `3d_twin`.
 * 3. The existing safe product default (`agent`).
 *
 * `twin_type` is template taxonomy and is only used as a facility signal; it is
 * never returned verbatim.
 */
export function resolveTemplateBuildKind(input: {
  configType?: unknown;
  twinType?: unknown;
  industry?: unknown;
  department?: unknown;
  templateId?: unknown;
  templateName?: unknown;
}): BuildKind {
  const explicit = normalizeBuildKind(input.configType);
  if (explicit) return explicit;

  if (isFacilityTemplate(input)) return FACILITY_BUILD_KIND;

  return DEFAULT_BUILD_KIND;
}

/**
 * Explicit facility identity signals. Deliberately narrow: a generic
 * "Operations" department is NOT a facility signal, so unrelated templates keep
 * the safe `agent` default.
 */
const FACILITY_SIGNALS = [
  'data centre',
  'data center',
  'datacentre',
  'datacenter',
  'facility',
];

function isFacilityTemplate(input: {
  twinType?: unknown;
  industry?: unknown;
  department?: unknown;
  templateId?: unknown;
  templateName?: unknown;
}): boolean {
  const haystack = [input.templateId, input.templateName, input.industry, input.department]
    .filter((v): v is string => typeof v === 'string')
    .join(' ')
    .toLowerCase();

  return FACILITY_SIGNALS.some((signal) => haystack.includes(signal));
}
