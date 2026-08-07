/**
 * AURA DC - live-backend egress guard for Vitest.
 *
 * Phase 1 rule: no test may reach the production Supabase project
 * (`psfvrskpnwcshvajzeix`) or any ambient Supabase configuration.
 * 21 integration tests call `supabase.auth.signUp()` / `signInWithPassword()`
 * against whatever `.env` supplies; today that resolves to production and they
 * only fail because the password policy rejects them. That is luck, not safety.
 *
 * This guard fails closed: unless the disposable test environment is proven
 * (same criteria as `scripts/aura-test-env-guard.mjs`), every network call to a
 * Supabase host is rejected locally, before it leaves the process.
 *
 * It never reads, prints or forwards tokens, passwords or secret keys.
 */

export const PRODUCTION_PROJECT_REF = 'psfvrskpnwcshvajzeix';
export const EXPECTED_TEST_PROJECT_NAME = 'aura-dc-security-test';

export interface LiveBackendDecision {
  allowed: boolean;
  reasons: string[];
  targetRef: string | null;
}

function refFromUrl(url?: string | null): string | null {
  if (!url) return null;
  try {
    const host = new URL(url).hostname;
    const m = /^([a-z0-9-]+)\.supabase\.(co|in)$/i.exec(host);
    return m ? m[1] : null;
  } catch {
    return null;
  }
}

/** Mirrors scripts/aura-test-env-guard.mjs. Disposable project or nothing. */
export function evaluateLiveBackendAccess(
  env: Record<string, string | undefined> = process.env,
): LiveBackendDecision {
  const reasons: string[] = [];
  const projectId = env.SUPABASE_PROJECT_ID?.trim() || null;
  const url = env.VITE_SUPABASE_URL?.trim() || null;
  const urlRef = refFromUrl(url);

  if (env.AURA_DC_TEST_ENV?.trim() !== EXPECTED_TEST_PROJECT_NAME) {
    reasons.push(`AURA_DC_TEST_ENV must be exactly "${EXPECTED_TEST_PROJECT_NAME}"`);
  }
  if (!projectId) reasons.push('SUPABASE_PROJECT_ID is not configured');
  if (!url) reasons.push('VITE_SUPABASE_URL is not configured');
  if (url && !urlRef) reasons.push('VITE_SUPABASE_URL is not a Supabase project URL');
  if (projectId?.includes(PRODUCTION_PROJECT_REF) || url?.includes(PRODUCTION_PROJECT_REF)) {
    reasons.push('configuration references the production project (forbidden)');
  }
  if (projectId && urlRef && urlRef !== projectId) {
    reasons.push('resolved project reference does not equal SUPABASE_PROJECT_ID');
  }
  if (!env.VITE_SUPABASE_PUBLISHABLE_KEY) {
    reasons.push('VITE_SUPABASE_PUBLISHABLE_KEY is not configured');
  }

  return { allowed: reasons.length === 0, reasons, targetRef: projectId ?? urlRef ?? null };
}

/** True for any host that is a Supabase project endpoint. */
export function isSupabaseHost(target: string): boolean {
  try {
    return /\.supabase\.(co|in)$/i.test(new URL(target).hostname);
  } catch {
    return false;
  }
}

export class LiveBackendBlockedError extends Error {
  constructor(target: string, reasons: string[]) {
    // Path only - query strings can carry tokens.
    let safe = target;
    try {
      const u = new URL(target);
      safe = `${u.origin}${u.pathname}`;
    } catch {
      /* keep as-is */
    }
    super(
      `AURA live-backend guard BLOCKED a request to ${safe}. ` +
        `Tests may not reach an ambient or production Supabase project. ` +
        `Reasons: ${reasons.join('; ')}`,
    );
    this.name = 'LiveBackendBlockedError';
  }
}

function targetOf(input: unknown): string {
  if (typeof input === 'string') return input;
  if (input instanceof URL) return input.toString();
  if (input && typeof (input as Request).url === 'string') return (input as Request).url;
  return '';
}

/** Installs the fetch interceptor. Returns the decision that was applied. */
export function installLiveBackendGuard(
  env: Record<string, string | undefined> = process.env,
): LiveBackendDecision {
  const decision = evaluateLiveBackendAccess(env);
  if (decision.allowed) return decision;

  const original = globalThis.fetch?.bind(globalThis);
  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const target = targetOf(input);
    if (isSupabaseHost(target)) throw new LiveBackendBlockedError(target, decision.reasons);
    if (!original) throw new Error(`fetch is unavailable in this environment (${target})`);
    return original(input, init);
  }) as typeof fetch;

  return decision;
}
