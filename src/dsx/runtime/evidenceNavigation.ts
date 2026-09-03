/**
 * Add facility scope to a canonical Evidence link only when an authoritative
 * active facility exists. Callers must never pass a synthetic fallback id.
 */
export function withEvidenceFacilityContext(href: string, facilityId: string | null): string {
  if (!facilityId) return href;

  const [pathname, query = ''] = href.split('?');
  const params = new URLSearchParams(query);
  params.set('facility', facilityId);
  return `${pathname}?${params.toString()}`;
}
