import { test, expect } from '@playwright/test';
import {
  resolveTestSupabaseConfig,
  resolveTestUserCredentials,
} from '../helpers/testSupabaseClient';

const testSupabase = resolveTestSupabaseConfig();

const EMPTY_STORAGE_STATE = {
  cookies: [],
  origins: [],
};

const storedSupabaseSession = () => {
  const key = Object.keys(localStorage).find(
    (candidate) => candidate.startsWith('sb-') && candidate.endsWith('-auth-token'),
  );
  if (!key) return null;
  const value = localStorage.getItem(key);
  return value ? JSON.parse(value) : null;
};

test.describe('Auth & Security', () => {
  // These tests explicitly exercise anonymous, login and logout behavior. They
  // must not inherit the authenticated storage state used by protected-route
  // E2E coverage.
  test.use({ storageState: EMPTY_STORAGE_STATE });

  test.beforeEach(async ({ page }) => {
    await page.goto('/auth');
    await page.waitForLoadState('networkidle');
  });

  test('should login with valid credentials and JWT contains sub', async ({ page }) => {
    const credentials = resolveTestUserCredentials();
    await page.locator('input#email').fill(credentials.email);
    await page.locator('input#password').fill(credentials.password);
    await page.getByRole('button', { name: /sign in/i }).click();

    // Should redirect to dashboard after login
    await expect(page).toHaveURL(/\/dashboard/i, { timeout: 10000 });

    // Check localStorage for session
    const session = await page.evaluate(storedSupabaseSession);

    expect(session).toBeTruthy();
    expect(session.user).toBeTruthy();
    expect(session.user.id).toBeTruthy(); // JWT sub field
  });

  test('should restore session on page refresh', async ({ page }) => {
    const credentials = resolveTestUserCredentials();
    await page.locator('input#email').fill(credentials.email);
    await page.locator('input#password').fill(credentials.password);
    await page.getByRole('button', { name: /sign in/i }).click();
    await expect(page).toHaveURL(/\/dashboard/i, { timeout: 10000 });

    // Refresh page
    await page.reload();
    await page.waitForLoadState('networkidle');

    // Should still be on dashboard (session restored)
    await expect(page).toHaveURL(/\/dashboard/i);
  });

  test('should logout and clear session', async ({ page }) => {
    const credentials = resolveTestUserCredentials();
    await page.locator('input#email').fill(credentials.email);
    await page.locator('input#password').fill(credentials.password);
    await page.getByRole('button', { name: /sign in/i }).click();
    await expect(page).toHaveURL(/\/dashboard/i, { timeout: 10000 });

    // Logout
    const profileMenu = page.getByRole('button', { name: /profile|account|user/i });
    if (await profileMenu.isVisible()) {
      await profileMenu.click();
      await page.getByRole('menuitem', { name: /logout|sign out/i }).click();
    } else {
      // Alternative: look for logout button directly
      await page.getByRole('button', { name: /logout|sign out/i }).click();
    }

    // Should redirect to auth page
    await expect(page).toHaveURL(/\/auth/i, { timeout: 5000 });

    // Session should be cleared
    const session = await page.evaluate(storedSupabaseSession);
    expect(session).toBeNull();
  });

  test('should not expose service keys in browser', async ({ page }) => {
    // Check that no environment variables are leaked to window object
    const leakedKeys = await page.evaluate(() => {
      const sensitive = ['SUPABASE_SERVICE_KEY', 'SERVICE_ROLE_KEY', 'ANON_KEY'];
      return sensitive.filter(key => 
        (window as any)[key] || 
        (import.meta.env as any)[key]?.includes('service_role')
      );
    });

    expect(leakedKeys).toHaveLength(0);
  });

  test('should enforce RLS - unauthorized user cannot read protected data', async ({ page }) => {
    // Try to access API without auth
    const response = await page.request.get(`${testSupabase.url}/rest/v1/agents`, {
      headers: {
        apikey: testSupabase.anonKey,
      }
    });

    // Should not return data without proper auth
    expect(response.status()).toBeGreaterThanOrEqual(401);
  });

  test('should handle failed login gracefully', async ({ page }) => {
    await page.locator('input#email').fill(`invalid-${crypto.randomUUID()}@example.invalid`);
    await page.locator('input#password').fill(crypto.randomUUID());
    await page.getByRole('button', { name: /sign in/i }).click();

    // Should show error message
    await expect(page.getByText(/invalid|incorrect|error/i)).toBeVisible({ timeout: 5000 });
    
    // Should remain on auth page
    await expect(page).toHaveURL(/\/auth/i);
  });
});
