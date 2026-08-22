import { describe, expect, it } from 'vitest';
import { credentialHealthEvidenceIsCurrent } from './connection-health-policy';

describe('connection credential health policy', () => {
  it('accepts a passing check when no credential version applies', () => {
    expect(credentialHealthEvidenceIsCurrent({
      lastCheckStatus: 'PASSED',
      lastCheckStartedAt: '2026-08-22T18:00:00Z',
    })).toBe(true);
  });

  it('accepts a passing check performed after the active credential rotation', () => {
    expect(credentialHealthEvidenceIsCurrent({
      lastCheckStatus: 'PASSED',
      lastCheckStartedAt: '2026-08-22T18:05:00Z',
      credentialStatus: 'ACTIVE',
      credentialRotatedAt: '2026-08-22T18:00:00Z',
    })).toBe(true);
  });

  it('rejects historical passing evidence after credential rotation', () => {
    expect(credentialHealthEvidenceIsCurrent({
      lastCheckStatus: 'PASSED',
      lastCheckStartedAt: '2026-08-22T17:59:59Z',
      credentialStatus: 'ACTIVE',
      credentialRotatedAt: '2026-08-22T18:00:00Z',
    })).toBe(false);
  });

  it('rejects inactive credentials and malformed timestamps', () => {
    expect(credentialHealthEvidenceIsCurrent({
      lastCheckStatus: 'PASSED',
      lastCheckStartedAt: 'invalid',
      credentialStatus: 'ACTIVE',
      credentialRotatedAt: '2026-08-22T18:00:00Z',
    })).toBe(false);
    expect(credentialHealthEvidenceIsCurrent({
      lastCheckStatus: 'PASSED',
      lastCheckStartedAt: '2026-08-22T18:05:00Z',
      credentialStatus: 'REVOKED',
      credentialRotatedAt: '2026-08-22T18:00:00Z',
    })).toBe(false);
  });
});
