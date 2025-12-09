import { test, expect } from '@playwright/test';

test.describe('Auth & Security', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/auth');
    await page.waitForLoadState('networkidle');
  });

  test('should login with valid credentials and JWT contains sub', async ({ page }) => {
    // Fill login form
    await page.getByPlaceholder(/email/i).fill('test@m2m.studio');
    await page.getByPlaceholder(/password/i).fill('testpass123');
    await page.getByRole('button', { name: /sign in/i }).click();

    // Should redirect to dashboard after login
    await expect(page).toHaveURL(/\/dashboard/i, { timeout: 10000 });

    // Check localStorage for session
    const session = await page.evaluate(() => {
      const authStorage = localStorage.getItem('sb-mlhcdcvpvztfjfndmxzl-auth-token');
      return authStorage ? JSON.parse(authStorage) : null;
    });

    expect(session).toBeTruthy();
    expect(session.user).toBeTruthy();
    expect(session.user.id).toBeTruthy(); // JWT sub field
  });

  test('should restore session on page refresh', async ({ page }) => {
    // Login first
    await page.getByPlaceholder(/email/i).fill('test@m2m.studio');
    await page.getByPlaceholder(/password/i).fill('testpass123');
    await page.getByRole('button', { name: /sign in/i }).click();
    await expect(page).toHaveURL(/\/dashboard/i, { timeout: 10000 });

    // Refresh page
    await page.reload();
    await page.waitForLoadState('networkidle');

    // Should still be on dashboard (session restored)
    await expect(page).toHaveURL(/\/dashboard/i);
  });

  test('should logout and clear session', async ({ page }) => {
    // Login
    await page.getByPlaceholder(/email/i).fill('test@m2m.studio');
    await page.getByPlaceholder(/password/i).fill('testpass123');
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
    const session = await page.evaluate(() => localStorage.getItem('sb-mlhcdcvpvztfjfndmxzl-auth-token'));
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
    const response = await page.request.get('https://mlhcdcvpvztfjfndmxzl.supabase.co/rest/v1/agents', {
      headers: {
        'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1saGNkY3Zwdnp0ZmpmbmRteHpsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE5MzU1NDAsImV4cCI6MjA3NzUxMTU0MH0.OgcmUgCsCL2s2eOTPmZYPaDY_Fy-JwVNTVOfgA3mJSk'
      }
    });

    // Should not return data without proper auth
    expect(response.status()).toBeGreaterThanOrEqual(401);
  });

  test('should handle failed login gracefully', async ({ page }) => {
    await page.getByPlaceholder(/email/i).fill('invalid@test.com');
    await page.getByPlaceholder(/password/i).fill('wrongpassword');
    await page.getByRole('button', { name: /sign in/i }).click();

    // Should show error message
    await expect(page.getByText(/invalid|incorrect|error/i)).toBeVisible({ timeout: 5000 });
    
    // Should remain on auth page
    await expect(page).toHaveURL(/\/auth/i);
  });
});
