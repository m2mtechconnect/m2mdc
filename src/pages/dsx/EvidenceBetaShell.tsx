/**
 * DSX-aligned operator workspace shell.
 *
 * A single investigation surface: a persistent left rail (navigation plus
 * facility scope), a centre workspace, and a right contextual drawer. The
 * operational truth bar and the investigation context bar are always visible,
 * so the operator always knows what they are looking at and how trustworthy
 * it is.
 */
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { cn } from '@/lib/utils';
import { EvidenceBetaProvider, useWorkspace } from '@/dsx/runtime/EvidenceBetaContext';
import { OperationalTruthBar } from '@/components/dsx/OperationalTruthBar';
import { ProvenanceDrawer } from '@/components/dsx/ProvenanceDrawer';
import { ContextBar } from '@/components/dsx/ContextBar';
import { AssetDrawer } from '@/components/dsx/AssetDrawer';
import { ConstraintDrawer } from '@/components/dsx/ConstraintDrawer';
import { buildHierarchy, type HierarchyNode } from '@/dsx/workspaces/facilityGraph';
import { DSX_ROOT, relatedViewsForDomain } from '@/dsx/workspaces/relatedViews';

interface NavEntry { to: string; label: string; end?: boolean; domain?: string }

/**
 * Grouped by operator intent: what is happening, what is it made of,
 * and what can be proven about it.
 */
const NAV: { group: string; items: NavEntry[] }[] = [
  {
    group: 'Operate',
    items: [
      { to: DSX_ROOT, label: 'Facility overview', end: true },
      { to: `${DSX_ROOT}/thermal`, label: 'Thermal', domain: 'thermal' },
      { to: `${DSX_ROOT}/power`, label: 'Power', domain: 'power' },
      { to: `${DSX_ROOT}/cooling`, label: 'Cooling', domain: 'cooling' },
      { to: `${DSX_ROOT}/network`, label: 'Compute fabric', domain: 'network' },
    ],
  },
  {
    group: 'Model',
    items: [
      { to: `${DSX_ROOT}/facility`, label: 'Facility registry', domain: 'facility' },
      { to: `${DSX_ROOT}/workload`, label: 'Workload', domain: 'workload' },
      { to: `${DSX_ROOT}/simulations`, label: 'Simulations' },
    ],
  },
  {
    group: 'Assure',
    items: [
      { to: `${DSX_ROOT}/sovereignty`, label: 'Sovereignty', domain: 'sovereignty' },
      { to: `${DSX_ROOT}/carbon`, label: 'Carbon and water', domain: 'carbon' },
      { to: `${DSX_ROOT}/financials`, label: 'Financial exposure', domain: 'financial' },
      { to: `${DSX_ROOT}/evidence`, label: 'Evidence and decisions' },
    ],
  },
];

/** Page titles keyed by the final path segment. */
const TITLES: Record<string, string> = {
  'evidence-beta': 'Facility overview',
  overview: 'Facility overview',
  thermal: 'Thermal',
  power: 'Power',
  cooling: 'Cooling',
  network: 'Compute fabric',
  facility: 'Facility registry',
  workload: 'Workload',
  simulations: 'Simulations',
  sovereignty: 'Sovereignty',
  carbon: 'Carbon and water',
  financials: 'Financial exposure',
  evidence: 'Evidence and decisions',
};

const DOT: Record<string, string> = {
  violation: 'bg-red-400',
  attention: 'bg-amber-400',
  normal: 'bg-emerald-400',
  unavailable: 'bg-zinc-500',
};

/** Maps a route segment to the constraint domain used for related views. */
const SEGMENT_DOMAIN: Record<string, string> = {
  thermal: 'thermal',
  power: 'power',
  cooling: 'cooling',
  network: 'network',
  facility: 'facility',
  workload: 'workload',
  sovereignty: 'sovereignty',
  carbon: 'carbon',
  financials: 'financial',
};

/** Continues the investigation without losing the current scope. */
function RelatedWorkspaces() {
  const { pathname } = useLocation();
  const { hrefWithContext } = useWorkspace();
  const segment = pathname.replace(/\/$/, '').split('/').pop() ?? 'evidence-beta';
  const domain = SEGMENT_DOMAIN[segment];
  if (!domain) return null;
  const views = relatedViewsForDomain(domain).filter((v) => !v.path.endsWith(`/${segment}`));
  if (views.length === 0) return null;

  return (
    <section aria-label="Related workspaces" data-testid="dsx-related-workspaces" className="pt-8">
      <h2 className="pb-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        Continue this investigation
      </h2>
      <div className="flex flex-wrap gap-2">
        {views.map((v) => (
          <Link
            key={v.id}
            to={hrefWithContext(v.path)}
            title={v.hint}
            className="rounded-md border border-border/60 px-2.5 py-1 text-xs text-muted-foreground hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            {v.label}
          </Link>
        ))}
      </div>
    </section>
  );
}

function ScopeTree({ nodes, depth = 0 }: { nodes: HierarchyNode[]; depth?: number }) {
  const { selectAsset, selectedAssetId } = useWorkspace();
  return (
    <ul className={depth === 0 ? 'space-y-0.5' : 'space-y-0.5 border-l border-border/60 pl-2'}>
      {nodes.map((n) => (
        <li key={n.asset.aura_asset_id}>
          <button
            type="button"
            onClick={() => selectAsset(n.asset.aura_asset_id)}
            data-testid={`dsx-scope-${n.asset.source_asset_id}`}
            aria-current={selectedAssetId === n.asset.aura_asset_id ? 'true' : undefined}
            className={cn(
              'w-full truncate rounded-sm px-2 py-1 text-left text-[11px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
              selectedAssetId === n.asset.aura_asset_id
                ? 'bg-primary/15 font-semibold text-foreground'
                : 'text-muted-foreground hover:bg-muted/60',
            )}
          >
            {n.asset.name}
          </button>
          {n.children.length > 0 && <ScopeTree nodes={n.children} depth={depth + 1} />}
        </li>
      ))}
    </ul>
  );
}

function WorkspaceNav() {
  const { constraints, hrefWithContext } = useWorkspace();
  const status = Object.fromEntries(constraints.map((c) => [c.domain, c.status]));

  return (
    <nav
      aria-label="DSX workspaces"
      data-testid="dsx-workspace-nav"
      className="w-full shrink-0 overflow-x-auto border-b border-border bg-card/40 p-3 lg:w-60 lg:overflow-x-visible lg:overflow-y-auto lg:border-b-0 lg:border-r"
    >
      <div className="flex min-w-max gap-4 lg:block lg:min-w-0">
      {NAV.map((g) => (
        <div key={g.group} className="pb-0 lg:pb-4">
          <p className="px-2 pb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            {g.group}
          </p>
          <ul className="flex gap-1 lg:block lg:space-y-0.5">
            {g.items.map((i) => {
              const s = i.domain ? status[i.domain] : undefined;
              return (
                <li key={i.to}>
                  <NavLink
                    to={hrefWithContext(i.to)}
                    end={i.end}
                    data-testid={`dsx-nav-${i.label.toLowerCase().replace(/\s+/g, '-')}`}
                    className={({ isActive }) =>
                      cn(
                        'flex items-center gap-2 whitespace-nowrap rounded-sm px-2 py-1.5 text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
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
      </div>
      <div className="hidden lg:block">
        <p className="px-2 pb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          Facility scope
        </p>
        <ScopeTree nodes={buildHierarchy()} />
      </div>
    </nav>
  );
}

/** One h1 per route, plus the scope breadcrumb the workspace is answering for. */
function WorkspaceHeader() {
  const { pathname } = useLocation();
  const { selectedAncestry, selectAsset, hrefWithContext } = useWorkspace();
  const segment = pathname.replace(/\/$/, '').split('/').pop() ?? 'evidence-beta';
  const title = TITLES[segment] ?? 'Facility overview';

  return (
    <header className="space-y-1 pb-4">
      <nav aria-label="Breadcrumb" className="flex flex-wrap items-center gap-1 text-[11px] text-muted-foreground">
        <Link
          to={hrefWithContext(DSX_ROOT)}
          className="rounded-sm underline underline-offset-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          Operator workspace
        </Link>
        {selectedAncestry.map((a) => (
          <span key={a.stable_asset_id} className="flex items-center gap-1">
            <span aria-hidden>/</span>
            <button
              type="button"
              onClick={() => selectAsset(a.stable_asset_id)}
              className="rounded-sm underline underline-offset-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              {a.name}
            </button>
          </span>
        ))}
        <span aria-hidden>/</span>
        <span className="font-medium text-foreground">{title}</span>
      </nav>
      <h1 className="text-lg font-semibold tracking-tight" data-testid="dsx-workspace-title">{title}</h1>
    </header>
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
      <ContextBar />
      <div className="flex flex-1 min-w-0 flex-col lg:flex-row">
        <WorkspaceNav />
        <div className="min-w-0 flex-1 p-4 sm:p-6">
          <WorkspaceHeader />
          <Outlet />
          <RelatedWorkspaces />
        </div>
      </div>
      <AssetDrawer />
      <ConstraintDrawer />
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
