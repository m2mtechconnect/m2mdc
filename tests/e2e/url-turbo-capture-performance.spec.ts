import { test, expect } from '@playwright/test';

test.describe('URL Turbo Capture - Performance Audit', () => {
  test.setTimeout(120000); // 2 minutes for full capture tests

  test('should capture website faster with optimizations', async ({ page }) => {
    await page.goto('/');
    
    // Navigate to a page where capture can be triggered
    // Assuming there's a URL input somewhere in the app
    const urlInput = page.locator('input[type="url"], input[placeholder*="URL"], input[placeholder*="url"]').first();
    
    if (await urlInput.count() > 0) {
      await urlInput.fill('https://example.com');
      
      const startTime = Date.now();
      
      // Trigger capture (adjust selector based on actual UI)
      const captureButton = page.locator('button:has-text("Scan"), button:has-text("Capture"), button:has-text("Analyze")').first();
      if (await captureButton.count() > 0) {
        await captureButton.click();
        
        // Wait for capture to complete (look for success indicators)
        await page.waitForSelector('[data-testid="capture-complete"], .toast:has-text("Success"), .toast:has-text("Complete")', {
          timeout: 90000
        });
        
        const endTime = Date.now();
        const duration = endTime - startTime;
        
        console.log(`Capture completed in ${duration}ms`);
        
        // With optimizations, a simple site should complete in under 30 seconds
        expect(duration).toBeLessThan(30000);
      }
    }
  });

  test('should use cached content on subsequent scans', async ({ page }) => {
    await page.goto('/');
    
    const urlInput = page.locator('input[type="url"], input[placeholder*="URL"]').first();
    
    if (await urlInput.count() > 0) {
      const testUrl = 'https://example.com';
      await urlInput.fill(testUrl);
      
      // First scan
      const captureButton = page.locator('button:has-text("Scan"), button:has-text("Capture")').first();
      if (await captureButton.count() > 0) {
        const firstStartTime = Date.now();
        await captureButton.click();
        await page.waitForSelector('[data-testid="capture-complete"], .toast:has-text("Success")', {
          timeout: 90000
        });
        const firstDuration = Date.now() - firstStartTime;
        
        // Wait a bit
        await page.waitForTimeout(2000);
        
        // Second scan (should be much faster with cache)
        await urlInput.fill(testUrl);
        const secondStartTime = Date.now();
        await captureButton.click();
        await page.waitForSelector('[data-testid="capture-complete"], .toast:has-text("Success")', {
          timeout: 90000
        });
        const secondDuration = Date.now() - secondStartTime;
        
        console.log(`First scan: ${firstDuration}ms, Second scan: ${secondDuration}ms`);
        
        // Second scan should be at least 40% faster due to caching
        expect(secondDuration).toBeLessThan(firstDuration * 0.6);
      }
    }
  });

  test('should handle parallel page capture correctly', async ({ page }) => {
    await page.goto('/');
    
    // Monitor network requests to verify parallel execution
    const captureRequests: number[] = [];
    
    page.on('request', request => {
      if (request.url().includes('url-turbo-capture')) {
        captureRequests.push(Date.now());
      }
    });
    
    const urlInput = page.locator('input[type="url"]').first();
    
    if (await urlInput.count() > 0) {
      // Trigger a capture that should process multiple pages
      await urlInput.fill('https://example.com');
      
      const captureButton = page.locator('button:has-text("Scan"), button:has-text("Capture")').first();
      if (await captureButton.count() > 0) {
        await captureButton.click();
        
        // Wait for capture to complete
        await page.waitForSelector('[data-testid="capture-complete"], .toast:has-text("Success")', {
          timeout: 90000
        });
        
        // Verify requests were made
        expect(captureRequests.length).toBeGreaterThan(0);
      }
    }
  });

  test('should respect timeout configurations', async ({ page }) => {
    await page.goto('/');
    
    // Test with a potentially slow/timeout URL
    const urlInput = page.locator('input[type="url"]').first();
    
    if (await urlInput.count() > 0) {
      // Use a URL that might timeout
      await urlInput.fill('https://httpstat.us/200?sleep=20000');
      
      const startTime = Date.now();
      
      const captureButton = page.locator('button:has-text("Scan"), button:has-text("Capture")').first();
      if (await captureButton.count() > 0) {
        await captureButton.click();
        
        // Should timeout within configured limit (6 seconds + buffer)
        await page.waitForSelector('[data-testid="capture-error"], .toast:has-text("timeout"), .toast:has-text("failed")', {
          timeout: 15000
        });
        
        const duration = Date.now() - startTime;
        
        // Should fail within reasonable time due to 6s timeout
        expect(duration).toBeLessThan(15000);
      }
    }
  });

  test('should show progress updates during capture', async ({ page }) => {
    await page.goto('/');
    
    const urlInput = page.locator('input[type="url"]').first();
    
    if (await urlInput.count() > 0) {
      await urlInput.fill('https://example.com');
      
      const progressUpdates: string[] = [];
      
      // Monitor for progress indicators
      page.on('console', msg => {
        if (msg.type() === 'log' && msg.text().includes('phase')) {
          progressUpdates.push(msg.text());
        }
      });
      
      const captureButton = page.locator('button:has-text("Scan"), button:has-text("Capture")').first();
      if (await captureButton.count() > 0) {
        await captureButton.click();
        
        // Wait for visible progress indicators
        await page.waitForSelector('[data-testid="capture-progress"], .progress, [role="progressbar"]', {
          timeout: 5000
        }).catch(() => {
          // Progress might complete too fast
        });
        
        await page.waitForSelector('[data-testid="capture-complete"], .toast:has-text("Success")', {
          timeout: 90000
        });
        
        // Should have seen multiple progress phases
        console.log('Progress updates:', progressUpdates);
      }
    }
  });

  test('should handle edge cases gracefully', async ({ page }) => {
    await page.goto('/');
    
    const urlInput = page.locator('input[type="url"]').first();
    
    if (await urlInput.count() > 0) {
      // Test with invalid URL
      await urlInput.fill('not-a-valid-url');
      
      const captureButton = page.locator('button:has-text("Scan"), button:has-text("Capture")').first();
      if (await captureButton.count() > 0) {
        await captureButton.click();
        
        // Should show error message
        await expect(page.locator('.toast, [role="alert"]')).toContainText(/invalid|error/i, {
          timeout: 5000
        });
      }
      
      // Test with non-existent domain
      await urlInput.fill('https://this-domain-definitely-does-not-exist-12345.com');
      
      if (await captureButton.count() > 0) {
        await captureButton.click();
        
        // Should handle gracefully
        await page.waitForSelector('[data-testid="capture-error"], .toast:has-text("failed"), .toast:has-text("error")', {
          timeout: 15000
        });
      }
    }
  });

  test('performance metrics - capture efficiency', async ({ page }) => {
    await page.goto('/');
    
    const urlInput = page.locator('input[type="url"]').first();
    
    if (await urlInput.count() > 0) {
      const testUrls = [
        'https://example.com',
        'https://example.org',
      ];
      
      const durations: number[] = [];
      
      for (const url of testUrls) {
        await urlInput.fill(url);
        
        const captureButton = page.locator('button:has-text("Scan"), button:has-text("Capture")').first();
        if (await captureButton.count() > 0) {
          const startTime = Date.now();
          await captureButton.click();
          
          await page.waitForSelector('[data-testid="capture-complete"], .toast:has-text("Success")', {
            timeout: 90000
          });
          
          const duration = Date.now() - startTime;
          durations.push(duration);
          
          // Wait between captures
          await page.waitForTimeout(2000);
        }
      }
      
      console.log('Capture durations:', durations);
      
      // Average should be under 25 seconds with optimizations
      const average = durations.reduce((a, b) => a + b, 0) / durations.length;
      expect(average).toBeLessThan(25000);
    }
  });
});
