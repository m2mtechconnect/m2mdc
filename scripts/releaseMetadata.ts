export const LOVABLE_ORPHAN_BRANCH = '__orphan__';

export interface ReleaseEnvironmentInputs {
  rawBranch: string;
  explicitEnvironment?: string;
  providerEnvironment?: string;
}

/**
 * Lovable production publishes check out the synchronized source onto an
 * internal `__orphan__` branch. That is a provider checkout detail, not the
 * authoritative source branch. Production source is GitHub `main`; the
 * compatibility mirror is required to remain a fast-forward copy of `main`.
 */
export function normalizeReleaseBranch(rawBranch: string): string {
  const branch = rawBranch.trim() || 'unknown';
  return branch === LOVABLE_ORPHAN_BRANCH ? 'main' : branch;
}

/**
 * Prefer explicit provider metadata. When Lovable exposes only its internal
 * orphan checkout marker, classify the release as production rather than
 * emitting an ambiguous `unknown` environment in the live fingerprint.
 */
export function resolveReleaseEnvironment({
  rawBranch,
  explicitEnvironment,
  providerEnvironment,
}: ReleaseEnvironmentInputs): string {
  const explicit = explicitEnvironment?.trim();
  if (explicit) return explicit;

  const provider = providerEnvironment?.trim();
  if (provider) return provider;

  return rawBranch.trim() === LOVABLE_ORPHAN_BRANCH ? 'production' : 'unknown';
}
