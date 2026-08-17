/**
 * Bounded loading gate.
 *
 * The UX audit found routes that spin indefinitely when session, profile or
 * RBAC resolution never settles. Loading is a transient state, never a terminal
 * one: after a fixed budget this component states what happened and offers the
 * only two actions that can actually help - retry, or sign out and start again.
 * It never retries by itself and never loops.
 */
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';

/** Milliseconds a resolution step may spin before it is treated as stalled. */
export const LOADING_BUDGET_MS = 12_000;

export function useLoadingTimedOut(active: boolean, budgetMs = LOADING_BUDGET_MS): boolean {
  const [timedOut, setTimedOut] = useState(false);
  useEffect(() => {
    if (!active) {
      setTimedOut(false);
      return;
    }
    const id = window.setTimeout(() => setTimedOut(true), budgetMs);
    return () => window.clearTimeout(id);
  }, [active, budgetMs]);
  return timedOut;
}

export function BoundedLoading({
  label = 'Loading your workspace',
  stage,
  budgetMs = LOADING_BUDGET_MS,
}: {
  label?: string;
  /** What is being resolved, so the terminal state can explain itself. */
  stage: 'session' | 'approval' | 'authorization';
  budgetMs?: number;
}) {
  const timedOut = useLoadingTimedOut(true, budgetMs);
  const navigate = useNavigate();

  if (!timedOut) {
    return (
      <div
        className="flex min-h-dvh items-center justify-center"
        data-testid="bounded-loading"
        data-stage={stage}
        role="status"
        aria-live="polite"
      >
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-primary" />
          <p className="text-sm text-muted-foreground">{label}</p>
        </div>
      </div>
    );
  }

  const reason =
    stage === 'session'
      ? 'Your session could not be confirmed.'
      : stage === 'approval'
        ? 'Your account approval status could not be read.'
        : 'Your access permissions could not be resolved.';

  return (
    <div
      className="flex min-h-dvh items-center justify-center px-4"
      data-testid="bounded-loading-terminal"
      data-stage={stage}
      role="alert"
    >
      <div className="max-w-md space-y-3 rounded-lg border border-border bg-card p-6 text-center">
        <h1 className="text-lg font-semibold text-foreground">We could not finish loading</h1>
        <p className="text-sm text-muted-foreground">
          {reason} The backend did not respond within {Math.round(budgetMs / 1000)} seconds. Nothing
          you entered has been lost, and no data was changed.
        </p>
        <div className="flex flex-wrap justify-center gap-2">
          <Button className="min-h-11" onClick={() => window.location.reload()}>
            Try again
          </Button>
          <Button variant="outline" className="min-h-11" onClick={() => navigate('/sign-out')}>
            Sign out
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          If this keeps happening, contact your AURA administrator with the time shown in your
          browser.
        </p>
      </div>
    </div>
  );
}

export default BoundedLoading;
