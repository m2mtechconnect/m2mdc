/**
 * Real Supabase session installer for authenticated Playwright specs
 * that must reach the real backend (NOT the mocked truth-in-UI
 * suite). Reads the sandbox-injected environment variables that the
 * Lovable browser harness exposes:
 *
 *   • LOVABLE_BROWSER_SUPABASE_STORAGE_KEY
 *   • LOVABLE_BROWSER_SUPABASE_SESSION_JSON
 *   • LOVABLE_BROWSER_SUPABASE_COOKIES_JSON  (optional; SSR clients)
 *
 * The values NEVER touch committed files, screenshots, traces or
 * logs — they are consumed straight from the environment inside the
 * test worker and pushed to the browser context via `addCookies` +
 * `addInitScript`, both of which run BEFORE any page in the context
 * navigates or the Supabase client boots.
 *
 * If the vars are absent (e.g. running outside the Lovable sandbox
 * or with an unauthenticated session), `installRealSupabaseAuth`
 * throws so the test fails with a clear "external auth unavailable"
 * signal instead of silently degrading to PendingApproval.
 */

import type { BrowserContext } from '@playwright/test';

export interface RealAuthHandle {
  storageKey: string;
  /** Redacted marker so tests can log without leaking material. */
  redacted: '<session-installed>';
}

export class RealAuthUnavailableError extends Error {
  constructor(missing: string[]) {
    super(
      `Real Supabase auth harness unavailable — missing env: ${missing.join(', ')}. ` +
      `This spec requires the Lovable sandbox to inject an authenticated session.`,
    );
    this.name = 'RealAuthUnavailableError';
  }
}

export async function installRealSupabaseAuth(
  context: BrowserContext,
  originUrl: string = process.env.AURA_TARGET_ORIGIN
    ?? `http://localhost:${process.env.AURA_BUILDER_PORT ?? '8080'}`,
): Promise<RealAuthHandle> {
  const storageKey = process.env.LOVABLE_BROWSER_SUPABASE_STORAGE_KEY;
  const sessionJson = process.env.LOVABLE_BROWSER_SUPABASE_SESSION_JSON;
  const cookiesJson = process.env.LOVABLE_BROWSER_SUPABASE_COOKIES_JSON;

  const missing: string[] = [];
  if (!storageKey) missing.push('LOVABLE_BROWSER_SUPABASE_STORAGE_KEY');
  if (!sessionJson) missing.push('LOVABLE_BROWSER_SUPABASE_SESSION_JSON');
  if (missing.length > 0) throw new RealAuthUnavailableError(missing);

  // Cookies for @supabase/ssr flows (SSR reads session from cookies,
  // not localStorage). Optional — some projects are SPA-only.
  if (cookiesJson) {
    try {
      const cookies = JSON.parse(cookiesJson) as Array<Record<string, unknown>>;
      const scoped = cookies.map((c) => ({ ...c, url: originUrl }));
      // Cast: Playwright's Cookie type is stricter than the raw
      // sandbox JSON — the shape is already compatible at runtime.
      await context.addCookies(scoped as Parameters<BrowserContext['addCookies']>[0]);
    } catch (err) {
      throw new Error(
        `LOVABLE_BROWSER_SUPABASE_COOKIES_JSON is present but not valid JSON: ${(err as Error).message}`,
      );
    }
  }

  // Prime localStorage BEFORE the Supabase client boots. `addInitScript`
  // runs on every page load in this context, before any app script.
  // We scope the write to the localhost origin at runtime — if a page
  // in this context later navigates elsewhere, the write is a no-op
  // (still runs, but localStorage there is a different origin).
  await context.addInitScript(
    ([key, payload, origin]) => {
      try {
        if (window.location.origin !== origin) return;
        window.localStorage.setItem(key, payload);
      } catch {
        /* storage disabled */
      }
    },
    [storageKey!, sessionJson!, originUrl] as const,
  );

  return { storageKey: storageKey!, redacted: '<session-installed>' };
}