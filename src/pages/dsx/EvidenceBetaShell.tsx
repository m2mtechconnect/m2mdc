/**
 * DSX-aligned operator workspace shell.
 *
 * A single investigation surface: a persistent left rail (navigation plus
 * facility scope), a centre workspace, and a right contextual drawer. The
 * operational truth bar and the investigation context bar are always visible,
 * so the operator always knows what they are looking at and how trustworthy
 * it is.
 */
import { useState } from 'react';
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import { Helmet } from 'react-helmet-async';
import { cn } from '@/lib/utils';
import { EvidenceBetaProvider, useWorkspace } from '@/dsx/runtime/EvidenceBetaContext';
import { OperationalTruthBar } from '@/components/dsx/OperationalTruthBar';
import { ProvenanceDrawer } from '@/components/dsx/ProvenanceDrawer';
import { ContextBar } from '@/components/dsx/ContextBar';
import { SideInspector } from '@/components/dsx/SideInspector';
import { ConstraintDrawer } from '@/components/dsx/ConstraintDrawer';
import { buildHierarchy, type HierarchyNode } from '@/dsx/workspaces/facilityGraph';
import { DSX_ROOT, relatedViewsForDomain } from '@/dsx/workspaces/relatedViews';
import { EVIDENCE_SECTIONS, evidenceTitle } from '@/dsx/nav/evidenceNav';

interface NavEntry { to: string; label: string; end?: boolean; domain?: string }

/**
 * Grouped by operator intent: what is happening, what is it made of,
 * and what can be proven about it.
 */
/**
 * Navigation is derived from the canonical five-section Evidence IA so the
 * sidebar, the routes and the page titles can never drift apart.
 */
const NAV: { group: string; items: NavEntry[] }[] = EVIDENCE_SECTIONS.map((section) => ({
  group: section.label,
  items:
    section.children.length > 0
      ? section.children.map((child) => ({ to: child.path, label: child.label, domain: child.domain }))
      : [{ to: section.path, label: section.label, end: section.id === 'overview' }],
}));

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
  compute: 'network',
  sustainability: 'carbon',
  financial: 'financial',
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

/** True when this branch contains the selected asset, so it opens by default. */
function containsAsset(node: HierarchyNode, id: string | null): boolean {
  if (!id) return false;
  if (node.asset.aura_asset_id === id) return true;
  return node.children.some((c) => containsAsset(c, id));
}

function ScopeNode({ node, depth }: { node: HierarchyNode; depth: number }) {
  const { selectAsset, selectedAssetId } = useWorkspace();
  const onPath = containsAsset(node, selectedAssetId);
  // Collapsed by default: only the branch holding the selected asset expands.
  const [open, setOpen] = useState(onPath || depth === 0);
  const expanded = open || onPath;
  const selected = selectedAssetId === node.asset.aura_asset_id;

  return (
    <li>
      <div className="flex items-center gap-0.5">
        {node.children.length > 0 ? (
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-expanded={expanded}
            aria-label={`${expanded ? 'Collapse' : 'Expand'} ${node.asset.name}`}
            className="inline-flex h-8 w-8 items-center justify-center rounded-sm text-muted-foreground hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <ChevronRight className={cn('h-3 w-3 transition-transform', expanded && 'rotate-90')} aria-hidden />
          </button>
        ) : (
          <span className="w-5 shrink-0" aria-hidden />
        )}
        <button
          type="button"
          onClick={() => selectAsset(node.asset.aura_asset_id)}
          data-testid={`dsx-scope-${node.asset.source_asset_id}`}
          aria-current={selected ? 'true' : undefined}
          className={cn(
            'min-w-0 flex-1 truncate rounded-sm px-1.5 py-1 text-left text-[11px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
            selected ? 'bg-primary/15 font-semibold text-foreground' : 'text-muted-foreground hover:bg-muted/60',
          )}
        >
          {node.asset.name}
        </button>
      </div>
      {node.children.length > 0 && expanded && <ScopeTree nodes={node.children} depth={depth + 1} />}
    </li>
  );
}

function ScopeTree({ nodes, depth = 0 }: { nodes: HierarchyNode[]; depth?: number }) {
  return (
    <ul className={depth === 0 ? 'space-y-0.5' : 'space-y-0.5 border-l border-border/60 pl-2'}>
      {nodes.map((n) => <ScopeNode key={n.asset.aura_asset_id} node={n} depth={depth} />)}
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
      className="relative w-full min-w-0 max-w-full shrink-0 overflow-x-auto border-b border-border bg-card/40 p-3 lg:w-60 lg:overflow-x-visible lg:overflow-y-auto lg:border-b-0 lg:border-r"
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
  const title = evidenceTitle(pathname);

  return (
    <header className="space-y-1.5 pb-5">
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
      <h1 className="text-2xl font-semibold tracking-tight" data-testid="dsx-workspace-title">{title}</h1>
    </header>
  );
}

function ShellBody() {
  return (
    <div className="flex min-h-[calc(100vh-4rem)] w-full min-w-0 max-w-full flex-col overflow-x-hidden">
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
          <div className="mx-auto w-full min-w-0 max-w-[1400px]">
            <WorkspaceHeader />
            <Outlet />
            <RelatedWorkspaces />
          </div>
        </div>
      </div>
      <SideInspector />
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
