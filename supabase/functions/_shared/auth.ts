import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  AdminAuthorizationError,
  authorizeAdminRequest,
} from "./adminAuthorization.ts";

export type AuthLevel = "public" | "user" | "admin";

export interface AuthContext {
  userId?: string;
  user?: any;
  organizationId?: string;
  tenantId?: string;
  roles?: string[];
  supabase: SupabaseClient;
}

/**
 * Creates a Supabase client with appropriate auth context
 * @param req - The incoming request
 * @param level - Required auth level: "public" (no auth), "user" (JWT required), "admin" (JWT, role and tenant required)
 */
export async function getAuthContext(
  req: Request,
  level: AuthLevel = "user"
): Promise<AuthContext> {
  const authHeader = req.headers.get("Authorization");

  // Administrative endpoints authenticate and authorize with the caller's
  // RLS-bound client. The service-role client is not created until every
  // identity, role and organization check succeeds.
  if (level === "admin") {
    const callerClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader || "" } } },
    );

    try {
      const authorized = await authorizeAdminRequest(
        authHeader,
        req.headers.get("X-Organization-Id"),
        {
          authenticate: async (token) => {
            const { data, error } = await callerClient.auth.getUser(token);
            return { data: data?.user ?? null, error };
          },
          listRoleGrants: async (userId) => {
            const { data, error } = await callerClient
              .from("user_roles")
              .select("role, scope, expires_at")
              .eq("user_id", userId);
            return { data, error };
          },
          listMemberships: async (userId) => {
            const { data, error } = await callerClient
              .from("profiles")
              .select("org_id")
              .eq("user_id", userId)
              .limit(2);
            return { data, error };
          },
          listOrganizations: async (organizationId) => {
            const { data, error } = await callerClient
              .from("organizations")
              .select("id")
              .eq("id", organizationId)
              .limit(2);
            return { data, error };
          },
          createServiceClient: () => createClient(
            Deno.env.get("SUPABASE_URL")!,
            Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
          ),
          audit: (event) => console.info("[admin-authorization]", event),
        },
      );

      return {
        supabase: authorized.serviceClient,
        user: authorized.user,
        userId: authorized.userId,
        organizationId: authorized.organizationId,
        tenantId: authorized.organizationId,
        roles: authorized.roles,
      };
    } catch (error) {
      if (error instanceof AdminAuthorizationError) {
        throw {
          code: error.code,
          message: error.message,
          status: error.status,
        };
      }
      throw error;
    }
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
