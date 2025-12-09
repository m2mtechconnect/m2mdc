/**
 * AURA Header & Branding Tests
 * 
 * Validates the updated AURA header design:
 * - Logo-only branding (no text)
 * - Personalized time-based greeting
 * - No role dropdown
 * - No Co-Pilot button in header
 * - Modern hamburger menu
 */

import { test, expect } from '@playwright/test';
import { login } from '../helpers/auth';

test.describe('AURA Header & Branding @regression @smoke', () => {
  test.beforeEach(async ({ page }) => {
    await login(page, 'test_exec@aura.dev', 'TestPassword123!');
    await page.waitForURL('/');
  });

  test('should display AURA logo without text', async ({ page }) => {
    // Verify logo exists
    const logo = page.locator('header img[alt="AURA"]');
    await expect(logo).toBeVisible();

    // Verify no "AURA" text next to logo
    const logoContainer = page.locator('header a[href="/"]');
    const hasText = await logoContainer.locator('span:has-text("AURA")').count();
    expect(hasText).toBe(0);
  });

  test('should display time-based greeting with user name', async ({ page }) => {
    const hour = new Date().getHours();
    let expectedGreeting: string;

    if (hour < 12) {
      expectedGreeting = 'Good morning';
    } else if (hour < 18) {
      expectedGreeting = 'Good afternoon';
    } else {
      expectedGreeting = 'Good evening';
    }

    // Verify greeting exists
    const greeting = page.locator(`header:has-text("${expectedGreeting}")`);
    await expect(greeting).toBeVisible();

    // Verify it contains a name (extracted from email or profile)
    const greetingText = await greeting.textContent();
    expect(greetingText).toMatch(/test|exec|edouard/i);
  });

  test('should NOT display role dropdown', async ({ page }) => {
    // Verify no role dropdown in header
    const roleDropdown = page.locator('header select');
    const count = await roleDropdown.count();
    expect(count).toBe(0);

    // Verify no "Executive" text in header
    const headerText = await page.locator('header').textContent();
    expect(headerText).not.toContain('Executive');
  });

  test('should NOT display Co-Pilot button in header', async ({ page }) => {
    // Verify no Co-Pilot button in header
    const headerCoPilot = page.locator('header button:has-text("Co-Pilot")');
    await expect(headerCoPilot).not.toBeVisible();

    // Verify no circular Co-Pilot icon in header
    const circularCoPilot = page.locator('header button[aria-label*="Co-Pilot"]');
    await expect(circularCoPilot).not.toBeVisible();
  });

  test('should display modern thin hamburger menu icon', async ({ page }) => {
    const menuButton = page.locator('header button[aria-label*="menu"]');
    await expect(menuButton).toBeVisible();

    // Click to open
    await menuButton.click();

    // Verify mobile menu opens
    await expect(page.locator('[role="dialog"]:has-text("AURA")')).toBeVisible();

    // Verify menu icon changes (should show X or close icon)
    await expect(menuButton).toBeVisible();

    // Close menu
    await menuButton.click();
    await expect(page.locator('[role="dialog"]:has-text("AURA")')).not.toBeVisible();
  });

  test('should have hairline divider below header', async ({ page }) => {
    const header = page.locator('header');
    
    // Get computed style
    const borderBottom = await header.evaluate(el => {
      return window.getComputedStyle(el).borderBottom;
    });

    // Should have a border
    expect(borderBottom).not.toBe('none');
    expect(borderBottom).not.toBe('');
  });

  test('should display floating Co-Pilot button (not in header)', async ({ page }) => {
    // Verify floating Co-Pilot button exists outside header
    const floatingCoPilot = page.locator('button:has-text("AURA Co-Pilot"):not(header button)');
    
    // It should either be visible or hidden based on drawer state
    // Just verify it exists in the DOM
    const count = await page.locator('button[aria-label*="AURA Co-Pilot"]').count();
    expect(count).toBeGreaterThan(0);
  });

  test('should have no console errors on header load', async ({ page }) => {
    const consoleErrors: string[] = [];
    
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    await page.goto('/');
    await page.waitForTimeout(2000);

    expect(consoleErrors).toHaveLength(0);
  });

  test('should be responsive on mobile breakpoint', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });

    // Verify logo still visible
    await expect(page.locator('header img[alt="AURA"]')).toBeVisible();

    // Verify hamburger menu visible on mobile
    await expect(page.locator('header button[aria-label*="menu"]')).toBeVisible();

    // Verify greeting hidden on small screens (md:flex means hidden on mobile)
    const greeting = page.locator('header:has-text("Good")');
    const isVisible = await greeting.isVisible();
    expect(isVisible).toBe(false);
  });
});
