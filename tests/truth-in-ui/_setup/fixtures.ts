/**
 * Shared `test.extend` fixtures for the truth-in-UI suite.
 *
 *  • `guard`   — network guard, auto-asserted on teardown.
 *  • `page`    — augmented to install the deterministic clock and
 *                the network guard BEFORE the first navigation.
 *
 * Individual specs opt into Kit mocks by calling `mockKit()` inline
 * so different specs can express different runtime states without
 * fixture explosion.
 */

import { test as base, expect } from '@playwright/test';
import { installNetworkGuard, type NetworkGuardHandle } from './network-guard';
import { installDeterministicClock } from './clock';

type Fixtures = {
  guard: NetworkGuardHandle;
};

export const test = base.extend<Fixtures>({
  guard: async ({ page }, use, testInfo) => {
    // Order matters: clock BEFORE any route registration so
    // page-scripts see the frozen Date from the very first tick.
    await installDeterministicClock(page);
    const handle = await installNetworkGuard(page);
    await use(handle);
    // Product invariant, enforced per test: no unexpected external
    // egress. Reported as a first-class product failure.
    const violations = handle.violations();
    if (violations.length > 0) {
      testInfo.annotations.push({
        type: 'network-egress',
        description: JSON.stringify(violations, null, 2),
      });
    }
    expect(violations, 'no unexpected external network requests').toEqual([]);
  },
});

export { expect };