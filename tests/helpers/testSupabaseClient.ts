import { createClient } from '@supabase/supabase-js';
import type { BrowserContext } from '@playwright/test';
import type { Database } from '@/integrations/supabase/types';

const DEFAULT_TEST_SUPABASE_URL = 'http://127.0.0.1:54321';
const DEFAULT_TEST_ANON_KEY = 'test-placeholder-anon-key';
const LOOPBACK_HOSTS = new Set(['127.0.0.1', 'localhost', '[::1]', '::1']);

export interface TestSupabaseConfig {
  url: string;
  anonKey: string;
}

export interface BrowserTestSession {
  accessToken: string;
  userId: string;
}

export interface TestUserCredentials {
  email: string;
  password: string;
}

export class UnsafeTestBackendError extends Error {
  constructor(reason: string) {
    super(`Test backend configuration rejected: ${reason}`);
    this.name = 'UnsafeTestBackendError';
  }
}

/**
 * Resolves a disposable Supabase endpoint for executable tests.
 *
 * Playwright must never inherit an ambient cloud or production URL. Only a
 * loopback Supabase stack is accepted; the returned error never includes keys,
 * tokens, query strings, or other credential material.
 */
export function resolveTestSupabaseConfig(
  env: Record<string, string | undefined> = process.env,
): TestSupabaseConfig {
  const configuredUrl =
    env.TEST_SUPABASE_URL?.trim() ||
    env.VITE_SUPABASE_URL?.trim() ||
    env.SUPABASE_URL?.trim() ||
    DEFAULT_TEST_SUPABASE_URL;

  let parsed: URL;
  try {
    parsed = new URL(configuredUrl);
  } catch {
    throw new UnsafeTestBackendError('URL is malformed');
  }

  if (!['http:', 'https:'].includes(parsed.protocol)) {
    throw new UnsafeTestBackendError('URL protocol must be HTTP or HTTPS');
  }
  if (!LOOPBACK_HOSTS.has(parsed.hostname)) {
    throw new UnsafeTestBackendError('only loopback hosts are permitted');
  }
  if (parsed.username || parsed.password || parsed.search || parsed.hash) {
    throw new UnsafeTestBackendError('URL must not contain credentials, query parameters, or fragments');
  }
  if (parsed.pathname !== '/' && parsed.pathname !== '') {
    throw new UnsafeTestBackendError('URL must not contain a path');
  }

  const anonKey =
    env.TEST_SUPABASE_ANON_KEY?.trim() ||
    env.VITE_SUPABASE_PUBLISHABLE_KEY?.trim() ||
    env.SUPABASE_ANON_KEY?.trim() ||
    DEFAULT_TEST_ANON_KEY;

  return { url: parsed.origin, anonKey };
}

/** Requires runtime-injected credentials for tests that use a pre-seeded user. */
export function resolveTestUserCredentials(
  env: Record<string, string | undefined> = process.env,
): TestUserCredentials {
  const email = env.TEST_USER_EMAIL?.trim();
  const password = env.TEST_USER_PASSWORD;

  if (!email || !password) {
    throw new Error('Pre-seeded test user credentials are not configured');
  }

  return { email, password };
}

export function createTestSupabaseClient(options: { accessToken?: string } = {}) {
  const { url, anonKey } = resolveTestSupabaseConfig();
  const headers = options.accessToken
    ? { Authorization: `Bearer ${options.accessToken}` }
    : undefined;

  return createClient<Database>(url, anonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
    global: headers ? { headers } : undefined,
  });
}

/** Reads the authenticated browser session without logging or returning refresh tokens. */
export async function getBrowserTestSession(
  context: BrowserContext,
): Promise<BrowserTestSession> {
  const state = await context.storageState();

  for (const origin of state.origins) {
    for (const item of origin.localStorage) {
      if (!item.name.startsWith('sb-') || !item.name.endsWith('-auth-token')) continue;

      try {
        const session = JSON.parse(item.value) as {
          access_token?: unknown;
          user?: { id?: unknown };
        };
        if (typeof session.access_token === 'string' && typeof session.user?.id === 'string') {
          return { accessToken: session.access_token, userId: session.user.id };
        }
      } catch {
        // Ignore unrelated or malformed storage entries and fail closed below.
      }
    }
  }

  throw new Error('Authenticated Supabase test session is unavailable');
}
