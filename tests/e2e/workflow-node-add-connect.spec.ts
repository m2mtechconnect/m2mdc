import { test, expect } from '@playwright/test';

test.describe('Workflow Editor - Node Add & Connect', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/builder?id=system_test_01&step=5');
    await page.waitForLoadState('networkidle');
  });

  test('should add nodes from palette', async ({ page }) => {
    // Add Analyze node
    await page.getByRole('button', { name: 'Analyze' }).click();
    await expect(page.getByText('1 nodes')).toBeVisible();

    // Add Classify node
    await page.getByRole('button', { name: 'Classify' }).click();
    await expect(page.getByText('2 nodes')).toBeVisible();

    // Add Notify Teams node
    await page.getByRole('button', { name: 'Notify Teams' }).click();
    await expect(page.getByText('3 nodes')).toBeVisible();
  });

  test('should show node added toast notification', async ({ page }) => {
    await page.getByRole('button', { name: 'Analyze' }).click();
    await expect(page.getByText(/analyze node added/i)).toBeVisible();
  });

  test('should save workflow with nodes to database', async ({ page }) => {
    // Add nodes
    await page.getByRole('button', { name: 'Analyze' }).click();
    await page.getByRole('button', { name: 'Classify' }).click();
    
    // Save draft
    await page.getByRole('button', { name: /save draft/i }).click();
    
    // Check for success toast
    await expect(page.getByText(/workflow saved/i)).toBeVisible();
    await expect(page.getByText(/2 nodes saved/i)).toBeVisible();
  });

  test('should persist and restore workflow on page refresh', async ({ page }) => {
    // Add nodes
    await page.getByRole('button', { name: 'Analyze' }).click();
    await page.getByRole('button', { name: 'Classify' }).click();
    
    // Save
    await page.getByRole('button', { name: /save draft/i }).click();
    await expect(page.getByText(/workflow saved/i)).toBeVisible();
    
    // Refresh page
    await page.reload();
    await page.waitForLoadState('networkidle');
    
    // Check nodes are restored
    await expect(page.getByText('2 nodes')).toBeVisible();
  });

  test('should clear unsaved changes badge after save', async ({ page }) => {
    // Add node
    await page.getByRole('button', { name: 'Analyze' }).click();
    await expect(page.getByText('Unsaved changes')).toBeVisible();
    
    // Save
    await page.getByRole('button', { name: /save draft/i }).click();
    await expect(page.getByText(/workflow saved/i)).toBeVisible();
    
    // Badge should be gone
    await expect(page.getByText('Unsaved changes')).not.toBeVisible();
  });

  test('should support multiple node types in same workflow', async ({ page }) => {
    const nodeTypes = [
      'Analyze',
      'Classify', 
      'Notify Teams',
      'Create Jira Ticket',
      'Write Salesforce',
      'Generate Report'
    ];

    for (const nodeType of nodeTypes) {
      await page.getByRole('button', { name: nodeType }).click();
    }

    await expect(page.getByText('6 nodes')).toBeVisible();
  });

  test('should disable save button when no changes', async ({ page }) => {
    const saveButton = page.getByRole('button', { name: /save draft/i });
    await expect(saveButton).toBeDisabled();
  });

  test('should enable save button after adding nodes', async ({ page }) => {
    await page.getByRole('button', { name: 'Analyze' }).click();
    
    const saveButton = page.getByRole('button', { name: /save draft/i });
    await expect(saveButton).toBeEnabled();
  });
});
