/**
 * Regression contract for the "stuck on Loading your workspace" defect.
 *
 * Root cause: `RBACContext` treated two TERMINAL outcomes as the transient
 * `loading` state:
 *   1. `supabase.auth.getUser()` returning no user (a locally persisted
 *      session the server no longer recognises), and
 *   2. `onAuthStateChange` firing with no session.
 * Neither path ever settled, so every protected route - not just
 * /readiness/supervisor - spun indefinitely with no redirect and no error.
 *
 * Secondary causes: the authorization chain had no settle budget, and the
 * BoundedLoading budget restarted on every remount (session -> approval ->
 * authorization handoffs and Suspense boundaries), so the "bounded" escape
 * hatch never fired.
 *
 * These assertions are source-level on purpose: they pin the fail-closed
 * control flow without standing up a live backend, which the test environment
 * blocks by design.
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { renderHook, act } from '@testing-library/react';
import {
  useLoadingTimedOut,
  __resetLoadingBudgetAnchor,
  LOADING_BUDGET_MS,
} from '@/components/shared/BoundedLoading';

const read = (relativePath: string) =>
  readFileSync(resolve(process.cwd(), relativePath), 'utf8');

const rbacSource = read('src/contexts/RBACContext.tsx');
const routerSource = read('src/ApprovedUserRouter.tsx');
const guardSource = read('src/routing/PermissionRouteGuard.tsx');

describe('RBAC resolution never settles in loading', () => {
  it('treats a server-rejected caller as unauthenticated, not loading', () => {
    // The `if (!user)` branch must settle terminally.
    const noUserBranch = rbacSource.slice(
      rbacSource.indexOf('if (!user) {'),
      rbacSource.indexOf('if (!cancelled) setUserId(user.id);'),
    );
    expect(noUserBranch).toContain("settle({ status: 'unauthenticated' })");
    expect(noUserBranch).not.toContain("{ status: 'loading' }");
  });

  it('treats a null auth-state session as unauthenticated, not loading', () => {
    const listener = rbacSource.slice(rbacSource.indexOf('onAuthStateChange'));
    const elseBranch = listener.slice(listener.indexOf('} else {'));
    expect(elseBranch).toContain("settle({ status: 'unauthenticated' })");
    expect(elseBranch).not.toContain("setResolution({ status: 'loading' })");
  });

  it('declares unauthenticated as a first-class terminal resolution', () => {
    expect(rbacSource).toContain("| { status: 'unauthenticated' }");
  });

  it('time-boxes the authorization chain and fails closed on timeout', () => {
    expect(rbacSource).toContain('AUTHORIZATION_BUDGET_MS');
    expect(rbacSource).toContain('AuthorizationTimeoutError');
    // The budget may only convert a still-loading state into an error.
    expect(rbacSource).toContain("current.status === 'loading'");
    expect(rbacSource).toContain("{ status: 'error', error: new AuthorizationTimeoutError() }");
    // Re-armed when the listener puts the provider back into loading.
    expect(rbacSource).toContain('armBudget();');
    expect(rbacSource).toContain('disarmBudget();');
  });

  it('grants no permissions on the timeout path', () => {
    // The timeout produces `error`, which ApprovedUserRouter renders as
    // AuthorizationError - it never reaches AuthenticatedShell.
    expect(routerSource).toContain("resolution.status === 'error'");
    expect(routerSource).toContain('<AuthorizationError />');
  });
});

describe('protected routing responds to every terminal state', () => {
  it('redirects unauthenticated callers to sign-in with a return path', () => {
    expect(routerSource).toContain("resolution.status === 'unauthenticated'");
    expect(routerSource).toContain('returnTo=');
    expect(routerSource).toContain('/login?');
  });

  it('still renders the shell for internal, tenant and tenant-unresolved', () => {
    expect(routerSource).toContain("resolution.status === 'internal'");
    expect(routerSource).toContain("resolution.status === 'tenant'");
    expect(routerSource).toContain("resolution.status === 'tenant-unresolved'");
  });
});

describe('PermissionRouteGuard cannot spin indefinitely', () => {
  it('bounds the permission check', () => {
    expect(guardSource).toContain('useLoadingTimedOut');
    expect(guardSource).toContain('Permissions could not be confirmed.');
    expect(guardSource).toContain('Try again');
  });

  it('redirects unauthenticated callers instead of rendering the page', () => {
    expect(guardSource).toContain("resolution.status === 'unauthenticated'");
    expect(guardSource).toContain('<Navigate to="/login" replace />');
  });

  it('shows a truthful access-denied state for unresolved tenants', () => {
    expect(guardSource).toContain("resolution.status === 'tenant-unresolved'");
    expect(guardSource).toContain('Access unavailable');
    expect(guardSource).toContain('/account/settings');
  });

  it('never renders children before a permission decision', () => {
    const decisionIndex = guardSource.indexOf("resolution.status === 'pilot' || !can(permission)");
    const childrenIndex = guardSource.indexOf('<>{children}</>');
    expect(decisionIndex).toBeGreaterThan(-1);
    expect(childrenIndex).toBeGreaterThan(decisionIndex);
  });
});

describe('loading budget survives remounts', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    __resetLoadingBudgetAnchor();
  });

  afterEach(() => {
    vi.useRealTimers();
    __resetLoadingBudgetAnchor();
  });

  it('fires after the budget elapses', () => {
    const { result } = renderHook(() => useLoadingTimedOut(true));
    expect(result.current).toBe(false);
    act(() => {
      vi.advanceTimersByTime(LOADING_BUDGET_MS + 1);
    });
    expect(result.current).toBe(true);
  });

  it('does not restart the budget when a stage hands off to the next', () => {
    // Stage one spins for most of the budget, then unmounts as the next
    // stage mounts in the same tick - the historical reset bug.
    const first = renderHook(() => useLoadingTimedOut(true));
    act(() => {
      vi.advanceTimersByTime(LOADING_BUDGET_MS - 500);
    });
    expect(first.result.current).toBe(false);
    first.unmount();

    const second = renderHook(() => useLoadingTimedOut(true));
    act(() => {
      vi.advanceTimersByTime(600);
    });
    expect(second.result.current).toBe(true);
    second.unmount();
  });

  it('releases the anchor once loading genuinely ends', () => {
    const first = renderHook(() => useLoadingTimedOut(true));
    act(() => {
      vi.advanceTimersByTime(LOADING_BUDGET_MS - 500);
    });
    first.unmount();
    act(() => {
      vi.advanceTimersByTime(10);
    });

    const later = renderHook(() => useLoadingTimedOut(true));
    act(() => {
      vi.advanceTimersByTime(600);
    });
    expect(later.result.current).toBe(false);
    later.unmount();
  });
});
