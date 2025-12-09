/**
 * AURA Co-Pilot Command Bar Tests
 * 
 * Validates the unified Co-Pilot command bar that:
 * - Detects URLs vs natural language
 * - Routes to URL scanner or Co-Pilot chat
 * - Shows suggestion chips
 * - Has "Ask Co-Pilot" CTA button
 */

import { test, expect } from '@playwright/test';
import { login } from '../helpers/auth';

test.describe('AURA Co-Pilot Command Bar @regression', () => {
  test.beforeEach(async ({ page }) => {
    await login(page, 'test_exec@aura.dev', 'TestPassword123!');
    await page.waitForURL('/');
  });

  test('should display Co-Pilot icon and placeholder', async ({ page }) => {
    const input = page.locator('input[placeholder*="Co-Pilot"]');
    await expect(input).toBeVisible();

    // Verify placeholder text
    const placeholder = await input.getAttribute('placeholder');
    expect(placeholder).toContain('Co-Pilot');
    expect(placeholder).toMatch(/URL|ask|twin/i);
  });

  test('should show suggestion chips on focus', async ({ page }) => {
    const input = page.locator('input[placeholder*="Co-Pilot"]');
    
    // Focus input
    await input.click();

    // Verify suggestion chips appear
    await expect(page.locator('button:has-text("Scan")')).toBeVisible({ timeout: 2000 });
    await expect(page.locator('button:has-text("Design")')).toBeVisible({ timeout: 2000 });
  });

  test('should detect URL input and trigger scanner', async ({ page }) => {
    const input = page.locator('input[placeholder*="Co-Pilot"]');
    
    // Enter URL
    await input.fill('https://www.yvr.ca');
    
    // Press Enter
    await page.keyboard.press('Enter');

    // Verify scanning starts
    await expect(page.locator('text=Scanning')).toBeVisible({ timeout: 5000 });

    // Verify recommendations appear
    await expect(page.locator('text=Top Digital Twin Blueprints')).toBeVisible({ timeout: 30000 });
  });

  test('should detect natural language and open Co-Pilot', async ({ page }) => {
    const input = page.locator('input[placeholder*="Co-Pilot"]');
    
    // Enter natural language query
    await input.fill('Design a digital twin for airport operations');
    
    // Press Enter
    await page.keyboard.press('Enter');

    // Verify Co-Pilot drawer opens
    await expect(page.locator('[role="dialog"]:has-text("AURA Co-Pilot")')).toBeVisible({ timeout: 5000 });

    // Verify message was sent
    await expect(page.locator('[role="dialog"]:has-text("Design a digital twin for airport operations")')).toBeVisible();
  });

  test('should show "Ask Co-Pilot" button', async ({ page }) => {
    const button = page.locator('button:has-text("Ask Co-Pilot")');
    
    // May not be visible by default, but should exist when typing
    const input = page.locator('input[placeholder*="Co-Pilot"]');
    await input.fill('test query');

    await expect(button).toBeVisible({ timeout: 2000 });
  });

  test('should handle suggestion chip clicks', async ({ page }) => {
    const input = page.locator('input[placeholder*="Co-Pilot"]');
    await input.click();

    // Click first suggestion chip
    const firstChip = page.locator('button:has-text("Scan")').first();
    await firstChip.click({ timeout: 5000 });

    // Verify input populated
    const value = await input.inputValue();
    expect(value.length).toBeGreaterThan(0);
  });

  test('should show loading state during processing', async ({ page }) => {
    const input = page.locator('input[placeholder*="Co-Pilot"]');
    await input.fill('https://www.yvr.ca');
    await page.keyboard.press('Enter');

    // Verify button shows loading state
    const loadingState = page.locator('button:has-text("Scanning"), button:has-text("Thinking")');
    await expect(loadingState.first()).toBeVisible({ timeout: 2000 });
  });

  test('should disable input while processing', async ({ page }) => {
    const input = page.locator('input[placeholder*="Co-Pilot"]');
    await input.fill('https://www.yvr.ca');
    await page.keyboard.press('Enter');

    // Input should be disabled
    await expect(input).toBeDisabled({ timeout: 2000 });
  });

  test('should handle Enter key submission', async ({ page }) => {
    const input = page.locator('input[placeholder*="Co-Pilot"]');
    await input.fill('test query');

    // Press Enter
    await page.keyboard.press('Enter');

    // Should trigger Co-Pilot or scanner
    const result = page.locator('text=Scanning, [role="dialog"]:has-text("AURA Co-Pilot")');
    await expect(result.first()).toBeVisible({ timeout: 5000 });
  });

  test('should handle empty input gracefully', async ({ page }) => {
    const input = page.locator('input[placeholder*="Co-Pilot"]');
    
    // Try to submit empty
    await input.click();
    await page.keyboard.press('Enter');

    // Should not crash or show error
    await expect(page.locator('body')).toBeVisible();
    
    // No scanning or Co-Pilot should start
    await expect(page.locator('text=Scanning')).not.toBeVisible({ timeout: 2000 });
  });
});
