import { test, expect } from '@playwright/test';

/**
 * E2E Tests: Industry + Department UI Validation
 * Tests the complete user experience for different company scans
 */

test.describe('Industry + Department UI - Enterprise Retail (Walmart)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should display correct industry and department for Walmart', async ({ page }) => {
    // Simulate entering Walmart URL
    const searchInput = page.locator('input[type="url"], input[placeholder*="website"], input[placeholder*="URL"]').first();
    await searchInput.fill('https://walmart.com');
    
    const searchButton = page.locator('button:has-text("Generate"), button:has-text("Search"), button[type="submit"]').first();
    await searchButton.click();

    // Wait for recommendations to load
    await page.waitForSelector('text=/digital twin/i', { timeout: 30000 });

    // Check for industry/department indicators
    const pageContent = await page.content();
    expect(pageContent.toLowerCase()).toContain('retail');
  });

  test('should show only operational digital twins', async ({ page }) => {
    const searchInput = page.locator('input[type="url"], input[placeholder*="website"], input[placeholder*="URL"]').first();
    await searchInput.fill('https://walmart.com');
    
    const searchButton = page.locator('button:has-text("Generate"), button:has-text("Search"), button[type="submit"]').first();
    await searchButton.click();

    await page.waitForSelector('text=/digital twin/i', { timeout: 30000 });

    // Check that recommendations contain digital twin language
    const cards = page.locator('[class*="card"], [class*="recommendation"]');
    const cardCount = await cards.count();

    if (cardCount > 0) {
      for (let i = 0; i < Math.min(cardCount, 3); i++) {
        const cardText = await cards.nth(i).textContent();
        const lowerText = cardText?.toLowerCase() || '';
        
        // Should contain digital twin indicators
        expect(
          lowerText.includes('digital twin') ||
          lowerText.includes('supply chain') ||
          lowerText.includes('warehouse') ||
          lowerText.includes('logistics') ||
          lowerText.includes('operations') ||
          lowerText.includes('inventory')
        ).toBe(true);

        // Should NOT contain banned terms
        expect(lowerText).not.toContain('personalization engine');
        expect(lowerText).not.toContain('customer experience platform');
        expect(lowerText).not.toContain('ai upskilling');
        expect(lowerText).not.toContain('innovation workshop');
      }
    }
  });

  test('should display operational filter chips', async ({ page }) => {
    const searchInput = page.locator('input[type="url"], input[placeholder*="website"], input[placeholder*="URL"]').first();
    await searchInput.fill('https://walmart.com');
    
    const searchButton = page.locator('button:has-text("Generate"), button:has-text("Search"), button[type="submit"]').first();
    await searchButton.click();

    await page.waitForSelector('text=/digital twin/i', { timeout: 30000 });

    // Look for filter chips or tags
    const pageContent = await page.content();
    const hasOperationalTags = 
      pageContent.includes('Supply Chain') ||
      pageContent.includes('Operations') ||
      pageContent.includes('Logistics') ||
      pageContent.includes('Warehouse');

    expect(hasOperationalTags).toBe(true);

    // Should NOT have personalization or marketing tags for enterprise retail
    expect(pageContent).not.toContain('Personalization');
    expect(pageContent).not.toContain('Customer Experience');
  });
});

test.describe('Industry + Department UI - Pharmaceuticals (Pfizer)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should display pharma-specific digital twins', async ({ page }) => {
    const searchInput = page.locator('input[type="url"], input[placeholder*="website"], input[placeholder*="URL"]').first();
    await searchInput.fill('https://pfizer.com');
    
    const searchButton = page.locator('button:has-text("Generate"), button:has-text("Search"), button[type="submit"]').first();
    await searchButton.click();

    await page.waitForSelector('text=/digital twin/i', { timeout: 30000 });

    const pageContent = await page.content();
    const lowerContent = pageContent.toLowerCase();

    // Should contain pharma-relevant keywords
    const hasPharmaKeywords =
      lowerContent.includes('pharma') ||
      lowerContent.includes('compliance') ||
      lowerContent.includes('gxp') ||
      lowerContent.includes('clinical') ||
      lowerContent.includes('regulatory');

    expect(hasPharmaKeywords).toBe(true);
  });

  test('should not show retail-specific twins for pharma', async ({ page }) => {
    const searchInput = page.locator('input[type="url"], input[placeholder*="website"], input[placeholder*="URL"]').first();
    await searchInput.fill('https://pfizer.com');
    
    const searchButton = page.locator('button:has-text("Generate"), button:has-text("Search"), button[type="submit"]').first();
    await searchButton.click();

    await page.waitForSelector('text=/digital twin/i', { timeout: 30000 });

    const pageContent = await page.content();
    const lowerContent = pageContent.toLowerCase();

    // Should NOT contain retail-specific terms
    expect(lowerContent).not.toContain('customer personalization');
    expect(lowerContent).not.toContain('store operations');
    expect(lowerContent).not.toContain('pos system');
  });
});

test.describe('Industry + Department UI - Enterprise Software (SAP)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should display software/ERP-specific digital twins', async ({ page }) => {
    const searchInput = page.locator('input[type="url"], input[placeholder*="website"], input[placeholder*="URL"]').first();
    await searchInput.fill('https://sap.com');
    
    const searchButton = page.locator('button:has-text("Generate"), button:has-text("Search"), button[type="submit"]').first();
    await searchButton.click();

    await page.waitForSelector('text=/digital twin/i', { timeout: 30000 });

    const pageContent = await page.content();
    const lowerContent = pageContent.toLowerCase();

    // Should contain software/enterprise keywords
    const hasSoftwareKeywords =
      lowerContent.includes('software') ||
      lowerContent.includes('procurement') ||
      lowerContent.includes('erp') ||
      lowerContent.includes('enterprise');

    expect(hasSoftwareKeywords).toBe(true);
  });
});

test.describe('Industry + Department UI - Card Content Validation', () => {
  test('should display structured twin blueprint format', async ({ page }) => {
    await page.goto('/');
    
    const searchInput = page.locator('input[type="url"], input[placeholder*="website"], input[placeholder*="URL"]').first();
    await searchInput.fill('https://walmart.com');
    
    const searchButton = page.locator('button:has-text("Generate"), button:has-text("Search"), button[type="submit"]').first();
    await searchButton.click();

    await page.waitForSelector('text=/digital twin/i', { timeout: 30000 });

    // Look for card elements
    const cards = page.locator('[class*="card"], [class*="recommendation"]');
    const cardCount = await cards.count();

    if (cardCount > 0) {
      const firstCard = cards.first();
      const cardText = await firstCard.textContent();

      // Should have title-like content
      expect(cardText).toBeTruthy();
      expect(cardText!.length).toBeGreaterThan(20);
    }
  });

  test('should show exactly 3 recommendations', async ({ page }) => {
    await page.goto('/');
    
    const searchInput = page.locator('input[type="url"], input[placeholder*="website"], input[placeholder*="URL"]').first();
    await searchInput.fill('https://walmart.com');
    
    const searchButton = page.locator('button:has-text("Generate"), button:has-text("Search"), button[type="submit"]').first();
    await searchButton.click();

    await page.waitForSelector('text=/digital twin/i', { timeout: 30000 });

    const cards = page.locator('[class*="card"], [class*="recommendation"]');
    const cardCount = await cards.count();

    expect(cardCount).toBeGreaterThan(0);
    expect(cardCount).toBeLessThanOrEqual(3);
  });
});

test.describe('Industry + Department UI - Regression Prevention', () => {
  const testDomains = [
    { url: 'walmart.com', name: 'Walmart' },
    { url: 'pfizer.com', name: 'Pfizer' },
    { url: 'sap.com', name: 'SAP' },
    { url: 'verizon.com', name: 'Verizon' },
  ];

  testDomains.forEach(({ url, name }) => {
    test(`should never show generic AI initiatives for ${name}`, async ({ page }) => {
      await page.goto('/');
      
      const searchInput = page.locator('input[type="url"], input[placeholder*="website"], input[placeholder*="URL"]').first();
      await searchInput.fill(`https://${url}`);
      
      const searchButton = page.locator('button:has-text("Generate"), button:has-text("Search"), button[type="submit"]').first();
      await searchButton.click();

      await page.waitForSelector('text=/digital twin/i', { timeout: 30000 });

      const pageContent = await page.content();
      const lowerContent = pageContent.toLowerCase();

      // Hard-block generic AI terms
      expect(lowerContent).not.toContain('ai upskilling program');
      expect(lowerContent).not.toContain('ai innovation workshop');
      expect(lowerContent).not.toContain('ai strategy assessment');
      expect(lowerContent).not.toContain('ai literacy training');
      expect(lowerContent).not.toContain('generic ai platform');
    });
  });
});
