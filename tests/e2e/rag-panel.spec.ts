import { test, expect } from '@playwright/test';

test.describe('RAG Panel', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/builder?id=324009c1-b8d0-4519-a992-fbcbd360c45e&step=3');
    await page.waitForLoadState('networkidle');
  });

  test('should display RAG panel with all tabs', async ({ page }) => {
    // Check Knowledge tab is visible
    await expect(page.getByRole('tab', { name: /Knowledge/i })).toBeVisible();
    await page.click('button[role="tab"]:has-text("Knowledge")');
    
    // Verify all source tabs exist
    await expect(page.getByRole('tab', { name: /Upload/i })).toBeVisible();
    await expect(page.getByRole('tab', { name: /URLs/i })).toBeVisible();
    await expect(page.getByRole('tab', { name: /Cloud Drives/i })).toBeVisible();
    await expect(page.getByRole('tab', { name: /Databases/i })).toBeVisible();
  });

  test('should show upload interface on Upload tab', async ({ page }) => {
    await page.click('button[role="tab"]:has-text("Knowledge")');
    await page.click('button[role="tab"]:has-text("Upload")');
    
    await expect(page.getByText(/Drag & drop files here/i)).toBeVisible();
    await expect(page.getByText(/PDF, DOCX, PPTX/i)).toBeVisible();
    await expect(page.getByRole('button', { name: /Browse Files/i })).toBeVisible();
  });

  test('should show URL input on URLs tab', async ({ page }) => {
    await page.click('button[role="tab"]:has-text("Knowledge")');
    await page.click('button[role="tab"]:has-text("URLs")');
    
    await expect(page.getByText(/Enter URLs \(one per line\)/i)).toBeVisible();
    await expect(page.getByPlaceholder(/https:\/\/example.com/i)).toBeVisible();
    await expect(page.getByRole('button', { name: /Validate & Ingest/i })).toBeVisible();
  });

  test('should validate URL input', async ({ page }) => {
    await page.click('button[role="tab"]:has-text("Knowledge")');
    await page.click('button[role="tab"]:has-text("URLs")');
    
    const textarea = page.getByPlaceholder(/https:\/\/example.com/i);
    const ingestButton = page.getByRole('button', { name: /Validate & Ingest/i });
    
    // Button should be disabled when empty
    await expect(ingestButton).toBeDisabled();
    
    // Button should be enabled when text is entered
    await textarea.fill('https://example.com/doc.pdf');
    await expect(ingestButton).toBeEnabled();
  });

  test('should show coming soon for Cloud Drives', async ({ page }) => {
    await page.click('button[role="tab"]:has-text("Knowledge")');
    await page.click('button[role="tab"]:has-text("Cloud Drives")');
    
    // Should show OAuth providers
    await expect(page.getByText(/OAuth Providers/i)).toBeVisible();
    await expect(page.getByRole('button', { name: /Connect Google Drive/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /Connect SharePoint/i })).toBeVisible();
    
    // Should show S3 form
    await expect(page.getByText(/AWS S3/i)).toBeVisible();
    await expect(page.getByPlaceholder(/my-bucket-name/i)).toBeVisible();
  });

  test('should show coming soon for Databases', async ({ page }) => {
    await page.click('button[role="tab"]:has-text("Knowledge")');
    await page.click('button[role="tab"]:has-text("Databases")');
    
    // Should show database connection form
    await expect(page.getByText(/Read-Only Connections/i)).toBeVisible();
    await expect(page.getByPlaceholder(/postgresql:\/\/readonly/i)).toBeVisible();
    await expect(page.getByRole('button', { name: /Connect Database/i })).toBeVisible();
  });

  test('should display retrieval configuration controls', async ({ page }) => {
    await page.click('button[role="tab"]:has-text("Knowledge")');
    
    // Check for retrieval controls
    await expect(page.getByText(/Retrieval Configuration/i)).toBeVisible();
    await expect(page.getByText(/Top-K Documents/i)).toBeVisible();
    await expect(page.getByText(/Rerank Top-N/i)).toBeVisible();
    await expect(page.getByText(/Temperature/i)).toBeVisible();
    await expect(page.getByText(/Hybrid Search/i)).toBeVisible();
  });

  test('should have test query interface', async ({ page }) => {
    await page.click('button[role="tab"]:has-text("Knowledge")');
    
    await expect(page.getByText(/Test Retrieval/i)).toBeVisible();
    await expect(page.getByPlaceholder(/Ask a sample question/i)).toBeVisible();
    await expect(page.getByRole('button', { name: /Run Test Query/i })).toBeVisible();
  });

  test('should show indexed knowledge table', async ({ page }) => {
    await page.click('button[role="tab"]:has-text("Knowledge")');
    
    await expect(page.getByText(/Indexed Knowledge/i)).toBeVisible();
  });
});
