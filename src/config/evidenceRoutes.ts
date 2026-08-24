/**
 * Neutral canonical Evidence route family.
 *
 * The Evidence workspace was originally mounted under an implementation-named
 * path (`/dsx/evidence-beta`). That path leaked an internal programme name and
 * a "beta" qualifier into customer-visible URLs, breadcrumbs and shared links.
 *
 * `/evidence/...` is now the single canonical family. The legacy paths remain
 * accepted deep links (a single compatibility redirect preserves query and
 * hash), but nothing in the product may emit them.
 */

/** Canonical, customer-facing Evidence root. */
export const EVIDENCE_ROOT = '/evidence';

/** Retired implementation-named root. Accepted, never emitted. */
export const LEGACY_EVIDENCE_ROOT = '/dsx/evidence-beta';

/** Canonical route for the accelerated-AI capability registry (admin). */
export const ACCELERATED_AI_CAPABILITIES_ROUTE = '/admin/accelerated-ai-capabilities';

/** Retired implementation-named capability registry path. Accepted, never emitted. */
export const LEGACY_CAPABILITIES_ROUTE = '/admin/dsx-capabilities';

/** Visible label for the capability registry. No vendor or programme name. */
export const ACCELERATED_AI_CAPABILITIES_LABEL = 'Accelerated AI capabilities';

/** Build a canonical Evidence path from a sub-path (leading slash optional). */
export function evidencePath(sub = ''): string {
  const trimmed = sub.replace(/^\/+/, '');
  return trimmed ? `${EVIDENCE_ROOT}/${trimmed}` : EVIDENCE_ROOT;
}

/** Canonical Evidence sub-paths, relative to `EVIDENCE_ROOT`. */
export const EVIDENCE_CANONICAL_SUBPATHS = [
  'overview',
  'operations/thermal',
  'operations/power',
  'operations/cooling',
  'operations/compute',
  'operations/workload',
  'sustainability',
  'sustainability/financial',
  'sustainability/sovereignty',
  'decisions',
  'decisions/log',
  'assets',
] as const;

/** Full canonical Evidence URLs. */
export const EVIDENCE_CANONICAL_PATHS = EVIDENCE_CANONICAL_SUBPATHS.map((s) => evidencePath(s));

/**
 * Rewrite a legacy implementation-named Evidence path onto the neutral family.
 * Any other path is returned unchanged.
 */
export function neutralEvidencePath(path: string): string {
  if (path === LEGACY_EVIDENCE_ROOT) return EVIDENCE_ROOT;
  if (path.startsWith(`${LEGACY_EVIDENCE_ROOT}/`)) {
    return `${EVIDENCE_ROOT}${path.slice(LEGACY_EVIDENCE_ROOT.length)}`;
  }
  if (path === LEGACY_CAPABILITIES_ROUTE) return ACCELERATED_AI_CAPABILITIES_ROUTE;
  return path;
}

/** True when a path still carries a retired implementation/vendor name. */
export function isLegacyNamedPath(path: string): boolean {
  return (
    path === LEGACY_EVIDENCE_ROOT ||
    path.startsWith(`${LEGACY_EVIDENCE_ROOT}/`) ||
    path === LEGACY_CAPABILITIES_ROUTE ||
    path.startsWith('/omniverse-scene') ||
    path.startsWith('/settings/integrations/nvidia-dsx')
  );
}
