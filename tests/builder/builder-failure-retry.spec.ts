/**
 * Phase 2 failure recovery: canonical facility transaction -> retry -> Builder.
 *
 * The first create_facility_setup RPC is intercepted with a controlled 503.
 * The second attempt reaches the real CI Supabase stack. Builder creation must
 * not occur until facility identity exists, and only one real Builder draft may
 * be created after recovery.
 */

import { test, expect, type Request as PWRequest, type Route } from '@playwright/test';
import {
  installRealSupabaseAuth,
  RealAuthUnavailableError,
} from '../_harness/realAuthInject';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const CONSOLE_ERROR_ALLOWLIST: RegExp[] = [
  /Download the React DevTools/i,
  /\[vite\] connecting/i,
  /\[vite\] connected/i,
  /Controlled facility failure/i,
  /503/,
  /create_facility_setup/i,
];

function isBuildersCreateRequest(req: PWRequest): boolean {
  return req.method() === 'POST' && /\/functions\/v1\/builders-create(\?|$)/.test(req.url());
}

function isFacilitySetupRequest(req: PWRequest): boolean {
  return req.method() === 'POST' && /\/rest\/v1\/rpc\/create_facility_setup(\?|$)/.test(req.url());
}

test.describe('Phase 2 facility setup failure and retry', () => {
  test('failed facility creation creates no draft; retry creates one facility and one bound draft', async ({
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

    let interceptedFailures = 0;
    let successfulFacilityResponses = 0;
    const builderCreateRequests: PWRequest[] = [];
    const consoleErrors: string[] = [];
    const pageErrors: string[] = [];

    await context.route('**/rest/v1/rpc/create_facility_setup*', async (route: Route) => {
      if (interceptedFailures === 0) {
        interceptedFailures += 1;
        await route.fulfill({
          status: 503,
          contentType: 'application/json',
          headers: {
            'access-control-allow-origin': 'http://localhost:8080',
            'access-control-allow-headers': 'authorization, apikey, content-type, x-client-info',
          },
          body: JSON.stringify({ message: 'Controlled facility failure' }),
        });
        return;
      }
      await route.continue();
    });

    page.on('response', (response) => {
      const req = response.request();
      if (isFacilitySetupRequest(req) && response.status() >= 200 && response.status() < 300) {
        successfulFacilityResponses += 1;
      }
    });
    page.on('request', (req) => {
      if (isBuildersCreateRequest(req)) builderCreateRequests.push(req);
    });
    page.on('console', (msg) => {
      if (msg.type() !== 'error') return;
      const text = msg.text();
      if (CONSOLE_ERROR_ALLOWLIST.some((rx) => rx.test(text))) return;
      consoleErrors.push(text);
    });
    page.on('pageerror', (err) => pageErrors.push(err.message));

    await page.goto('/builder', { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('heading', { name: /create your first facility/i })).toBeVisible({ timeout: 15_000 });
    expect(builderCreateRequests, 'no Builder draft before facility setup').toHaveLength(0);

    await page.getByRole('button', { name: /^create facility$/i }).click();
    await page.waitForURL(/\/manage\/facilities\?.*next=builder/, { timeout: 10_000 });

    const dialog = page.getByRole('dialog', { name: /create facility/i });
    await expect(dialog).toBeVisible();
    await dialog.getByLabel('Facility name').fill('Phase 2 Retry Facility');
    await dialog.getByRole('combobox', { name: 'Facility region' }).click();
    await page.getByRole('option', { name: /Montreal, Quebec/i }).click();
    await dialog.getByRole('combobox', { name: 'Facility tier' }).click();
    await page.getByRole('option', { name: 'Tier II' }).click();
    await dialog.getByLabel('Design capacity (kW)').fill('3100');

    const confirm = dialog.getByRole('button', { name: /create and continue to build/i });
    await confirm.click();

    await expect(page.getByText(/Controlled facility failure/i)).toBeVisible({ timeout: 10_000 });
    await expect(dialog).toBeVisible();
    expect(interceptedFailures, 'exactly one controlled failure').toBe(1);
    expect(successfulFacilityResponses, 'no successful facility transaction yet').toBe(0);
    expect(builderCreateRequests, 'failed facility setup must not create a Builder draft').toHaveLength(0);
    expect(new URL(page.url()).pathname).toBe('/manage/facilities');

    // Inputs remain in the open dialog. Retry the same operator-authored facility.
    await expect(dialog.getByLabel('Facility name')).toHaveValue('Phase 2 Retry Facility');
    await expect(dialog.getByLabel('Design capacity (kW)')).toHaveValue('3100');
    await confirm.click();

    await page.waitForURL(/\/builder\?draft=[^&]+&twin=[^&]+/, { timeout: 20_000 });
    await page.waitForTimeout(750);

    const recoveredUrl = new URL(page.url());
    const draftId = recoveredUrl.searchParams.get('draft');
    const twinId = recoveredUrl.searchParams.get('twin');
    expect(draftId).toMatch(UUID);
    expect(twinId).toMatch(UUID);
    expect(successfulFacilityResponses, 'exactly one successful facility transaction').toBe(1);
    expect(builderCreateRequests, 'exactly one Builder draft after recovery').toHaveLength(1);

    const builderBody = builderCreateRequests[0].postDataJSON() as Record<string, unknown>;
    expect(builderBody.twin_id).toBe(twinId);
    expect(builderBody.source).toBe('facility');

    const builderCountBeforeReload = builderCreateRequests.length;
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.waitForURL(/\/builder\?draft=[^&]+&twin=[^&]+/, { timeout: 15_000 });
    await page.waitForTimeout(750);
    expect(builderCreateRequests.length - builderCountBeforeReload, 'reload creates no additional draft').toBe(0);

    expect(consoleErrors, 'no unexpected console.error').toEqual([]);
    expect(pageErrors, 'no page exceptions').toEqual([]);
  });
});
