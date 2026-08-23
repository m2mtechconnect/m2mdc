// Compatibility wrapper around the canonical request-authentication boundary.
// Keep the existing requireCaller()/requireCallerRole() API for handlers while
// delegating bearer-token validation to _shared/auth.ts so authentication logic
// has one implementation.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getAuthContext } from "./auth.ts";
import { getCorsHeaders } from "./cors.ts";

export interface CallerIdentity {
  userId: string;
  email: string | null;
  token: string;
}

export class CallerRejected extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = "CallerRejected";
  }
}

function bearerToken(req: Request): string {
  return (req.headers.get("Authorization") ?? "")
    .replace(/^Bearer\s+/i, "")
    .trim();
}

function normalizeAuthError(error: unknown): CallerRejected | null {
  if (error instanceof CallerRejected) return error;
  if (!error || typeof error !== "object") return null;

  const candidate = error as { status?: unknown; message?: unknown };
  if (typeof candidate.status !== "number") return null;
  return new CallerRejected(
    candidate.status,
    typeof candidate.message === "string" ? candidate.message : "Caller rejected",
  );
}

/**
 * Resolves the calling user from the canonical shared auth context.
 * Throws CallerRejected when the token is missing, invalid or expired.
 */
export async function requireCaller(req: Request): Promise<CallerIdentity> {
  const token = bearerToken(req);
  if (!token) throw new CallerRejected(401, "Missing authorization header");

  try {
    const context = await getAuthContext(req, "user");
    if (!context.userId) throw new CallerRejected(401, "Invalid or expired token");
    return {
      userId: context.userId,
      email: context.user?.email ?? null,
      token,
    };
  } catch (error) {
    const normalized = normalizeAuthError(error);
    if (normalized) throw normalized;
    throw error;
  }
}

/**
 * Additionally requires the caller to hold a role via public.has_role.
 * Role lookup keeps its existing privileged RPC semantics; only authentication
 * is consolidated here.
 */
export async function requireCallerRole(
  req: Request,
  role: string,
): Promise<CallerIdentity> {
  const caller = await requireCaller(req);

  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );
  const { data, error } = await admin.rpc("has_role", {
    _user_id: caller.userId,
    _role: role,
  });

  if (error || data !== true) {
    throw new CallerRejected(403, `Caller lacks required role: ${role}`);
  }

  return caller;
}

export function callerRejectedResponse(
  error: unknown,
  req: Request,
): Response | null {
  if (!(error instanceof CallerRejected)) return null;
  return new Response(
    JSON.stringify({ error: error.message }),
    {
      status: error.status,
      headers: {
        ...getCorsHeaders(req.headers.get("origin")),
        "Content-Type": "application/json",
      },
    },
  );
}
