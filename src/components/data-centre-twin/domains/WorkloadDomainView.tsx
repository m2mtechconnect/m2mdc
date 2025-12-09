/**
 * Workload & GPU Scheduler Domain View
 */

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Cpu, Clock, Users, AlertTriangle } from 'lucide-react';
import type { DataCentreFacility } from '@/types/dataCenterTwin';

interface WorkloadDomainViewProps {
  facility: DataCentreFacility;
}

export function WorkloadDomainView({ facility }: WorkloadDomainViewProps) {
  const workloadTwin = facility.workloadGpu;
  const gpuClusters = workloadTwin.clusters;
  const totalGpus = workloadTwin.kpis.totalGpuCount;
  const avgUtilization = workloadTwin.kpis.avgGpuUtilization;
  const totalQueueDepth = workloadTwin.kpis.queueDepth;
  
  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <MetricCard
          title="GPU Utilization"
          value={`${avgUtilization.toFixed(0)}%`}
          status={avgUtilization > 70 ? 'good' : avgUtilization > 50 ? 'warning' : 'critical'}
          icon={Cpu}
        />
        <MetricCard
          title="Total GPUs"
          value={`${totalGpus}`}
          status="good"
          icon={Cpu}
        />
        <MetricCard
          title="Queue Depth"
          value={`${totalQueueDepth} jobs`}
          status={totalQueueDepth < 50 ? 'good' : totalQueueDepth < 100 ? 'warning' : 'critical'}
          icon={Clock}
        />
        <MetricCard
          title="Active Jobs"
          value={`${workloadTwin.activeJobs.length}`}
          status="good"
          icon={Users}
        />
      </div>

      {/* GPU Clusters */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">GPU Clusters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            {gpuClusters.map((cluster) => (
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
        </CardContent>
      </Card>

      {/* Workload Metrics */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Job Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 rounded-full bg-purple-500" />
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
                  <div className="w-3 h-3 rounded-full bg-yellow-500" />
                  <span>Queued Jobs</span>
                </div>
                <span className="font-bold">{workloadTwin.queuedJobs.length}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">SLA & Performance</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <div className="flex justify-between text-sm mb-2">
                  <span>GPU Fairness Index</span>
                  <span className="font-medium text-green-500">{workloadTwin.kpis.gpuFairnessIndex.toFixed(2)}</span>
                </div>
                <Progress value={workloadTwin.kpis.gpuFairnessIndex} className="h-2" />
              </div>
              <div>
                <div className="flex justify-between text-sm mb-2">
                  <span>SLA Compliance</span>
                  <span className="font-medium text-green-500">{(100 - workloadTwin.kpis.slaBreachRate).toFixed(1)}%</span>
                </div>
                <Progress value={100 - workloadTwin.kpis.slaBreachRate} className="h-2" />
              </div>
              {workloadTwin.kpis.slaBreachRate > 0 && (
                <div className="flex items-center gap-2 p-3 rounded-lg bg-yellow-500/10 text-yellow-600 text-sm">
                  <AlertTriangle className="h-4 w-4" />
                  <span>{workloadTwin.activeJobs.filter(j => j.slaBreached).length} jobs at risk of SLA breach</span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Cost Metrics */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Cost Analysis</CardTitle>
        </CardHeader>
        <CardContent>
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
        </CardContent>
      </Card>
    </div>
  );
}

interface MetricCardProps {
  title: string;
  value: string;
  status: 'good' | 'warning' | 'critical';
  icon: React.ElementType;
}

function MetricCard({ title, value, status, icon: Icon }: MetricCardProps) {
  const getStatusColor = () => {
    switch (status) {
      case 'good': return 'text-green-500';
      case 'warning': return 'text-yellow-500';
      case 'critical': return 'text-destructive';
    }
  };

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-lg bg-muted ${getStatusColor()}`}>
            <Icon className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground">{title}</p>
            <p className={`text-xl font-bold ${getStatusColor()}`}>{value}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
