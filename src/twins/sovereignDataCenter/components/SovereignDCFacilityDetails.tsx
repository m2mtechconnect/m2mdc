/**
 * Sovereign DC Facility Details - GPU clusters, data flows, incidents
 */

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  Server, Database, AlertTriangle, Shield, 
  MapPin, Clock, CheckCircle, XCircle
} from 'lucide-react';
import type { 
  GpuCluster, 
  SovereignDataFlow, 
  IncidentScenario 
} from '@/types/sovereignDataCenterTwin';
import { cn } from '@/lib/utils';

interface SovereignDCFacilityDetailsProps {
  gpuClusters: GpuCluster[];
  dataFlows: SovereignDataFlow[];
  incidentScenarios: IncidentScenario[];
}

function GPUClustersTab({ clusters }: { clusters: GpuCluster[] }) {
  return (
    <div className="space-y-3">
      {clusters.map((cluster) => (
        <Card key={cluster.id} className="overflow-hidden">
          <CardContent className="p-4">
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-2">
                <Server className="h-4 w-4 text-primary" />
                <span className="font-medium">{cluster.name}</span>
              </div>
              <div className="flex gap-2">
                <Badge variant="outline">{cluster.gpuType}</Badge>
                {cluster.isSovereign ? (
                  <Badge variant="default" className="bg-green-600">
                    <Shield className="h-3 w-3 mr-1" />
                    Sovereign
                  </Badge>
                ) : (
                  <Badge variant="secondary">Non-Sovereign</Badge>
                )}
              </div>
            </div>
            
            <div className="grid grid-cols-4 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground text-xs">GPUs</p>
                <p className="font-semibold">{cluster.gpuCount.toLocaleString()}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs">Region</p>
                <p className="font-semibold flex items-center gap-1">
                  <MapPin className="h-3 w-3" />
                  {cluster.region}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs">Tenants</p>
                <p className="font-semibold">{cluster.tenantCount}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs">Utilization</p>
                <div className="flex items-center gap-2">
                  <Progress value={cluster.avgUtilizationPct} className="h-2 flex-1" />
                  <span className="font-semibold text-xs">{cluster.avgUtilizationPct}%</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function DataFlowsTab({ flows }: { flows: SovereignDataFlow[] }) {
  const stageColors: Record<string, string> = {
    training: 'bg-purple-500',
    fine_tuning: 'bg-blue-500',
    inference: 'bg-green-500',
    backup: 'bg-yellow-500',
    logging: 'bg-gray-500'
  };

  return (
    <div className="space-y-2">
      {flows.map((flow) => (
        <div
          key={flow.id}
          className={cn(
            "p-3 rounded-lg border flex items-center justify-between",
            !flow.sovereign && "border-orange-500/50 bg-orange-500/5"
          )}
        >
          <div className="flex items-center gap-3">
            <Database className="h-4 w-4 text-muted-foreground" />
            <div>
              <p className="font-medium text-sm">{flow.workloadName}</p>
              <div className="flex items-center gap-2 mt-1">
                <Badge 
                  variant="secondary" 
                  className={cn("text-[10px] text-white", stageColors[flow.stage])}
                >
                  {flow.stage.replace('_', ' ')}
                </Badge>
                <span className="text-xs text-muted-foreground">
                  {flow.dataVolumeGb ? `${flow.dataVolumeGb} GB` : ''}
                </span>
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="flex items-center gap-1">
              <MapPin className="h-3 w-3" />
              {flow.jurisdiction}
            </Badge>
            {flow.sovereign ? (
              <CheckCircle className="h-4 w-4 text-green-500" />
            ) : (
              <XCircle className="h-4 w-4 text-orange-500" />
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

function IncidentsTab({ incidents }: { incidents: IncidentScenario[] }) {
  const categoryIcons: Record<string, React.ReactNode> = {
    cooling: <span>❄️</span>,
    power: <span>⚡</span>,
    workload: <span>📊</span>,
    network: <span>🌐</span>,
    security: <span>🔒</span>,
    compliance: <span>📋</span>
  };

  const severityColors: Record<string, string> = {
    low: 'text-green-500',
    medium: 'text-yellow-500',
    high: 'text-orange-500',
    critical: 'text-red-500'
  };

  return (
    <div className="space-y-3">
      {incidents.map((incident) => (
        <Card key={incident.id}>
          <CardContent className="p-4">
            <div className="flex items-start justify-between mb-2">
              <div className="flex items-center gap-2">
                {categoryIcons[incident.category]}
                <span className="font-medium">{incident.name}</span>
              </div>
              <Badge 
                variant="outline" 
                className={severityColors[incident.severity || 'medium']}
              >
                {incident.severity || 'medium'}
              </Badge>
            </div>
            
            <p className="text-sm text-muted-foreground mb-3">
              {incident.description}
            </p>
            
            <div className="flex items-center gap-4 text-xs text-muted-foreground mb-3">
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                MTTR: {incident.mttrMinutes} min
              </span>
              <span>
                Probability: {(incident.probabilityPerYear * 100).toFixed(1)}%/year
              </span>
            </div>
            
            <div className="space-y-1">
              <p className="text-xs font-medium">Recommended Actions:</p>
              <ul className="text-xs text-muted-foreground space-y-1">
                {incident.recommendedActions.slice(0, 3).map((action, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <span className="text-primary">•</span>
                    {action}
                  </li>
                ))}
              </ul>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export function SovereignDCFacilityDetails({
  gpuClusters,
  dataFlows,
  incidentScenarios
}: SovereignDCFacilityDetailsProps) {
  return (
    <Tabs defaultValue="gpu" className="w-full">
      <TabsList className="grid w-full grid-cols-3">
        <TabsTrigger value="gpu" className="flex items-center gap-2">
          <Server className="h-4 w-4" />
          GPU Clusters ({gpuClusters.length})
        </TabsTrigger>
        <TabsTrigger value="flows" className="flex items-center gap-2">
          <Database className="h-4 w-4" />
          Data Flows ({dataFlows.length})
        </TabsTrigger>
        <TabsTrigger value="incidents" className="flex items-center gap-2">
          <AlertTriangle className="h-4 w-4" />
          Incidents ({incidentScenarios.length})
        </TabsTrigger>
      </TabsList>
      
      <TabsContent value="gpu" className="mt-4">
        <GPUClustersTab clusters={gpuClusters} />
      </TabsContent>
      
      <TabsContent value="flows" className="mt-4">
        <DataFlowsTab flows={dataFlows} />
      </TabsContent>
      
      <TabsContent value="incidents" className="mt-4">
        <IncidentsTab incidents={incidentScenarios} />
      </TabsContent>
    </Tabs>
  );
}
