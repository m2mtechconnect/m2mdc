/**
 * Marketing Screenshot Capture Script
 * 
 * Captures high-quality screenshots of Studio UI for landing page assets.
 * Uses Playwright to navigate and capture each scene defined in screenshotPresets.
 * 
 * Usage:
 *   npx playwright test scripts/captureMarketingScreenshots.ts --project=chromium
 * 
 * Or add to package.json:
 *   "capture:screenshots": "playwright test scripts/captureMarketingScreenshots.ts --project=chromium"
 */

import { test } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

// Screenshot presets - mirrored from src/constants/screenshotPresets.ts
const SCREENSHOT_PRESETS = [
  {
    id: 'dashboard',
    name: 'Dashboard Overview',
    route: '/dashboard',
    selector: '#dashboard-main',
    viewport: { width: 1440, height: 900 },
    darkMode: true,
    waitFor: 2000,
  },
  {
    id: 'blueprint',
    name: 'Blueprint Designer',
    route: '/blueprint',
    selector: '#blueprint-overview',
    viewport: { width: 1440, height: 900 },
    darkMode: true,
    waitFor: 1500,
  },
  {
    id: 'simulation',
    name: 'Simulation Panel',
    route: '/data-centre-twin?view=simulation',
    selector: '#simulation-root',
    viewport: { width: 1440, height: 900 },
    darkMode: true,
    waitFor: 2000,
  },
  {
    id: 'twin3d',
    name: '3D Data Centre',
    route: '/data-centre-twin',
    selector: '#twin-3d-scene',
    viewport: { width: 1440, height: 900 },
    darkMode: true,
    waitFor: 3000, // Extra time for 3D to render
  },
  {
    id: 'agents',
    name: 'Subsystem Agents',
    route: '/manage-agents',
    selector: '#agents-list',
    viewport: { width: 1440, height: 900 },
    darkMode: false,
    waitFor: 1500,
  },
  {
    id: 'sovereignty',
    name: 'Sovereignty & Safety',
    route: '/sovereignty-audit',
    selector: '#sovereignty-grid',
    viewport: { width: 1440, height: 900 },
    darkMode: true,
    waitFor: 1500,
  },
  {
    id: 'telemetry',
    name: 'Telemetry & Analytics',
    route: '/telemetry-analytics',
    selector: '#telemetry-panel',
    viewport: { width: 1440, height: 900 },
    darkMode: true,
    waitFor: 2000,
  },
  {
    id: 'recommendation',
    name: 'Recommendation Panel',
    route: '/recommendation',
    selector: '#recommendation-panel',
    viewport: { width: 1440, height: 900 },
    darkMode: false,
    waitFor: 1500,
  },
];

const OUTPUT_DIR = 'public/landing/screenshots';

test.describe('Marketing Screenshot Capture', () => {
  test.beforeAll(async () => {
    // Ensure output directory exists
    if (!fs.existsSync(OUTPUT_DIR)) {
      fs.mkdirSync(OUTPUT_DIR, { recursive: true });
    }
    console.log(`\n📸 Marketing Screenshot Capture`);
    console.log(`   Output: ${OUTPUT_DIR}/`);
    console.log(`   Presets: ${SCREENSHOT_PRESETS.length} screens\n`);
  });

  for (const preset of SCREENSHOT_PRESETS) {
    test(`Capture: ${preset.name}`, async ({ page }) => {
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

      // Capture WebP for better compression
      const webpPath = path.join(OUTPUT_DIR, `${preset.id}-desktop.webp`);
      await (screenshotTarget as any).screenshot({
        path: webpPath,
        type: 'png', // Playwright outputs PNG, we'll note WebP conversion needed
        animations: 'disabled',
      });
      
      // Note: For true WebP, you'd use sharp or similar post-processing
      // For now, we save as PNG and can convert with:
      // npx sharp-cli -i public/landing/screenshots/*.png -o public/landing/screenshots/ -f webp
      
      console.log(`  ✓ Saved: ${preset.id}-desktop.png (convert to WebP separately)`);
    });
  }

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
