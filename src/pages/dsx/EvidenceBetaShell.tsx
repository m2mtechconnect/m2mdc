/**
 * DSX-aligned operator workspace shell.
 *
 * One runtime, one truth bar, one provenance drawer and eleven workspaces.
 * Navigation is stable across every workspace; the active workspace is the
 * only thing that changes.
 */
import { NavLink, Outlet } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { cn } from '@/lib/utils';
import { EvidenceBetaProvider, useWorkspace } from '@/dsx/runtime/EvidenceBetaContext';
import { OperationalTruthBar } from '@/components/dsx/OperationalTruthBar';
import { ProvenanceDrawer } from '@/components/dsx/ProvenanceDrawer';
import { statusRank } from '@/dsx/workspaces/constraints';

interface NavEntry { to: string; label: string; end?: boolean; domain?: string }

const NAV: { group: string; items: NavEntry[] }[] = [
  {
    group: 'Operate',
    items: [
      { to: '/dsx/evidence-beta', label: 'Facility overview', end: true },
      { to: '/dsx/evidence-beta/thermal', label: 'Thermal', domain: 'thermal' },
      { to: '/dsx/evidence-beta/power', label: 'Power', domain: 'power' },
      { to: '/dsx/evidence-beta/cooling', label: 'Cooling', domain: 'cooling' },
      { to: '/dsx/evidence-beta/network', label: 'Compute fabric', domain: 'network' },
    ],
  },
  {
    group: 'Model',
    items: [
      { to: '/dsx/evidence-beta/facility', label: 'Facility registry', domain: 'facility' },
      { to: '/dsx/evidence-beta/workload', label: 'Workload', domain: 'workload' },
    ],
  },
  {
    group: 'Assure',
    items: [
      { to: '/dsx/evidence-beta/sovereignty', label: 'Sovereignty', domain: 'sovereignty' },
      { to: '/dsx/evidence-beta/carbon', label: 'Carbon and water', domain: 'carbon' },
      { to: '/dsx/evidence-beta/financials', label: 'Financial exposure', domain: 'financial' },
      { to: '/dsx/evidence-beta/evidence', label: 'Evidence and decisions' },
    ],
  },
];

const DOT: Record<string, string> = {
  violation: 'bg-red-400',
  attention: 'bg-amber-400',
  normal: 'bg-emerald-400',
  unavailable: 'bg-zinc-500',
};

function WorkspaceNav() {
  const { constraints } = useWorkspace();
  const status = Object.fromEntries(constraints.map((c) => [c.domain, c.status]));

  return (
    <nav aria-label="DSX workspaces" className="w-60 shrink-0 border-r border-border bg-card/40 p-3">
      {NAV.map((g) => (
        <div key={g.group} className="pb-4">
          <p className="px-2 pb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            {g.group}
          </p>
          <ul className="space-y-0.5">
            {g.items.map((i) => {
              const s = i.domain ? status[i.domain] : undefined;
              return (
                <li key={i.to}>
                  <NavLink
                    to={i.to}
                    end={i.end}
                    data-testid={`dsx-nav-${i.label.toLowerCase().replace(/\s+/g, '-')}`}
                    className={({ isActive }) =>
                      cn(
                        'flex items-center gap-2 rounded-sm px-2 py-1.5 text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                        isActive ? 'bg-primary/15 font-semibold text-foreground' : 'text-muted-foreground hover:bg-muted/60',
                      )
                    }
                  >
                    {s && (
                      <span
                        aria-hidden
                        className={cn('h-1.5 w-1.5 shrink-0 rounded-full', DOT[s])}
                        data-status={s}
                      />
                    )}
                    <span className="truncate">{i.label}</span>
                    {s && <span className="sr-only">{s}</span>}
                  </NavLink>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );
}

function ShellBody() {
  return (
    <div className="flex min-h-[calc(100vh-4rem)] flex-col">
      <Helmet>
        <title>DSX Operator Workspace | AURA Data Centre Twin</title>
        <meta
          name="description"
          content="Deterministic, contract-validated DSX-aligned operator workspaces for the AURA data centre digital twin."
        />
      </Helmet>
      <OperationalTruthBar />
      <div className="flex flex-1">
        <WorkspaceNav />
        <main className="min-w-0 flex-1 p-6">
          <Outlet />
        </main>
      </div>
      <ProvenanceDrawer />
    </div>
  );
}

export default function EvidenceBetaShell() {
  return (
    <EvidenceBetaProvider>
      <ShellBody />
    </EvidenceBetaProvider>
  );
}