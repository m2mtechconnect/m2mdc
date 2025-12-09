/**
 * AURA Dashboard Hero Message Tests
 * 
 * Validates the updated hero messaging:
 * - "Welcome to AURA"
 * - "Where ideas become intelligent twins."
 * - No old "Your Digital Twin Studio" messaging
 */

import { test, expect } from '@playwright/test';
import { login } from '../helpers/auth';

test.describe('AURA Dashboard Hero @regression @smoke', () => {
  test.beforeEach(async ({ page }) => {
    await login(page, 'test_exec@aura.dev', 'TestPassword123!');
    await page.waitForURL('/');
  });

  test('should display new hero heading', async ({ page }) => {
    const heading = page.locator('h1:has-text("Welcome to AURA")');
    await expect(heading).toBeVisible();

    // Verify it has gradient styling
    const hasGradient = await heading.evaluate(el => {
      return window.getComputedStyle(el).background.includes('gradient') ||
             el.classList.contains('gradient') ||
             el.classList.contains('text-gradient-hero');
    });
    
    expect(hasGradient).toBe(true);
  });

  test('should display new tagline', async ({ page }) => {
    const tagline = page.locator('text=Powering enterprise-grade digital twins and autonomous AI agents.');
    await expect(tagline).toBeVisible();
  });

  test('should NOT display old messaging', async ({ page }) => {
    // Old "Your Digital Twin Studio" should be gone
    await expect(page.locator('h2:has-text("Your Digital Twin Studio")')).not.toBeVisible();

    // Old tagline should be gone
    await expect(page.locator('text=Turn your data, processes, and workflows into operational')).not.toBeVisible();
  });

  test('should have proper hierarchy: h1 for Welcome, p for tagline', async ({ page }) => {
    // Welcome should be h1
    await expect(page.locator('h1:has-text("Welcome to AURA")')).toBeVisible();

    // Tagline should be in a p tag
    await expect(page.locator('p:has-text("Powering enterprise-grade digital twins and autonomous AI agents")')).toBeVisible();
  });

  test('should be centered on page', async ({ page }) => {
    const heroSection = page.locator('h1:has-text("Welcome to AURA")').locator('..');
    
    const hasTextCenter = await heroSection.evaluate(el => {
      return window.getComputedStyle(el).textAlign === 'center' ||
             el.classList.contains('text-center');
    });

    expect(hasTextCenter).toBe(true);
  });

  test('should display Co-Pilot command bar below hero', async ({ page }) => {
    // Verify command bar exists
    const commandBar = page.locator('input[placeholder*="Co-Pilot"]');
    await expect(commandBar).toBeVisible();

    // Verify it's positioned after the hero section
    const heroBox = await page.locator('h1:has-text("Welcome to AURA")').boundingBox();
    const barBox = await commandBar.boundingBox();

    expect(heroBox).toBeTruthy();
    expect(barBox).toBeTruthy();
    expect(barBox!.y).toBeGreaterThan(heroBox!.y);
  });

  test('should have consistent spacing and typography', async ({ page }) => {
    const heading = page.locator('h1:has-text("Welcome to AURA")');
    const tagline = page.locator('p:has-text("Powering enterprise-grade digital twins and autonomous AI agents")');

    // Both should be visible and have proper spacing
    await expect(heading).toBeVisible();
    await expect(tagline).toBeVisible();

    // Verify spacing between them
    const headingBox = await heading.boundingBox();
    const taglineBox = await tagline.boundingBox();

    expect(headingBox).toBeTruthy();
    expect(taglineBox).toBeTruthy();

    // Tagline should be below heading with some spacing
    const gap = taglineBox!.y - (headingBox!.y + headingBox!.height);
    expect(gap).toBeGreaterThan(0);
    expect(gap).toBeLessThan(100); // But not too much spacing
  });
});
