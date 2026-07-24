/**
 * Committed regression for the /builder "Start blank" failure → Retry
 * recovery path.
 *
 * Uses the real Lovable-sandbox-injected Supabase session so the
 * successful Retry hits the real `builders-create` edge function and
 * persists exactly one real draft. Only the FIRST create request is
 * intercepted (503) — subsequent requests pass through to the backend.
 */

import { test, expect, type Request as PWRequest, type Route } from '@playwright/test';
import {
  installRealSupabaseAuth,
  RealAuthUnavailableError,
} from '../_harness/realAuthInject';

const UUID_V4 =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const CONSOLE_ERROR_ALLOWLIST: RegExp[] = [
  /Download the React DevTools/i,
  /\[vite\] connecting/i,
  /\[vite\] connected/i,
  // The controlled 503 surfaces as a client-side console.error from
  // the edge-function wrapper. That is the expected user-visible
  // failure signal — allow it, but only from this one path.
  /builders-create/i,
  /503/,
  /Failed to create/i,
  /Failed to initialize/i,
  /Draft was not created/i,
  /Controlled failure/i,
  /\[builderService\] Create failed/i,
  /FunctionsHttpError/i,
  /non-2xx status/i,
  /Could not start build/i,
];

function isBuildersCreateRequest(req: PWRequest): boolean {
  const url = req.url();
  return req.method() === 'POST' && /\/functions\/v1\/builders-create(\?|$)/.test(url);
}

test.describe('/builder failure-and-Retry regression (real backend recovery)', () => {
  test('First create fails (503); Retry succeeds against real backend; single persisted draft', async ({
    context,
    page,
  }) => {
    try {
      await installRealSupabaseAuth(context);
    } catch (err) {
      if (err instanceof RealAuthUnavailableError) {
        test.skip(true, err.message);
      }
      throw err;
    }

    // ---- One-time interception. First matching request → 503. ----
    let interceptsFired = 0;
    let realCreateRequests = 0;
    const failedRequests: string[] = [];

    await context.route('**/functions/v1/builders-create*', async (route: Route) => {
      if (interceptsFired === 0) {
        interceptsFired += 1;
        failedRequests.push(route.request().url());
        await route.fulfill({
          status: 503,
          contentType: 'application/json',
          headers: {
            'access-control-allow-origin': '*',
            'access-control-allow-headers': '*',
          },
          body: JSON.stringify({
            error: {
              code: 'SERVICE_UNAVAILABLE',
              message: 'Controlled failure for regression test',
            },
          }),
        });
        return;
      }
      // Subsequent requests pass through to the real backend.
      await route.continue();
    });

    // Track REAL (non-intercepted) create requests by watching for the
    // response — an intercepted route.fulfill still fires request events,
    // so we count real ones by response status.
    page.on('response', (resp) => {
      const req = resp.request();
      if (!isBuildersCreateRequest(req)) return;
      // Intercepted 503s are counted via `failedRequests` above.
      if (resp.status() === 503) return;
      realCreateRequests += 1;
    });

    const consoleErrors: string[] = [];
    const pageErrors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() !== 'error') return;
      const text = msg.text();
      if (CONSOLE_ERROR_ALLOWLIST.some((rx) => rx.test(text))) return;
      consoleErrors.push(text);
    });
    page.on('pageerror', (err) => pageErrors.push(err.message));

    // ---- Navigate; starter must render, no auto-create. ----
    await page.goto('/builder', { waitUntil: 'domcontentloaded' });
    await expect(page).toHaveURL(/\/builder(\?|$)/);

    const starterHeading = page.getByRole('heading', { name: /start a new build/i });
    await expect(starterHeading).toBeVisible();

    const startBlank = page.getByRole('button', { name: /^start blank$/i });
    await expect(startBlank).toBeEnabled();

    // ---- Click. First (intercepted) request must fail with 503. ----
    await startBlank.click();
    // Rapid follow-up clicks while the first request is in flight —
    // must NOT queue additional requests.
    for (let i = 0; i < 3; i++) {
      try { await startBlank.click({ timeout: 200, trial: false }); }
      catch { /* disabled/unmounted — expected */ }
    }

    // Wait for the visible error state to settle.
    const errorAlert = page.getByRole('alert');
    await expect(errorAlert).toBeVisible({ timeout: 10_000 });

    // No draft persisted; URL untouched.
    expect(new URL(page.url()).searchParams.get('draft')).toBeNull();

    // Starter still mounted.
    await expect(starterHeading).toBeVisible();

    // Primary action becomes Retry.
    const retryButton = page.getByRole('button', { name: /^retry$/i });
    await expect(retryButton).toBeVisible();
    await expect(retryButton).toBeEnabled();

    // Exactly one failed request; zero real-backend requests so far.
    expect(failedRequests.length, `one intercepted failure (saw ${failedRequests.length})`).toBe(1);
    expect(realCreateRequests, `no real create yet (saw ${realCreateRequests})`).toBe(0);

    // Wizard did not mount.
    await expect(page.getByRole('progressbar')).toHaveCount(0);

    // ---- Retry: real backend must succeed and persist. ----
    await retryButton.click();

    await page.waitForURL(/\/builder\?draft=/, { timeout: 15_000 });
    const draftId = new URL(page.url()).searchParams.get('draft');
    expect(draftId, 'draft id present after Retry').toBeTruthy();
    expect(draftId!, 'draft id is a v4 UUID').toMatch(UUID_V4);

    // Let stragglers settle.
    await page.waitForTimeout(1_500);

    // Exactly one real create request across the whole test.
    expect(
      realCreateRequests,
      `exactly one real backend create after Retry (saw ${realCreateRequests})`,
    ).toBe(1);
    // Total intercepted failure count unchanged.
    expect(failedRequests.length).toBe(1);

    // Error state cleared; wizard mounted.
    await expect(starterHeading).toBeHidden({ timeout: 15_000 });
    await expect(errorAlert).toBeHidden();
    await expect(page.locator('main').first()).toBeVisible();

    // ---- Reload: same draft, no additional create. ----
    const realBefore = realCreateRequests;
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.waitForURL(/\/builder\?draft=/, { timeout: 15_000 });
    await page.waitForTimeout(1_500);
    expect(new URL(page.url()).searchParams.get('draft')).toBe(draftId);
    expect(
      realCreateRequests - realBefore,
      `reload must not create additional drafts`,
    ).toBe(0);

    // ---- Console/runtime hygiene. ----
    expect(consoleErrors, 'no unexpected console.error').toEqual([]);
    expect(pageErrors, 'no page exceptions').toEqual([]);
  });
});