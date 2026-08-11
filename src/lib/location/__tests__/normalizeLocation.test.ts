import { describe, expect, it } from 'vitest';
import { normalizeLocation } from '../normalizeLocation';

describe('normalizeLocation', () => {
  it('prefers structured fields over display text', () => {
    const r = normalizeLocation('Montreal, QC', { city: 'Toronto', regionCode: 'on', countryCode: 'ca' });
    expect(r).toMatchObject({
      city: 'Toronto',
      regionCode: 'ON',
      countryCode: 'CA',
      source: 'structured',
      confidence: 'confirmed',
      displayLocation: 'Montreal, QC',
    });
  });

  it('parses "Montreal, QC"', () => {
    expect(normalizeLocation('Montreal, QC')).toMatchObject({
      city: 'Montreal',
      regionCode: 'QC',
      countryCode: null,
      source: 'parsed',
      confidence: 'derived',
    });
  });

  it('parses accented "Montréal, Québec, Canada"', () => {
    expect(normalizeLocation('Montréal, Québec, Canada')).toMatchObject({
      city: 'Montréal',
      regionCode: 'QC',
      countryCode: 'CA',
      confidence: 'derived',
    });
  });

  it('parses "Toronto, ON, Canada"', () => {
    expect(normalizeLocation('Toronto, ON, Canada')).toMatchObject({
      city: 'Toronto',
      regionCode: 'ON',
      countryCode: 'CA',
    });
  });

  it('parses international "Frankfurt, Germany"', () => {
    expect(normalizeLocation('Frankfurt, Germany')).toMatchObject({
      city: 'Frankfurt',
      regionCode: null,
      countryCode: 'DE',
    });
  });

  it('parses non-Canadian regions "Dallas, TX, USA"', () => {
    expect(normalizeLocation('Dallas, TX, USA')).toMatchObject({
      city: 'Dallas',
      regionCode: 'TX',
      countryCode: 'US',
    });
  });

  it('treats a lone token as an ambiguous city, never a region guess', () => {
    expect(normalizeLocation('Singapore City')).toMatchObject({
      city: 'Singapore City',
      regionCode: null,
      confidence: 'ambiguous',
    });
  });

  it('resolves region-only and country-only inputs', () => {
    expect(normalizeLocation('QC')).toMatchObject({ city: null, regionCode: 'QC' });
    expect(normalizeLocation('Canada')).toMatchObject({ city: null, countryCode: 'CA' });
  });

  it('returns unavailable for missing or empty input', () => {
    for (const input of [undefined, null, '', '   ']) {
      expect(normalizeLocation(input)).toMatchObject({
        city: null,
        regionCode: null,
        countryCode: null,
        source: 'unavailable',
        confidence: 'unavailable',
      });
    }
  });

  it('handles extra whitespace and multiple commas without guessing', () => {
    const r = normalizeLocation('  Kista ,  Stockholm County ,  Sweden ');
    expect(r.displayLocation).toBe('Kista , Stockholm County , Sweden');
    expect(r.city).toBe('Kista');
    expect(r.confidence).toBe('ambiguous');
  });

  it('never defaults to Montreal or QC', () => {
    const r = normalizeLocation('Unknown Facility');
    expect(r.city).not.toBe('Montreal');
    expect(r.regionCode).toBeNull();
  });
});
