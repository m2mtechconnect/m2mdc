/**
 * API Response Handler
 * Utilities for working with the standardized REST envelope
 */

import type { ApiResponse, ApiError } from '@/types/common';
import { logger } from './logger';

/**
 * Parse and validate API response envelope
 * Throws error if response is unsuccessful
 */
export function parseApiResponse<T>(payload: unknown): T {
  if (!payload || typeof payload !== 'object') {
    throw new Error('Invalid API response format');
  }

  const response = payload as ApiResponse<T>;

  // Log correlation ID for debugging
  if (response.correlationId) {
    logger.debug('API Response', { 
      component: 'apiResponseHandler',
      metadata: { correlationId: response.correlationId, success: response.success }
    });
  }

  if (!response.success) {
    const error = response.error || { message: 'Request failed', code: 'UNKNOWN_ERROR' };
    logger.error('API Error', error, {
      component: 'apiResponseHandler',
      metadata: { correlationId: response.correlationId, errorCode: error.code }
    });
    
    throw {
      message: error.message,
      code: error.code,
      details: error.details,
      correlationId: response.correlationId,
    } as ApiError & { correlationId: string };
  }

  if (response.data === null || response.data === undefined) {
    throw new Error('API returned null data despite success status');
  }

  return response.data;
}

/**
 * Safely parse API response without throwing
 * Returns { success, data, error } tuple
 */
export function safeParseApiResponse<T>(
  payload: unknown
): { success: true; data: T } | { success: false; error: ApiError & { correlationId?: string } } {
  try {
    const data = parseApiResponse<T>(payload);
    return { success: true, data };
  } catch (err) {
    const error = err as ApiError & { correlationId?: string };
    return { 
      success: false, 
      error: {
        message: error.message || 'Unknown error',
        code: error.code,
        details: error.details,
        correlationId: error.correlationId,
      }
    };
  }
}

/**
 * Check if payload is a valid API response envelope
 */
export function isApiResponse(payload: unknown): payload is ApiResponse<unknown> {
  if (!payload || typeof payload !== 'object') return false;
  
  const response = payload as Record<string, unknown>;
  return (
    typeof response.success === 'boolean' &&
    'data' in response &&
    'error' in response &&
    typeof response.correlationId === 'string'
  );
}
