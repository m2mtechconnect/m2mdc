/**
 * Canonical power units for AURA DC.
 *
 * Evidence (read-only production inspection, Stage 6D):
 *   select capacity_kw, count(*) from data_centre_twins group by 1;
 *     5000 -> 17 rows, 20000 -> 3 rows, 5000000 -> 3 rows, 10000000 -> 2 rows
 *
 * The 5,000,000 and 10,000,000 rows are watt values written into a column
 * named `capacity_kw` (5 MW and 10 MW facilities). Rendered verbatim they
 * produced "10000.0 MW" - a 10 GW claim - on the Dashboard and Blueprint.
 *
 * Stage 7J closed this at the source: the affected rows were rescaled by
 * migration and a database trigger now rejects any capacity above the
 * plausibility limit. This module remains the single conversion boundary and
 * the last line of defence for legacy or imported records: storage values are
 * normalised once, formatting happens once, and every rescale is disclosed.
 */

/**
 * Largest capacity, in kW, that is credible for a single data-centre twin.
 * 1,000,000 kW = 1 GW. No AURA facility record models a gigawatt campus, so
 * any stored value above this is treated as watts mis-recorded as kilowatts.
 */
export const MAX_PLAUSIBLE_FACILITY_KW = 1_000_000;

export interface NormalisedPower {
  /** Capacity in kilowatts, safe to format and to derive KPIs from. */
  kw: number;
  /** True when the stored value was interpreted as watts and divided by 1000. */
  wasRescaled: boolean;
  /** The raw stored value, preserved for provenance. */
  storedValue: number | null;
  /** Human-readable disclosure, or null when the stored value was used as-is. */
  note: string | null;
}

/**
 * Normalise a stored `capacity_kw` value to kilowatts.
 * Non-finite, zero or negative values fall back to `fallbackKw`.
 */
export function normaliseStoredCapacityKw(
  stored: number | null | undefined,
  fallbackKw: number,
): NormalisedPower {
  if (stored == null || !Number.isFinite(stored) || stored <= 0) {
    return {
      kw: fallbackKw,
      wasRescaled: false,
      storedValue: stored == null || !Number.isFinite(stored) ? null : stored,
      note: null,
    };
  }

  if (stored > MAX_PLAUSIBLE_FACILITY_KW) {
    const kw = stored / 1000;
    return {
      kw,
      wasRescaled: true,
      storedValue: stored,
      note:
        `Stored capacity ${stored.toLocaleString()} exceeds the ${MAX_PLAUSIBLE_FACILITY_KW.toLocaleString()} kW ` +
        `plausibility limit and is interpreted as watts, so it is shown as ${formatPower(kw)}.`,
    };
  }

  return { kw: stored, wasRescaled: false, storedValue: stored, note: null };
}

/** Round to a readable number of decimals and drop trailing zeros. */
function trim(value: number): string {
  const abs = Math.abs(value);
  const decimals = abs >= 100 ? 0 : abs >= 10 ? 1 : 2;
  return Number(value.toFixed(decimals)).toLocaleString(undefined, {
    maximumFractionDigits: decimals,
  });
}

export interface PowerParts {
  value: string;
  unit: 'kW' | 'MW' | 'GW';
}

/** Choose the unit that keeps the figure between 1 and 999 wherever possible. */
export function powerParts(kw: number): PowerParts {
  if (!Number.isFinite(kw)) return { value: '-', unit: 'kW' };
  const abs = Math.abs(kw);
  if (abs >= 1_000_000) return { value: trim(kw / 1_000_000), unit: 'GW' };
  if (abs >= 1000) return { value: trim(kw / 1000), unit: 'MW' };
  return { value: trim(kw), unit: 'kW' };
}

/**
 * Format a kilowatt figure. Never renders a five-digit MW value and never
 * renders a trailing ".0".
 */
export function formatPower(kw: number): string {
  const parts = powerParts(kw);
  if (parts.value === '-') return '-';
  return `${parts.value} ${parts.unit}`;
}

/** Spoken form for assistive technology, e.g. "10 megawatts". */
export function powerAriaLabel(kw: number): string {
  const { value, unit } = powerParts(kw);
  if (value === '-') return 'not available';
  const spoken = unit === 'GW' ? 'gigawatts' : unit === 'MW' ? 'megawatts' : 'kilowatts';
  return `${value} ${spoken}`;
}
