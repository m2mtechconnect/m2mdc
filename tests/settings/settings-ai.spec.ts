/**
 * /settings/ai regression coverage.
 *
 * Uses the real Lovable-sandbox-injected Supabase session to reach the
 * authorized /settings/ai route. Configuration persistence is currently
 * bound to `localStorage.copilot_settings` (documented existing
 * contract) — the test asserts that contract without inventing a
 * backend one.
 */

import { test, expect } from '@playwright/test';
import {
  installRealSupabaseAuth,
  RealAuthUnavailableError,
} from '../_harness/realAuthInject';

const CONSOLE_ERROR_ALLOWLIST: RegExp[] = [
  /Download the React DevTools/i,
  /\[vite\] connecting/i,
  /\[vite\] connected/i,
  // Ambient app noise unrelated to /settings/ai (documented pre-existing).
  /Failed to fetch location/i,
  /Failed to fetch twins/i,
  // Vendor Supabase auth (`_getUser`) navigation-abort noise emitted in
  // the production preview bundle when the app tears down mid-request.
  // Owned by an external module; scoped to a narrow signature so this
  // does not paper over app-owned failures.
  /TypeError: Failed to fetch[\s\S]*vendor-supabase/i,
];

test.describe('/settings/ai', () => {
  test('authorized load, validation, save success and persistence', async ({ context, page }) => {
    try {
      await installRealSupabaseAuth(context);
    } catch (err) {
      if (err instanceof RealAuthUnavailableError) test.skip(true, err.message);
      throw err;
    }

    const consoleErrors: string[] = [];
    const pageErrors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() !== 'error') return;
      const text = msg.text();
      if (CONSOLE_ERROR_ALLOWLIST.some((rx) => rx.test(text))) return;
      consoleErrors.push(text);
    });
    page.on('pageerror', (err) => pageErrors.push(err.message));

    // Clear any prior local config so this run is deterministic.
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await page.evaluate(() => window.localStorage.removeItem('copilot_settings'));

    // ---- Direct-route load ----
    await page.goto('/settings/ai', { waitUntil: 'domcontentloaded' });
    await expect(page).toHaveURL(/\/settings\/ai/);

    // Loading state resolves.
    const projectInput = page.locator('#ai-project-id');
    await expect(projectInput).toBeVisible({ timeout: 15_000 });
    await expect(projectInput).toHaveValue('');

    // ---- Validation: empty submit surfaces inline error, not a save ----
    const save = page.getByRole('button', { name: /^save configuration$/i });
    await expect(save).toBeEnabled();
    await save.click();
    const inlineError = page.locator('#ai-project-id-error');
    await expect(inlineError).toBeVisible();
    await expect(projectInput).toHaveAttribute('aria-invalid', 'true');

    // Confirm nothing was persisted.
    const afterInvalid = await page.evaluate(() =>
      window.localStorage.getItem('copilot_settings'),
    );
    expect(afterInvalid).toBeNull();

    // ---- Validation clears when corrected ----
    await projectInput.fill('regression-test-project');
    await expect(inlineError).toBeHidden();
    await expect(projectInput).toHaveAttribute('aria-invalid', 'false');

    // ---- Successful save ----
    // Rapid double click must produce only a single persisted state
    // (isSaving disables the button between clicks).
    await Promise.all([save.click(), save.click().catch(() => {})]);
    await expect(save).toBeEnabled();

    const persisted = await page.evaluate(() =>
      window.localStorage.getItem('copilot_settings'),
    );
    expect(persisted, 'settings persisted to localStorage').toBeTruthy();
    const parsed = JSON.parse(persisted!);
    expect(parsed.projectId).toBe('regression-test-project');
    expect(parsed.model).toBeTruthy();

    // ---- Refresh restores saved state ----
    await page.reload({ waitUntil: 'domcontentloaded' });
    await expect(page.locator('#ai-project-id')).toHaveValue('regression-test-project', {
      timeout: 10_000,
    });

    expect(consoleErrors, 'no unexpected console.error').toEqual([]);
    expect(pageErrors, 'no page exceptions').toEqual([]);

    // Cleanup.
    await page.evaluate(() => window.localStorage.removeItem('copilot_settings'));
  });
});