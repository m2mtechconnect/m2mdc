import { test as base, expect } from '@playwright/test';
import { getBrowserTestSession } from '../../helpers/testSupabaseClient';
import { QA_ADMIN_STORAGE_STATE } from '../global-setup';

/**
 * Protected-route fixture. Import this instead of `@playwright/test` only when
 * the product contract requires an already authenticated, approved QA admin.
 * Authentication-flow/public tests must keep using the base Playwright test.
 */
export const test = base.extend({});

test.use({ storageState: QA_ADMIN_STORAGE_STATE });

test.beforeEach(async ({ context }) => {
  if (!process.env.TEST_USER_EMAIL?.trim() || !process.env.TEST_USER_PASSWORD) {
    throw new Error(
      'Protected E2E test selected without disposable TEST_USER_EMAIL/TEST_USER_PASSWORD credentials',
    );
  }

  // Fail before product assertions if the generated browser state is missing or
  // malformed. The helper returns only access-token/user-id metadata and never
  // logs or exposes the refresh token.
  await getBrowserTestSession(context);
});

export { expect };
