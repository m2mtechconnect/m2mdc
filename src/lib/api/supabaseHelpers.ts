/**
 * Supabase helper utilities
 * Provides type-safe wrappers for common Supabase operations
 */

import { supabase } from '@/integrations/supabase/client';
import { logger } from '../logger';
import type { PostgrestError } from '@supabase/supabase-js';

export interface SupabaseResult<T> {
  data: T | null;
  error: PostgrestError | null;
}

/**
 * Safely execute a Supabase query with logging
 */
export async function executeQuery<T>(
  queryName: string,
  queryFn: () => Promise<SupabaseResult<T>>
): Promise<SupabaseResult<T>> {
  try {
    logger.debug(`Executing query: ${queryName}`);
    const result = await queryFn();
    
    if (result.error) {
      logger.error(`Query failed: ${queryName}`, result.error);
    } else {
      logger.debug(`Query succeeded: ${queryName}`);
    }
    
    return result;
  } catch (error) {
    logger.error(`Query exception: ${queryName}`, error);
    return {
      data: null,
      error: {
        message: error instanceof Error ? error.message : 'Unknown error',
        details: error,
        hint: '',
        code: 'EXCEPTION',
      } as PostgrestError,
    };
  }
}

/**
 * Get current authenticated user
 */
export async function getCurrentUser() {
  const { data: { user }, error } = await supabase.auth.getUser();
  
  if (error) {
    logger.error('Failed to get current user', error);
    return null;
  }
  
  return user;
}

/**
 * Check if user is authenticated
 */
export async function isAuthenticated(): Promise<boolean> {
  const user = await getCurrentUser();
  return user !== null;
}

/**
 * Call a Supabase edge function with type safety
 */
export async function callEdgeFunction<TRequest, TResponse>(
  functionName: string,
  payload?: TRequest
): Promise<{ data: TResponse | null; error: Error | null }> {
  try {
    logger.debug(`Calling edge function: ${functionName}`, {
      component: 'SupabaseHelpers',
      metadata: { functionName },
    });

    const { data, error } = await supabase.functions.invoke<TResponse>(
      functionName,
      payload ? { body: payload } : undefined
    );

    if (error) {
      logger.error(`Edge function failed: ${functionName}`, error);
      return { data: null, error };
    }

    return { data, error: null };
  } catch (error) {
    logger.error(`Edge function exception: ${functionName}`, error);
    return {
      data: null,
      error: error instanceof Error ? error : new Error('Unknown error'),
    };
  }
}
