/**
 * Blueprint Overview Tab - Universal Enterprise Template
 * ALL Data Centre twins use this standard layout with complete enterprise components
 * This is the Walmart Standard Blueprint template applied globally
 */

import { lazy, Suspense } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Server, 
  MapPin, 
  Zap, 
  Thermometer, 
  Wind, 
  Network, 
  Building2, 
  Cpu, 
  Globe, 
  DollarSign,
  Bot,
  Activity
} from 'lucide-react';
import type { DataCentreBlueprint, BlueprintSummary } from '@/types/dataCentreBlueprint';

// Universal Enterprise Components - ALL twins get these
import { ExecutiveSummaryBlock } from '../ExecutiveSummaryBlock';
import { DomainHealthMap } from '../DomainHealthMap';
import { DependencyGraph } from '../DependencyGraph';
import { ChangeLogPanel } from '../ChangeLogPanel';
import { AgentHealthPanel } from '../AgentHealthPanel';
import { KPIEnhancementsPanel } from '../KPIEnhancementsPanel';
import { WorkflowEnhancementsPanel } from '../WorkflowEnhancementsPanel';

// Lazy load 3D visualization for performance
const TwinVisualizationLayout = lazy(() => 
  import('@/components/twin-visualization').then(m => ({ default: m.TwinVisualizationLayout }))
);

function VisualizationSkeleton() {
  return (
    <div className="h-[400px] bg-muted rounded-lg animate-pulse flex items-center justify-center">
      <div className="text-center">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-2" />
        <p className="text-sm text-muted-foreground">Loading 3D Twin...</p>
      </div>
    </div>
  );
}

interface BlueprintOverviewTabProps {
  blueprint: DataCentreBlueprint;
  summary: BlueprintSummary | null;
}

const domainIcons: Record<string, React.ReactNode> = {
  thermal: <Thermometer className="h-4 w-4" />,
  power: <Zap className="h-4 w-4" />,
  cooling: <Wind className="h-4 w-4" />,
  network: <Network className="h-4 w-4" />,
  facility: <Building2 className="h-4 w-4" />,
  workload: <Cpu className="h-4 w-4" />,
  sovereignty: <Globe className="h-4 w-4" />,
  financial: <DollarSign className="h-4 w-4" />,
};

const domainColors: Record<string, string> = {
  thermal: 'bg-warning/10 text-warning border-warning/30',
  power: 'bg-warning/10 text-warning border-warning/30',
  cooling: 'bg-info/10 text-info border-info/30',
  network: 'bg-primary/10 text-primary border-primary/30',
  facility: 'bg-muted text-muted-foreground border-border',
  workload: 'bg-primary/10 text-primary border-primary/30',
  sovereignty: 'bg-success/10 text-success border-success/30',
  financial: 'bg-success/10 text-success border-success/30',
};

/**
 * Universal Blueprint Overview Tab
 * This is the standard enterprise template used by ALL Data Centre twins:
 * - Montreal Sovereign AI DC
 * - Toronto Sovereign AI DC
 * - Walmart Green DC
 * - All scanner-generated twins
 * - All regional variants (BC, Alberta, Quebec, US, EU, APAC, etc.)
 */
export function BlueprintOverviewTab({ blueprint, summary }: BlueprintOverviewTabProps) {
  const domains = Object.entries(blueprint.domains);

  return (
    <div className="space-y-6" data-tour="blueprint-overview">
      {/* ============================================== */}
      {/* SECTION 0: 3D Twin Visualization */}
      {/* Visual layout of racks, power, cooling, network */}
      {/* ============================================== */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Activity className="h-4 w-4" />
            Blueprint Layout Visualization
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Suspense fallback={<VisualizationSkeleton />}>
            <TwinVisualizationLayout mode="blueprint" />
          </Suspense>
        </CardContent>
      </Card>

      {/* ============================================== */}
      {/* SECTION 1: Executive Summary Block */}
      {/* ROI, Carbon Impact, Active Systems, Costs */}
      {/* ============================================== */}
      <ExecutiveSummaryBlock />

      {/* ============================================== */}
      {/* SECTION 2: Domain Health + Dependency Graph */}
      {/* Visual system overview and relationships */}
      {/* ============================================== */}
      <div className="grid lg:grid-cols-2 gap-6">
        <DomainHealthMap />
        <DependencyGraph />
      </div>

      {/* ============================================== */}
      {/* SECTION 3: Agent Health & Performance Panel */}
      {/* Health scores, latency, refresh rates, ML reasoning */}
      {/* ============================================== */}
      <AgentHealthPanel />

      {/* ============================================== */}
      {/* SECTION 4: KPI Insights & Forecasting */}
      {/* Why KPIs matter, impacts, 30-day forecasts, recommendations */}
      {/* ============================================== */}
      <KPIEnhancementsPanel />

      {/* ============================================== */}
      {/* SECTION 5: Workflow Version Control & Preview */}
      {/* Simulation preview, version history, rollback, impact analysis */}
      {/* ============================================== */}
      <WorkflowEnhancementsPanel />

      {/* ============================================== */}
      {/* SECTION 7: Facility Summary */}
      {/* Location, Capacity, Racks, Tier */}
      {/* ============================================== */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Server className="h-4 w-4" />
            Facility Summary
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="p-3 rounded-lg border bg-muted/30">
              <div className="flex items-center gap-2 mb-1">
                <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">Location</span>
              </div>
              <p className="font-medium">{blueprint.location}</p>
            </div>
            <div className="p-3 rounded-lg border bg-muted/30">
              <div className="flex items-center gap-2 mb-1">
                <Zap className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">Capacity</span>
              </div>
              <p className="font-medium">{blueprint.capacityKw} MW</p>
            </div>
            <div className="p-3 rounded-lg border bg-muted/30">
              <div className="flex items-center gap-2 mb-1">
                <Server className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">Racks</span>
              </div>
              <p className="font-medium">{blueprint.racks} Racks</p>
            </div>
            <div className="p-3 rounded-lg border bg-muted/30">
              <div className="flex items-center gap-2 mb-1">
                <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">Tier</span>
              </div>
              <p className="font-medium">Tier {blueprint.tier}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ============================================== */}
      {/* SECTION 8: Domains & Agents Overview */}
      {/* 8-domain grid with agent/KPI counts */}
      {/* ============================================== */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Activity className="h-4 w-4" />
            Domains & Agents
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {domains.map(([key, domain]) => {
              const domainAgents = blueprint.agents.filter(a => a.domain === key);
              const domainKPIs = blueprint.kpis.filter(k => k.domain === key);
              
              return (
                <div 
                  key={key}
                  className={`p-4 rounded-lg border ${domainColors[key] || 'bg-muted/30'}`}
                >
                  <div className="flex items-center gap-2 mb-2">
                    {domainIcons[key]}
                    <span className="font-medium capitalize">{domain.name}</span>
                  </div>
                  <p className="text-xs text-muted-foreground mb-3 line-clamp-2">{domain.description}</p>
                  <div className="flex gap-2">
                    <Badge variant="outline" className="text-xs">
                      <Bot className="h-3 w-3 mr-1" />
                      {domainAgents.length} Agents
                    </Badge>
                    <Badge variant="outline" className="text-xs">
                      {domainKPIs.length} KPIs
                    </Badge>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* ============================================== */}
      {/* SECTION 9: Blueprint Metrics Summary */}
      {/* Total counts for all components */}
      {/* ============================================== */}
      {summary && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Blueprint Metrics</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-6">
              <div className="text-center p-4 rounded-lg bg-muted/30">
                <p className="text-2xl font-bold text-primary">{summary.totalAgents}</p>
                <p className="text-xs text-muted-foreground">Active Agents</p>
              </div>
              <div className="text-center p-4 rounded-lg bg-muted/30">
                <p className="text-2xl font-bold text-primary">{summary.totalKpis}</p>
                <p className="text-xs text-muted-foreground">KPIs Tracked</p>
              </div>
              <div className="text-center p-4 rounded-lg bg-muted/30">
                <p className="text-2xl font-bold text-primary">{summary.totalWorkflows}</p>
                <p className="text-xs text-muted-foreground">Workflows</p>
              </div>
              <div className="text-center p-4 rounded-lg bg-muted/30">
                <p className="text-2xl font-bold text-primary">{summary.totalDataSources}</p>
                <p className="text-xs text-muted-foreground">Data Sources</p>
              </div>
              <div className="text-center p-4 rounded-lg bg-muted/30">
                <p className="text-2xl font-bold text-primary">{summary.totalScenarios}</p>
                <p className="text-xs text-muted-foreground">Scenarios</p>
              </div>
              <div className="text-center p-4 rounded-lg bg-muted/30">
                <p className="text-2xl font-bold text-primary">{summary.totalRoles}</p>
                <p className="text-xs text-muted-foreground">Human Roles</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ============================================== */}
      {/* SECTION 10: Blueprint Metadata */}
      {/* ID, Version, Created, Updated timestamps */}
      {/* ============================================== */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Blueprint Metadata</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <p className="text-xs text-muted-foreground mb-1">Blueprint ID</p>
              <p className="font-mono text-sm">{blueprint.id}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">Version</p>
              <p className="font-mono text-sm">v{blueprint.version}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">Created</p>
              <p className="text-sm">{new Date(blueprint.createdAt).toLocaleString()}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">Last Updated</p>
              <p className="text-sm">{new Date(blueprint.updatedAt).toLocaleString()}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ============================================== */}
      {/* SECTION 11: Real-Time Change Log */}
      {/* Audit trail of all builder edits */}
      {/* ============================================== */}
      <ChangeLogPanel />
    </div>
  );
}
