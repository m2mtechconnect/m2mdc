import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { SSO_PROVIDERS } from '../ssoProviders';

describe('SSO provider truth', () => {
  it('only advertises Google as available', () => {
    expect(SSO_PROVIDERS.google.available).toBe(true);
    expect(SSO_PROVIDERS.microsoft.available).toBe(false);
    expect(SSO_PROVIDERS.enterprise.available).toBe(false);
  });

  it('gives a reason for every unavailable provider', () => {
    for (const provider of Object.values(SSO_PROVIDERS)) {
      if (!provider.available) {
        expect(provider.unavailableReason?.length ?? 0).toBeGreaterThan(0);
      }
    }
  });

  it('does not present "coming soon" SSO stubs on the auth pages', () => {
    for (const file of ['src/pages/auth/SignIn.tsx', 'src/pages/auth/SignUp.tsx']) {
      expect(readFileSync(file, 'utf8')).not.toMatch(/SSO coming soon/i);
    }
  });
});
