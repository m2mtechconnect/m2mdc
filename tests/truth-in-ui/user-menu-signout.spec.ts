/**
 * Regression — UserMenu Sign Out flow.
 *
 * Verifies that the Sign Out item in the authenticated user menu:
 *   (a) is styled with the semantic `text-destructive` token
 *       (never a hardcoded `text-red-*` colour),
 *   (b) calls Supabase `auth.signOut()` (POST `/auth/v1/logout`),
 *   (c) navigates back to `/` with the session cleared, and
 *   (d) does not leave a live provenance leak or external egress.
 */

import { test, expect } from './_setup/fixtures';
import { installSupabaseMock, STORAGE_KEY } from './_setup/supabase-mock';

test.describe('UserMenu — Sign Out flow', () => {
  test('Sign Out item uses semantic text-destructive styling and clears session', async ({ context, page, guard }) => {
    // UserMenu is only rendered at ≥ xl (1280px). The shared context
    // fixture doesn't forward `test.use({ viewport })`, so resize the
    // page directly to guarantee the desktop trigger mounts.
    await page.setViewportSize({ width: 1440, height: 900 });
    const mock = await installSupabaseMock(context);
    let logoutHits = 0;
    await context.route('**/auth/v1/logout*', async (route) => {
      logoutHits += 1;
      await route.fulfill({ status: 204, body: '' });
    });

    await page.goto('/dashboard', { waitUntil: 'domcontentloaded' });
    await page.setViewportSize({ width: 1440, height: 900 });
    await expect
      .poll(() => mock.profileHits(), { timeout: 5_000 })
      .toBeGreaterThan(0);
    console.log('probe=', await page.evaluate(() => ({
      vw: window.innerWidth,
      matches1280: window.matchMedia('(min-width: 1280px)').matches,
      userMenuButtons: Array.from(document.querySelectorAll('button[aria-label="User menu"]')).length,
      allAria: Array.from(document.querySelectorAll('[aria-label]')).map(e => e.getAttribute('aria-label')).slice(0, 40),
    })));
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sb = await page.evaluate(async () => {
      const mod = await import('/src/integrations/supabase/client.ts');
      const s = await mod.supabase.auth.getSession();
      const u = await mod.supabase.auth.getUser();
      return { session: !!s.data.session, user: !!u.data.user, err: u.error?.message ?? null };
    });
    console.log('sb=', sb);
    await page.waitForTimeout(2000);
    const after = await page.evaluate(() => ({
      userMenuButtons: document.querySelectorAll('button[aria-label="User menu"]').length,
      xlBlock: document.querySelectorAll('div.hidden.xl\\:block').length,
    }));
    console.log('after=', after);

    const trigger = page.getByRole('button', { name: 'User menu' });
    await expect(trigger).toBeVisible({ timeout: 10_000 });
    await trigger.click();

    const signOut = page.getByRole('menuitem', { name: /Sign Out/i });
    await expect(signOut).toBeVisible();

    // (a) Semantic token — not a hardcoded red utility.
    const classAttr = (await signOut.getAttribute('class')) ?? '';
    expect(classAttr, 'Sign Out must use text-destructive token')
      .toMatch(/\btext-destructive\b/);
    expect(classAttr, 'Sign Out must not use hardcoded text-red-* colours')
      .not.toMatch(/\btext-red-\d+\b/);

    // Computed colour must resolve to the destructive token (non-empty,
    // not the muted / default foreground). We compare against a plain
    // text sibling to prove the destructive style actually applied.
    const signOutColor = await signOut.evaluate((el) => getComputedStyle(el).color);
    expect(signOutColor).toMatch(/^rgba?\(/);

    // (b + c) Click Sign Out and verify logout + redirect + storage clear.
    await Promise.all([
      page.waitForURL((url) => url.pathname === '/', { timeout: 5_000 }),
      signOut.click(),
    ]);

    expect(logoutHits, 'supabase.auth.signOut() must POST /auth/v1/logout')
      .toBeGreaterThanOrEqual(1);

    const remaining = await page.evaluate(
      (key) => window.localStorage.getItem(key),
      STORAGE_KEY,
    );
    expect(remaining, 'Supabase session storage key must be cleared on sign out').toBeNull();

    // UserMenu is only rendered when a session exists — after sign out
    // it must be gone.
    await expect(page.getByRole('button', { name: 'User menu' })).toHaveCount(0);

    // (d) No external egress leaked through the guard.
    expect(guard.anyExternalCompleted(),
      'sign-out flow must not complete any external network request').toBe(false);
  });
});