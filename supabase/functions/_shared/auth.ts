import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

export type AuthLevel = "public" | "user" | "admin";

export interface AuthContext {
  userId?: string;
  user?: any;
  supabase: SupabaseClient;
}

/**
 * Creates a Supabase client with appropriate auth context
 * @param req - The incoming request
 * @param level - Required auth level: "public" (no auth), "user" (JWT required), "admin" (service role)
 */
export async function getAuthContext(
  req: Request,
  level: AuthLevel = "user"
): Promise<AuthContext> {
  const authHeader = req.headers.get("Authorization");

  // For admin-level endpoints, always use service role
  if (level === "admin") {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );
    return { supabase };
  }

  // For public endpoints, create client with optional auth
  if (level === "public") {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader || "" } } }
    );

    // Try to get user but don't fail if not present
    const { data: { user } } = await supabase.auth.getUser();
    return { 
      supabase, 
      user: user || undefined,
      userId: user?.id 
    };
  }

  // For user-level endpoints, require valid JWT
  if (!authHeader) {
    throw {
      code: "UNAUTHORIZED",
      message: "Missing authorization header",
      status: 401,
    };
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: authHeader } } }
  );

  const { data: { user }, error } = await supabase.auth.getUser();

  if (error || !user) {
    throw {
      code: "UNAUTHORIZED",
      message: "Invalid or expired token",
      status: 401,
    };
  }

  return { 
    supabase, 
    user, 
    userId: user.id 
  };
}

/**
 * Checks if user has a specific role
 */
export async function checkRole(
  supabase: SupabaseClient,
  userId: string,
  role: string
): Promise<boolean> {
  const { data, error } = await supabase
    .rpc("has_role", { _user_id: userId, _role: role });

  if (error) {
    console.error("Error checking role:", error);
    return false;
  }

  return data === true;
}
