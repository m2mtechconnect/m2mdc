/**
 * Centralized error handling utilities
 * Standardizes error handling patterns across the application
 */

import { toast } from 'sonner';
import { logger } from './logger';
import { isApiError, type ApiError } from '@/types/common';

/**
 * Extract a user-friendly error message from various error types
 */
export function getErrorMessage(error: unknown): string {
  // Handle API errors
  if (isApiError(error)) {
    return error.message;
  }

  // Handle Error instances
  if (error instanceof Error) {
    return error.message;
  }

  // Handle Supabase errors
  if (
    typeof error === 'object' &&
    error !== null &&
    'message' in error &&
    typeof (error as { message: unknown }).message === 'string'
  ) {
    return (error as { message: string }).message;
  }

  // Handle string errors
  if (typeof error === 'string') {
    return error;
  }

  // Fallback for unknown error types
  return 'An unexpected error occurred';
}

/**
 * Handle an error by logging it and showing a toast notification
 */
export function handleError(
  error: unknown,
  context?: {
    component?: string;
    action?: string;
    fallbackMessage?: string;
  }
): void {
  const message = context?.fallbackMessage || getErrorMessage(error);
  
  logger.error(
    message,
    error,
    {
      component: context?.component,
      action: context?.action,
    }
  );

  toast.error(message);
}

/**
 * Handle a successful operation with a toast notification
 */
export function handleSuccess(message: string): void {
  logger.info(message);
  toast.success(message);
}

/**
 * Wrap an async function with error handling
 */
export function withErrorHandling<T extends (...args: unknown[]) => Promise<unknown>>(
  fn: T,
  context?: {
    component?: string;
    action?: string;
    fallbackMessage?: string;
  }
): T {
  return (async (...args: unknown[]) => {
    try {
      return await fn(...args);
    } catch (error) {
      handleError(error, context);
      throw error; // Re-throw so caller can handle if needed
    }
  }) as T;
}

/**
 * Convert unknown error to ApiError format
 */
export function normalizeError(error: unknown): ApiError {
  if (isApiError(error)) {
    return error;
  }

  return {
    message: getErrorMessage(error),
    details: error,
  };
}
