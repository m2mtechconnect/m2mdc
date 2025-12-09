/**
 * Workload & GPU Scheduler Domain View
 */

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Cpu, Clock, Users, TrendingUp, AlertTriangle } from 'lucide-react';
import type { DataCentreFacility } from '@/types/dataCenterTwin';

interface WorkloadDomainViewProps {
  facility: DataCentreFacility;
}

export function WorkloadDomainView({ facility }: WorkloadDomainViewProps) {
  const totalGpus = facility.gpuClusters.reduce((acc, c) => acc + c.totalGpus, 0);
  const avgUtilization = facility.gpuClusters.reduce((acc, c) => acc + c.utilizationPercent, 0) / facility.gpuClusters.length;
  const totalQueueDepth = facility.gpuClusters.reduce((acc, c) => acc + c.queueDepth, 0);
  
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
          title="Active Tenants"
          value="12"
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
            {facility.gpuClusters.map((cluster) => (
              <div key={cluster.id} className="p-4 rounded-lg bg-muted/30 border">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h4 className="font-medium">{cluster.id}</h4>
                    <p className="text-xs text-muted-foreground">{cluster.gpuModel}</p>
                  </div>
                  <Badge variant={cluster.status === 'operational' ? 'default' : 'secondary'}>
                    {cluster.totalGpus} GPUs
                  </Badge>
                </div>
                
                <div className="space-y-3">
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span>Utilization</span>
                      <span className="font-medium">{cluster.utilizationPercent}%</span>
                    </div>
                    <Progress value={cluster.utilizationPercent} className="h-3" />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div className="p-2 rounded bg-background">
                      <p className="text-muted-foreground">Avg GPU Temp</p>
                      <p className="font-medium text-lg">{cluster.avgGpuTempC}°C</p>
                    </div>
                    <div className="p-2 rounded bg-background">
                      <p className="text-muted-foreground">Power Draw</p>
                      <p className="font-medium text-lg">{cluster.powerDrawKw} kW</p>
                    </div>
                    <div className="p-2 rounded bg-background">
                      <p className="text-muted-foreground">Queue Depth</p>
                      <p className="font-medium text-lg">{cluster.queueDepth} jobs</p>
                    </div>
                    <div className="p-2 rounded bg-background">
                      <p className="text-muted-foreground">Avg Wait</p>
                      <p className="font-medium text-lg">{cluster.avgQueueTimeMin} min</p>
                    </div>
                  </div>
                  
                  <div className="pt-3 border-t">
                    <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground">Training</span>
                      <span>{cluster.trainingJobsActive} active</span>
                    </div>
                    <div className="flex justify-between text-xs mt-1">
                      <span className="text-muted-foreground">Inference</span>
                      <span>{cluster.inferenceJobsActive} active</span>
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
                  {facility.gpuClusters.reduce((acc, c) => acc + c.trainingJobsActive, 0)}
                </span>
              </div>
              <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 rounded-full bg-blue-500" />
                  <span>Inference Jobs</span>
                </div>
                <span className="font-bold">
                  {facility.gpuClusters.reduce((acc, c) => acc + c.inferenceJobsActive, 0)}
                </span>
              </div>
              <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 rounded-full bg-yellow-500" />
                  <span>Queued Jobs</span>
                </div>
                <span className="font-bold">{totalQueueDepth}</span>
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
                  <span className="font-medium text-green-500">0.94</span>
                </div>
                <Progress value={94} className="h-2" />
              </div>
              <div>
                <div className="flex justify-between text-sm mb-2">
                  <span>SLA Compliance</span>
                  <span className="font-medium text-green-500">99.2%</span>
                </div>
                <Progress value={99.2} className="h-2" />
              </div>
              <div className="flex items-center gap-2 p-3 rounded-lg bg-yellow-500/10 text-yellow-600 text-sm">
                <AlertTriangle className="h-4 w-4" />
                <span>2 jobs approaching SLA breach</span>
              </div>
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
              <p className="text-2xl font-bold">${(facility.costPerKwh * facility.pue * 0.5).toFixed(2)}</p>
            </div>
            <div className="p-4 rounded-lg bg-muted/30 text-center">
              <p className="text-xs text-muted-foreground mb-1">Daily Compute Cost</p>
              <p className="text-2xl font-bold">${Math.round(facility.currentPowerDrawKw * 24 * facility.costPerKwh)}</p>
            </div>
            <div className="p-4 rounded-lg bg-muted/30 text-center">
              <p className="text-xs text-muted-foreground mb-1">$/TFLOP</p>
              <p className="text-2xl font-bold">$0.0012</p>
            </div>
            <div className="p-4 rounded-lg bg-muted/30 text-center">
              <p className="text-xs text-muted-foreground mb-1">Efficiency Score</p>
              <p className="text-2xl font-bold text-green-500">A+</p>
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
