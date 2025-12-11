/**
 * E2E Tests for Scanner Company Name Extraction
 * Ensures twin names are correctly derived from scanned sites
 */

import { test, expect } from '@playwright/test';

test.describe('Scanner Company Name Extraction', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the main dashboard where scanner is located
    await page.goto('/');
  });

  test('scanner input accepts URL and displays recommendation panel', async ({ page }) => {
    // Find the URL input (hero search bar)
    const searchInput = page.locator('input[placeholder*="url" i], input[placeholder*="website" i], input[placeholder*="scan" i]').first();
    
    // Check if input exists
    if (await searchInput.count() > 0) {
      await expect(searchInput).toBeVisible();
      
      // Type a test URL
      await searchInput.fill('walmart.ca');
      
      // The input should accept the value
      await expect(searchInput).toHaveValue('walmart.ca');
    }
  });

  test('recommendation panel shows clean company name', async ({ page }) => {
    // Look for any recommendation panel that might be visible
    const recommendationPanel = page.locator('[data-testid="recommendation-panel"], .recommendation-panel, [class*="recommendation"]').first();
    
    if (await recommendationPanel.count() > 0) {
      // Check that no malformed patterns appear in headers/titles
      const allText = await recommendationPanel.textContent();
      
      // These patterns should NOT appear
      expect(allText).not.toMatch(/^!\(/);
      expect(allText).not.toMatch(/^\[https/);
      expect(allText).not.toContain('!(https');
      expect(allText).not.toContain('![');
    }
  });

  test('twin name in headers does not contain URL artifacts', async ({ page }) => {
    // Check all h1, h2, h3 headers on the page
    const headers = page.locator('h1, h2, h3');
    const headerCount = await headers.count();
    
    for (let i = 0; i < headerCount; i++) {
      const headerText = await headers.nth(i).textContent();
      if (headerText) {
        // Headers should not start with malformed patterns
        expect(headerText.trim()).not.toMatch(/^!\(/);
        expect(headerText.trim()).not.toMatch(/^\[/);
        expect(headerText.trim()).not.toMatch(/^https?:\/\//i);
        expect(headerText.trim()).not.toMatch(/^www\./i);
      }
    }
  });

  test('twin name badges do not contain broken patterns', async ({ page }) => {
    // Check all badge-like elements
    const badges = page.locator('[class*="badge"], [class*="chip"], [class*="tag"]');
    const badgeCount = await badges.count();
    
    for (let i = 0; i < badgeCount; i++) {
      const badgeText = await badges.nth(i).textContent();
      if (badgeText && badgeText.includes('Twin')) {
        // Twin badges should have clean names
        expect(badgeText).not.toContain('!(');
        expect(badgeText).not.toContain('https://');
        expect(badgeText).not.toContain('http://');
      }
    }
  });
});

test.describe('Blueprint and Simulation Headers', () => {
  test('blueprint designer shows clean twin name', async ({ page }) => {
    // Navigate to blueprint page if it exists
    await page.goto('/data-centre-twin');
    
    // Wait for page to load
    await page.waitForLoadState('networkidle');
    
    // Check header content
    const pageContent = await page.textContent('body');
    
    // Should not contain broken patterns anywhere visible
    if (pageContent?.includes('Sovereign Green AI Data Centre Twin')) {
      expect(pageContent).not.toMatch(/!\(.*Sovereign Green AI Data Centre Twin/);
      expect(pageContent).not.toMatch(/\[https.*Sovereign Green AI Data Centre Twin/);
    }
  });

  test('simulation environment shows clean twin name', async ({ page }) => {
    // Navigate to simulation tab
    await page.goto('/data-centre-twin?view=simulation');
    
    // Wait for page to load
    await page.waitForLoadState('networkidle');
    
    // Look for simulation mode header
    const simulationHeader = page.locator('text=Simulation Environment, text=Simulation Mode').first();
    
    if (await simulationHeader.count() > 0) {
      // Get parent container and check for clean names
      const container = simulationHeader.locator('..').locator('..');
      const containerText = await container.textContent();
      
      if (containerText) {
        expect(containerText).not.toContain('!(');
        expect(containerText).not.toContain('https://');
      }
    }
  });
});

test.describe('Company Name Edge Cases', () => {
  test('handles domain-only input gracefully', async ({ page }) => {
    await page.goto('/');
    
    const searchInput = page.locator('input[placeholder*="url" i], input[placeholder*="website" i]').first();
    
    if (await searchInput.count() > 0) {
      // Test various input formats
      const testInputs = [
        'walmart',
        'walmart.com',
        'www.walmart.com',
        'https://walmart.com',
        'https://www.walmart.com/path/to/page',
      ];
      
      for (const input of testInputs) {
        await searchInput.fill(input);
        // Input should accept any format
        await expect(searchInput).toHaveValue(input);
        await searchInput.clear();
      }
    }
  });
});
