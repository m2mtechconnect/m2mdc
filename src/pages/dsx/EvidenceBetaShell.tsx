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
import { AlertTriangle, ChevronRight, FileSearch } from "lucide-react";
import { Helmet } from 'react-helmet-async';
import { cn } from '@/lib/utils';
import { WorkspaceHeader } from "@/components/workspace-system";
import { EvidenceBetaProvider, useWorkspace } from '@/dsx/runtime/EvidenceBetaContext';
import { OperationalTruthBar } from '@/components/dsx/OperationalTruthBar';
import { ProvenanceDrawer } from '@/components/dsx/ProvenanceDrawer';
import { ContextBar } from '@/components/dsx/ContextBar';
import { SideInspector } from '@/components/dsx/SideInspector';
import { ConstraintDrawer } from '@/components/dsx/ConstraintDrawer';
import { buildHierarchy, type HierarchyNode } from '@/dsx/workspaces/facilityGraph';
import { DSX_ROOT, relatedViewsForDomain } from '@/dsx/workspaces/relatedViews';
import { EVIDENCE_SECTIONS, evidenceTitle } from '@/dsx/nav/evidenceNav';
import { Button } from '@/components/ui/button';
import { useActiveTwin } from '@/context/ActiveTwinContext';

interface NavEntry { to: string; label: string; end?: boolean; domain?: string }

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
  violation: 'bg-[hsl(var(--v2-critical))]',
  attention: 'bg-[hsl(var(--v2-simulated))]',
  normal: 'bg-[hsl(var(--v2-verified))]',
  unavailable: 'bg-[hsl(var(--v2-neutral))]',
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
    <section aria-label="Related workspaces" data-testid="dsx-related-workspaces" className="pt-6">
      <h2 className="v2-field-label pb-2 font-semibold text-foreground">
        Continue this investigation
      </h2>
      <div className="flex flex-wrap gap-2">
        {views.map((v) => (
          <Link
            key={v.id}
            to={hrefWithContext(v.path)}
            title={v.hint}
            className="inline-flex min-h-9 items-center rounded-md border border-[hsl(var(--v2-line))] bg-[hsl(var(--v2-panel))] px-3 py-1.5 text-[13px] text-muted-foreground transition-colors hover:bg-[hsl(var(--v2-canvas-deep)/0.7)] hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
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
            className="inline-flex h-9 w-9 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-[hsl(var(--v2-canvas-deep)/0.7)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <ChevronRight className={cn('h-3.5 w-3.5 transition-transform', expanded && 'rotate-90')} aria-hidden />
          </button>
        ) : (
          <span className="w-6 shrink-0" aria-hidden />
        )}
        <button
          type="button"
          onClick={() => selectAsset(node.asset.aura_asset_id)}
          data-testid={`dsx-scope-${node.asset.source_asset_id}`}
          aria-current={selected ? 'true' : undefined}
          className={cn(
            'min-h-9 min-w-0 flex-1 truncate rounded-md px-2 py-1.5 text-left text-[13px] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
            selected
              ? 'bg-[hsl(var(--v2-tech)/0.10)] font-semibold text-[hsl(var(--v2-tech-strong))]'
              : 'text-muted-foreground hover:bg-[hsl(var(--v2-canvas-deep)/0.7)] hover:text-foreground',
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
    <ul className={depth === 0 ? 'space-y-0.5' : 'space-y-0.5 border-l border-[hsl(var(--v2-line))] pl-2'}>
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
      className="v2-rail relative w-full min-w-0 max-w-full shrink-0 overflow-x-hidden border-b border-[hsl(var(--v2-line))] p-2.5 lg:w-60 lg:overflow-y-auto lg:border-b-0"
    >
      <div className="grid min-w-0 grid-cols-1 gap-2 sm:grid-cols-2 lg:block">
        {NAV.map((g) => (
          <div key={g.group} className="min-w-0 pb-0 lg:pb-4">
            <p className="v2-field-label px-2 pb-1.5 font-semibold text-foreground">
              {g.group}
            </p>
            <ul className="flex min-w-0 flex-wrap gap-1 lg:block lg:space-y-0.5">
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
                          'flex min-h-10 max-w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-[13px] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                          isActive
                            ? 'bg-[hsl(var(--v2-tech)/0.10)] font-semibold text-[hsl(var(--v2-tech-strong))]'
                            : 'text-muted-foreground hover:bg-[hsl(var(--v2-canvas-deep)/0.7)] hover:text-foreground',
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
        <p className="v2-field-label px-2 pb-1.5 font-semibold text-foreground">
          Facility scope
        </p>
        <ScopeTree nodes={buildHierarchy()} />
      </div>
    </nav>
  );
}

/** One h1 per route, plus the scope breadcrumb the workspace is answering for. */
function EvidenceWorkspaceHeader() {
  const { pathname } = useLocation();
  const { selectedAncestry, selectAsset, hrefWithContext, facilityScope } = useWorkspace();
  const title = evidenceTitle(pathname);

  const breadcrumb = (
    <nav aria-label="Breadcrumb" className="flex flex-wrap items-center gap-1 text-[13px] text-muted-foreground">
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
  );

  const meta = (
    <div className="flex flex-col gap-1">
      <p data-testid="dsx-active-facility" className="text-[13px] font-medium text-foreground">
        {facilityScope.headerLabel}
      </p>
      {breadcrumb}
    </div>
  );

  return (
    <WorkspaceHeader
      eyebrow="AURA Evidence"
      title={<span data-testid="dsx-workspace-title">{title}</span>}
      icon={FileSearch}
      capabilityId="evidence.workspace"
      meta={meta}
    />
  );
}


function ShellBody() {
  const { facilityScope } = useWorkspace();

  return (
    <div className="v2-canvas flex min-h-[calc(100vh-4rem)] w-full min-w-0 max-w-full flex-col overflow-x-hidden">
      <Helmet>
        <title>DSX Operator Workspace | AURA Data Centre Twin</title>
        <meta
          name="description"
          content="Deterministic, contract-validated DSX-aligned operator workspaces for the AURA data centre digital twin."
        />
      </Helmet>
      <OperationalTruthBar />
      <ContextBar />
      {facilityScope.availability === 'unavailable' ? (
        <main className="flex flex-1 items-start justify-center p-4 sm:p-8" data-testid="evidence-facility-unavailable">
          <section className="w-full max-w-3xl rounded-lg border border-amber-500/40 bg-amber-500/5 p-5 sm:p-8" aria-labelledby="evidence-unavailable-heading">
            <AlertTriangle className="mb-4 h-7 w-7 text-amber-700 dark:text-amber-300" aria-hidden />
            <h1 id="evidence-unavailable-heading" className="text-2xl font-semibold text-foreground">
              Evidence unavailable for this facility
            </h1>
            <p data-testid="dsx-active-facility" className="mt-2 text-sm font-medium text-foreground">
              {facilityScope.headerLabel}
            </p>
            <p className="mt-3 text-sm text-muted-foreground">{facilityScope.reason}</p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Button asChild>
                <Link to="/manage/integrations?tab=connections">Review data connections</Link>
              </Button>
              <Button asChild variant="outline">
                <Link to="/dashboard">Return to Command Center</Link>
              </Button>
            </div>
          </section>
        </main>
      ) : (
        <div className="flex flex-1 min-w-0 flex-col lg:flex-row">
          <WorkspaceNav />
          <div className="min-w-0 flex-1 p-4 sm:p-6">
            <div className="mx-auto w-full min-w-0 max-w-screen-2xl">
              <EvidenceWorkspaceHeader />
              <Outlet />
              <RelatedWorkspaces />
            </div>
          </div>
        </div>
      )}
      <SideInspector />
      <ConstraintDrawer />
      <ProvenanceDrawer />
    </div>
  );
}

export default function EvidenceBetaShell() {
  const { twins } = useActiveTwin();
  return (
    <EvidenceBetaProvider twins={twins}>
      <ShellBody />
    </EvidenceBetaProvider>
  );
}
