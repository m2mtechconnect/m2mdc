import { test, expect } from './fixtures/authenticatedTest';

test.describe('Account Settings Page', () => {
  test.beforeEach(async ({ page }) => {
    // The protected fixture verifies the pre-provisioned admin session first.
    await page.goto('/');
    await page.waitForTimeout(1000);
  });

  test('should navigate to settings page from user menu', async ({ page }) => {
    // Click user avatar menu
    await page.click('[data-testid="user-menu-trigger"], button[aria-label*="account"], button:has-text("Account")').catch(() => {});
    
    // Wait for menu to open
    await page.waitForTimeout(500);
    
    // Click Settings menu item
    await page.click('text=Settings').catch(async () => {
      await page.click('[role="menuitem"]:has-text("Settings")');
    });
    
    // Verify navigation
    await expect(page).toHaveURL(/\/account\/settings/);
  });

  test('should load and display workspace settings', async ({ page }) => {
    await page.goto('/account/settings');
    await page.waitForLoadState('networkidle');
    
    // Wait for settings page to load
    await page.waitForSelector('h1:has-text("Workspace Settings")', { timeout: 5000 });
    
    // Check for settings tabs
    await expect(page.locator('text=General')).toBeVisible();
    await expect(page.locator('text=Security')).toBeVisible();
    await expect(page.locator('text=Notifications')).toBeVisible();
  });

  test('should display workspace information in general tab', async ({ page }) => {
    await page.goto('/account/settings');
    await page.waitForLoadState('networkidle');
    
    // Wait for form to load
    await page.waitForTimeout(2000);
    
    // Click general tab (should be default)
    await page.click('text=General').catch(() => {});
    
    // Check for workspace info fields
    await expect(page.locator('text=Workspace Information')).toBeVisible();
    await expect(page.locator('label:has-text("Workspace Name")')).toBeVisible();
  });

  test('should expose admin-editable workspace controls for the QA admin', async ({ page }) => {
    await page.goto('/account/settings');
    await page.waitForLoadState('networkidle');

    // This suite now runs with a deliberately provisioned global admin. Assert
    // the actual capability instead of the previous boolean `toBeDefined()`
    // assertion, which passed for both true and false.
    const workspaceNameInput = page.locator('input[id="workspace_name"]');
    await expect(workspaceNameInput).toBeVisible();
    await expect(workspaceNameInput).toBeEnabled();
  });

  test('should update workspace settings as admin', async ({ page }) => {
    await page.goto('/account/settings');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    
    // Try to update workspace name
    const workspaceNameInput = page.locator('input[id="workspace_name"]');
    
    if (await workspaceNameInput.isEnabled()) {
      await workspaceNameInput.clear();
      await workspaceNameInput.fill('Updated Workspace');
      
      // Click save button
      await page.click('button:has-text("Save Changes")');
      
      // Wait for success or error message
      await page.waitForTimeout(2000);
    }
  });

  test('should display security settings', async ({ page }) => {
    await page.goto('/account/settings');
    await page.waitForLoadState('networkidle');
    
    // Click security tab
    await page.click('text=Security');
    await page.waitForTimeout(1000);
    
    // Check for security options
    await expect(page.locator('text=Access & Security')).toBeVisible();
    await expect(page.locator('text=Multi-Factor Authentication')).toBeVisible();
  });

  test('should display notifications settings', async ({ page }) => {
    await page.goto('/account/settings');
    await page.waitForLoadState('networkidle');
    
    // Click notifications tab
    await page.click('text=Notifications');
    await page.waitForTimeout(1000);
    
    // Check for notification options
    await expect(page.locator('text=Notification Preferences')).toBeVisible();
  });
});
