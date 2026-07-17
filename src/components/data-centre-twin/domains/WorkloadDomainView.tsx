/**
 * Workload & GPU Scheduler Domain View
 */

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Cpu, Clock, Users, AlertTriangle, Filter } from 'lucide-react';
import { CollapsibleSection } from '@/components/shared/CollapsibleSection';
import { SummaryCard } from '@/components/shared/SummaryCard';
import type { DataCentreFacility } from '@/types/dataCenterTwin';

import { DomainProvenanceHeader } from '@/components/provenance/DomainProvenanceHeader';

interface WorkloadDomainViewProps {
  facility: DataCentreFacility;
}

type WorkloadType = 'all' | 'training' | 'inference';

export function WorkloadDomainView({ facility }: WorkloadDomainViewProps) {
  const [workloadFilter, setWorkloadFilter] = useState<WorkloadType>('all');
  
  const workloadTwin = facility.workloadGpu;
  const gpuClusters = workloadTwin.clusters;
  
  const filteredClusters = gpuClusters.filter(c => {
    if (workloadFilter === 'all') return true;
    return c.workloadType === workloadFilter;
  });
  
  const totalGpus = workloadTwin.kpis.totalGpuCount;
  const avgUtilization = workloadTwin.kpis.avgGpuUtilization;
  const totalQueueDepth = workloadTwin.kpis.queueDepth;
  
  const workloadCounts = {
    all: gpuClusters.length,
    training: gpuClusters.filter(c => c.workloadType === 'training').length,
    inference: gpuClusters.filter(c => c.workloadType === 'inference').length,
  };
  
  return (
    <div className="space-y-6" data-provenance="demo" data-testid="workload-domain-view">
      <DomainProvenanceHeader provenance="demo" sourceName="sovereignDataCenter/mockData" ariaContext="Workload domain data provenance" />
      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <SummaryCard
          title="GPU Utilization"
          value={`${avgUtilization.toFixed(0)}%`}
          status={avgUtilization > 70 ? 'good' : avgUtilization > 50 ? 'warning' : 'critical'}
          icon={Cpu}
        />
        <SummaryCard
          title="Total GPUs"
          value={`${totalGpus}`}
          status="good"
          icon={Cpu}
        />
        <SummaryCard
          title="Queue Depth"
          value={`${totalQueueDepth} jobs`}
          status={totalQueueDepth < 50 ? 'good' : totalQueueDepth < 100 ? 'warning' : 'critical'}
          icon={Clock}
        />
        <SummaryCard
          title="Active Jobs"
          value={`${workloadTwin.activeJobs.length}`}
          status="good"
          icon={Users}
        />
      </div>

      {/* GPU Clusters */}
      <CollapsibleSection title="GPU Clusters" badge={`${filteredClusters.length} clusters`}>
        {/* Filters */}
        <div className="flex items-center gap-4 mb-4 pb-4 border-b border-border/50">
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">Workload:</span>
            <div className="flex gap-1">
              {[
                { key: 'all' as const, label: 'All', color: '' },
                { key: 'training' as const, label: 'Training', color: 'border-primary/30 text-primary' },
                { key: 'inference' as const, label: 'Inference', color: 'border-blue-500/30 text-blue-500' },
              ].map(({ key, label, color }) => (
                <Button
                  key={key}
                  variant={workloadFilter === key ? 'default' : 'outline'}
                  size="sm"
                  className={`h-7 text-xs ${workloadFilter !== key && color ? color : ''}`}
                  onClick={() => setWorkloadFilter(key)}
                >
                  {label}
                  <span className="ml-1 opacity-70">({workloadCounts[key]})</span>
                </Button>
              ))}
            </div>
          </div>
        </div>
        
        {filteredClusters.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No clusters match the current filter
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {filteredClusters.map((cluster) => (
              <div key={cluster.id} className="p-4 rounded-lg bg-muted/30 border">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h4 className="font-medium">{cluster.name}</h4>
                    <p className="text-xs text-muted-foreground">{cluster.nodes[0]?.gpuModel || 'GPU'}</p>
                  </div>
                  <Badge variant="default">
                    {cluster.totalGpus} GPUs
                  </Badge>
                </div>
                
                <div className="space-y-3">
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span>Utilization</span>
                      <span className="font-medium">{cluster.avgUtilization.toFixed(0)}%</span>
                    </div>
                    <Progress value={cluster.avgUtilization} className="h-3" />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div className="p-2 rounded bg-background">
                      <p className="text-muted-foreground">Active GPUs</p>
                      <p className="font-medium text-lg">{cluster.activeGpus}</p>
                    </div>
                    <div className="p-2 rounded bg-background">
                      <p className="text-muted-foreground">Workload</p>
                      <p className="font-medium text-lg capitalize">{cluster.workloadType}</p>
                    </div>
                    <div className="p-2 rounded bg-background">
                      <p className="text-muted-foreground">Scheduler</p>
                      <p className="font-medium text-lg capitalize">{cluster.scheduler}</p>
                    </div>
                    <div className="p-2 rounded bg-background">
                      <p className="text-muted-foreground">Region</p>
                      <p className="font-medium text-lg">{cluster.region}</p>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CollapsibleSection>

      {/* Workload Metrics */}
      <div className="grid gap-4 md:grid-cols-2">
        <CollapsibleSection title="Job Distribution">
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 rounded-full bg-primary" />
                <span>Training Jobs</span>
              </div>
              <span className="font-bold">
                {workloadTwin.activeJobs.filter(j => j.type === 'training').length}
              </span>
            </div>
            <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 rounded-full bg-blue-500" />
                <span>Inference Jobs</span>
              </div>
              <span className="font-bold">
                {workloadTwin.activeJobs.filter(j => j.type === 'inference').length}
              </span>
            </div>
            <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 rounded-full bg-amber-500" />
                <span>Queued Jobs</span>
              </div>
              <span className="font-bold">{workloadTwin.queuedJobs.length}</span>
            </div>
          </div>
        </CollapsibleSection>

        <CollapsibleSection title="SLA & Performance">
          <div className="space-y-4">
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span>GPU Fairness Index</span>
                <span className="font-medium text-emerald-500">{workloadTwin.kpis.gpuFairnessIndex.toFixed(2)}</span>
              </div>
              <Progress value={workloadTwin.kpis.gpuFairnessIndex} className="h-2" />
            </div>
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span>SLA Compliance</span>
                <span className="font-medium text-emerald-500">{(100 - workloadTwin.kpis.slaBreachRate).toFixed(1)}%</span>
              </div>
              <Progress value={100 - workloadTwin.kpis.slaBreachRate} className="h-2" />
            </div>
            {workloadTwin.kpis.slaBreachRate > 0 && (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-amber-500/10 text-amber-600 text-sm">
                <AlertTriangle className="h-4 w-4" />
                <span>{workloadTwin.activeJobs.filter(j => j.slaBreached).length} jobs at risk of SLA breach</span>
              </div>
            )}
          </div>
        </CollapsibleSection>
      </div>

      {/* Cost Metrics */}
      <CollapsibleSection title="Cost Analysis">
        <div className="grid gap-4 md:grid-cols-4">
          <div className="p-4 rounded-lg bg-muted/30 text-center">
            <p className="text-xs text-muted-foreground mb-1">Cost per GPU-hour</p>
            <p className="text-2xl font-bold">${workloadTwin.kpis.costPerGpuHour.toFixed(2)}</p>
          </div>
          <div className="p-4 rounded-lg bg-muted/30 text-center">
            <p className="text-xs text-muted-foreground mb-1">Avg Queue Time</p>
            <p className="text-2xl font-bold">{workloadTwin.kpis.avgQueueTimeMinutes.toFixed(0)} min</p>
          </div>
          <div className="p-4 rounded-lg bg-muted/30 text-center">
            <p className="text-xs text-muted-foreground mb-1">Training Throughput</p>
            <p className="text-2xl font-bold">{(workloadTwin.kpis.trainingThroughput / 1000).toFixed(1)}K tok/s</p>
          </div>
          <div className="p-4 rounded-lg bg-muted/30 text-center">
            <p className="text-xs text-muted-foreground mb-1">Inference Throughput</p>
            <p className="text-2xl font-bold">{workloadTwin.kpis.inferenceThroughput.toFixed(0)} req/s</p>
          </div>
        </div>
      </CollapsibleSection>
    </div>
  );
}
