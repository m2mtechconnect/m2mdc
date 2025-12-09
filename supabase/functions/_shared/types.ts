/**
 * Standard error structure for API responses
 */
export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
}

/**
 * Standard response envelope for all edge functions
 * Ensures consistent structure across the API
 */
export interface ApiResponse<T> {
  success: boolean;
  data: T | null;
  error: ApiError | null;
  correlationId: string;
}

/**
 * Common error codes used across edge functions
 */
export const ErrorCodes = {
  VALIDATION_ERROR: "VALIDATION_ERROR",
  UNAUTHORIZED: "UNAUTHORIZED",
  FORBIDDEN: "FORBIDDEN",
  NOT_FOUND: "NOT_FOUND",
  CONFLICT: "CONFLICT",
  INTERNAL_ERROR: "INTERNAL_ERROR",
  EXTERNAL_API_ERROR: "EXTERNAL_API_ERROR",
  TIMEOUT: "TIMEOUT",
} as const;

/**
 * Helper to create success response
 */
export function createSuccessResponse<T>(
  data: T,
  correlationId: string
): ApiResponse<T> {
  return {
    success: true,
    data,
    error: null,
    correlationId,
  };
}

/**
 * Helper to create error response
 */
export function createErrorResponse(
  code: string,
  message: string,
  correlationId: string,
  details?: Record<string, unknown>
): ApiResponse<null> {
  return {
    success: false,
    data: null,
    error: {
      code,
      message,
      details,
    },
    correlationId,
  };
}

/**
 * Maps HTTP status codes to error codes
 */
export function getStatusForError(code: string): number {
  switch (code) {
    case ErrorCodes.VALIDATION_ERROR:
      return 400;
    case ErrorCodes.UNAUTHORIZED:
      return 401;
    case ErrorCodes.FORBIDDEN:
      return 403;
    case ErrorCodes.NOT_FOUND:
      return 404;
    case ErrorCodes.CONFLICT:
      return 409;
    case ErrorCodes.TIMEOUT:
      return 504;
    case ErrorCodes.EXTERNAL_API_ERROR:
      return 502;
    default:
      return 500;
  }
}
