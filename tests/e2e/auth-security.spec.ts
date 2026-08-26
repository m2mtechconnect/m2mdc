import { test, expect } from '@playwright/test';
import {
  resolveTestSupabaseConfig,
  resolveTestUserCredentials,
} from '../helpers/testSupabaseClient';

const testSupabase = resolveTestSupabaseConfig();
const LOGIN_RETURN_TO_DASHBOARD = '/login?returnTo=%2Fdashboard';

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
    await page.goto(LOGIN_RETURN_TO_DASHBOARD);
    await expect(page.getByLabel('Email Address', { exact: true })).toBeVisible({ timeout: 10_000 });
  });

  test('should login with valid credentials and JWT contains sub', async ({ page }) => {
    const credentials = resolveTestUserCredentials();
    await page.getByLabel('Email Address', { exact: true }).fill(credentials.email);
    await page.getByLabel('Password', { exact: true }).fill(credentials.password);
    await page.getByRole('button', { name: /^sign in$/i }).click();

    // The explicit returnTo makes the expected post-login destination deterministic.
    await expect(page).toHaveURL(/\/dashboard/i, { timeout: 10000 });

    // Check localStorage for session
    const session = await page.evaluate(storedSupabaseSession);

    expect(session).toBeTruthy();
    expect(session.user).toBeTruthy();
    expect(session.user.id).toBeTruthy(); // JWT sub field
  });

  test('should restore session on page refresh', async ({ page }) => {
    const credentials = resolveTestUserCredentials();
    await page.getByLabel('Email Address', { exact: true }).fill(credentials.email);
    await page.getByLabel('Password', { exact: true }).fill(credentials.password);
    await page.getByRole('button', { name: /^sign in$/i }).click();
    await expect(page).toHaveURL(/\/dashboard/i, { timeout: 10000 });

    // Refresh page
    await page.reload();
    await page.waitForLoadState('networkidle');

    // Should still be on dashboard (session restored)
    await expect(page).toHaveURL(/\/dashboard/i);
  });

  test('should logout and clear session', async ({ page }) => {
    const credentials = resolveTestUserCredentials();
    await page.getByLabel('Email Address', { exact: true }).fill(credentials.email);
    await page.getByLabel('Password', { exact: true }).fill(credentials.password);
    await page.getByRole('button', { name: /^sign in$/i }).click();
    await expect(page).toHaveURL(/\/dashboard/i, { timeout: 10000 });

    // Exercise the canonical committed sign-out contract instead of relying on
    // shell-specific profile menu affordances.
    await page.goto('/sign-out');
    await page.waitForURL((url) => url.pathname === '/', { timeout: 10_000 });

    // Session should be cleared.
    const session = await page.evaluate(storedSupabaseSession);
    expect(session).toBeNull();

    // Protected navigation must require authentication again after logout.
    await page.goto('/dashboard');
    await expect(page).toHaveURL(/\/(?:login|auth)(?:\?|$)/i, { timeout: 10_000 });
  });

  test('should not expose service keys in browser', async ({ page }) => {
    // Browser globals must not expose server-only credential names. Network and
    // build-perimeter checks cover raw secret material separately.
    const leakedKeys = await page.evaluate(() => {
      const sensitive = ['SUPABASE_SERVICE_KEY', 'SUPABASE_SERVICE_ROLE_KEY', 'SERVICE_ROLE_KEY'];
      const browserWindow = window as unknown as Record<string, unknown>;
      return sensitive.filter((key) => Boolean(browserWindow[key]));
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
    await page.getByLabel('Email Address', { exact: true }).fill(`invalid-${crypto.randomUUID()}@example.invalid`);
    await page.getByLabel('Password', { exact: true }).fill(crypto.randomUUID());
    await page.getByRole('button', { name: /^sign in$/i }).click();

    // Should show error message
    await expect(page.getByText(/invalid|incorrect|error/i)).toBeVisible({ timeout: 5000 });

    // Failed authentication must remain on the canonical login route.
    await expect(page).toHaveURL(/\/login(?:\?|$)/i);
  });
});
