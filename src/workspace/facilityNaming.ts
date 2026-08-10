/**
 * Facility display naming.
 *
 * Some saved twins carry placeholder names (for example "1", "New Digital
 * Twin" or an empty string) that were never edited after provisioning. Showing
 * those verbatim makes the Dashboard and Blueprint look broken and gives no
 * facility context. This module resolves a readable display name,
 * classification and breadcrumb context from the facility attributes we do
 * have, without mutating any stored record.
 */

const PLACEHOLDER_PATTERNS = [
  /^new (digital twin|data ?centre|data center|twin)$/i,
  /^untitled/i,
  /^default( twin)?$/i,
  /^twin$/i,
  /^test$/i,
];

/** True when a stored twin name carries no facility meaning. */
export function isPlaceholderFacilityName(name: string | null | undefined): boolean {
  const value = (name ?? '').trim();
  if (value.length === 0) return true;
  // Purely numeric or one/two character names ("1", "aa") carry no meaning.
  if (/^\d+$/.test(value)) return true;
  if (value.length <= 2) return true;
  return PLACEHOLDER_PATTERNS.some((pattern) => pattern.test(value));
}

export interface FacilityNamingInput {
  name?: string | null;
  city?: string | null;
  regionCode?: string | null;
  tier?: string | null;
  sovereigntyLevel?: string | null;
  industry?: string | null;
}

export interface FacilityNaming {
  /** Name to render everywhere in the UI. */
  displayName: string;
  /** Facility classification line, for example "Tier-III · Sovereign AI data centre". */
  classification: string;
  /** Breadcrumb trail from region to facility. */
  breadcrumb: string[];
  /** True when displayName was derived because the stored name is a placeholder. */
  isDerivedName: boolean;
  /** The original stored name, kept for provenance and disclosure. */
  storedName: string | null;
}

function titleCase(value: string): string {
  return value.replace(/\b\w/g, (c) => c.toUpperCase());
}

/** Resolves display name, classification and breadcrumb for a facility. */
export function resolveFacilityNaming(input: FacilityNamingInput): FacilityNaming {
  const storedName = (input.name ?? '').trim() || null;
  const isDerivedName = isPlaceholderFacilityName(input.name);

  const city = (input.city ?? '').trim();
  const sovereignty = (input.sovereigntyLevel ?? '').trim().toLowerCase();
  const industry = (input.industry ?? '').trim();
  const tier = (input.tier ?? '').trim();

  const sovereignPrefix = sovereignty === 'sovereign' ? 'Sovereign ' : '';
  const kind = /ai|gpu|compute/i.test(industry) ? 'AI data centre' : 'Data centre';

  const displayName = isDerivedName
    ? [city, `${sovereignPrefix}${kind}`].filter(Boolean).join(' ').trim() || 'AURA reference facility'
    : (storedName as string);

  const classification = [tier, `${sovereignPrefix}${kind}`.trim(), industry ? titleCase(industry) : '']
    .filter(Boolean)
    .join(' · ');

  const region = (input.regionCode ?? '').trim();
  const breadcrumb = [region, city, displayName].filter(Boolean);

  return { displayName, classification, breadcrumb, isDerivedName, storedName };
}
