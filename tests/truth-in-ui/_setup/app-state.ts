/**
 * Deterministic app-shell state for the DSX drawer suites.
 *
 * Evidence (desktop-webkit, focused run 2026-08-05T14:27:51Z): the guided
 * tour auto-starts for the mocked signed-in session and renders a modal
 * `alertdialog` ("Active Data Centre", step 1 of 5) over the workspace.
 * That overlay intercepts every pointer event, so the card triggers never
 * own their hit point and the activation poll burns the whole 900s budget.
 *
 * This is environment seeding, not an interaction workaround: a returning
 * operator who has already dismissed the tour sees no such overlay. We
 * mark every registered tour as seen before the first navigation, exactly
 * as the product itself persists it (`m2m_tour_state_v1`).
 */
import type { BrowserContext } from '@playwright/test';
import { expect, type Page } from '@playwright/test';

const TOUR_STORAGE_KEY = 'm2m_tour_state_v1';

const TOUR_IDS = [
  'studioIntro',
  'overview',
  'simulation',
  'blueprint',
  'role_executive',
  'role_manager',
  'role_engineer',
  'role_security_admin',
] as const;

export async function seedDismissedTours(context: BrowserContext) {
  const seen = Object.fromEntries(
    TOUR_IDS.map((id) => [id, { seen: true, completedAt: '2026-01-01T00:00:00.000Z' }]),
  );
  await context.addInitScript(
    ([key, value]) => {
      try {
        window.localStorage.setItem(key as string, value as string);
      } catch {
        /* storage unavailable — the tour will simply run */
      }
    },
    [TOUR_STORAGE_KEY, JSON.stringify(seen)] as const,
  );
}

/**
 * Test-precondition assertion: the workspace must not start in first-time
 * onboarding state. This asserts the seeded returning-operator precondition
 * held; it never dismisses anything, and it deliberately ignores ordinary
 * metric/constraint/asset/Co-Pilot dialogs opened by the test itself.
 */
export async function assertNoOnboardingOverlay(page: Page, label = 'precondition') {
  const tourModal = page.locator('[role="alertdialog"][data-state="open"]');
  await expect(tourModal, `${label}: no onboarding tour modal may cover the workspace`).toHaveCount(0);
}
