/**
 * Authenticated preview session resolver.
 *
 * Produces the `{ storageKey, sessionJson, cookies, source }` bundle that
 * Playwright needs to boot the app as a signed-in operator, from whichever
 * of the two supported sources is available:
 *
 *   1. `injected`     — the Lovable sandbox exported
 *                       LOVABLE_BROWSER_SUPABASE_{STORAGE_KEY,SESSION_JSON,COOKIES_JSON}
 *                       because the user signed into the preview.
 *   2. `credentials`  — AURA_PREVIEW_EMAIL / AURA_PREVIEW_PASSWORD are set, so we
 *                       mint a session with the publishable key over the normal
 *                       password grant. No service-role key, no admin API.
 *
 * Secret hygiene: values are read from the environment inside this process and
 * handed to Playwright in-memory only. Nothing is written to disk, logged, or
 * embedded in evidence artifacts — callers receive the redacted marker instead.
 */

import { readFileSync } from 'node:fs';

function readDotEnv() {
  try {
    const raw = readFileSync(new URL('../.env', import.meta.url), 'utf8');
    return Object.fromEntries(
      raw
        .split('\n')
        .map((line) => line.trim())
        .filter((line) => line && !line.startsWith('#') && line.includes('='))
        .map((line) => {
          const idx = line.indexOf('=');
          return [line.slice(0, idx), line.slice(idx + 1).replace(/^["']|["']$/g, '')];
        }),
    );
  } catch {
    return {};
  }
}

export class PreviewSessionUnavailableError extends Error {
  constructor(detail) {
    super(
      `No authenticated preview session available. ${detail}\n` +
        `Provide one of:\n` +
        `  • sign into the Lovable preview (injects LOVABLE_BROWSER_SUPABASE_* next turn), or\n` +
        `  • export AURA_PREVIEW_EMAIL and AURA_PREVIEW_PASSWORD for an approved pilot account.`,
    );
    this.name = 'PreviewSessionUnavailableError';
  }
}

export function backendConfig() {
  const env = { ...readDotEnv(), ...process.env };
  const url = env.VITE_SUPABASE_URL;
  const key = env.VITE_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) throw new Error('VITE_SUPABASE_URL / VITE_SUPABASE_PUBLISHABLE_KEY are not configured.');
  return { url: url.replace(/\/$/, ''), key };
}

/** `sb-<project-ref>-auth-token`, the key the browser client persists under. */
export function storageKeyFor(url) {
  const ref = new URL(url).hostname.split('.')[0];
  return `sb-${ref}-auth-token`;
}

async function signInWithPassword(email, password) {
  const { url, key } = backendConfig();
  const res = await fetch(`${url}/auth/v1/token?grant_type=password`, {
    method: 'POST',
    headers: { apikey: key, Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok || !body.access_token) {
    // Deliberately surface only the provider's error code, never the payload.
    throw new PreviewSessionUnavailableError(
      `Password grant rejected (${res.status} ${body.error_code ?? body.error ?? 'unknown_error'}).`,
    );
  }
  const session = {
    access_token: body.access_token,
    refresh_token: body.refresh_token,
    token_type: body.token_type ?? 'bearer',
    expires_in: body.expires_in,
    expires_at: body.expires_at ?? Math.floor(Date.now() / 1000) + (body.expires_in ?? 3600),
    user: body.user,
  };
  return { storageKey: storageKeyFor(url), sessionJson: JSON.stringify(session), cookies: null, source: 'credentials' };
}

export async function resolvePreviewSession() {
  const storageKey = process.env.LOVABLE_BROWSER_SUPABASE_STORAGE_KEY;
  const sessionJson = process.env.LOVABLE_BROWSER_SUPABASE_SESSION_JSON;
  if (storageKey && sessionJson) {
    return {
      storageKey,
      sessionJson,
      cookies: process.env.LOVABLE_BROWSER_SUPABASE_COOKIES_JSON ?? null,
      source: 'injected',
    };
  }
  const email = process.env.AURA_PREVIEW_EMAIL;
  const password = process.env.AURA_PREVIEW_PASSWORD;
  if (email && password) return signInWithPassword(email, password);
  throw new PreviewSessionUnavailableError(
    `LOVABLE_BROWSER_AUTH_STATUS=${process.env.LOVABLE_BROWSER_AUTH_STATUS ?? 'unset'} and no credential fallback is configured.`,
  );
}

/**
 * Install the session into a Playwright BrowserContext so the app boots
 * signed-in on the very first navigation (init script runs before app code).
 */
export async function installPreviewSession(context, session, originUrl) {
  if (session.cookies) {
    try {
      const parsed = JSON.parse(session.cookies);
      await context.addCookies(parsed.map((c) => ({ ...c, url: originUrl })));
    } catch {
      /* cookie bundle unusable — localStorage path still applies */
    }
  }
  await context.addInitScript(
    ([key, payload, origin]) => {
      try {
        if (window.location.origin !== origin) return;
        window.localStorage.setItem(key, payload);
      } catch {
        /* storage disabled */
      }
    },
    [session.storageKey, session.sessionJson, originUrl],
  );
  return { source: session.source, redacted: '<session-installed>' };
}