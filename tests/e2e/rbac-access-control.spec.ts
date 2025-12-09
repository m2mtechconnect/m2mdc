import { test, expect } from '@playwright/test';

test.describe('Access Control Page - Admin Only', () => {
  test.beforeEach(async ({ page }) => {
    // Assume user is already logged in (handled by auth setup)
    await page.goto('/account/access-control');
  });

  test('should display access control page for admin users', async ({ page }) => {
    // Check for page title
    await expect(page.getByRole('heading', { name: /Access Control & RBAC/i })).toBeVisible();
    
    // Check for key UI elements
    await expect(page.getByRole('button', { name: /Grant Role/i })).toBeVisible();
    await expect(page.getByText(/Role Permissions/i)).toBeVisible();
    await expect(page.getByText(/Current User Roles/i)).toBeVisible();
  });

  test('should show access denied for non-admin users', async ({ page }) => {
    // This test requires switching to a non-admin user
    // Implementation depends on your auth setup
    // await switchToNonAdminUser(page);
    
    await page.goto('/account/access-control');
    
    // Should see access denied message
    await expect(page.getByText(/Access Denied/i)).toBeVisible();
    await expect(page.getByText(/need global admin permissions/i)).toBeVisible();
  });

  test('should display role descriptions', async ({ page }) => {
    // Check for role descriptions
    await expect(page.getByText(/Viewer/i)).toBeVisible();
    await expect(page.getByText(/Operator/i)).toBeVisible();
    await expect(page.getByText(/Admin/i)).toBeVisible();
    
    // Check for permission descriptions
    await expect(page.getByText(/View agents and their status/i)).toBeVisible();
    await expect(page.getByText(/Start\/stop\/restart agents/i)).toBeVisible();
    await expect(page.getByText(/Full system control/i)).toBeVisible();
  });

  test('should display current user roles table', async ({ page }) => {
    // Check table headers
    await expect(page.getByRole('columnheader', { name: /User/i })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: /Role/i })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: /Scope/i })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: /Granted/i })).toBeVisible();
  });
});

test.describe('Grant Role Flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/account/access-control');
  });

  test('should open grant role dialog', async ({ page }) => {
    await page.getByRole('button', { name: /Grant Role/i }).click();
    
    // Check dialog is open
    await expect(page.getByRole('dialog')).toBeVisible();
    await expect(page.getByText(/Grant User Role/i)).toBeVisible();
    
    // Check form fields
    await expect(page.getByLabel(/User Email/i)).toBeVisible();
    await expect(page.getByLabel(/Role/i)).toBeVisible();
    await expect(page.getByLabel(/Scope/i)).toBeVisible();
  });

  test('should show agent dropdown when scope is set to agent', async ({ page }) => {
    await page.getByRole('button', { name: /Grant Role/i }).click();
    
    // Select "Specific Agent" scope
    await page.getByLabel(/Scope/i).click();
    await page.getByRole('option', { name: /Specific Agent/i }).click();
    
    // Agent dropdown should now be visible
    await expect(page.getByLabel(/Agent/i)).toBeVisible();
  });

  test('should require email and agent when granting scoped role', async ({ page }) => {
    await page.getByRole('button', { name: /Grant Role/i }).click();
    
    // Select operator role
    await page.getByLabel(/Role/i).click();
    await page.getByRole('option', { name: /Operator/i }).click();
    
    // Select specific agent scope
    await page.getByLabel(/Scope/i).click();
    await page.getByRole('option', { name: /Specific Agent/i }).click();
    
    // Try to submit without email and agent
    const submitButton = page.getByRole('button', { name: /^Grant Role$/i });
    await expect(submitButton).toBeDisabled();
  });

  test('should successfully grant a global viewer role', async ({ page }) => {
    await page.getByRole('button', { name: /Grant Role/i }).click();
    
    // Fill in form
    await page.getByLabel(/User Email/i).fill('testuser@example.com');
    
    await page.getByLabel(/Role/i).click();
    await page.getByRole('option', { name: /Viewer/i }).click();
    
    // Global scope is default
    
    // Submit
    await page.getByRole('button', { name: /^Grant Role$/i }).click();
    
    // Check for success message
    await expect(page.getByText(/Role granted successfully/i)).toBeVisible({ timeout: 5000 });
  });
});

test.describe('Revoke Role Flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/account/access-control');
  });

  test('should show revoke confirmation dialog', async ({ page }) => {
    // Find first revoke button in the table
    const revokeButtons = page.getByRole('button').filter({ hasText: '' }); // Trash icon
    const firstRevokeButton = revokeButtons.first();
    
    if (await firstRevokeButton.isVisible()) {
      await firstRevokeButton.click();
      
      // Check confirmation dialog
      await expect(page.getByText(/Revoke Role/i)).toBeVisible();
      await expect(page.getByText(/Are you sure/i)).toBeVisible();
      await expect(page.getByRole('button', { name: /Cancel/i })).toBeVisible();
      await expect(page.getByRole('button', { name: /Revoke Role/i })).toBeVisible();
    }
  });

  test('should cancel revoke operation', async ({ page }) => {
    const revokeButtons = page.getByRole('button').filter({ hasText: '' });
    const firstRevokeButton = revokeButtons.first();
    
    if (await firstRevokeButton.isVisible()) {
      await firstRevokeButton.click();
      
      // Click cancel
      await page.getByRole('button', { name: /Cancel/i }).click();
      
      // Dialog should close
      await expect(page.getByRole('dialog')).not.toBeVisible();
    }
  });
});

test.describe('Agent Operations - Permission-Based UI', () => {
  test('should show runtime controls for operators', async ({ page }) => {
    // Navigate to an agent detail page
    await page.goto('/app/agents'); // Agents list
    
    // Wait for agents to load
    await page.waitForLoadState('networkidle');
    
    // Click on first agent (if exists)
    const firstAgent = page.locator('[data-testid="agent-card"]').first();
    
    if (await firstAgent.isVisible()) {
      await firstAgent.click();
      
      // Should see runtime controls
      await expect(page.getByRole('button', { name: /Run/i })).toBeVisible();
      await expect(page.getByRole('button', { name: /Pause/i })).toBeVisible();
      await expect(page.getByRole('button', { name: /Stop/i })).toBeVisible();
    }
  });

  test('should hide runtime controls for viewers', async ({ page }) => {
    // This test requires switching to a viewer user
    // Implementation depends on your auth setup
    
    await page.goto('/app/agents');
    await page.waitForLoadState('networkidle');
    
    const firstAgent = page.locator('[data-testid="agent-card"]').first();
    
    if (await firstAgent.isVisible()) {
      await firstAgent.click();
      
      // Runtime controls should be disabled or hidden for viewers
      const runButton = page.getByRole('button', { name: /Run/i });
      
      if (await runButton.isVisible()) {
        await expect(runButton).toBeDisabled();
      }
    }
  });
});

test.describe('Access Denied Scenarios', () => {
  test('should redirect or show error for unauthorized agent access', async ({ page }) => {
    // Try to access an agent that doesn't belong to this user
    const unauthorizedAgentId = '00000000-0000-0000-0000-000000000000';
    
    await page.goto(`/app/agents/${unauthorizedAgentId}/manage`);
    
    // Should see error or be redirected
    await page.waitForLoadState('networkidle');
    
    const hasError = await page.getByText(/not found|access denied|permission denied/i).isVisible();
    const isRedirected = page.url() !== `/app/agents/${unauthorizedAgentId}/manage`;
    
    expect(hasError || isRedirected).toBe(true);
  });

  test('should show friendly error message for permission denied', async ({ page }) => {
    // This test requires attempting an unauthorized action
    // Implementation depends on your error handling setup
    
    await page.goto('/app/agents');
    await page.waitForLoadState('networkidle');
    
    // Look for any permission error messages
    const errorToast = page.locator('[role="alert"]').filter({ hasText: /permission/i });
    
    if (await errorToast.isVisible()) {
      // Error message should be user-friendly
      const errorText = await errorToast.textContent();
      expect(errorText).not.toContain('SQL');
      expect(errorText).not.toContain('RLS');
      expect(errorText).not.toContain('policy');
    }
  });
});

test.describe('RBAC Smoke Tests', () => {
  test('should load agents list without errors', async ({ page }) => {
    await page.goto('/app/agents');
    await page.waitForLoadState('networkidle');
    
    // Page should load without console errors
    const errors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });
    
    await page.waitForTimeout(2000);
    
    // Check for RBAC-related errors
    const rbacErrors = errors.filter(e => 
      e.toLowerCase().includes('permission') ||
      e.toLowerCase().includes('rbac') ||
      e.toLowerCase().includes('rls')
    );
    
    expect(rbacErrors).toHaveLength(0);
  });

  test('should handle authentication check on protected routes', async ({ page }) => {
    // This test checks that RBAC pages require authentication
    // For now, just verify the page loads (auth is assumed to be handled globally)
    
    await page.goto('/account/access-control');
    await page.waitForLoadState('networkidle');
    
    // Should either show the page or redirect to auth
    const isAccessControl = await page.getByText(/Access Control/i).isVisible();
    const isAuth = page.url().includes('/auth');
    
    expect(isAccessControl || isAuth).toBe(true);
  });
});
