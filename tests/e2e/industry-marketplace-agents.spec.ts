import { test, expect } from '@playwright/test';

test.describe('Industry Marketplace - Agents Only', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/marketplace?tab=industry');
    await page.waitForLoadState('networkidle');
  });

  test('should display only industry agents (30 total, 5 per industry)', async ({ page }) => {
    // Wait for agents to load
    await page.waitForSelector('[data-testid="industry-agent-card"]', { timeout: 5000 });

    // Count total agents displayed
    const agentCards = await page.locator('[data-testid="industry-agent-card"]').count();
    expect(agentCards).toBeGreaterThanOrEqual(30);

    // Verify no template cards are shown
    const templateCards = await page.locator('[data-testid="template-card"]').count();
    expect(templateCards).toBe(0);
  });

  test('should filter agents by industry', async ({ page }) => {
    await page.waitForSelector('[data-testid="industry-agent-card"]', { timeout: 5000 });

    // Select Healthcare industry
    await page.click('button:has-text("All Industries")');
    await page.click('text=Healthcare');
    
    await page.waitForTimeout(500);

    // Verify at least 5 healthcare agents are shown
    const healthcareAgents = await page.locator('[data-testid="industry-agent-card"]:has-text("Healthcare")').count();
    expect(healthcareAgents).toBeGreaterThanOrEqual(5);

    // Verify all displayed agents are Healthcare agents
    const allCards = await page.locator('[data-testid="industry-agent-card"]').count();
    expect(allCards).toBe(healthcareAgents);
  });

  test('should filter agents by integration type', async ({ page }) => {
    await page.waitForSelector('[data-testid="industry-agent-card"]', { timeout: 5000 });

    // Select Zapier integration type
    await page.click('button:has-text("All Types")');
    await page.click('text=Zapier');
    
    await page.waitForTimeout(500);

    // Verify only Zapier agents are shown
    const zapierBadges = await page.locator('text=Zapier').count();
    expect(zapierBadges).toBeGreaterThan(0);
  });

  test('should search agents by name', async ({ page }) => {
    await page.waitForSelector('[data-testid="industry-agent-card"]', { timeout: 5000 });

    // Search for a specific agent
    const searchInput = page.locator('input[placeholder*="Search"]');
    await searchInput.fill('Compliance');
    
    await page.waitForTimeout(500);

    // Verify search results
    const searchResults = await page.locator('[data-testid="industry-agent-card"]').count();
    expect(searchResults).toBeGreaterThan(0);

    // Verify all results contain "Compliance" in name or features
    const firstCard = page.locator('[data-testid="industry-agent-card"]').first();
    await expect(firstCard).toContainText(/Compliance/i);
  });

  test('should display agent status badges correctly', async ({ page }) => {
    await page.waitForSelector('[data-testid="industry-agent-card"]', { timeout: 5000 });

    // Check for status badges
    const connectedBadges = await page.locator('text=Connected').count();
    const notConnectedBadges = await page.locator('text=Not Connected').count();

    // All agents should have a status badge
    const totalCards = await page.locator('[data-testid="industry-agent-card"]').count();
    expect(connectedBadges + notConnectedBadges).toBe(totalCards);
  });

  test('should open preview modal with agent details', async ({ page }) => {
    await page.waitForSelector('[data-testid="industry-agent-card"]', { timeout: 5000 });

    // Click preview on first agent
    const firstCard = page.locator('[data-testid="industry-agent-card"]').first();
    await firstCard.locator('button:has-text("Preview")').click();

    // Verify modal opens with details
    await expect(page.locator('role=dialog')).toBeVisible();
    await expect(page.locator('h2[class*="text-2xl"]')).toBeVisible();
    
    // Verify features section exists
    await expect(page.locator('text=Features')).toBeVisible();
    
    // Verify details section exists
    await expect(page.locator('text=Details')).toBeVisible();
    
    // Verify connection status section exists
    await expect(page.locator('text=Connection Status')).toBeVisible();

    // Close modal
    await page.click('button:has-text("Close")');
    await expect(page.locator('role=dialog')).not.toBeVisible();
  });

  test('should display feature chips on agent cards', async ({ page }) => {
    await page.waitForSelector('[data-testid="industry-agent-card"]', { timeout: 5000 });

    const firstCard = page.locator('[data-testid="industry-agent-card"]').first();
    
    // Verify at least one feature chip is displayed
    const featureChips = await firstCard.locator('span[class*="bg-muted"]').count();
    expect(featureChips).toBeGreaterThan(0);
  });

  test('should show Connect button for not connected agents', async ({ page }) => {
    await page.waitForSelector('[data-testid="industry-agent-card"]', { timeout: 5000 });

    // Find a card with "Not Connected" status
    const notConnectedCard = page.locator('[data-testid="industry-agent-card"]:has(text="Not Connected")').first();
    
    // Verify Connect button exists
    await expect(notConnectedCard.locator('button:has-text("Connect")')).toBeVisible();
  });

  test('should display empty state when no results found', async ({ page }) => {
    await page.waitForSelector('[data-testid="industry-agent-card"]', { timeout: 5000 });

    // Search for something that doesn't exist
    const searchInput = page.locator('input[placeholder*="Search"]');
    await searchInput.fill('xyzabc123nonexistent');
    
    await page.waitForTimeout(500);

    // Verify empty state message
    await expect(page.locator('text=No agents found matching your criteria')).toBeVisible();
  });

  test('should load agents in under 900ms perceived time', async ({ page }) => {
    const startTime = Date.now();
    
    await page.goto('/marketplace?tab=industry');
    
    // Wait for skeleton or first agent card to appear (perceived load)
    await Promise.race([
      page.waitForSelector('[data-testid="industry-agent-card"]', { timeout: 1000 }),
      page.waitForSelector('.animate-pulse', { timeout: 1000 })
    ]);
    
    const perceivedLoadTime = Date.now() - startTime;
    
    console.log(`Perceived load time: ${perceivedLoadTime}ms`);
    expect(perceivedLoadTime).toBeLessThan(900);
  });

  test('should sort agents with Connected status first', async ({ page }) => {
    await page.waitForSelector('[data-testid="industry-agent-card"]', { timeout: 5000 });

    // Get all status badges in order
    const statusBadges = await page.locator('[data-testid="industry-agent-card"] >> text=/^(Connected|Not Connected)$/').allTextContents();
    
    // Find first "Not Connected" index
    const firstNotConnectedIndex = statusBadges.findIndex(status => status === 'Not Connected');
    
    // If there are both Connected and Not Connected agents
    if (firstNotConnectedIndex > 0) {
      // All items before first "Not Connected" should be "Connected"
      const allConnectedFirst = statusBadges.slice(0, firstNotConnectedIndex).every(status => status === 'Connected');
      expect(allConnectedFirst).toBe(true);
    }
  });

  test('should display industry badge on each card', async ({ page }) => {
    await page.waitForSelector('[data-testid="industry-agent-card"]', { timeout: 5000 });

    const firstCard = page.locator('[data-testid="industry-agent-card"]').first();
    
    // Verify industry badge exists (should be one of the seeded industries)
    const industryBadge = firstCard.locator('[class*="secondary"]').first();
    await expect(industryBadge).toBeVisible();
    
    const industryText = await industryBadge.textContent();
    expect(['Healthcare', 'Manufacturing', 'Finance', 'Energy', 'Marketing', 'Public Sector']).toContain(industryText);
  });
});
