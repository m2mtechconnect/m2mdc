/**
 * Blueprint Overview Tab - Summary view of the entire blueprint
 */

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
  thermal: 'bg-orange-500/10 text-orange-600 border-orange-500/30',
  power: 'bg-yellow-500/10 text-yellow-600 border-yellow-500/30',
  cooling: 'bg-blue-500/10 text-blue-600 border-blue-500/30',
  network: 'bg-purple-500/10 text-purple-600 border-purple-500/30',
  facility: 'bg-gray-500/10 text-gray-600 border-gray-500/30',
  workload: 'bg-pink-500/10 text-pink-600 border-pink-500/30',
  sovereignty: 'bg-green-500/10 text-green-600 border-green-500/30',
  financial: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/30',
};

export function BlueprintOverviewTab({ blueprint, summary }: BlueprintOverviewTabProps) {
  const domains = Object.entries(blueprint.domains);

  return (
    <div className="space-y-6">
      {/* Facility Summary */}
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

      {/* Domain Overview */}
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

      {/* Key Metrics */}
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

      {/* Metadata */}
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
    </div>
  );
}
