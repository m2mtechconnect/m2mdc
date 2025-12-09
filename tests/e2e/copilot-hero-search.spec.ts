import { test, expect } from '@playwright/test';

test.describe('CoPilot - Hero Search & Panel', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  test('hero search opens Co-Pilot and streams a response', async ({ page }) => {
    const input = page.locator('input[placeholder*="ask Co-Pilot"]');
    await input.click();
    await input.fill('Explain ROI for an AI compliance co-pilot');
    await page.keyboard.press('Enter');

    // Panel should open
    const header = page.locator('h2', { hasText: 'AURA Co-Pilot' });
    await expect(header).toBeVisible({ timeout: 8000 });

    // User message should be visible
    await expect(
      page.locator('text=Explain ROI for an AI compliance co-pilot').first()
    ).toBeVisible({ timeout: 8000 });

    // Either an assistant response or an error banner should appear
    const assistantContent = page.locator('[class*="prose"]').first();
    await expect(assistantContent).toBeVisible({ timeout: 20000 });
  });

  test('panel input sends message and shows response', async ({ page }) => {
    // Open Co-Pilot via header button
    await page.click('button:has-text("Co-Pilot")');
    await page.waitForTimeout(500);

    const input = page.locator('input[placeholder*="Ask anything"]');
    await input.fill('Hello from panel input');
    await page.keyboard.press('Enter');

    // User bubble
    await expect(page.locator('text=Hello from panel input').first()).toBeVisible({ timeout: 8000 });

    // Assistant response should stream in
    const assistantContent = page.locator('[class*="prose"]').first();
    await expect(assistantContent).toBeVisible({ timeout: 20000 });
  });
});
