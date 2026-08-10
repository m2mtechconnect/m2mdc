import { describe, expect, it } from 'vitest';
import {
  MAX_PLAUSIBLE_FACILITY_KW,
  formatPower,
  normaliseStoredCapacityKw,
  powerAriaLabel,
} from '../power';

describe('formatPower', () => {
  it('renders sub-megawatt figures in kW', () => {
    expect(formatPower(750)).toBe('750 kW');
  });

  it('renders megawatt figures without a trailing .0', () => {
    expect(formatPower(10_000)).toBe('10 MW');
    expect(formatPower(5000)).toBe('5 MW');
  });

  it('keeps one decimal where it carries information', () => {
    expect(formatPower(4200)).toBe('4.2 MW');
  });

  it('never renders a five-digit MW value', () => {
    expect(formatPower(10_000_000)).toBe('10 GW');
  });

  it('handles non-finite input', () => {
    expect(formatPower(Number.NaN)).toBe('-');
  });
});

describe('normaliseStoredCapacityKw', () => {
  it('passes plausible stored values through unchanged', () => {
    const r = normaliseStoredCapacityKw(5000, 4200);
    expect(r.kw).toBe(5000);
    expect(r.wasRescaled).toBe(false);
    expect(r.note).toBeNull();
  });

  it('rescales watt values written into the kW column', () => {
    // Production evidence: data_centre_twins rows store 10,000,000 here.
    const r = normaliseStoredCapacityKw(10_000_000, 4200);
    expect(r.kw).toBe(10_000);
    expect(r.wasRescaled).toBe(true);
    expect(r.note).toContain('10 MW');
  });

  it('does not rescale at the plausibility boundary', () => {
    expect(normaliseStoredCapacityKw(MAX_PLAUSIBLE_FACILITY_KW, 4200).wasRescaled).toBe(false);
  });

  it('falls back when the stored value is missing or invalid', () => {
    expect(normaliseStoredCapacityKw(null, 4200).kw).toBe(4200);
    expect(normaliseStoredCapacityKw(0, 4200).kw).toBe(4200);
    expect(normaliseStoredCapacityKw(-5, 4200).kw).toBe(4200);
  });
});

describe('powerAriaLabel', () => {
  it('spells out the unit', () => {
    expect(powerAriaLabel(10_000)).toBe('10 megawatts');
    expect(powerAriaLabel(400)).toBe('400 kilowatts');
  });
});
