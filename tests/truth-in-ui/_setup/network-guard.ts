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
  'nvidia.com',
  'ngc.nvidia.com',
  'openai.com',
  'anthropic.com',
  'sentry.io',
  'analytics.google.com',
];

/**
 * App-bootstrap externals that fire from the client bundle even on
 * public pages. These are blocked at the wire (so no real egress),
 * but do NOT count as test failures — they are the app's own
 * behaviour, not test-authored network activity. Each entry cites
 * WHY it's on the allow-list.
 */
const BOOTSTRAP_ALLOWED_SUFFIXES: { host: string; reason: string }[] = [
  { host: 'supabase.co',        reason: 'App auth client boots on every page and probes session; still aborted at wire.' },
  { host: 'supabase.io',        reason: 'Same as supabase.co (legacy TLD).' },
  { host: 'googleapis.com',     reason: 'App fetches its favicon from a GCS-hosted upload; aborted at wire.' },
  { host: 'gstatic.com',        reason: 'Google Fonts CSS loaded from index.html; aborted at wire.' },
  { host: 'fonts.google.com',   reason: 'Google Fonts stylesheet loaded from index.html; aborted at wire.' },
  { host: 'githack.com',        reason: 'drei/three example HDR asset for procedural scene; aborted at wire.' },
  { host: 'jsdelivr.net',       reason: 'CDN-hosted three.js example assets; aborted at wire.' },
  { host: 'clarity.ms',         reason: 'Microsoft Clarity analytics tag loaded from index.html; aborted at wire.' },
  { host: 'bing.com',           reason: 'Clarity companion beacon (bat.bing.com); aborted at wire.' },
  { host: 'lovable.dev',        reason: 'Lovable preview badge script; aborted at wire.' },
  { host: 'lovable.app',        reason: 'Lovable preview asset; aborted at wire.' },
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

    const bootstrap = BOOTSTRAP_ALLOWED_SUFFIXES.find(e => host.endsWith(e.host));
    if (bootstrap) {
      // Blocked at the wire but recorded as allowed for audit.
      externalAllowed.push({ url, method: req.method() });
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