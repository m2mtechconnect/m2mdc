import { test, expect } from '@playwright/test';

/**
 * E2E tests for Digital Twin Recommendations filtering
 * Verifies that enterprise retail companies receive only operational recommendations
 */

test.describe('Recommendations Filtering - Enterprise Retail', () => {
  const WALMART_URL = 'walmart.com';
  const TARGET_URL = 'target.com';
  
  test('walmart.com should show only operational digital twins', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Enter Walmart URL
    const urlInput = page.locator('input[type="url"], input[placeholder*="website"]').first();
    await expect(urlInput).toBeVisible({ timeout: 10000 });
    await urlInput.fill(WALMART_URL);
    
    // Trigger scan
    const scanButton = page.locator('button:has-text("Scan"), button:has-text("Analyze")').first();
    await scanButton.click();
    
    // Wait for recommendations to load
    await expect(page.getByText(/Top \d+ Digital Twin Blueprints/i).first()).toBeVisible({ timeout: 60000 });
    
    // Verify page title mentions Walmart
    const pageTitle = await page.locator('h1, h2').first().textContent();
    expect(pageTitle).toMatch(/walmart/i);
    
    // Get all recommendation cards
    const cards = page.locator('[data-testid="recommendation-card"], .recommendation-card, [class*="Card"]').filter({
      has: page.locator('h3, h4'),
    });
    
    const cardCount = await cards.count();
    expect(cardCount).toBeGreaterThanOrEqual(3);
    
    // Check each card
    for (let i = 0; i < Math.min(cardCount, 3); i++) {
      const card = cards.nth(i);
      const cardTitle = await card.locator('h3, h4').first().textContent() || '';
      const cardDescription = await card.locator('p').first().textContent() || '';
      const fullText = `${cardTitle} ${cardDescription}`.toLowerCase();
      
      console.log(`[Test] Card ${i + 1} title:`, cardTitle);
      
      // Assert: Should contain "Digital Twin" or operational keywords
      const hasDigitalTwin = /digital twin/i.test(cardTitle);
      const hasOperationalKeywords = 
        /supply chain|inventory|warehouse|distribution|store operations|workforce|logistics|last mile|loss prevention|forecasting|sustainability/i.test(fullText);
      
      expect(hasDigitalTwin || hasOperationalKeywords).toBe(true);
      
      // Assert: Should NOT contain banned personalization terms
      const bannedTerms = [
        'customer personalization',
        'personalized shopping',
        'marketing personalization',
        'loyalty optimization',
        'customer journey',
        'journey mapping',
        'promotional optimization',
      ];
      
      bannedTerms.forEach(term => {
        expect(fullText).not.toContain(term.toLowerCase());
      });
    }
  });

  test('walmart.com should show operational filter chips', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    const urlInput = page.locator('input[type="url"]').first();
    await urlInput.fill(WALMART_URL);
    
    const scanButton = page.locator('button:has-text("Scan")').first();
    await scanButton.click();
    
    await expect(page.getByText(/Top \d+ Digital Twin Blueprints/i).first()).toBeVisible({ timeout: 60000 });
    
    // Check for operational filter chips
    const operationalChips = [
      'Supply Chain & Inventory',
      'Store Operations & Workforce',
      'Logistics & Last Mile',
      'Risk & Loss Prevention',
      'ESG & Sustainability',
      'Funding Eligible',
    ];
    
    // At least some operational chips should be visible
    let foundOperationalChip = false;
    
    for (const chipText of operationalChips) {
      const chip = page.getByRole('button', { name: new RegExp(chipText, 'i') });
      if (await chip.isVisible()) {
        foundOperationalChip = true;
        console.log(`[Test] Found operational chip: ${chipText}`);
      }
    }
    
    expect(foundOperationalChip).toBe(true);
    
    // Should NOT show generic personalization chips
    const bannedChips = ['Personalization', 'Marketing', 'Customer Experience'];
    
    for (const chipText of bannedChips) {
      const chip = page.getByRole('button', { name: new RegExp(chipText, 'i') });
      const isVisible = await chip.isVisible().catch(() => false);
      expect(isVisible).toBe(false);
    }
  });

  test('target.com should also show operational twins', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    const urlInput = page.locator('input[type="url"]').first();
    await urlInput.fill(TARGET_URL);
    
    const scanButton = page.locator('button:has-text("Scan")').first();
    await scanButton.click();
    
    await expect(page.getByText(/Top \d+ Digital Twin Blueprints/i).first()).toBeVisible({ timeout: 60000 });
    
    // Get top 3 cards
    const cards = page.locator('[data-testid="recommendation-card"], .recommendation-card').filter({
      has: page.locator('h3, h4'),
    });
    
    const cardCount = await cards.count();
    expect(cardCount).toBeGreaterThanOrEqual(3);
    
    // All top 3 should be operational
    for (let i = 0; i < Math.min(cardCount, 3); i++) {
      const card = cards.nth(i);
      const cardTitle = await card.locator('h3, h4').first().textContent() || '';
      
      // Should mention operations, supply chain, logistics, etc.
      const isOperational = 
        /supply chain|inventory|warehouse|store operations|workforce|logistics|last mile|distribution/i.test(cardTitle);
      
      expect(isOperational).toBe(true);
    }
  });

  test('filter chips should filter recommendations correctly', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    const urlInput = page.locator('input[type="url"]').first();
    await urlInput.fill(WALMART_URL);
    
    const scanButton = page.locator('button:has-text("Scan")').first();
    await scanButton.click();
    
    await expect(page.getByText(/Top \d+ Digital Twin Blueprints/i).first()).toBeVisible({ timeout: 60000 });
    
    // Click on "Supply Chain & Inventory" chip if visible
    const supplyChainChip = page.getByRole('button', { name: /Supply Chain & Inventory/i });
    
    if (await supplyChainChip.isVisible()) {
      await supplyChainChip.click();
      
      // Wait for filter to apply
      await page.waitForTimeout(1000);
      
      // All visible cards should now be related to supply chain
      const cards = page.locator('[data-testid="recommendation-card"], .recommendation-card').filter({
        has: page.locator('h3, h4'),
      });
      
      const cardCount = await cards.count();
      
      for (let i = 0; i < cardCount; i++) {
        const card = cards.nth(i);
        const cardText = await card.textContent() || '';
        
        // Should mention supply chain or inventory
        expect(cardText.toLowerCase()).toMatch(/supply chain|inventory|replenishment|forecasting|distribution/);
      }
    }
  });
});

test.describe('Recommendations Filtering - Non-Retail', () => {
  const SAP_URL = 'sap.com';
  
  test('sap.com should show ERP/finance/supply chain twins', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    const urlInput = page.locator('input[type="url"]').first();
    await urlInput.fill(SAP_URL);
    
    const scanButton = page.locator('button:has-text("Scan")').first();
    await scanButton.click();
    
    await expect(page.getByText(/Top \d+ Digital Twin Blueprints/i).first()).toBeVisible({ timeout: 60000 });
    
    // Get top 3 cards
    const cards = page.locator('[data-testid="recommendation-card"], .recommendation-card').filter({
      has: page.locator('h3, h4'),
    });
    
    const cardCount = await cards.count();
    expect(cardCount).toBeGreaterThanOrEqual(3);
    
    // At least 2 of 3 should be ERP/finance/supply-chain focused
    let erpCount = 0;
    
    for (let i = 0; i < Math.min(cardCount, 3); i++) {
      const card = cards.nth(i);
      const cardText = await card.textContent() || '';
      
      if (/procurement|spend|supply chain|finance|fp&a|erp/i.test(cardText)) {
        erpCount++;
      }
    }
    
    expect(erpCount).toBeGreaterThanOrEqual(2);
  });
});

test.describe('Recommendations Content Validation', () => {
  test('recommendation cards should have complete digital twin structure', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    const urlInput = page.locator('input[type="url"]').first();
    await urlInput.fill('walmart.com');
    
    const scanButton = page.locator('button:has-text("Scan")').first();
    await scanButton.click();
    
    await expect(page.getByText(/Top \d+ Digital Twin Blueprints/i).first()).toBeVisible({ timeout: 60000 });
    
    // Get first recommendation card
    const firstCard = page.locator('[data-testid="recommendation-card"], .recommendation-card').filter({
      has: page.locator('h3, h4'),
    }).first();
    
    await expect(firstCard).toBeVisible();
    
    // Should have title
    const title = await firstCard.locator('h3, h4').first().textContent();
    expect(title).toBeTruthy();
    expect(title!.length).toBeGreaterThan(10);
    
    // Should have description
    const description = await firstCard.locator('p').first().textContent();
    expect(description).toBeTruthy();
    expect(description!.length).toBeGreaterThan(20);
    
    // Should have impact/effort badges
    const badges = firstCard.locator('[class*="badge"], [class*="Badge"]');
    const badgeCount = await badges.count();
    expect(badgeCount).toBeGreaterThan(0);
    
    // Should have "Create Agent" or similar action button
    const actionButton = firstCard.locator('button:has-text("Create"), button:has-text("Build")');
    await expect(actionButton).toBeVisible();
  });
});
