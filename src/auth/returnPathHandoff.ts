/**
 * Deep-link return-path handoff across auth round trips.
 *
 * The password flow can keep `?returnTo=` on `/login` because the navigation
 * never leaves the app. An OAuth/SSO round trip cannot: the provider returns
 * to a fixed, registered callback URL. This module carries the sanitized
 * return path across that hop using short-lived, same-origin `sessionStorage`.
 *
 * Safety rules:
 * - Only paths accepted by `safeReturnPath` are ever stored or returned, so an
 *   open redirect cannot be smuggled through the callback.
 * - The value expires (TTL below) and is consumed exactly once.
 * - Storage is same-origin session storage: it never travels to the provider.
 */
import { safeReturnPath } from '@/routing/AuthenticatedEntryRedirect';

export const RETURN_PATH_STORAGE_KEY = 'aura.auth.returnTo';
/** Long enough for a consent screen, short enough to never leak into a later session. */
export const RETURN_PATH_TTL_MS = 10 * 60 * 1000;

interface StoredReturnPath {
  path: string;
  storedAt: number;
}

function storage(): Storage | null {
  try {
    if (typeof window === 'undefined') return null;
    return window.sessionStorage;
  } catch {
    return null;
  }
}

/** Store a sanitized return path for the next auth callback. No-op when unsafe. */
export function stashReturnPath(raw: string | null | undefined): string | null {
  const safe = safeReturnPath(raw ?? null);
  const store = storage();
  if (!store) return safe;
  if (!safe || safe === '/') {
    store.removeItem(RETURN_PATH_STORAGE_KEY);
    return null;
  }
  const payload: StoredReturnPath = { path: safe, storedAt: Date.now() };
  try {
    store.setItem(RETURN_PATH_STORAGE_KEY, JSON.stringify(payload));
  } catch {
    // Storage unavailable: the callback simply falls back to the default route.
  }
  return safe;
}

/**
 * Read and clear the stored return path. Returns null when absent, expired,
 * malformed, or no longer safe.
 */
export function consumeReturnPath(now: number = Date.now()): string | null {
  const store = storage();
  if (!store) return null;
  let rawValue: string | null = null;
  try {
    rawValue = store.getItem(RETURN_PATH_STORAGE_KEY);
    store.removeItem(RETURN_PATH_STORAGE_KEY);
  } catch {
    return null;
  }
  if (!rawValue) return null;
  try {
    const parsed = JSON.parse(rawValue) as Partial<StoredReturnPath>;
    if (typeof parsed?.path !== 'string' || typeof parsed?.storedAt !== 'number') return null;
    if (now - parsed.storedAt > RETURN_PATH_TTL_MS) return null;
    return safeReturnPath(parsed.path);
  } catch {
    return null;
  }
}
