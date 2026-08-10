/**
 * Shared identifier guards.
 *
 * Postgres rejects non-UUID values for `uuid` columns with HTTP 400, so routes
 * that accept an id from the URL must validate before querying. Sample/demo ids
 * such as `agent-1` or `twin-1` are common in docs, tests and shared links.
 */
const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isUuid(value: string | null | undefined): value is string {
  return typeof value === 'string' && UUID_REGEX.test(value);
}