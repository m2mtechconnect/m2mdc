/**
 * Custom hook for invoking edge functions with automatic REST envelope handling
 */

import { supabase } from '@/integrations/supabase/client';
import type { ApiResponse } from '@/types/common';
import { logger } from '@/lib/logger';

interface UseEdgeFunctionOptions {
  logErrors?: boolean;
  component?: string;
}

/**
 * Helper to unwrap REST envelope if present, otherwise return data as-is
 */
function unwrapEnvelope<T>(data: unknown): T {
  // Check if this is a REST envelope
  if (
    data &&
    typeof data === 'object' &&
    'success' in data &&
    'correlationId' in data
  ) {
    const envelope = data as ApiResponse<T>;
    
    // Log correlation ID for debugging
    if (envelope.correlationId) {
      logger.debug('API Response', {
        component: 'useEdgeFunction',
        metadata: {
          correlationId: envelope.correlationId,
          success: envelope.success,
        },
      });
    }
    
    if (!envelope.success) {
      const error = envelope.error || { message: 'Request failed', code: 'UNKNOWN_ERROR' };
      logger.error('API Error', error, {
        component: 'useEdgeFunction',
        metadata: {
          correlationId: envelope.correlationId,
          errorCode: error.code,
        },
      });
      
      throw {
        message: error.message,
        code: error.code,
        details: error.details,
        correlationId: envelope.correlationId,
      };
    }
    
    if (envelope.data === null || envelope.data === undefined) {
      throw new Error('API returned null data despite success status');
    }
    
    return envelope.data;
  }
  
  // Legacy: return data as-is for functions not yet migrated
  return data as T;
}

/**
 * Invoke an edge function with automatic envelope handling
 */
export async function invokeEdgeFunction<T = any>(
  functionName: string,
  body?: any,
  options: UseEdgeFunctionOptions = {}
): Promise<T> {
  const { logErrors = true, component } = options;
  
  try {
    const { data, error } = await supabase.functions.invoke(functionName, {
      body,
    });
    
    if (error) {
      if (logErrors) {
        logger.error(`Edge function ${functionName} failed`, error, {
          component: component || 'useEdgeFunction',
          action: functionName,
        });
      }
      throw error;
    }
    
    // Unwrap envelope if present
    return unwrapEnvelope<T>(data);
  } catch (err) {
    if (logErrors) {
      logger.error(`Edge function ${functionName} error`, err, {
        component: component || 'useEdgeFunction',
        action: functionName,
      });
    }
    throw err;
  }
}

/**
 * Hook for edge function calls with React Query integration
 */
export function useEdgeFunction() {
  return {
    invoke: invokeEdgeFunction,
  };
}
