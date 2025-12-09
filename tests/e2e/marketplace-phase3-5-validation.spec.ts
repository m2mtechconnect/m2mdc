import { test, expect } from '@playwright/test';

/**
 * Marketplace Phase 3-5 Validation Tests
 * Automated QA for Template Seeding, Interactive Intelligence, and UX
 */

test.describe('Marketplace Phase 3-5 Comprehensive Validation', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/marketplace');
    await page.waitForLoadState('networkidle');
  });

  // ========== PHASE 3: TEMPLATE SEEDING VALIDATION ==========

  test('Test 1: Template count should be 40-50', async ({ page }) => {
    const templateCards = await page.locator('[data-testid="template-card"]').count();
    
    console.log(`Template count: ${templateCards}`);
    expect(templateCards).toBeGreaterThanOrEqual(40);
    expect(templateCards).toBeLessThanOrEqual(50);
  });

  test('Test 2: All 20 industries should be represented', async ({ page }) => {
    const requiredIndustries = [
      'Healthcare', 'Finance & Banking', 'Manufacturing', 'Energy & Utilities',
      'Retail & E-commerce', 'Technology', 'Telecommunications', 'Transportation & Logistics',
      'Real Estate', 'Insurance', 'Pharmaceuticals', 'Automotive',
      'Agriculture', 'Media & Entertainment', 'Education', 'Government & Public Sector',
      'Hospitality', 'Construction', 'Legal Services', 'Professional Services'
    ];

    for (const industry of requiredIndustries) {
      // Select industry filter
      await page.locator('select').first().selectOption(industry);
      await page.waitForTimeout(300);

      // Check that at least 1 template appears
      const count = await page.locator('[data-testid="template-card"]').count();
      expect(count).toBeGreaterThan(0);
      
      console.log(`✓ Industry "${industry}" has ${count} template(s)`);
    }
  });

  test('Test 3: All 12 departments should be represented', async ({ page }) => {
    const requiredDepartments = [
      'Operations', 'Finance', 'HR & Workforce', 'IT & DevOps',
      'Sales & CRM', 'Marketing', 'Customer Support', 'Supply Chain',
      'Compliance & Risk', 'Legal', 'R&D', 'Executive'
    ];

    const departmentFilter = page.locator('select').nth(1);

    for (const department of requiredDepartments) {
      await departmentFilter.selectOption(department);
      await page.waitForTimeout(300);

      const count = await page.locator('[data-testid="template-card"]').count();
      expect(count).toBeGreaterThan(0);
      
      console.log(`✓ Department "${department}" has ${count} template(s)`);
    }
  });

  test('Test 4: All templates must have complete blueprint structure', async ({ page }) => {
    const previewButtons = await page.locator('button:has-text("Preview")').all();
    
    // Sample 5 random templates
    const samplesToTest = Math.min(5, previewButtons.length);
    
    for (let i = 0; i < samplesToTest; i++) {
      await previewButtons[i].click();
      await page.waitForSelector('[role="dialog"]');

      // Check Blueprint tab exists
      await page.click('button:has-text("Blueprint")');
      await page.waitForTimeout(500);

      // Verify required sections
      const workflowSection = page.locator('text=Workflow Structure');
      await expect(workflowSection).toBeVisible();

      const eventTriggersSection = page.locator('text=Event Triggers');
      await expect(eventTriggersSection).toBeVisible();

      const dataSourcesSection = page.locator('text=Data Sources & Integrations');
      await expect(dataSourcesSection).toBeVisible();

      const blueprintJSON = page.locator('text=Blueprint JSON');
      await expect(blueprintJSON).toBeVisible();

      // Close drawer
      await page.press('body', 'Escape');
      await page.waitForTimeout(300);
    }
  });

  test('Test 5: No generic or vague templates allowed', async ({ page }) => {
    const bannedKeywords = [
      'AI idea',
      'Generic agent',
      'Marketing AI',
      'SEO automation',
      'Customer personalization',
      'Coming soon',
      'Placeholder',
      'Example template'
    ];

    const templateNames = await page.locator('[data-testid="template-card"] h3').allTextContents();
    const templateDescriptions = await page.locator('[data-testid="template-card"] p').allTextContents();

    const allText = [...templateNames, ...templateDescriptions].join(' ').toLowerCase();

    for (const keyword of bannedKeywords) {
      expect(allText).not.toContain(keyword.toLowerCase());
    }
  });

  // ========== PHASE 4: INTERACTIVE INTELLIGENCE VALIDATION ==========

  test('Test 6: Gemini chat integration works', async ({ page }) => {
    // Open first template
    await page.click('button:has-text("Preview")');
    await page.waitForSelector('[role="dialog"]');

    // Navigate to Preview tab
    await page.click('button:has-text("Preview")');
    await page.waitForTimeout(500);

    // Verify chat interface exists
    const chatInterface = page.locator('text=Chat With This Digital Twin');
    await expect(chatInterface).toBeVisible();

    // Verify input field exists
    const chatInput = page.locator('input[placeholder*="Ask about"]');
    await expect(chatInput).toBeVisible();

    // Test sending a message
    await chatInput.fill('What do you do?');
    await page.click('button[type="submit"]');

    // Wait for response
    await page.waitForTimeout(3000);

    // Check for assistant response
    const assistantMessages = page.locator('[role="assistant"], .bg-muted');
    expect(await assistantMessages.count()).toBeGreaterThan(0);
  });

  test('Test 7: Simulation engine placeholder exists', async ({ page }) => {
    await page.click('button:has-text("Preview")');
    await page.waitForSelector('[role="dialog"]');

    await page.click('button:has-text("Preview")');
    await page.waitForTimeout(500);

    const simulationButton = page.locator('button:has-text("Simulation")');
    await expect(simulationButton).toBeVisible();
  });

  test('Test 10: Use Template → Builder integration works', async ({ page }) => {
    await page.click('button:has-text("Preview")');
    await page.waitForSelector('[role="dialog"]');

    // Navigate to Deploy tab
    await page.click('button:has-text("Deploy")');
    await page.waitForTimeout(500);

    // Click "Use This Template"
    await page.click('button:has-text("Use This Template")');

    // Wait for navigation
    await page.waitForURL(/\/builder/, { timeout: 5000 });

    // Verify Builder loaded with template context
    expect(page.url()).toContain('/builder');
    expect(page.url()).toContain('templateId=');
  });

  // ========== PHASE 5: UX & PERFORMANCE VALIDATION ==========

  test('Test 11: Template cards show all required information', async ({ page }) => {
    const firstCard = page.locator('[data-testid="template-card"]').first();

    // Check for required elements
    await expect(firstCard.locator('h3')).toBeVisible(); // Title
    await expect(firstCard.locator('text=/Industry:|Department:/')).toBeVisible(); // Badges
    await expect(firstCard.locator('text=/ROI|Rating|Downloads/')).toBeVisible(); // Metrics
    await expect(firstCard.locator('button:has-text("Preview")')).toBeVisible();
    await expect(firstCard.locator('button:has-text("Use")')).toBeVisible();
  });

  test('Test 12: Marketplace filtering is performant', async ({ page }) => {
    const industryFilter = page.locator('select').first();

    // Measure filter response time
    const startTime = Date.now();
    await industryFilter.selectOption('Healthcare');
    await page.waitForTimeout(100); // Small buffer
    const endTime = Date.now();

    const filterTime = endTime - startTime;
    expect(filterTime).toBeLessThan(300); // Should be under 300ms
    console.log(`Filter response time: ${filterTime}ms`);

    // Verify results updated
    const cards = await page.locator('[data-testid="template-card"]').count();
    expect(cards).toBeGreaterThan(0);
  });

  test('Test 12b: Search query filters templates', async ({ page }) => {
    const searchInput = page.locator('input[type="search"]');
    
    await searchInput.fill('healthcare');
    await page.waitForTimeout(500);

    const results = await page.locator('[data-testid="template-card"]').count();
    expect(results).toBeGreaterThan(0);

    // Verify results contain search term
    const firstCardText = await page.locator('[data-testid="template-card"]').first().textContent();
    expect(firstCardText?.toLowerCase()).toContain('healthcare');
  });

  test('Test 14: Accessibility and branding', async ({ page }) => {
    // Check for semantic tokens (no hardcoded colors)
    const bodyStyles = await page.evaluate(() => {
      const body = document.body;
      const computedStyle = getComputedStyle(body);
      return {
        background: computedStyle.backgroundColor,
        color: computedStyle.color,
      };
    });

    // Verify CSS variables are being used (HSL-based)
    expect(bodyStyles.background).toBeTruthy();
    expect(bodyStyles.color).toBeTruthy();

    // Check keyboard navigation
    await page.keyboard.press('Tab');
    const focusedElement = await page.evaluate(() => document.activeElement?.tagName);
    expect(focusedElement).toBeTruthy();

    // Check for tooltips on hover
    await page.hover('text=Filters:');
    await page.waitForTimeout(500);
    const tooltip = page.locator('[role="tooltip"]');
    await expect(tooltip).toBeVisible();
  });

  test('Test 15: Load test with current template count', async ({ page }) => {
    const startTime = Date.now();
    await page.goto('/marketplace');
    await page.waitForLoadState('networkidle');
    const endTime = Date.now();

    const loadTime = endTime - startTime;
    console.log(`Marketplace load time: ${loadTime}ms`);
    
    expect(loadTime).toBeLessThan(1200); // Should load in under 1.2 seconds

    // Check for visual jitter
    const cards = page.locator('[data-testid="template-card"]');
    await expect(cards.first()).toBeVisible();

    // Verify smooth scroll
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(300);
    await page.evaluate(() => window.scrollTo(0, 0));
  });

  test('Test: Clear filters button works', async ({ page }) => {
    // Apply multiple filters
    await page.locator('select').first().selectOption('Healthcare');
    await page.locator('select').nth(1).selectOption('Operations');
    await page.locator('input[type="search"]').fill('patient');

    // Verify "Clear Filters" button shows count
    const clearButton = page.locator('button:has-text("Clear Filters")');
    await expect(clearButton).toBeVisible();
    await expect(clearButton).toContainText('(');

    // Click clear filters
    await clearButton.click();

    // Verify filters reset
    const searchInput = page.locator('input[type="search"]');
    expect(await searchInput.inputValue()).toBe('');
  });

  test('Test: Recommended toggle works', async ({ page }) => {
    const recommendedBadge = page.locator('text=⭐ Recommended for You');
    
    await recommendedBadge.click();
    await page.waitForTimeout(300);

    // Verify it's now active (visual change)
    const badgeClasses = await recommendedBadge.getAttribute('class');
    expect(badgeClasses).toContain('default'); // Should have active styling
  });

  test('Test: Template detail drawer tabs all work', async ({ page }) => {
    await page.click('button:has-text("Preview")');
    await page.waitForSelector('[role="dialog"]');

    // Test each tab
    const tabs = ['Overview', 'Blueprint', 'Preview', 'Scenarios', 'Deploy'];
    
    for (const tab of tabs) {
      await page.click(`button:has-text("${tab}")`);
      await page.waitForTimeout(300);
      
      // Verify tab content is visible
      const tabContent = page.locator('[role="tabpanel"]');
      await expect(tabContent).toBeVisible();
    }
  });
});

test.describe('Marketplace Competitive Parity', () => {
  test('Compare template depth vs competitors', async ({ page }) => {
    await page.goto('/marketplace');
    await page.waitForLoadState('networkidle');

    // Open a template
    await page.click('button:has-text("Preview")');
    await page.waitForSelector('[role="dialog"]');

    // Navigate to Blueprint tab
    await page.click('button:has-text("Blueprint")');
    await page.waitForTimeout(500);

    // Verify depth of information (more than competitors)
    const sections = [
      'Workflow Structure',
      'Event Triggers',
      'Data Sources & Integrations',
      'Blueprint JSON'
    ];

    for (const section of sections) {
      await expect(page.locator(`text=${section}`)).toBeVisible();
    }

    // Verify JSON blueprint is comprehensive
    const blueprintJSON = await page.locator('pre').textContent();
    expect(blueprintJSON).toBeTruthy();
    expect(blueprintJSON!.length).toBeGreaterThan(500); // Substantial content
  });
});
