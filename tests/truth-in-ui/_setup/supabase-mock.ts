/**
 * Phase 1A.3.e.1 — Supabase session + REST mock for the truth-in-UI
 * suite. Playwright-only. No production auth bypass.
 *
 * Design (per user directive):
 *   • Registered at BROWSER-CONTEXT level, BEFORE any page in the
 *     context navigates. Applies to every page in the context.
 *   • Matched on parsed origin + pathname (never a whole-URL regex).
 *   • Handles OPTIONS, HEAD, and GET explicitly.
 *   • Registered AFTER the network guard so it wins Playwright's
 *     LIFO route chain. Non-supabase URLs are `route.fallback()`'d
 *     down to the guard.
 *   • Sanitized logging only: method, origin, pathname, and query
 *     parameter NAMES. No headers, tokens, UUIDs, or query values.
 *   • Exposes `profileHits()` so tests can assert the profiles
 *     mock was actually reached.
 */

import type { BrowserContext, Page, Route } from '@playwright/test';

// Supabase project ref used by the Vite env — the storage key is
// `sb-<ref>-auth-token`. This is a public identifier, not a secret.
export const SUPABASE_REF = 'psfvrskpnwcshvajzeix';
export const STORAGE_KEY = `sb-${SUPABASE_REF}-auth-token`;
const SUPABASE_HOST = `${SUPABASE_REF}.supabase.co`;

function isSupabaseHost(host: string): boolean {
  return host === SUPABASE_HOST || host.endsWith('.supabase.co') || host.endsWith('.supabase.io');
}

function b64url(obj: unknown): string {
  const s = typeof obj === 'string' ? obj : JSON.stringify(obj);
  return Buffer.from(s, 'utf8').toString('base64')
    .replace(/=+$/, '').replace(/\+/g, '-').replace(/\//g, '_');
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

export interface SanitizedRequest {
  method: string;
  origin: string;
  pathname: string;
  queryKeys: string[];
}

export interface SupabaseMockHandle {
  session: FakeSession;
  /** Sanitized log of every request the mock saw (supabase hosts only
   *  after filtering — non-supabase hosts are delegated via fallback). */
  requests(): SanitizedRequest[];
  /** How many times a `/rest/v1/profiles*` request was fulfilled. */
  profileHits(): number;
  /** Storage entry for pre-navigation localStorage priming. */
  storage(): { key: string; value: string };
}

export async function installSupabaseMock(
  target: BrowserContext | Page,
  opts: { session?: FakeSession; profileRole?: 'admin' | 'user' } = {},
): Promise<SupabaseMockHandle> {
  const session = opts.session ?? buildFakeSession();
  const log: SanitizedRequest[] = [];
  let profileHits = 0;

  const profileRow = {
    id: session.userId,
    user_id: session.userId,
    email: 'truth-suite@aura.local',
    approved: true,
    is_approved: true,
    role: opts.profileRole ?? 'admin',
    created_at: new Date().toISOString(),
  };

  async function handle(route: Route): Promise<void> {
    const req = route.request();
    let parsed: URL;
    try { parsed = new URL(req.url()); }
    catch { return route.fallback(); }

    // Parse first, match on origin+pathname second.
    const host = parsed.hostname;
    if (!isSupabaseHost(host)) return route.fallback();

    const method = req.method().toUpperCase();
    const pathname = parsed.pathname;
    const queryKeys = Array.from(parsed.searchParams.keys()).sort();
    // Sanitized only: no headers, tokens, UUIDs, or query values.
    log.push({ method, origin: parsed.origin, pathname, queryKeys });

    // Cross-origin fulfill responses require CORS headers or the
    // browser rejects them and supabase-js logs "Failed to fetch".
    const CORS_HEADERS: Record<string, string> = {
      'access-control-allow-origin': '*',
      'access-control-expose-headers': 'content-range,content-profile',
    };
    const fulfillJson = (body: string, contentType = 'application/json', extraHeaders: Record<string, string> = {}) =>
      route.fulfill({
        status: 200,
        headers: { ...CORS_HEADERS, 'content-type': contentType, ...extraHeaders },
        body,
      });

    // ---- OPTIONS preflight -------------------------------------
    if (method === 'OPTIONS') {
      return route.fulfill({
        status: 204,
        headers: {
          ...CORS_HEADERS,
          'access-control-allow-methods': 'GET,POST,PATCH,DELETE,HEAD,OPTIONS',
          'access-control-allow-headers':
            'authorization,apikey,content-type,accept,accept-profile,content-profile,prefer,x-client-info',
        },
        body: '',
      });
    }

    // ---- Auth endpoints ----------------------------------------
    if (pathname.startsWith('/auth/v1/token')) {
      return fulfillJson(session.storagePayload);
    }
    if (pathname.startsWith('/auth/v1/user')) {
      return fulfillJson(JSON.stringify((JSON.parse(session.storagePayload) as { user: unknown }).user));
    }
    if (pathname.startsWith('/auth/v1/logout')) {
      return route.fulfill({ status: 204, headers: CORS_HEADERS, body: '' });
    }

    // Realtime — WS upgrades aren't reliably interceptable; the
    // network guard aborts them at the wire.
    if (pathname.startsWith('/realtime/')) {
      return route.abort('blockedbyclient');
    }

    // ---- Profiles / RBAC ---------------------------------------
    if (pathname.startsWith('/rest/v1/profiles')) {
      if (method === 'HEAD') {
        profileHits += 1;
        return route.fulfill({ status: 200, headers: CORS_HEADERS, body: '' });
      }
      if (method === 'GET') {
        profileHits += 1;
        const acceptHeader = (req.headers()['accept'] ?? '').toLowerCase();
        const wantsSingle = acceptHeader.includes('pgrst.object');
        return fulfillJson(
          JSON.stringify(wantsSingle ? profileRow : [profileRow]),
          wantsSingle ? 'application/vnd.pgrst.object+json' : 'application/json',
        );
      }
      // Writes are unexpected on this surface — reply row-shaped so
      // no code path hangs.
      return fulfillJson(JSON.stringify(profileRow));
    }

    if (pathname.startsWith('/rest/v1/user_roles')) {
      if (method === 'HEAD') return route.fulfill({ status: 200, headers: CORS_HEADERS, body: '' });
      return fulfillJson(
        // Mirror the real row shape: the roster UI keys on `id` and renders
        // `granted_at` / `expires_at`, so a stripped-down row is not a
        // faithful stand-in for the API.
        JSON.stringify([
          {
            id: `role-${session.userId}`,
            user_id: session.userId,
            role: opts.profileRole ?? 'admin',
            scope: 'global',
            granted_by: session.userId,
            granted_at: '2026-01-01T00:00:00.000Z',
            expires_at: null,
          },
        ]),
      );
    }

    // ---- RPC / other REST --------------------------------------
    if (pathname.startsWith('/rest/v1/') || pathname.startsWith('/rpc/')) {
      if (method === 'HEAD') return route.fulfill({ status: 200, headers: CORS_HEADERS, body: '' });
      return fulfillJson(method === 'GET' ? '[]' : '{}');
    }

    // Any other supabase.co path — reply empty so nothing hangs.
    return fulfillJson('{}');
  }

  // Register at context level so the mock is in force before any
  // page navigates. Route registered AFTER the guard fixture → runs
  // FIRST in Playwright's LIFO route chain.
  const asContext = target as Partial<BrowserContext>;
  if (typeof asContext.addInitScript === 'function' && 'route' in asContext) {
    const ctx = target as BrowserContext;
    await ctx.route('**/*', handle);
    await ctx.addInitScript(
      ([storageKey, payload]) => {
        try { window.localStorage.setItem(storageKey, payload); }
        catch { /* storage disabled */ }
      },
      [STORAGE_KEY, session.storagePayload] as const,
    );
  } else {
    const page = target as Page;
    await page.route('**/*', handle);
    await page.addInitScript(
      ([storageKey, payload]) => {
        try { window.localStorage.setItem(storageKey, payload); }
        catch { /* storage disabled */ }
      },
      [STORAGE_KEY, session.storagePayload] as const,
    );
  }

  return {
    session,
    requests: () => log.slice(),
    profileHits: () => profileHits,
    storage: () => ({ key: STORAGE_KEY, value: session.storagePayload }),
  };
}