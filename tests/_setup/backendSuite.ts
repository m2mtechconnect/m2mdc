/**
 * Suite gate for tests that genuinely require a backend.
 *
 * The live-backend guard blocks every Supabase call unless the disposable
 * `aura-dc-security-test` project is proven. Suites that talk to the backend
 * therefore failed on every run for an environmental reason, which buried real
 * regressions in a large permanent failure count.
 *
 * Skipping is the honest outcome: the assertion was never evaluated, so it must
 * not be reported as a failure or as a pass. Provision the disposable project
 * and these suites run for real, unchanged.
 */
import { describe } from 'vitest';
import { evaluateLiveBackendAccess } from './liveBackendGuard';

export const backendAccess = evaluateLiveBackendAccess();

/** `describe` when a disposable test backend is proven, `describe.skip` otherwise. */
export const describeWithBackend: typeof describe.skip = backendAccess.allowed
  ? describe
  : describe.skip;

/** Human-readable reason, for logging in a suite that reports its own status. */
export const backendSkipReason = backendAccess.allowed
  ? null
  : `requires the disposable test backend: ${backendAccess.reasons.join('; ')}`;
