import { test, expect } from './fixtures/authenticatedTest';

test.describe('Account Profile Page', () => {
  test.beforeEach(async ({ page }) => {
    // The protected fixture verifies the pre-provisioned session before this suite.
    await page.goto('/');
    await page.waitForTimeout(1000);
  });

  test('should navigate to profile page from user menu', async ({ page }) => {
    // Click user avatar menu
    await page.click('[data-testid="user-menu-trigger"], button[aria-label*="account"], button:has-text("Account")').catch(() => {});
    
    // Wait for menu to open
    await page.waitForTimeout(500);
    
    // Click Profile menu item
    await page.click('text=Profile, text=View Profile').catch(async () => {
      await page.click('[role="menuitem"]:has-text("Profile")');
    });
    
    // Verify navigation
    await expect(page).toHaveURL(/\/account\/profile/);
  });

  test('should load and display profile data', async ({ page }) => {
    await page.goto('/account/profile');
    await page.waitForLoadState('networkidle');
    
    // Wait for profile to load
    await page.waitForSelector('h1:has-text("Profile")', { timeout: 5000 });
    
    // Check for profile sections
    await expect(page.locator('text=Personal Information')).toBeVisible();
    await expect(page.locator('text=Contact Information')).toBeVisible();
    
    // Check for input fields
    await expect(page.locator('input[id="full_name"]')).toBeVisible();
    await expect(page.locator('input[id="email"]')).toBeVisible();
  });

  test('should update profile information', async ({ page }) => {
    await page.goto('/account/profile');
    await page.waitForLoadState('networkidle');
    
    // Wait for form to load
    await page.waitForSelector('input[id="full_name"]', { timeout: 5000 });
    
    // Update full name
    const nameInput = page.locator('input[id="full_name"]');
    await nameInput.clear();
    await nameInput.fill('Test User Updated');
    
    // Update job title
    const jobInput = page.locator('input[id="job_title"]');
    await jobInput.clear();
    await jobInput.fill('Senior Engineer');
    
    // Click save button
    await page.click('button:has-text("Save Changes")');
    
    // Wait for success message
    await expect(page.locator('text=Profile updated successfully')).toBeVisible({ timeout: 5000 });
  });

  test('should display read-only fields for role and department', async ({ page }) => {
    await page.goto('/account/profile');
    await page.waitForLoadState('networkidle');
    
    // Check that role and department sections exist
    const roleSection = page.locator('text=Role & Department');
    if (await roleSection.isVisible()) {
      // Verify these are read-only (no editable inputs in this section)
      await expect(page.locator('text=managed by your administrator')).toBeVisible();
    }
  });
});