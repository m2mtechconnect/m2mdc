/**
 * Typed facility-location normalization (Stage 7H, item 9).
 *
 * Replaces fragile `location.split(',')` parsing. Structured fields always win
 * over parsed display text, unknown regions are never guessed, and nothing is
 * ever defaulted to Montreal / QC.
 */

export type LocationSource = 'structured' | 'parsed' | 'unavailable';
export type LocationConfidence = 'confirmed' | 'derived' | 'ambiguous' | 'unavailable';

export interface NormalizedLocation {
  /** The original display string, preserved verbatim (trimmed) when present. */
  displayLocation: string | null;
  city: string | null;
  regionCode: string | null;
  countryCode: string | null;
  source: LocationSource;
  confidence: LocationConfidence;
}

export interface StructuredLocationInput {
  city?: string | null;
  regionCode?: string | null;
  countryCode?: string | null;
}

/** ISO-3166-2 subdivision codes for Canada, used only to *recognise* input. */
const CA_REGION_CODES = new Set([
  'AB', 'BC', 'MB', 'NB', 'NL', 'NS', 'NT', 'NU', 'ON', 'PE', 'QC', 'SK', 'YT',
]);

/** Full region names we can map with confidence. Never inferred from a city. */
const REGION_NAME_TO_CODE: Record<string, string> = {
  alberta: 'AB',
  'british columbia': 'BC',
  'colombie-britannique': 'BC',
  manitoba: 'MB',
  'new brunswick': 'NB',
  'nouveau-brunswick': 'NB',
  'newfoundland and labrador': 'NL',
  'nova scotia': 'NS',
  'nouvelle-ecosse': 'NS',
  ontario: 'ON',
  'prince edward island': 'PE',
  quebec: 'QC',
  saskatchewan: 'SK',
  yukon: 'YT',
};

const COUNTRY_NAME_TO_CODE: Record<string, string> = {
  canada: 'CA',
  'united states': 'US',
  'united states of america': 'US',
  usa: 'US',
  'etats-unis': 'US',
  france: 'FR',
  germany: 'DE',
  deutschland: 'DE',
  ireland: 'IE',
  japan: 'JP',
  netherlands: 'NL',
  singapore: 'SG',
  'united kingdom': 'GB',
  uk: 'GB',
};

const UNAVAILABLE: NormalizedLocation = {
  displayLocation: null,
  city: null,
  regionCode: null,
  countryCode: null,
  source: 'unavailable',
  confidence: 'unavailable',
};

/** Lowercase, strip accents and collapse whitespace for dictionary lookups. */
function fold(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

function clean(value: string | null | undefined): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.replace(/\s+/g, ' ').trim();
  return trimmed.length > 0 ? trimmed : null;
}

function asRegionCode(part: string): string | null {
  const folded = fold(part);
  if (REGION_NAME_TO_CODE[folded]) return REGION_NAME_TO_CODE[folded];
  const upper = part.trim().toUpperCase();
  if (CA_REGION_CODES.has(upper)) return upper;
  // Two-letter uppercase tokens are treated as subdivision codes generally
  // (e.g. "TX", "NY") but only when they are not a known country code.
  if (/^[A-Z]{2}$/.test(upper) && !Object.values(COUNTRY_NAME_TO_CODE).includes(upper)) {
    return upper;
  }
  return null;
}

function asCountryCode(part: string): string | null {
  const folded = fold(part);
  if (COUNTRY_NAME_TO_CODE[folded]) return COUNTRY_NAME_TO_CODE[folded];
  const upper = part.trim().toUpperCase();
  if (/^[A-Z]{2}$/.test(upper) && Object.values(COUNTRY_NAME_TO_CODE).includes(upper)) {
    return upper;
  }
  return null;
}

/**
 * Normalize a facility location.
 *
 * @param display Free-text display location, e.g. "Montreal, QC".
 * @param structured Authoritative structured fields. Never overwritten by
 *                   values parsed out of `display`.
 */
export function normalizeLocation(
  display?: string | null,
  structured?: StructuredLocationInput | null,
): NormalizedLocation {
  const displayLocation = clean(display);
  const sCity = clean(structured?.city);
  const sRegion = clean(structured?.regionCode);
  const sCountry = clean(structured?.countryCode);

  if (sCity || sRegion || sCountry) {
    return {
      displayLocation,
      city: sCity,
      regionCode: sRegion ? sRegion.toUpperCase() : null,
      countryCode: sCountry ? sCountry.toUpperCase() : null,
      source: 'structured',
      confidence: 'confirmed',
    };
  }

  if (!displayLocation) return UNAVAILABLE;

  const parts = displayLocation
    .split(',')
    .map((p) => p.trim())
    .filter((p) => p.length > 0);

  if (parts.length === 0) return { ...UNAVAILABLE, displayLocation };

  let city: string | null = null;
  let regionCode: string | null = null;
  let countryCode: string | null = null;

  if (parts.length === 1) {
    const only = parts[0];
    countryCode = asCountryCode(only);
    if (countryCode) {
      return {
        displayLocation,
        city: null,
        regionCode: null,
        countryCode,
        source: 'parsed',
        confidence: 'derived',
      };
    }
    regionCode = asRegionCode(only);
    if (regionCode) {
      return {
        displayLocation,
        city: null,
        regionCode,
        countryCode: null,
        source: 'parsed',
        confidence: 'derived',
      };
    }
    // A single free-text token is most likely a city, but we cannot confirm it.
    return {
      displayLocation,
      city: only,
      regionCode: null,
      countryCode: null,
      source: 'parsed',
      confidence: 'ambiguous',
    };
  }

  // Multi-part: read right-to-left, which is the stable convention.
  const rest = [...parts];
  const last = rest[rest.length - 1];
  const lastCountry = asCountryCode(last);
  if (lastCountry) {
    countryCode = lastCountry;
    rest.pop();
  }

  if (rest.length > 0) {
    const tail = rest[rest.length - 1];
    const tailRegion = asRegionCode(tail);
    if (tailRegion && rest.length > 1) {
      regionCode = tailRegion;
      rest.pop();
    } else if (tailRegion && rest.length === 1 && countryCode) {
      regionCode = tailRegion;
      rest.pop();
    }
  }

  city = rest.length > 0 ? rest[0] : null;

  const resolvedCount = [city, regionCode, countryCode].filter(Boolean).length;
  const unresolvedTokens = rest.length > 1;

  return {
    displayLocation,
    city,
    regionCode,
    countryCode,
    source: 'parsed',
    confidence: unresolvedTokens || resolvedCount < 2 ? 'ambiguous' : 'derived',
  };
}
