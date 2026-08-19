export const ADMINISTRATIVE_ROLES = [
  "security_admin",
  "admin",
  "owner",
] as const;

export type AdministrativeRole = (typeof ADMINISTRATIVE_ROLES)[number];

export interface AuthenticatedAdminUser {
  id: string;
  email?: string | null;
  [key: string]: unknown;
}

export interface RoleGrant {
  role: string | null;
  scope?: string | null;
  expires_at?: string | null;
}

export interface OrganizationMembership {
  org_id: string | null;
  is_approved: boolean | null;
}

export interface OrganizationRecord {
  id: string;
}

export interface AuthorizationLookup<T> {
  data: T | null;
  error?: unknown;
}

export interface AdminAuthorizationAuditEvent {
  outcome: "allowed" | "denied" | "error";
  code: string;
  userId?: string;
  organizationId?: string;
  role?: AdministrativeRole;
}

export interface AdminAuthorizationDependencies<TServiceClient> {
  authenticate: (token: string) => Promise<AuthorizationLookup<AuthenticatedAdminUser>>;
  listRoleGrants: (userId: string) => Promise<AuthorizationLookup<RoleGrant[]>>;
  listMemberships: (userId: string) => Promise<AuthorizationLookup<OrganizationMembership[]>>;
  listOrganizations: (organizationId: string) => Promise<AuthorizationLookup<OrganizationRecord[]>>;
  createServiceClient: () => TServiceClient;
  audit?: (event: AdminAuthorizationAuditEvent) => void;
  now?: () => Date;
}

export interface AuthorizedAdminContext<TServiceClient> {
  user: AuthenticatedAdminUser;
  userId: string;
  organizationId: string;
  roles: AdministrativeRole[];
  serviceClient: TServiceClient;
}

export class AdminAuthorizationError extends Error {
  constructor(
    public readonly code: string,
    public readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = "AdminAuthorizationError";
  }
}

function safeAudit(
  audit: AdminAuthorizationDependencies<unknown>["audit"],
  event: AdminAuthorizationAuditEvent,
): void {
  try {
    audit?.(event);
  } catch {
    // Audit transport must never alter the authorization decision.
  }
}

function reject(
  audit: AdminAuthorizationDependencies<unknown>["audit"],
  code: string,
  status: number,
  message: string,
  evidence: Omit<AdminAuthorizationAuditEvent, "outcome" | "code"> = {},
): never {
  safeAudit(audit, {
    outcome: status >= 500 ? "error" : "denied",
    code,
    ...evidence,
  });
  throw new AdminAuthorizationError(code, status, message);
}

function bearerToken(
  authorizationHeader: string | null | undefined,
  audit: AdminAuthorizationDependencies<unknown>["audit"],
): string {
  const header = authorizationHeader?.trim() ?? "";
  const match = header.match(/^Bearer\s+([^\s]+)$/i);
  if (!match) {
    reject(audit, "UNAUTHORIZED", 401, "Missing or invalid authorization header");
  }
  return match[1];
}

function isActiveGlobalGrant(grant: RoleGrant, now: Date): grant is RoleGrant & { role: AdministrativeRole } {
  if (!(ADMINISTRATIVE_ROLES as readonly string[]).includes(grant.role ?? "")) return false;
  if (grant.scope !== null && grant.scope !== undefined && grant.scope !== "global") return false;
  if (!grant.expires_at) return true;
  const expiresAt = new Date(grant.expires_at);
  return Number.isFinite(expiresAt.getTime()) && expiresAt > now;
}

/**
 * Fail-closed administrative authorization boundary.
 *
 * The service-role client factory is deliberately a dependency and is invoked
 * only after bearer authentication, canonical role resolution, approved
 * profiles membership, and canonical organization validation have all succeeded.
 */
export async function authorizeAdminRequest<TServiceClient>(
  authorizationHeader: string | null | undefined,
  requestedOrganizationId: string | null | undefined,
  dependencies: AdminAuthorizationDependencies<TServiceClient>,
): Promise<AuthorizedAdminContext<TServiceClient>> {
  const token = bearerToken(authorizationHeader, dependencies.audit);

  const authentication = await dependencies.authenticate(token);
  if (authentication.error || !authentication.data?.id) {
    reject(dependencies.audit, "UNAUTHORIZED", 401, "Invalid or expired token");
  }
  const user = authentication.data;

  const grants = await dependencies.listRoleGrants(user.id);
  if (grants.error) {
    reject(
      dependencies.audit,
      "AUTHORIZATION_LOOKUP_FAILED",
      500,
      "Unable to resolve administrative authority",
      { userId: user.id },
    );
  }

  const now = dependencies.now?.() ?? new Date();
  const roles = (grants.data ?? [])
    .filter((grant) => isActiveGlobalGrant(grant, now))
    .map((grant) => grant.role);
  const distinctRoles = Array.from(new Set(roles));
  if (distinctRoles.length === 0) {
    reject(
      dependencies.audit,
      "FORBIDDEN",
      403,
      "Administrative authority is required",
      { userId: user.id },
    );
  }

  const memberships = await dependencies.listMemberships(user.id);
  if (memberships.error) {
    reject(
      dependencies.audit,
      "TENANT_LOOKUP_FAILED",
      500,
      "Unable to resolve organization membership",
      { userId: user.id, role: distinctRoles[0] },
    );
  }

  const membershipRecords = memberships.data ?? [];
  if (membershipRecords.length !== 1) {
    reject(
      dependencies.audit,
      "TENANT_CONTEXT_REQUIRED",
      403,
      "A single profile membership is required",
      { userId: user.id, role: distinctRoles[0] },
    );
  }

  const membership = membershipRecords[0];
  if (membership.is_approved !== true) {
    reject(
      dependencies.audit,
      "PROFILE_NOT_APPROVED",
      403,
      "An approved profile is required",
      { userId: user.id, role: distinctRoles[0] },
    );
  }

  const organizationId = typeof membership.org_id === "string"
    ? membership.org_id.trim()
    : "";
  if (!organizationId) {
    reject(
      dependencies.audit,
      "TENANT_CONTEXT_REQUIRED",
      403,
      "A valid organization membership is required",
      { userId: user.id, role: distinctRoles[0] },
    );
  }

  const requested = requestedOrganizationId?.trim();
  if (requested && requested !== organizationId) {
    reject(
      dependencies.audit,
      "TENANT_SCOPE_VIOLATION",
      403,
      "Requested organization is outside the caller's tenant",
      { userId: user.id, organizationId, role: distinctRoles[0] },
    );
  }

  const organizations = await dependencies.listOrganizations(organizationId);
  if (organizations.error) {
    reject(
      dependencies.audit,
      "TENANT_LOOKUP_FAILED",
      500,
      "Unable to validate organization membership",
      { userId: user.id, organizationId, role: distinctRoles[0] },
    );
  }
  if (
    (organizations.data ?? []).length !== 1 ||
    organizations.data?.[0]?.id !== organizationId
  ) {
    reject(
      dependencies.audit,
      "TENANT_CONTEXT_REQUIRED",
      403,
      "Organization membership is not valid",
      { userId: user.id, organizationId, role: distinctRoles[0] },
    );
  }

  const serviceClient = dependencies.createServiceClient();
  safeAudit(dependencies.audit, {
    outcome: "allowed",
    code: "ADMIN_AUTHORIZED",
    userId: user.id,
    organizationId,
    role: distinctRoles[0],
  });

  return {
    user,
    userId: user.id,
    organizationId,
    roles: distinctRoles,
    serviceClient,
  };
}
