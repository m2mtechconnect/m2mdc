import { z } from "https://deno.land/x/zod@v3.23.8/mod.ts";
import { getAuthContext, AuthLevel } from "./auth.ts";
import {
  createCorsJsonResponse,
  evaluateCorsOrigin,
  handleCorsPreflightRequest,
} from "./cors.ts";
import {
  ApiResponse,
  createSuccessResponse,
  createErrorResponse,
  ErrorCodes,
  getStatusForError,
} from "./types.ts";

export interface HandlerConfig<TInput, TOutput> {
  /** Function name for logging */
  name: string;
  /** Required auth level */
  authLevel?: AuthLevel;
  /** Zod schema for request body validation */
  inputSchema?: z.ZodType<TInput>;
  /** Main business logic handler */
  handler: (input: TInput, context: HandlerContext) => Promise<TOutput>;
}

export interface HandlerContext {
  req: Request;
  correlationId: string;
  userId?: string;
  user?: any;
  organizationId?: string;
  tenantId?: string;
  roles?: string[];
  supabase: any;
  log: (message: string, extra?: Record<string, unknown>) => void;
}

/**
 * Creates a standardized edge function handler with:
 * - Automatic correlation ID generation
 * - Request/response logging
 * - Auth validation
 * - Input validation with Zod
 * - Consistent error handling
 * - Standard response envelope
 */
export function createHandler<TInput = any, TOutput = any>(
  config: HandlerConfig<TInput, TOutput>
) {
  return async (req: Request): Promise<Response> => {
    const correlationId = crypto.randomUUID();
    const startedAt = Date.now();
    const { name, authLevel = "user", inputSchema, handler } = config;

    const log = (msg: string, extra: Record<string, unknown> = {}) => {
      console.log(`[${name}:${correlationId}]`, msg, extra);
    };

    try {
      log("Request started", { method: req.method, url: req.url });

      // Handle CORS preflight
      if (req.method === "OPTIONS") {
        return handleCorsPreflightRequest(req);
      }

      const cors = evaluateCorsOrigin(req.headers.get("origin"));
      if (!cors.allowed) {
        return createCorsJsonResponse(req, createErrorResponse(
          "CORS_ORIGIN_DENIED",
          "Origin is not allowed",
          correlationId,
        ), 403);
      }

      // Authenticate
      let authContext;
      try {
        authContext = await getAuthContext(req, authLevel);
      } catch (authError: any) {
        log("Auth failed", { error: authError });
        const response = createErrorResponse(
          authError.code || ErrorCodes.UNAUTHORIZED,
          authError.message || "Authentication failed",
          correlationId
        );
        return createCorsJsonResponse(req, response, authError.status || 401);
      }

      // Parse and validate input
      let input: TInput;
      if (req.method === "GET") {
        const url = new URL(req.url);
        const params = Object.fromEntries(url.searchParams);
        input = params as TInput;
      } else {
        try {
          input = await req.json();
        } catch {
          input = {} as TInput;
        }
      }

      if (inputSchema) {
        const parseResult = inputSchema.safeParse(input);
        if (!parseResult.success) {
          log("Validation failed", { issues: parseResult.error.issues });
          const response = createErrorResponse(
            ErrorCodes.VALIDATION_ERROR,
            "Request validation failed",
            correlationId,
            { issues: parseResult.error.issues }
          );
          return createCorsJsonResponse(req, response, 400);
        }
        input = parseResult.data;
      }

      // Execute handler
      const context: HandlerContext = {
        req,
        correlationId,
        userId: authContext.userId,
        user: authContext.user,
        organizationId: authContext.organizationId,
        tenantId: authContext.tenantId,
        roles: authContext.roles,
        supabase: authContext.supabase,
        log,
      };

      const result = await handler(input, context);

      const duration = Date.now() - startedAt;
      log("Success", { durationMs: duration });

      const response = createSuccessResponse(result, correlationId);
      return createCorsJsonResponse(req, response, 200);
    } catch (err) {
      const duration = Date.now() - startedAt;
      
      // Standardize error format - convert object throws to Error instances
      const error = err instanceof Error ? err : new Error(
        typeof err === 'object' && err !== null && 'message' in err 
          ? String((err as { message: unknown }).message)
          : String(err)
      );
      
      // Extract error properties with type safety
      const code = (err && typeof err === 'object' && 'code' in err) 
        ? (err as { code: string }).code 
        : ErrorCodes.INTERNAL_ERROR;
      const message = error.message || "An unexpected error occurred";
      const status = (err && typeof err === 'object' && 'status' in err)
        ? (err as { status: number }).status
        : getStatusForError(code);

      log("Error", { 
        error: message, 
        code,
        stack: error.stack, 
        durationMs: duration 
      });

      const response = createErrorResponse(
        code,
        message,
        correlationId,
        { error: message }
      );

      return createCorsJsonResponse(req, response, status);
    }
  };
}
