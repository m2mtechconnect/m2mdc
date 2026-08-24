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

export type RoleResolution =
  | { status: 'loading' }
  | { status: 'internal'; role: AppRole }
  | { status: 'tenant'; role: OrganizationRole; orgId: string }
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
          if (!cancelled) setResolution({ status: 'error', error: userError });
          return;
        }

        if (!user) {
          if (!cancelled) {
            setUserId(null);
            resetAuthorization();
            setResolution({ status: 'loading' });
          }
          return;
        }

        if (!cancelled) setUserId(user.id);

        const { data: roleRows, error: rolesError } = await supabase
          .from('user_roles')
          .select('role, scope, expires_at')
          .eq('user_id', user.id);

        if (rolesError) {
          if (!cancelled) {
            resetAuthorization();
            setResolution({ status: 'error', error: rolesError });
          }
          return;
        }

        const platformAuthorization = resolveAuthorization(roleRows ?? []);
        if (platformAuthorization.unmapped.length > 0) {
          console.error('Unmapped platform authorization labels ignored:', platformAuthorization.unmapped);
        }

        // Generated Supabase types intentionally lag additive enterprise
        // migrations on stacked branches. Keep this compatibility cast local
        // to the tenant resolver rather than weakening the generated client.
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const tenantDb = supabase as any;

        const { data: rawMemberships, error: membershipsError } = await tenantDb
          .from('org_memberships')
          .select('org_id, role, status, is_default')
          .eq('user_id', user.id)
          .eq('status', 'active');

        if (membershipsError) {
          if (!cancelled) {
            resetAuthorization();
            setResolution({ status: 'error', error: membershipsError });
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
              setResolution({ status: 'error', error });
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

        const { data: resolvedActiveOrgId, error: activeOrgError } = await tenantDb.rpc('active_org_id');
        if (activeOrgError) {
          if (!cancelled) {
            resetAuthorization();
            setResolution({ status: 'error', error: activeOrgError });
          }
          return;
        }

        const serverActiveOrgId = typeof resolvedActiveOrgId === 'string' ? resolvedActiveOrgId : null;
        const activeMembership =
          memberships.find((membership) => membership.orgId === serverActiveOrgId)
          ?? memberships.find((membership) => membership.isDefault)
          ?? memberships[0]
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
            setResolution({ status: 'internal', role: platformAuthorization.primaryRole });
          } else if (activeMembership) {
            setResolution({
              status: 'tenant',
              role: activeMembership.role,
              orgId: activeMembership.orgId,
            });
          } else {
            setResolution({ status: 'pilot' });
          }
        }
      } catch (error) {
        console.error('Error resolving authorization:', error);
        if (!cancelled) {
          resetAuthorization();
          setResolution({ status: 'error', error });
        }
      }
    };

    void fetchAuthorization();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        setUserId(session.user.id);
        setResolution({ status: 'loading' });
        setTimeout(() => void fetchAuthorization(), 0);
      } else {
        setUserId(null);
        resetAuthorization();
        setResolution({ status: 'loading' });
      }
    });

    return () => {
      cancelled = true;
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

      // Twin/location selections are tenant-scoped but historically persisted
      // without an org prefix. Remove them before reloading so a switch can
      // never carry a stale customer selection into the next organization.
      localStorage.removeItem('dc_active_location_id');
      localStorage.removeItem('dc_active_twin_id');

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
