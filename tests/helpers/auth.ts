/**
 * Authentication helpers for E2E tests
 */

import { Page } from '@playwright/test';

export async function login(
  page: Page,
  email: string = 'test_exec@aura.dev',
  password: string = 'TestPassword123!'
) {
  await page.goto('/auth');
  
  // Fill login form
  await page.fill('input[type="email"]', email);
  await page.fill('input[type="password"]', password);
  
  // Submit
  await page.click('button[type="submit"]:has-text("Sign in")');
  
  // Wait for redirect to dashboard
  await page.waitForURL('/', { timeout: 10000 });
}

export async function logout(page: Page) {
  // Open user menu
  await page.click('button[aria-label="User menu"]');
  
  // Click sign out
  await page.click('button:has-text("Sign Out")');
  
  // Wait for redirect to auth page
  await page.waitForURL('/auth', { timeout: 5000 });
}

export async function getAuthToken(page: Page): Promise<string | null> {
  // Get auth token from localStorage
  const token = await page.evaluate(() => {
    return localStorage.getItem('supabase.auth.token');
  });
  
  return token;
}
