/**
 * Network guard fixture — fails the test on any unexpected external
 * request. Only same-origin (localhost) traffic and explicit local
 * schemes are allowed. Requests to production Supabase, NVIDIA,
 * OpenAI, Google Fonts, etc. are rejected and recorded.
 *
 * Usage from a fixture:
 *   const guard = await installNetworkGuard(page);
 *   …
 *   expect(guard.violations(), 'no external network egress').toEqual([]);
 */

import type { Page, Request } from '@playwright/test';

/** Schemes we always allow (never leave the browser). */
const ALLOWED_SCHEMES = new Set(['data:', 'blob:', 'about:', 'chrome:', 'chrome-extension:']);

/** Hostnames that are legitimate local traffic. */
const ALLOWED_HOSTS = new Set(['localhost', '127.0.0.1', '::1']);

/** Hostnames that MUST be blocked and reported as violations. */
const FORBIDDEN_HOST_SUFFIXES = [
  'supabase.co',
  'supabase.io',
  'nvidia.com',
  'ngc.nvidia.com',
  'openai.com',
  'anthropic.com',
  'googleapis.com',
  'gstatic.com',
  'fonts.google.com',
  'sentry.io',
  'analytics.google.com',
];

export interface NetworkGuardHandle {
  /** Requests that reached (or attempted) an external destination. */
  violations(): { url: string; method: string; reason: string }[];
  /** Requests explicitly allow-listed by hostname (for auditing). */
  externalAllowed(): { url: string; method: string }[];
}

export async function installNetworkGuard(page: Page): Promise<NetworkGuardHandle> {
  const violations: { url: string; method: string; reason: string }[] = [];
  const externalAllowed: { url: string; method: string }[] = [];

  // `**/*` catches http(s), ws, wss. `route.abort()` prevents any
  // real egress even if a match slips through.
  await page.route('**/*', async route => {
    const req: Request = route.request();
    const url = req.url();
    let host = '';
    try { host = new URL(url).hostname; } catch { /* opaque URLs */ }
    const scheme = url.split(':', 1)[0] + ':';

    if (ALLOWED_SCHEMES.has(scheme)) return route.continue();
    if (ALLOWED_HOSTS.has(host)) return route.continue();

    const forbidden = FORBIDDEN_HOST_SUFFIXES.find(s => host.endsWith(s));
    if (forbidden) {
      violations.push({ url, method: req.method(), reason: `forbidden host: ${host}` });
      return route.abort('blockedbyclient');
    }

    // Any other external host is also a violation — the truth suite
    // must be fully self-contained.
    violations.push({ url, method: req.method(), reason: `unexpected external host: ${host || '(opaque)'}` });
    return route.abort('blockedbyclient');
  });

  return {
    violations: () => violations.slice(),
    externalAllowed: () => externalAllowed.slice(),
  };
}