import { chmod } from 'node:fs/promises';
import { chromium, firefox, webkit, expect, type FullConfig } from '@playwright/test';
import {
  getBrowserTestSession,
  resolveTestUserCredentials,
} from './helpers/testSupabaseClient';

const DEFAULT_AUTH_STATE_PATH = '/tmp/aura-playwright-auth.json';
const QA_LOGIN_ROUTE = '/login?returnTo=%2Faccount%2Fprofile';

async function launchConfiguredBrowser(browserName: string) {
  switch (browserName) {
    case 'chromium':
      return chromium.launch();
    case 'firefox':
      return firefox.launch();
    case 'webkit':
      return webkit.launch();
    default:
      throw new Error('QA browser bootstrap rejected: unsupported or missing browser');
  }
}

/**
 * Establishes a real authenticated browser session against the disposable local
 * Supabase stack. This does not bypass application auth/RBAC: the session is
 * created through the committed sign-in UI and the app still validates the
 * session, profile approval and RBAC before protected content can render.
 */
export default async function globalAuthSetup(config: FullConfig) {
  if (process.env.QA_AUTH_BOOTSTRAP !== '1') return;

  const browserName = process.env.QA_BROWSER?.trim();
  if (!browserName) {
    throw new Error('QA browser bootstrap rejected: QA_BROWSER is not configured');
  }

  const authStatePath = process.env.QA_AUTH_STATE?.trim() || DEFAULT_AUTH_STATE_PATH;
  const expectedUserId = process.env.TEST_USER_ID?.trim();
  if (!expectedUserId) {
    throw new Error('QA browser bootstrap rejected: TEST_USER_ID is not configured');
  }

  const credentials = resolveTestUserCredentials();
  const project = config.projects.find(({ name }) => name === browserName);
  const configuredBaseURL = project?.use?.baseURL;
  const baseURL =
    typeof configuredBaseURL === 'string'
      ? configuredBaseURL
      : configuredBaseURL?.toString() || 'http://localhost:8080';

  const browser = await launchConfiguredBrowser(browserName);
  try {
    const context = await browser.newContext({ baseURL });
    try {
      const page = await context.newPage();
      await page.goto(QA_LOGIN_ROUTE);
      await expect(page.getByLabel('Email Address', { exact: true })).toBeVisible({ timeout: 10_000 });
      await page.getByLabel('Email Address', { exact: true }).fill(credentials.email);
      await page.getByLabel('Password', { exact: true }).fill(credentials.password);
      await page.getByRole('button', { name: /^sign in$/i }).click();

      await page.waitForFunction(() => {
        for (let i = 0; i < window.localStorage.length; i += 1) {
          const key = window.localStorage.key(i);
          if (key?.startsWith('sb-') && key.endsWith('-auth-token')) {
            const value = window.localStorage.getItem(key);
            if (value && value !== 'null' && value !== 'undefined') return true;
          }
        }
        return false;
      });

      const session = await getBrowserTestSession(context);
      expect(session.userId).toBe(expectedUserId);

      // The explicit returnTo proves the browser reached the protected route via
      // the normal sign-in contract before storage state is persisted.
      await expect(page).toHaveURL(/\/account\/profile(?:[/?#]|$)/, { timeout: 15_000 });
      await expect(page.locator('h1:has-text("Profile")').first()).toBeVisible({
        timeout: 15_000,
      });

      await context.storageState({ path: authStatePath });
      await chmod(authStatePath, 0o600);
    } finally {
      await context.close();
    }
  } finally {
    await browser.close();
  }
}
