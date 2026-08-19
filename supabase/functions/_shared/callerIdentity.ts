// NVIDIA operational-readiness Phase 2.
// Every service-role endpoint that used to answer a wildcard origin with no
// in-code identity check must call `requireCaller()` before it constructs a
// service-role client. The gateway JWT check is defense in depth; this is the
// in-code control that makes the caller provable inside the handler.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
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

/**
 * Resolves the calling user from the request's bearer token.
 * Throws `CallerRejected` (401) when the token is missing or invalid.
 */
export async function requireCaller(req: Request): Promise<CallerIdentity> {
  const authHeader = req.headers.get("Authorization") ?? "";
  const token = authHeader.replace(/^Bearer\s+/i, "").trim();

  if (!token) {
    throw new CallerRejected(401, "Missing authorization header");
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: `Bearer ${token}` } } },
  );

  const { data, error } = await supabase.auth.getUser();
  if (error || !data?.user) {
    throw new CallerRejected(401, "Invalid or expired token");
  }

  return { userId: data.user.id, email: data.user.email ?? null, token };
}

/** Additionally requires the caller to hold a role via `public.has_role`. */
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
