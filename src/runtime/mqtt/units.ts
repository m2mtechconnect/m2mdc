/**
 * Unit handling for runtime mapping execution.
 *
 * Conversions are only ever applied inside a single unit family and only via
 * an explicit factor table. Anything else is refused; AURA never guesses.
 */
import { unitFamily } from '../../connections/mappingValidation';

/** Canonical base per family, with each unit expressed as a linear transform to the base. */
const LINEAR: Record<string, { toBase: (v: number) => number; fromBase: (v: number) => number }> = {
  // temperature -> degC
  degc: { toBase: (v) => v, fromBase: (v) => v },
  degf: { toBase: (v) => (v - 32) / 1.8, fromBase: (v) => v * 1.8 + 32 },
  k: { toBase: (v) => v - 273.15, fromBase: (v) => v + 273.15 },
  // power -> W
  w: { toBase: (v) => v, fromBase: (v) => v },
  kw: { toBase: (v) => v * 1_000, fromBase: (v) => v / 1_000 },
  mw: { toBase: (v) => v * 1_000_000, fromBase: (v) => v / 1_000_000 },
  // energy -> Wh
  wh: { toBase: (v) => v, fromBase: (v) => v },
  kwh: { toBase: (v) => v * 1_000, fromBase: (v) => v / 1_000 },
  mwh: { toBase: (v) => v * 1_000_000, fromBase: (v) => v / 1_000_000 },
  // ratio -> ratio (0..1)
  ratio: { toBase: (v) => v, fromBase: (v) => v },
  '%': { toBase: (v) => v / 100, fromBase: (v) => v * 100 },
  pct: { toBase: (v) => v / 100, fromBase: (v) => v * 100 },
  // dimensionless
  none: { toBase: (v) => v, fromBase: (v) => v },
};

export type UnitConversion =
  | { ok: true; value: number; applied: boolean }
  | { ok: false; reason: string };

export function convertUnit(value: number, source: string | null, target: string | null): UnitConversion {
  const from = (source ?? '').trim();
  const to = (target ?? '').trim();
  if (!from || !to) return { ok: false, reason: 'source and target units are both required for numeric mappings' };
  if (from.toLowerCase() === to.toLowerCase()) return { ok: true, value, applied: false };
  const famFrom = unitFamily(from);
  const famTo = unitFamily(to);
  if (!famFrom || !famTo) return { ok: false, reason: `unit "${!famFrom ? from : to}" is not in a known unit family` };
  if (famFrom !== famTo) return { ok: false, reason: `cannot convert ${famFrom} to ${famTo} without an explicit conversion rule` };
  const a = LINEAR[from.toLowerCase()];
  const b = LINEAR[to.toLowerCase()];
  if (!a || !b) return { ok: false, reason: `no verified conversion factor between "${from}" and "${to}"` };
  return { ok: true, value: b.fromBase(a.toBase(value)), applied: true };
}