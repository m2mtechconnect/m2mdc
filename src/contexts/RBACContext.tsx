import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import {
  EMPTY_AUTHORIZATION,
  resolveAuthorization,
  type AnyRole,
  type Permission,
  type ResolvedAuthorization,
} from '@/auth/permissions';
import {
  isOrganizationRole,
  organizationPermissions,
  type OrganizationMembershipSummary,
  type OrganizationRole,
} from '@/auth/organizationAuthorization';
import { selectUnambiguousMembership } from '@/auth/activeOrgBootstrap';
import { clearTenantScopedClientState } from '@/auth/tenantStorageIsolation';

/**
 * Canonical authorization provider.
 *
 * Platform authority comes only from public.user_roles. Customer authority
 * comes only from public.org_memberships for the currently-active organization.
 * The two planes are deliberately separate: an organization admin is not a
 * platform admin, even when both roles happen to use the string "admin".
 */
export type AppRole = AnyRole;
export type { Permission } from '@/auth/permissions';

/**
 * Maximum time the authorization chain (getUser + role/membership reads +
 * active-org RPCs) may take before the provider fails closed into a
 * recoverable error. `loading` is a transient state only: it must never be
 * the state the UI settles in.
 */
export const AUTHORIZATION_BUDGET_MS = 15_000;

export class AuthorizationTimeoutError extends Error {
  constructor() {
    super('Authorization did not resolve within the allowed budget.');
    this.name = 'AuthorizationTimeoutError';
  }
}

export type RoleResolution =
  | { status: 'loading' }
  | { status: 'internal'; role: AppRole }
  | { status: 'tenant'; role: OrganizationRole; orgId: string }
  /**
   * Authenticated with organization memberships, but no membership could be
   * verified as the active organization through server authority. Fail-closed:
   * no tenant permissions are granted and surfaces must render recovery
   * guidance instead of guessing a tenant in browser state.
   */
  | { status: 'tenant-unresolved' }
  /**
   * The server rejected or no longer recognises the caller. A locally
   * persisted session is NOT evidence of authentication: getUser() is the
   * authority. This is terminal, not transient - surfaces must redirect to
   * sign-in rather than continue spinning.
   */
  | { status: 'unauthenticated' }
  | { status: 'pilot' }
  | { status: 'error'; error: unknown };

interface RBACContextType {
  role: AppRole | null;
  loading: boolean;
  /** Legacy role-label gate. Deliberately evaluates platform grants only. */
  hasAccess: (requiredRoles: AppRole[]) => boolean;
  userId: string | null;
  isInternal: boolean;
  isPlatformOwner: boolean;
  resolution: RoleResolution;
  retry: () => void;
  /** Active platform/global roles only. Tenant authority is organizationRole. */
  roles: AppRole[];
  permissions: Permission[];
  can: (permission: Permission) => boolean;
  authorization: ResolvedAuthorization;
  organizations: OrganizationMembershipSummary[];
  activeOrganization: OrganizationMembershipSummary | null;
  activeOrgId: string | null;
  organizationRole: OrganizationRole | null;
  switchingOrganization: boolean;
  switchOrganization: (orgId: string) => Promise<void>;
}

const RBACContext = createContext<RBACContextType>({
  role: null,
  loading: true,
  hasAccess: () => false,
  userId: null,
  isInternal: false,
  isPlatformOwner: false,
  resolution: { status: 'loading' },
  retry: () => {},
  roles: [],
  permissions: [],
  can: () => false,
  authorization: EMPTY_AUTHORIZATION,
  organizations: [],
  activeOrganization: null,
  activeOrgId: null,
  organizationRole: null,
  switchingOrganization: false,
  switchOrganization: async () => {},
});

export const useRBAC = () => useContext(RBACContext);

interface MembershipRow {
  org_id: string;
  role: string;
  status: string;
  is_default: boolean;
}

interface OrganizationRow {
  id: string;
  name: string;
  domain: string | null;
}

export const RBACProvider = ({ children }: { children: ReactNode }) => {
  const [userId, setUserId] = useState<string | null>(null);
  const [resolution, setResolution] = useState<RoleResolution>({ status: 'loading' });
  const [retryTick, setRetryTick] = useState(0);
  const [authorization, setAuthorization] = useState<ResolvedAuthorization>(EMPTY_AUTHORIZATION);
  const [platformRoles, setPlatformRoles] = useState<AppRole[]>([]);
  const [effectivePermissions, setEffectivePermissions] = useState<Set<Permission>>(new Set());
  const [organizations, setOrganizations] = useState<OrganizationMembershipSummary[]>([]);
  const [activeOrgId, setActiveOrgId] = useState<string | null>(null);
  const [organizationRole, setOrganizationRole] = useState<OrganizationRole | null>(null);
  const [isPlatformOwner, setIsPlatformOwner] = useState(false);
  const [switchingOrganization, setSwitchingOrganization] = useState(false);

  const retry = useCallback(() => {
    setResolution({ status: 'loading' });
    setRetryTick((n) => n + 1);
  }, []);

  useEffect(() => {
    let cancelled = false;
    let budgetTimer: ReturnType<typeof setTimeout> | null = null;

    // `loading` must always be time-boxed. If the authorization chain never
    // settles (hung request, unreachable backend), fail closed into a
    // recoverable error rather than spinning forever. No permissions are
    // granted by this path.
    const armBudget = () => {
      if (budgetTimer) clearTimeout(budgetTimer);
      budgetTimer = setTimeout(() => {
        if (cancelled) return;
        setResolution((current) =>
          current.status === 'loading'
            ? { status: 'error', error: new AuthorizationTimeoutError() }
            : current,
        );
      }, AUTHORIZATION_BUDGET_MS);
    };

    const disarmBudget = () => {
      if (budgetTimer) clearTimeout(budgetTimer);
      budgetTimer = null;
    };

    const settle = (next: RoleResolution) => {
      if (cancelled) return;
      disarmBudget();
      setResolution(next);
    };

    const resetAuthorization = () => {
      setAuthorization(EMPTY_AUTHORIZATION);
      setPlatformRoles([]);
      setEffectivePermissions(new Set());
      setOrganizations([]);
      setActiveOrgId(null);
      setOrganizationRole(null);
      setIsPlatformOwner(false);
    };

    const fetchAuthorization = async () => {
      try {
        const { data: { user }, error: userError } = await supabase.auth.getUser();

        if (userError) {
          if (!cancelled) settle({ status: 'error', error: userError });
          return;
        }

        // getUser() is the server authority. A persisted browser session that
        // the server no longer recognises is an authentication failure, not a
        // pending load: settle terminally so the caller redirects to sign-in.
        if (!user) {
          if (!cancelled) {
            setUserId(null);
            resetAuthorization();
            settle({ status: 'unauthenticated' });
          }
          return;
        }


        if (!cancelled) setUserId(user.id);

        // Generated Supabase types intentionally lag additive enterprise
        // migrations on stacked branches. Keep this compatibility cast local
        // to the tenant resolver rather than weakening the generated client.
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const tenantDb = supabase as any;

        // These reads share the same verified caller but do not depend on one
        // another. Resolve them concurrently to remove three serial network
        // round trips from every cold authorization bootstrap. The results are
        // still validated independently and every failure remains fail-closed.
        const [rolesResult, membershipsResult, activeOrgResult] = await Promise.all([
          supabase
            .from('user_roles')
            .select('role, scope, expires_at')
            .eq('user_id', user.id),
          tenantDb
            .from('org_memberships')
            .select('org_id, role, status, is_default')
            .eq('user_id', user.id)
            .eq('status', 'active'),
          tenantDb.rpc('active_org_id'),
        ]);

        const { data: roleRows, error: rolesError } = rolesResult;

        if (rolesError) {
          if (!cancelled) {
            resetAuthorization();
            settle({ status: 'error', error: rolesError });
          }
          return;
        }

        const platformAuthorization = resolveAuthorization(roleRows ?? []);
        if (platformAuthorization.unmapped.length > 0) {
          console.error('Unmapped platform authorization labels ignored:', platformAuthorization.unmapped);
        }

        const { data: rawMemberships, error: membershipsError } = membershipsResult;

        if (membershipsError) {
          if (!cancelled) {
            resetAuthorization();
            settle({ status: 'error', error: membershipsError });
          }
          return;
        }

        const membershipRows = (rawMemberships ?? []) as MembershipRow[];
        const orgIds = membershipRows.map((membership) => membership.org_id);

        let orgRows: OrganizationRow[] = [];
        if (orgIds.length > 0) {
          const { data, error } = await tenantDb
            .from('organizations')
            .select('id, name, domain')
            .in('id', orgIds);
          if (error) {
            if (!cancelled) {
              resetAuthorization();
              settle({ status: 'error', error });
            }
            return;
          }
          orgRows = (data ?? []) as OrganizationRow[];
        }

        const orgById = new Map(orgRows.map((org) => [org.id, org]));
        const memberships: OrganizationMembershipSummary[] = membershipRows
          .filter((membership) => isOrganizationRole(membership.role))
          .map((membership) => {
            const org = orgById.get(membership.org_id);
            return {
              orgId: membership.org_id,
              orgName: org?.name ?? 'Organization',
              domain: org?.domain ?? null,
              role: membership.role as OrganizationRole,
              isDefault: membership.is_default,
            };
          });

        const { data: resolvedActiveOrgId, error: activeOrgError } = activeOrgResult;
        if (activeOrgError) {
          if (!cancelled) {
            resetAuthorization();
            settle({ status: 'error', error: activeOrgError });
          }
          return;
        }

        let serverActiveOrgId = typeof resolvedActiveOrgId === 'string' ? resolvedActiveOrgId : null;

        // The server-owned active organization is authoritative. When it is
        // missing, bootstrap it ONLY when membership selection is unambiguous
        // (exactly one default membership, or exactly one membership total).
        // The bootstrap goes through the server RPC and is read back; when
        // verification fails the resolution fails closed. The browser never
        // falls back to "the first" membership in local state.
        if (!serverActiveOrgId && memberships.length > 0) {
          const candidate = selectUnambiguousMembership(memberships);
          if (candidate) {
            try {
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              const { error: setActiveError } = await (tenantDb as any).rpc('set_active_org', { _org_id: candidate.orgId });
              if (setActiveError) throw setActiveError;
              const { data: verifiedActiveOrgId } = await tenantDb.rpc('active_org_id');
              if (verifiedActiveOrgId === candidate.orgId) {
                serverActiveOrgId = candidate.orgId;
              } else {
                console.warn('[RBAC] Active organization bootstrap verification failed; failing closed');
              }
            } catch (bootstrapError) {
              console.warn('[RBAC] Active organization bootstrap failed; failing closed', bootstrapError);
            }
          }
        }

        // The active membership must come from the verified server authority.
        // No browser-side fallback to a default or first membership.
        const activeMembership =
          memberships.find((membership) => membership.orgId === serverActiveOrgId)
          ?? null;

        const tenantPermissions = organizationPermissions(activeMembership?.role ?? null);
        const combinedPermissions = new Set<Permission>(platformAuthorization.permissions);
        tenantPermissions.forEach((permission) => combinedPermissions.add(permission));

        const platformOwner = platformAuthorization.grants.some(
          (grant) => grant.role === 'owner' && (grant.scope === null || grant.scope === 'global'),
        );

        if (!cancelled) {
          setAuthorization(platformAuthorization);
          setEffectivePermissions(combinedPermissions);
          setPlatformRoles(platformAuthorization.roles);
          setOrganizations(memberships);
          setActiveOrgId(activeMembership?.orgId ?? null);
          setOrganizationRole(activeMembership?.role ?? null);
          setIsPlatformOwner(platformOwner);

          if (platformAuthorization.primaryRole) {
            settle({ status: 'internal', role: platformAuthorization.primaryRole });
          } else if (activeMembership) {
            settle({
              status: 'tenant',
              role: activeMembership.role,
              orgId: activeMembership.orgId,
            });
          } else if (memberships.length > 0) {
            // Memberships exist but none could be verified as the active
            // organization. Authenticated yet tenant-less: fail closed into a
            // dedicated state so surfaces render precise recovery guidance.
            settle({ status: 'tenant-unresolved' });
          } else {
            settle({ status: 'pilot' });
          }
        }
      } catch (error) {
        console.error('Error resolving authorization:', error);
        if (!cancelled) {
          resetAuthorization();
          settle({ status: 'error', error });
        }
      }
    };

    armBudget();
    void fetchAuthorization();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      // fetchAuthorization() above already owns the initial server-verified
      // bootstrap. Supabase also emits INITIAL_SESSION immediately after the
      // listener is registered; starting a second identical query chain here
      // doubled cold-load authorization traffic and introduced a resolution
      // race without adding any security evidence.
      if (event === 'INITIAL_SESSION') return;

      if (session?.user) {
        setUserId(session.user.id);
        setResolution({ status: 'loading' });
        armBudget();
        setTimeout(() => void fetchAuthorization(), 0);
      } else {
        // No session is a terminal authentication outcome, not a pending one.
        setUserId(null);
        resetAuthorization();
        settle({ status: 'unauthenticated' });
      }
    });

    return () => {
      cancelled = true;
      disarmBudget();
      subscription.unsubscribe();
    };
  }, [retryTick]);

  const switchOrganization = useCallback(async (orgId: string) => {
    if (!organizations.some((organization) => organization.orgId === orgId)) {
      throw new Error('Organization membership required');
    }

    setSwitchingOrganization(true);
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const tenantDb = supabase as any;
      const { error } = await tenantDb.rpc('set_active_org', { _org_id: orgId });
      if (error) throw error;

      // Legacy customer stores are not namespaced by organization. Purge the
      // complete tenant-scoped set before the hard reload so content from the
      // previous customer can never be rehydrated into the new organization.
      clearTenantScopedClientState(window.localStorage, window.sessionStorage);

      // A full shell reload intentionally flushes React/query/store state from
      // the previous tenant. The server-side active-org membership check has
      // already completed before navigation occurs.
      window.location.assign('/dashboard');
    } finally {
      setSwitchingOrganization(false);
    }
  }, [organizations]);

  const role: AppRole | null =
    resolution.status === 'internal' || resolution.status === 'tenant' ? resolution.role : null;
  const isInternal = resolution.status === 'internal';
  const loading = resolution.status === 'loading';
  const activeOrganization = organizations.find((organization) => organization.orgId === activeOrgId) ?? null;

  const hasAccess = (requiredRoles: AppRole[]) => {
    if (platformRoles.length === 0) return false;
    return requiredRoles.some((required) => platformRoles.includes(required));
  };

  const can = (permission: Permission) => effectivePermissions.has(permission);

  return (
    <RBACContext.Provider
      value={{
        role,
        loading,
        hasAccess,
        userId,
        isInternal,
        isPlatformOwner,
        resolution,
        retry,
        roles: platformRoles,
        permissions: Array.from(effectivePermissions),
        can,
        authorization,
        organizations,
        activeOrganization,
        activeOrgId,
        organizationRole,
        switchingOrganization,
        switchOrganization,
      }}
    >
      {children}
    </RBACContext.Provider>
  );
};
