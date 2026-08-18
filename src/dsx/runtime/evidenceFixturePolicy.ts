/**
 * Phase 3 - fixture policy for evidence surfaces.
 *
 * Fixtures remain available for unit tests, Storybook and explicitly labelled
 * demonstrations. They must never populate an authenticated production
 * evidence surface, and a fixture-backed result can never be approved as an
 * authoritative decision.
 */
export const FIXTURES_ALLOWED_AS_PRODUCTION_EVIDENCE = false;

export const FIXTURE_DEMONSTRATION_NOTICE =
  'Seeded Evidence Beta fixture. These values are a demonstration of the workspace, not measured or persisted production evidence, and cannot be approved as an authoritative decision.';

export const FIXTURE_RUN_PREFIX = 'fixture:';

/** True when the identifier is a demonstration id rather than a run record. */
export function isFixtureRunId(runId: string | null | undefined): boolean {
  if (!runId) return false;
  const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return !uuid.test(runId);
}