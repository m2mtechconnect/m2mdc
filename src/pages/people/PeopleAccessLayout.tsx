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

const PLATFORM_NAV: Array<{
  label: string;
  href: string;
  match: string;
  permission?: Permission;
}> = [
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
 * Platform and tenant authority use different persistence planes. `/teams`
 * is organization-scoped whenever an active organization exists. Platform-only
 * callers are routed to the real Access Control / onboarding administration
 * surfaces instead of rendering the retired legacy Teams demo page.
 */
export default function PeopleAccessLayout({ children }: PeopleAccessLayoutProps) {
  const location = useLocation();
  const { can, resolution, activeOrganization } = useRBAC();

  if (location.pathname === '/teams') {
    if (activeOrganization) {
      if (!can('tenant.view_members')) return <Navigate to="/dashboard" replace />;
      return <TenantPeopleAccess />;
    }

    if (resolution.status === 'internal') {
      if (can('authz.view_assignments')) return <Navigate to="/teams/access-control" replace />;
      if (can('platform.view_admin_console')) return <Navigate to="/teams/onboarding" replace />;
    }
    return <Navigate to="/dashboard" replace />;
  }

  // Tenant users do not enter platform authorization / onboarding pages by URL.
  if (resolution.status === 'tenant') {
    return <Navigate to={can('tenant.view_members') ? '/teams' : '/dashboard'} replace />;
  }

  const visible = PLATFORM_NAV.filter((item) => !item.permission || can(item.permission));
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
        {current && (
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
          const active = location.pathname === item.match || location.pathname.startsWith(`${item.match}/`);
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
