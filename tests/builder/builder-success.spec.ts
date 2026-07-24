/**
 * Committed regression for the /builder "Start blank" success path.
 *
 * Runs against the real dev server on port 8080 with the Lovable
 * sandbox's injected Supabase session installed BEFORE navigation.
 * The `builders-create` edge function is invoked for real — success
 * is not mocked, so a persisted UUID is genuine.
 *
 * Covers the proven /builder repair:
 *   • Starter screen renders on first mount (no phantom draft).
 *   • Exactly one `builders-create` request per user activation
 *     even with rapid repeated clicks.
 *   • Success response returns a valid v4 UUID.
 *   • URL transitions to `/builder?draft=<uuid>`.
 *   • Wizard mounts; starter disappears.
 *   • Refresh hydrates the same draft with zero additional create
 *     requests.
 *   • History navigation adds no drafts.
 *   • Zero unexpected console errors or page exceptions.
 */

import { test, expect, type Request as PWRequest } from '@playwright/test';
import {
  installRealSupabaseAuth,
  RealAuthUnavailableError,
} from '../_harness/realAuthInject';

const UUID_V4 =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

// Console-error allowlist: benign, well-understood dev-server noise
// only. Do NOT extend to paper over real regressions.
const CONSOLE_ERROR_ALLOWLIST: RegExp[] = [
  /Download the React DevTools/i,
  /\[vite\] connecting/i,
  /\[vite\] connected/i,
];

function isBuildersCreateRequest(req: PWRequest): boolean {
  const url = req.url();
  return req.method() === 'POST' && /\/functions\/v1\/builders-create(\?|$)/.test(url);
}

test.describe('/builder success regression (real backend)', () => {
  test('Start blank creates exactly one persisted draft and survives refresh + history', async ({
    context,
    page,
  }) => {
    // ---- Phase C: auth installed BEFORE any page navigation. ----
    try {
      await installRealSupabaseAuth(context);
    } catch (err) {
      if (err instanceof RealAuthUnavailableError) {
        test.skip(true, err.message);
      }
      throw err;
    }

    // Request + console instrumentation. Attached before nav so we
    // capture every event from the first byte the app emits.
    const createRequests: string[] = [];
    const consoleErrors: string[] = [];
    const pageErrors: string[] = [];

    page.on('request', (req) => {
      if (isBuildersCreateRequest(req)) createRequests.push(req.url());
    });
    page.on('console', (msg) => {
      if (msg.type() !== 'error') return;
      const text = msg.text();
      if (CONSOLE_ERROR_ALLOWLIST.some((rx) => rx.test(text))) return;
      consoleErrors.push(text);
    });
    page.on('pageerror', (err) => pageErrors.push(err.message));

    // ---- Load /builder. Authorized shell must render on FIRST try. ----
    await page.goto('/builder', { waitUntil: 'domcontentloaded' });

    // No PendingApproval flash. If auth failed to install, we would
    // land on /pending-approval; assert URL directly.
    await expect(page).toHaveURL(/\/builder(\?|$)/);

    // Starter renders (proves no phantom draft was auto-created).
    const starterHeading = page.getByRole('heading', { name: /start a new build/i });
    await expect(starterHeading).toBeVisible();

    const startBlank = page.getByRole('button', { name: /start blank/i });
    await expect(startBlank).toBeEnabled();

    // ---- Rapid repeated clicks: only ONE create request must fire. ----
    await startBlank.click();
    // Two follow-up clicks. Some may be no-ops (button becomes
    // disabled / unmounts); that is expected — the assertion is on
    // the outgoing request count.
    for (let i = 0; i < 2; i++) {
      try { await startBlank.click({ timeout: 250, trial: false }); }
      catch { /* button disabled or unmounted — fine */ }
    }

    // Wait for the URL to transition to ?draft=<uuid>.
    await page.waitForURL(/\/builder\?draft=/, { timeout: 15_000 });

    // Extract and validate the returned identifier.
    const draftIdFromUrl = new URL(page.url()).searchParams.get('draft');
    expect(draftIdFromUrl, 'draft id present in URL').toBeTruthy();
    expect(draftIdFromUrl!, 'draft id is a v4 UUID').toMatch(UUID_V4);

    // Give the client a beat to settle any straggler retries. If a
    // duplicate fires late, this window will catch it.
    await page.waitForTimeout(1_500);

    // Exactly one real create request.
    expect(
      createRequests.length,
      `exactly one builders-create request (saw ${createRequests.length})`,
    ).toBe(1);

    // Starter disappears; wizard mounts. Poll patiently — the store
    // subscription + router search-params update can take an extra
    // React commit cycle to propagate on the real backend.
    await expect(starterHeading).toBeHidden({ timeout: 15_000 });
    await expect(page.locator('main').first()).toBeVisible();

    // ---- Refresh: same draft, no extra create request. ----
    createRequests.length = 0;
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.waitForURL(/\/builder\?draft=/, { timeout: 15_000 });
    await page.waitForTimeout(1_500);

    const draftAfterReload = new URL(page.url()).searchParams.get('draft');
    expect(draftAfterReload).toBe(draftIdFromUrl);
    expect(
      createRequests.length,
      `no create requests after refresh (saw ${createRequests.length})`,
    ).toBe(0);
    await expect(starterHeading).toBeHidden();

    // ---- History: back then forward — no additional create. ----
    // Navigate to a neutral in-app route first so `back()` returns
    // us to the draft URL rather than an about:blank.
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await page.goBack({ waitUntil: 'domcontentloaded' });
    await page.waitForURL(/\/builder\?draft=/, { timeout: 10_000 });
    await page.waitForTimeout(1_000);
    await page.goForward({ waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(500);
    await page.goBack({ waitUntil: 'domcontentloaded' });
    await page.waitForURL(/\/builder\?draft=/, { timeout: 10_000 });
    await page.waitForTimeout(1_000);

    const draftAfterHistory = new URL(page.url()).searchParams.get('draft');
    expect(draftAfterHistory).toBe(draftIdFromUrl);
    expect(
      createRequests.length,
      `history navigation must not create drafts (saw ${createRequests.length})`,
    ).toBe(0);

    // ---- Zero unexpected console errors / page exceptions. ----
    expect(consoleErrors, 'no unexpected console.error').toEqual([]);
    expect(pageErrors, 'no page exceptions or unhandled rejections').toEqual([]);
  });
});