import { describe, it, expect } from 'vitest';
import { existsSync } from 'node:fs';
import { repositoryFilesContaining } from '../helpers/repositorySearch';

/**
 * Regression guard for the retired parallel Google OAuth path.
 *
 * The `rag-oauth-google` edge function performed its own authorization-code
 * exchange and persisted unencrypted provider tokens. It was quarantined (410)
 * and is now removed. Any future Google authorization must go through the
 * generic managed connector architecture, which keeps provider tokens at the
 * gateway and gives AURA only an opaque handle.
 */
describe('legacy Google OAuth retirement', () => {
  const grep = (pattern: RegExp, roots: string[]) => repositoryFilesContaining({
    roots,
    pattern,
    exclude: (path) => path.endsWith('.md') || path.endsWith('legacyGoogleOAuthRetired.test.ts'),
  });

  it('has no edge function source directory', () => {
    expect(existsSync('supabase/functions/rag-oauth-google')).toBe(false);
  });

  it('has no invocation site anywhere in app or function source', () => {
    expect(grep(/rag-oauth-google/, ['src', 'supabase', 'tests', 'scripts', 'services'])).toEqual([]);
  });

  it('does not reference the retired OAuth client secrets', () => {
    expect(grep(/GOOGLE_OAUTH_CLIENT_(ID|SECRET)/, ['src', 'supabase', 'tests', 'scripts', 'services'])).toEqual([]);
  });

  it('offers no Google Drive authorization affordance', () => {
    expect(grep(/Connect Google Drive/, ['src'])).toEqual([]);
  });
});
