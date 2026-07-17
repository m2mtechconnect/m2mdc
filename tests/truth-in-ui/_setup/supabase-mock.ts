/**
 * Phase 1A.3.e.1 — Supabase session + REST mock for the truth-in-UI
 * suite. Playwright-only. No production auth bypass.
 *
 * What this does:
 *   1. Mints a self-signed-looking (but harmless) JWT with the
 *      `sub` claim the app requires (see `validateJWT` in
 *      `authBootstrap.ts`) and a far-future `exp`.
 *   2. Primes localStorage with the exact `sb-<ref>-auth-token`
 *      shape the Supabase JS client reads on boot.
 *   3. Installs `page.route()` on every `*.supabase.co/**` URL,
 *      returning canned auth/REST/RPC responses so the app renders
 *      instead of redirecting to `/auth`.
 *   4. All external calls are aborted at the wire by the network
 *      guard — the mock only fulfils requests locally, no real egress.
 *
 * The mocks intentionally return empty datasets (`[]`) rather than
 * fixtures — the truth-in-UI assertion is that provenance badges
 * are correctly rendered, NOT that data is present.
 */

import type { Page } from '@playwright/test';

// Supabase project ref used by the Vite env — the storage key is
// `sb-<ref>-auth-token`. Keeping this in sync with `.env` is fine:
// the value is a public identifier, not a secret.
export const SUPABASE_REF = 'psfvrskpnwcshvajzeix';
export const STORAGE_KEY = `sb-${SUPABASE_REF}-auth-token`;
const SUPABASE_HOST = `${SUPABASE_REF}.supabase.co`;

function b64url(obj: unknown): string {
  const s = typeof obj === 'string' ? obj : JSON.stringify(obj);
  return Buffer.from(s, 'utf8')
    .toString('base64')
    .replace(/=+$/, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
}

/** Mint a JWT-shaped string. Signature is meaningless — the app only
 * decodes the payload client-side; real verification happens server
 * side against Supabase, which we never contact in these tests. */
export function mintFakeJwt(userId = '00000000-0000-4000-8000-000000000001'): string {
  const header  = b64url({ alg: 'HS256', typ: 'JWT' });
  const payload = b64url({
    sub: userId,
    aud: 'authenticated',
    role: 'authenticated',
    email: 'truth-suite@aura.local',
    exp: Math.floor(Date.now() / 1000) + 60 * 60,
    iat: Math.floor(Date.now() / 1000) - 60,
    iss: `https://${SUPABASE_HOST}/auth/v1`,
  });
  const signature = b64url('truth-suite-signature-not-verified');
  return `${header}.${payload}.${signature}`;
}

export interface FakeSession {
  userId: string;
  accessToken: string;
  refreshToken: string;
  storagePayload: string;
}

export function buildFakeSession(userId?: string): FakeSession {
  const uid = userId ?? '00000000-0000-4000-8000-000000000001';
  const accessToken = mintFakeJwt(uid);
  const refreshToken = 'truth-suite-refresh-not-verified';
  const session = {
    access_token: accessToken,
    refresh_token: refreshToken,
    token_type: 'bearer',
    expires_in: 3600,
    expires_at: Math.floor(Date.now() / 1000) + 3600,
    provider_token: null,
    provider_refresh_token: null,
    user: {
      id: uid,
      aud: 'authenticated',
      role: 'authenticated',
      email: 'truth-suite@aura.local',
      email_confirmed_at: new Date().toISOString(),
      phone: '',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      app_metadata: { provider: 'email', providers: ['email'] },
      user_metadata: {},
      identities: [],
    },
  };
  return { userId: uid, accessToken, refreshToken, storagePayload: JSON.stringify(session) };
}

/**
 * Install the Supabase route mock + prime session. Must be called
 * BEFORE navigating to any auth-gated route. `page.route()` for
 * `*.supabase.co/**` is fully local — nothing leaves the browser.
 */
export async function installSupabaseMock(
  page: Page,
  opts: { session?: FakeSession; profileRole?: 'admin' | 'user' } = {},
): Promise<FakeSession> {
  const session = opts.session ?? buildFakeSession();

  await page.route(/^https?:\/\/[^/]*supabase\.co\/.*$/i, async route => {
    const url = new URL(route.request().url());
    const path = url.pathname;
    const method = route.request().method();

    // Auth endpoints ------------------------------------------------
    if (path.startsWith('/auth/v1/token')) {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.parse(session.storagePayload) as never,
      });
    }
    if (path.startsWith('/auth/v1/user')) {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(JSON.parse(session.storagePayload).user),
      });
    }
    if (path.startsWith('/auth/v1/logout')) {
      return route.fulfill({ status: 204, body: '' });
    }

    // Realtime: reject the websocket upgrade so the client falls back
    // silently. `page.route` does not intercept ws upgrades reliably —
    // network-guard aborts them at the wire.
    if (path.startsWith('/realtime/')) {
      return route.abort('blockedbyclient');
    }

    // Profiles / RBAC lookups: return the truth-suite admin profile
    // so RBAC-gated UI renders. The profile role does NOT grant any
    // real capability — no server ever sees the fake JWT.
    if (path.startsWith('/rest/v1/profiles') && method === 'GET') {
      const profile = {
        id: session.userId,
        user_id: session.userId,
        email: 'truth-suite@aura.local',
        approved: true,
        is_approved: true,
        role: opts.profileRole ?? 'admin',
        created_at: new Date().toISOString(),
      };
      // supabase-js .maybeSingle()/.single() send
      // `Accept: application/vnd.pgrst.object+json`; PostgREST then
      // returns a single object, NOT an array. Detect that here so
      // both shapes work.
      const accept = route.request().headers()['accept'] ?? '';
      const single = accept.includes('pgrst.object');
      return route.fulfill({
        status: 200,
        contentType: single ? 'application/vnd.pgrst.object+json' : 'application/json',
        body: JSON.stringify(single ? profile : [profile]),
      });
    }
    }
    if (path.startsWith('/rest/v1/user_roles') && method === 'GET') {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([{ user_id: session.userId, role: opts.profileRole ?? 'admin' }]),
      });
    }

    // RPC / other REST: empty payload so the UI renders skeletons
    // rather than pending forever.
    if (path.startsWith('/rest/v1/') || path.startsWith('/rpc/')) {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: method === 'GET' ? '[]' : '{}',
      });
    }

    // Anything else from supabase.co — return 200 empty. The
    // network-guard still records the request for audit.
    return route.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
  });

  // Prime localStorage BEFORE navigating to the auth-gated route.
  await page.addInitScript(([storageKey, payload]) => {
    try {
      window.localStorage.setItem(storageKey, payload);
    } catch { /* storage disabled */ }
  }, [STORAGE_KEY, session.storagePayload] as const);

  return session;
}