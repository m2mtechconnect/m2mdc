import { describe, it, expect } from 'vitest';
import {
  evaluateLiveBackendAccess,
  installLiveBackendGuard,
  isSupabaseHost,
  LiveBackendBlockedError,
} from '../_setup/liveBackendGuard';

const REF = 'auradisposable123';
const ok = () => ({
  AURA_DC_TEST_ENV: 'aura-dc-security-test',
  SUPABASE_PROJECT_ID: REF,
  VITE_SUPABASE_URL: `https://${REF}.supabase.co`,
  VITE_SUPABASE_PUBLISHABLE_KEY: 'pub',
});

describe('live-backend guard', () => {
  it('allows a well-formed disposable environment', () => {
    expect(evaluateLiveBackendAccess(ok()).allowed).toBe(true);
  });

  it('blocks the production project ref', () => {
    const r = evaluateLiveBackendAccess({
      ...ok(),
      SUPABASE_PROJECT_ID: 'psfvrskpnwcshvajzeix',
      VITE_SUPABASE_URL: 'https://psfvrskpnwcshvajzeix.supabase.co',
    });
    expect(r.allowed).toBe(false);
    expect(r.reasons.join()).toContain('production project');
  });

  it('blocks an ambient/unmarked environment', () => {
    expect(evaluateLiveBackendAccess({}).allowed).toBe(false);
  });

  it('recognises supabase hosts only', () => {
    expect(isSupabaseHost('https://abc.supabase.co/auth/v1/signup')).toBe(true);
    expect(isSupabaseHost('https://example.com/x')).toBe(false);
  });

  it('rejects auth signup fetches when blocked, without leaking the query string', async () => {
    const saved = globalThis.fetch;
    try {
      installLiveBackendGuard({});
      await expect(
        fetch('https://psfvrskpnwcshvajzeix.supabase.co/auth/v1/signup?apikey=secretvalue', {
          method: 'POST',
        }),
      ).rejects.toThrow(LiveBackendBlockedError);
      const err = await fetch('https://psfvrskpnwcshvajzeix.supabase.co/auth/v1/signup?apikey=secretvalue')
        .catch((e) => e as Error);
      expect(err.message).not.toContain('secretvalue');
    } finally {
      globalThis.fetch = saved;
    }
  });

  it('leaves non-supabase fetches to the original implementation', async () => {
    const saved = globalThis.fetch;
    try {
      globalThis.fetch = (async () => new Response('ok')) as typeof fetch;
      installLiveBackendGuard({});
      const res = await fetch('https://example.com/ping');
      expect(await res.text()).toBe('ok');
    } finally {
      globalThis.fetch = saved;
    }
  });
});

describe('production hostname denylist', () => {
  it('denies production hosts even when the disposable environment is allowed', async () => {
    const saved = globalThis.fetch;
    try {
      globalThis.fetch = (async () => new Response('ok')) as typeof fetch;
      const decision = installLiveBackendGuard(ok());
      expect(decision.allowed).toBe(true);
      await expect(
        fetch('https://psfvrskpnwcshvajzeix.supabase.co/rest/v1/profiles'),
      ).rejects.toThrow(LiveBackendBlockedError);
      await expect(fetch('https://auradc.m2mtechconnect.com/')).rejects.toThrow(
        LiveBackendBlockedError,
      );
      const res = await fetch(`https://${REF}.supabase.co/rest/v1/x`);
      expect(await res.text()).toBe('ok');
    } finally {
      globalThis.fetch = saved;
    }
  });
});
