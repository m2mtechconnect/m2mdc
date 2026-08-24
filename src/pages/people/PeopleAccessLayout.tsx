import type { ReactNode } from 'react';
import { Link, Navigate, useLocation } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import { useRBAC } from '@/contexts/RBACContext';
import type { Permission } from '@/auth/permissions';
import { cn } from '@/lib/utils';
import TenantPeopleAccess from '@/pages/people/TenantPeopleAccess';

interface PeopleAccessLayoutProps {
  children: ReactNode;
}

const LOCAL_NAV: Array<{
  label: string;
  href: string;
  match: string;
  permission?: Permission;
}> = [
  { label: 'Members & approvals', href: '/teams', match: '/teams' },
  {
    label: 'Access control',
    href: '/teams/access-control',
    match: '/teams/access-control',
    permission: 'authz.view_assignments',
  },
  {
    label: 'Onboarding submissions',
    href: '/teams/onboarding',
    match: '/teams/onboarding',
    permission: 'platform.view_admin_console',
  },
];

/**
 * Platform and tenant authority use different persistence planes. The legacy
 * Teams page remains available for platform-only administration routes, while
 * /teams renders the organization-scoped member surface whenever an active
 * organization exists.
 */
export default function PeopleAccessLayout({ children }: PeopleAccessLayoutProps) {
  const location = useLocation();
  const { can, resolution, activeOrganization } = useRBAC();

  const tenantMembersRoute = location.pathname === '/teams' && !!activeOrganization;
  if (tenantMembersRoute) {
    if (!can('tenant.view_members')) return <Navigate to="/dashboard" replace />;
    return <TenantPeopleAccess />;
  }

  // Tenant users do not enter platform authorization / onboarding pages by URL.
  if (resolution.status === 'tenant') {
    return <Navigate to={can('tenant.view_members') ? '/teams' : '/dashboard'} replace />;
  }

  const visible = LOCAL_NAV.filter((item) => !item.permission || can(item.permission));
  const current = [...visible]
    .sort((a, b) => b.match.length - a.match.length)
    .find((item) => location.pathname === item.match || location.pathname.startsWith(`${item.match}/`));

  return (
    <section className="min-w-0 py-5" data-testid="people-access-workspace">
      <nav aria-label="Breadcrumb" className="mb-3 flex flex-wrap items-center gap-1 text-xs text-muted-foreground">
        <Link to="/dashboard" className="hover:text-foreground">Command Center</Link>
        <ChevronRight className="h-3 w-3" aria-hidden />
        <span>Govern</span>
        <ChevronRight className="h-3 w-3" aria-hidden />
        <span className="text-foreground">People &amp; Access</span>
        {current && current.href !== '/teams' && (
          <>
            <ChevronRight className="h-3 w-3" aria-hidden />
            <span className="text-foreground">{current.label}</span>
          </>
        )}
      </nav>

      <nav
        aria-label="People and access sections"
        className="mb-4 flex max-w-full gap-1 overflow-x-auto border-b border-border"
      >
        {visible.map((item) => {
          const active = item.href === '/teams'
            ? location.pathname === '/teams'
            : location.pathname === item.match || location.pathname.startsWith(`${item.match}/`);
          return (
            <Link
              key={item.href}
              to={item.href}
              aria-current={active ? 'page' : undefined}
              className={cn(
                'whitespace-nowrap border-b-2 px-3 py-2 text-sm font-medium transition-colors',
                active
                  ? 'border-primary text-foreground'
                  : 'border-transparent text-muted-foreground hover:text-foreground',
              )}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="min-w-0">{children}</div>
    </section>
  );
}
