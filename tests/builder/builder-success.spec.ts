/**
 * Phase 2 golden handoff: facility -> Builder.
 *
 * Runs against the real CI Supabase stack with auth installed before navigation.
 * No facility or builder request is mocked.
 *
 * Proves:
 * - /builder does not auto-create a draft.
 * - a user with no configured facility is sent through canonical facility setup.
 * - facility creation uses the tenant-bound create_facility_setup RPC exactly once.
 * - the resulting twin id is carried into builders-create exactly once.
 * - ?new=true is consumed and replaced by a durable draft id while preserving twin id.
 * - refresh reuses the same draft and twin without creating duplicates.
 * - legacy starter placeholders cannot satisfy the canonical first-run gate because
 *   the product only exposes operator-configured facilities in this journey.
 */

import { test, expect, type Request as PWRequest } from '@playwright/test';
import {
  installRealSupabaseAuth,
  RealAuthUnavailableError,
} from '../_harness/realAuthInject';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const CONSOLE_ERROR_ALLOWLIST: RegExp[] = [
  /Download the React DevTools/i,
  /\[vite\] connecting/i,
  /\[vite\] connected/i,
];

function isBuildersCreateRequest(req: PWRequest): boolean {
  return req.method() === 'POST' && /\/functions\/v1\/builders-create(\?|$)/.test(req.url());
}

function isFacilitySetupRequest(req: PWRequest): boolean {
  return req.method() === 'POST' && /\/rest\/v1\/rpc\/create_facility_setup(\?|$)/.test(req.url());
}

test.describe('Phase 2 facility -> Builder continuity (real backend)', () => {
  test('creates one truth-safe facility and binds one durable Builder draft to the same twin', async ({
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

    const facilityRequests: PWRequest[] = [];
    const builderCreateRequests: PWRequest[] = [];
    const consoleErrors: string[] = [];
    const pageErrors: string[] = [];

    page.on('request', (req) => {
      if (isFacilitySetupRequest(req)) facilityRequests.push(req);
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
    await expect(page).toHaveURL(/\/builder(\?|$)/);

    const facilityRequired = page.getByRole('heading', { name: /create your first facility/i });
    await expect(facilityRequired).toBeVisible({ timeout: 15_000 });
    expect(builderCreateRequests, 'no draft created before facility identity exists').toHaveLength(0);

    await page.getByRole('button', { name: /^create facility$/i }).click();
    await page.waitForURL(/\/manage\/facilities\?.*next=builder/, { timeout: 10_000 });

    const dialog = page.getByRole('dialog', { name: /create facility/i });
    await expect(dialog).toBeVisible();

    await dialog.getByLabel('Facility name').fill('Phase 2 Golden Facility');

    await dialog.getByRole('combobox', { name: 'Facility region' }).click();
    await page.getByRole('option', { name: /Toronto, Ontario/i }).click();

    await dialog.getByRole('combobox', { name: 'Facility tier' }).click();
    await page.getByRole('option', { name: 'Tier III' }).click();

    await dialog.getByLabel('Design capacity (kW)').fill('4200');
    await dialog.getByRole('button', { name: /create and continue to build/i }).click();

    await page.waitForURL(/\/builder\?draft=[^&]+&twin=[^&]+/, { timeout: 20_000 });

    const url = new URL(page.url());
    const draftId = url.searchParams.get('draft');
    const twinId = url.searchParams.get('twin');

    expect(draftId, 'durable Builder draft id').toMatch(UUID);
    expect(twinId, 'canonical facility twin id').toMatch(UUID);
    expect(url.searchParams.get('new'), '?new=true consumed exactly once').toBeNull();

    expect(facilityRequests, 'one facility transaction').toHaveLength(1);
    expect(builderCreateRequests, 'one Builder draft transaction').toHaveLength(1);

    const facilityBody = facilityRequests[0].postDataJSON() as Record<string, unknown>;
    expect(facilityBody._name).toBe('Phase 2 Golden Facility');
    expect(facilityBody._region_code).toBe('canada-central');
    expect(facilityBody._tier).toBe('Tier III');
    expect(facilityBody._capacity_kw).toBe(4200);
    expect(facilityBody).not.toHaveProperty('_pue_target');
    expect(facilityBody).not.toHaveProperty('_renewable_target_pct');
    expect(facilityBody).not.toHaveProperty('_carbon_intensity');
    expect(facilityBody).not.toHaveProperty('_sovereignty_level');

    const builderBody = builderCreateRequests[0].postDataJSON() as Record<string, unknown>;
    expect(builderBody.twin_id, 'Builder receives the exact facility identity').toBe(twinId);
    expect(builderBody.source).toBe('facility');
    expect(builderBody.type).toBe('3d_twin');

    facilityRequests.length = 0;
    builderCreateRequests.length = 0;

    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.waitForURL(/\/builder\?draft=[^&]+&twin=[^&]+/, { timeout: 15_000 });
    await page.waitForTimeout(1_000);

    const reloaded = new URL(page.url());
    expect(reloaded.searchParams.get('draft')).toBe(draftId);
    expect(reloaded.searchParams.get('twin')).toBe(twinId);
    expect(facilityRequests, 'refresh must not create another facility').toHaveLength(0);
    expect(builderCreateRequests, 'refresh must not create another draft').toHaveLength(0);

    await page.goto(`/blueprint/${twinId}`, { waitUntil: 'domcontentloaded' });
    await expect(page).toHaveURL(new RegExp(`/blueprint/${twinId}$`));

    expect(consoleErrors, 'no unexpected console.error').toEqual([]);
    expect(pageErrors, 'no page exceptions or unhandled rejections').toEqual([]);
  });
});
