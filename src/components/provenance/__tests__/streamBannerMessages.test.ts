import { describe, it, expect } from 'vitest';
import { STREAM_BANNER_MESSAGES } from '@/components/provenance/ProvenanceBadge';

describe('StreamStatusBanner — cause-specific messaging (Phase 1A.1)', () => {
  it('uses the verbatim invalid-response string', () => {
    expect(STREAM_BANNER_MESSAGES['kit-invalid']).toBe(
      'Kit response invalid — displaying local demonstration data.',
    );
  });

  it('uses the verbatim unavailable string', () => {
    expect(STREAM_BANNER_MESSAGES['kit-unavailable']).toBe(
      'Kit unavailable — displaying local demonstration data.',
    );
  });

  it('has a distinct disabled message', () => {
    expect(STREAM_BANNER_MESSAGES['kit-disabled']).toMatch(/disabled by configuration/i);
  });

  it('does NOT collapse invalid and unavailable into the same string', () => {
    expect(STREAM_BANNER_MESSAGES['kit-invalid']).not.toEqual(
      STREAM_BANNER_MESSAGES['kit-unavailable'],
    );
  });

  it('every reason maps to a non-empty operator-readable string', () => {
    for (const msg of Object.values(STREAM_BANNER_MESSAGES)) {
      expect(msg.length).toBeGreaterThan(10);
    }
  });
});