/**
 * Guarded profile reads (findings PW-P2-02 and PW-P2-03).
 *
 * A profile query must never be issued with an empty, undefined or otherwise
 * invalid user id: PostgREST happily accepts `user_id=eq.` and the request is
 * either aborted or returns another caller's empty set. Every profile read
 * goes through this module so the guard cannot be forgotten.
 */
import { supabase } from '@/integrations/supabase/client';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isValidUserId(value: unknown): value is string {
  return typeof value === 'string' && UUID_RE.test(value);
}

export type ProfileQueryState =
  | { status: 'auth-loading' }
  | { status: 'unauthenticated' }
  | { status: 'empty' }
  | { status: 'success'; data: Record<string, unknown> }
  | { status: 'error'; message: string };

/**
 * Reads selected profile columns for one resolved user. Returns
 * `unauthenticated` without touching the network when the id is not a real
 * user id, so no request can carry an empty filter.
 */
export async function fetchProfileFields(
  userId: string | null | undefined,
  columns: string,
): Promise<ProfileQueryState> {
  if (!isValidUserId(userId)) return { status: 'unauthenticated' };
  const { data, error } = await supabase
    .from('profiles')
    .select(columns)
    .eq('user_id', userId)
    .maybeSingle();
  if (error) return { status: 'error', message: error.message };
  if (!data) return { status: 'empty' };
  return { status: 'success', data: data as unknown as Record<string, unknown> };
}