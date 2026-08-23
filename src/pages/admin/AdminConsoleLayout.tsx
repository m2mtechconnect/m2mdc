import type { ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Building2, ChevronRight, Database, FileCheck2, Gauge, PackageCheck, Shield, Stethoscope } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useRBAC } from '@/contexts/RBACContext';
import type { Permission } from '@/auth/permissions';

interface AdminConsoleLayoutProps {
  children: ReactNode;
}

interface AdminNavItem {
  label: string;
  href: string;
  matches: readonly string[];
  icon: typeof Gauge;
  permission?: Permission;
}

const ADMIN_NAV: readonly AdminNavItem[] = [
  {
    label: 'Customers',
    href: '/admin/customers',
    matches: ['/admin/customers'],
    icon: Building2,
    permission: 'platform.manage_customers',
  },
  {
    label: 'Platform readiness',
    href: '/admin/platform-readiness',
    matches: ['/admin/platform-readiness'],
    icon: Gauge,
  },
  {
    label: 'DSX capabilities',
    href: '/admin/dsx-capabilities',
    matches: ['/admin/dsx-capabilities'],
    icon: FileCheck2,
  },
  {
    label: 'Dataset registry',
    href: '/admin/dataset-registry',
    matches: ['/admin/dataset-registry'],
    icon: Database,
  },
  {
    label: 'Asset derivatives',
    href: '/admin/asset-pipeline',
    matches: ['/admin/asset-pipeline', '/admin/asset-preview', '/admin/asset-validation'],
    icon: PackageCheck,
  },
  {
    label: 'Reference facility',
    href: '/admin/reference-facility-validation',
    matches: ['/admin/reference-facility-validation'],
    icon: Shield,
  },
  {
    label: 'Twin diagnostics',
    href: '/twin-debug',
    matches: ['/twin-debug'],
    icon: Stethoscope,
  },
];

/** Salesforce-style admin console; each child page retains the single page H1. */
export default function AdminConsoleLayout({ children }: AdminConsoleLayoutProps) {
  const location = useLocation();
  const { can } = useRBAC();
  const visibleAdminNav = ADMIN_NAV.filter((item) => !item.permission || can(item.permission));
  const current = visibleAdminNav.find((item) =>
    item.matches.some((match) => location.pathname === match || location.pathname.startsWith(`${match}/`)),
  );

  return (
    <section className="min-w-0 py-5" data-testid="platform-admin-workspace">
      <nav aria-label="Breadcrumb" className="mb-4 flex flex-wrap items-center gap-1 text-xs text-muted-foreground">
        <Link to="/dashboard" className="hover:text-foreground">Command Center</Link>
        <ChevronRight className="h-3 w-3" aria-hidden />
        <span>Govern</span>
        <ChevronRight className="h-3 w-3" aria-hidden />
        <span>Platform Administration</span>
        {current && (
          <>
            <ChevronRight className="h-3 w-3" aria-hidden />
            <span className="text-foreground">{current.label}</span>
          </>
        )}
      </nav>

      <div className="grid min-w-0 gap-6 lg:grid-cols-[240px_minmax(0,1fr)]">
        <aside className="min-w-0" aria-label="Platform administration sections">
          <nav className="flex max-w-full gap-1 overflow-x-auto lg:sticky lg:top-24 lg:flex-col lg:overflow-visible">
            {visibleAdminNav.map((item) => {
              const active = item.matches.some(
                (match) => location.pathname === match || location.pathname.startsWith(`${match}/`),
              );
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  to={item.href}
                  aria-current={active ? 'page' : undefined}
                  className={cn(
                    'flex min-h-10 shrink-0 items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors',
                    active
                      ? 'bg-primary/10 font-medium text-primary'
                      : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                  )}
                >
                  <Icon className="h-4 w-4" aria-hidden />
                  <span className="whitespace-nowrap">{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </aside>

        <div className="min-w-0">{children}</div>
      </div>
    </section>
  );
}
