/**
 * Marketing Screenshot Capture Script
 * 
 * Captures high-quality screenshots of Studio UI for landing page assets.
 * Uses Playwright to navigate and capture each scene defined in screenshotPresets.
 * 
 * IMPORTANT: Requires authentication credentials to access protected routes.
 * 
 * Usage:
 *   TEST_EMAIL="your@email.com" TEST_PASSWORD="yourpass" npx playwright test scripts/captureMarketingScreenshots.ts --project=screenshots
 * 
 * Or add to package.json:
 *   "capture:screenshots": "playwright test scripts/captureMarketingScreenshots.ts --project=screenshots"
 */

import { test, expect, Page } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

// Screenshot presets for authenticated routes
const SCREENSHOT_PRESETS = [
  {
    id: 'dashboard',
    name: 'Dashboard Overview',
    route: '/dashboard',
    selector: '#dashboard-main',
    viewport: { width: 1440, height: 900 },
    darkMode: true,
    waitFor: 3000,
  },
  {
    id: 'blueprint',
    name: 'Blueprint Designer',
    route: '/blueprint',
    selector: '#blueprint-overview',
    viewport: { width: 1440, height: 900 },
    darkMode: true,
    waitFor: 2500,
  },
  {
    id: 'simulation',
    name: 'Simulation Panel',
    route: '/data-centre-twin/default?view=simulation&demo=true',
    selector: '#simulation-root',
    viewport: { width: 1440, height: 900 },
    darkMode: true,
    waitFor: 3000,
  },
  {
    id: 'twin3d',
    name: '3D Data Centre',
    route: '/data-centre-twin/default?demo=true',
    selector: '#twin-3d-scene',
    viewport: { width: 1440, height: 900 },
    darkMode: true,
    waitFor: 4000, // Extra time for 3D to render
  },
  {
    id: 'agents',
    name: 'Subsystem Agents',
    route: '/manage-agents',
    selector: '#agents-list',
    viewport: { width: 1440, height: 900 },
    darkMode: true,
    waitFor: 2500,
  },
  {
    id: 'sovereignty',
    name: 'Sovereignty & Safety',
    route: '/sovereignty-audit',
    selector: '#sovereignty-grid',
    viewport: { width: 1440, height: 900 },
    darkMode: true,
    waitFor: 2500,
  },
  {
    id: 'telemetry',
    name: 'Telemetry & Analytics',
    route: '/telemetry-analytics',
    selector: '#telemetry-panel',
    viewport: { width: 1440, height: 900 },
    darkMode: true,
    waitFor: 3000,
  },
];

const OUTPUT_DIR = 'public/landing/screenshots';

// Get credentials from environment variables
const TEST_EMAIL = process.env.TEST_EMAIL || '';
const TEST_PASSWORD = process.env.TEST_PASSWORD || '';

/**
 * Authenticate user before capturing screenshots
 */
async function authenticate(page: Page): Promise<boolean> {
  if (!TEST_EMAIL || !TEST_PASSWORD) {
    console.error('❌ Missing credentials. Set TEST_EMAIL and TEST_PASSWORD environment variables.');
    return false;
  }

  console.log(`\n🔐 Authenticating as ${TEST_EMAIL}...`);
  
  await page.goto('/auth', { waitUntil: 'networkidle' });
  
  // Fill login form
  await page.fill('input[type="email"]', TEST_EMAIL);
  await page.fill('input[type="password"]', TEST_PASSWORD);
  
  // Submit
  await page.click('button[type="submit"]');
  
  // Wait for redirect to dashboard (indicates successful login)
  try {
    await page.waitForURL(/\/(dashboard|data-centre-twin)/, { timeout: 15000 });
    console.log('✅ Authentication successful\n');
    return true;
  } catch (error) {
    console.error('❌ Authentication failed. Check your credentials.');
    return false;
  }
}

test.describe('Marketing Screenshot Capture', () => {
  test.beforeAll(async () => {
    // Ensure output directory exists
    if (!fs.existsSync(OUTPUT_DIR)) {
      fs.mkdirSync(OUTPUT_DIR, { recursive: true });
    }
    console.log(`\n📸 Marketing Screenshot Capture`);
    console.log(`   Output: ${OUTPUT_DIR}/`);
    console.log(`   Presets: ${SCREENSHOT_PRESETS.length} screens`);
    console.log(`   Auth: ${TEST_EMAIL ? 'Credentials provided' : '⚠️ No credentials - set TEST_EMAIL and TEST_PASSWORD'}\n`);
  });

  // Single test that authenticates once and captures all screenshots
  test('Capture all authenticated screenshots', async ({ page }) => {
    // Set viewport for auth
    await page.setViewportSize({ width: 1440, height: 900 });
    
    // Authenticate first
    const authenticated = await authenticate(page);
    if (!authenticated) {
      test.skip();
      return;
    }
    
    // Capture each preset
    for (const preset of SCREENSHOT_PRESETS) {
      console.log(`\n📸 Capturing: ${preset.name}`);
      
      // Set viewport
      await page.setViewportSize(preset.viewport);

      // Set color scheme
      await page.emulateMedia({ 
        colorScheme: preset.darkMode ? 'dark' : 'light' 
      });

      // Navigate to route
      console.log(`  → Navigating to ${preset.route}`);
      await page.goto(preset.route, { waitUntil: 'networkidle' });

      // Wait for content to settle
      if (preset.waitFor) {
        await page.waitForTimeout(preset.waitFor);
      }

      // Wait for any animations to complete
      await page.evaluate(() => {
        return new Promise<void>((resolve) => {
          requestAnimationFrame(() => {
            requestAnimationFrame(() => resolve());
          });
        });
      });

      // Hide any onboarding tooltips or modals that might be visible
      await page.evaluate(() => {
        const tooltips = document.querySelectorAll('[data-tour], .react-joyride__tooltip, [role="tooltip"]');
        tooltips.forEach(el => (el as HTMLElement).style.display = 'none');
        
        // Also hide any notification toasts
        const toasts = document.querySelectorAll('[data-sonner-toast]');
        toasts.forEach(el => (el as HTMLElement).style.display = 'none');
      });

      // Try to find specific selector, fall back to full page
      let screenshotTarget = page;
      if (preset.selector) {
        try {
          const element = page.locator(preset.selector);
          if (await element.isVisible({ timeout: 3000 })) {
            screenshotTarget = element as any;
            console.log(`  ✓ Found selector: ${preset.selector}`);
          } else {
            console.log(`  ⚠ Selector not visible, using full page: ${preset.selector}`);
          }
        } catch {
          console.log(`  ⚠ Selector not found, using full page: ${preset.selector}`);
        }
      }

      // Capture PNG
      const pngPath = path.join(OUTPUT_DIR, `${preset.id}-desktop.png`);
      await (screenshotTarget as any).screenshot({
        path: pngPath,
        type: 'png',
        animations: 'disabled',
      });
      console.log(`  ✓ Saved: ${preset.id}-desktop.png`);
    }
    
    console.log(`\n✅ All ${SCREENSHOT_PRESETS.length} screenshots captured!`);
  });

  test('Generate manifest', async () => {
    // Generate updated manifest
    const manifest = {
      version: '2.0.0',
      generatedAt: new Date().toISOString(),
      brandColors: 'cyan/teal (#00BCD4)',
      screenshots: SCREENSHOT_PRESETS.reduce((acc, preset) => {
        acc[preset.id] = {
          desktop: `/landing/screenshots/${preset.id}-desktop.png`,
          webp: `/landing/screenshots/${preset.id}-desktop.webp`,
          alt: `${preset.name} - M2M AURA Studio interface`,
          title: preset.name,
          darkMode: preset.darkMode,
        };
        return acc;
      }, {} as Record<string, any>),
    };

    const manifestPath = path.join(OUTPUT_DIR, 'manifest.json');
    fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
    console.log(`\n✓ Generated manifest.json`);
    console.log(`\n📸 Screenshot capture complete!`);
    console.log(`\nNext steps:`);
    console.log(`  1. Review screenshots in ${OUTPUT_DIR}/`);
    console.log(`  2. Convert to WebP: npx sharp-cli -i ${OUTPUT_DIR}/*.png -o ${OUTPUT_DIR}/ -f webp`);
    console.log(`  3. Update src/data/studioScreenshots.ts if needed`);
  });
});
