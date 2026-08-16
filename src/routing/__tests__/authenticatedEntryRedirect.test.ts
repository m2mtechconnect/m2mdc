/**
 * Signed-in entry-route behaviour (finding PW-P2-05) and open-redirect safety.
 */
import { describe, expect, it } from 'vitest';
import { DEFAULT_AUTHENTICATED_ROUTE, safeReturnPath } from '../AuthenticatedEntryRedirect';

describe('safeReturnPath', () => {
  it('accepts in-app absolute paths', () => {
    expect(safeReturnPath('/dashboard')).toBe('/dashboard');
    expect(safeReturnPath('/simulation?step=compare')).toBe('/simulation?step=compare');
  });

  it('rejects anything that could leave the origin', () => {
    for (const bad of ['//evil.com', 'https://evil.com', '/\\evil.com', 'dashboard', '', null]) {
      expect(safeReturnPath(bad)).toBeNull();
    }
  });

  it('has a safe default destination', () => {
    expect(DEFAULT_AUTHENTICATED_ROUTE).toBe('/dashboard');
  });
});
