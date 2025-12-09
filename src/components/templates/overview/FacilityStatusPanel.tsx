import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Activity, Server, Leaf, Clock, TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface FacilityStatus {
  name: string;
  region: string;
  status: string;
  gpu_count: number;
  uptime_pct: number;
  renewable_mix: number;
}

interface SampleMetric {
  label: string;
  value: string;
  trend: 'up' | 'down' | 'stable';
}

interface RecentIncident {
  id: string;
  type: string;
  severity: 'high' | 'medium' | 'low';
  status: string;
  summary: string;
  timestamp: string;
}

interface KpiSnapshot {
  [key: string]: number;
}

interface FacilityStatusPanelProps {
  facilityStatus?: FacilityStatus;
  kpiSnapshot?: KpiSnapshot;
  sampleMetrics?: SampleMetric[];
  recentIncidents?: RecentIncident[];
}

const TrendIcon = ({ trend }: { trend: string }) => {
  if (trend === 'up') return <TrendingUp className="h-4 w-4 text-green-500" />;
  if (trend === 'down') return <TrendingDown className="h-4 w-4 text-red-500" />;
  return <Minus className="h-4 w-4 text-muted-foreground" />;
};

const SeverityBadge = ({ severity }: { severity: string }) => {
  const colors = {
    high: 'bg-red-100 text-red-700 border-red-200',
    medium: 'bg-yellow-100 text-yellow-700 border-yellow-200',
    low: 'bg-green-100 text-green-700 border-green-200'
  };
  return (
    <Badge className={colors[severity as keyof typeof colors] || colors.low}>
      {severity}
    </Badge>
  );
};

export function FacilityStatusPanel({
  facilityStatus,
  kpiSnapshot,
  sampleMetrics,
  recentIncidents
}: FacilityStatusPanelProps) {
  if (!facilityStatus && !kpiSnapshot && !sampleMetrics?.length && !recentIncidents?.length) {
    return null;
  }

  return (
    <div className="space-y-4">
      {/* Facility Status Header */}
      {facilityStatus && (
        <Card className="p-4 bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Server className="h-6 w-6 text-primary" />
              <div>
                <h3 className="font-semibold text-lg">{facilityStatus.name}</h3>
                <p className="text-sm text-muted-foreground">{facilityStatus.region}</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <Badge variant={facilityStatus.status === 'operational' ? 'default' : 'destructive'}>
                <Activity className="h-3 w-3 mr-1" />
                {facilityStatus.status}
              </Badge>
              <div className="text-right">
                <p className="text-sm text-muted-foreground">Uptime</p>
                <p className="font-bold text-lg">{facilityStatus.uptime_pct}%</p>
              </div>
              <div className="text-right">
                <p className="text-sm text-muted-foreground">GPUs</p>
                <p className="font-bold text-lg">{facilityStatus.gpu_count.toLocaleString()}</p>
              </div>
              <div className="text-right flex items-center gap-1">
                <Leaf className="h-4 w-4 text-green-500" />
                <div>
                  <p className="text-sm text-muted-foreground">Renewable</p>
                  <p className="font-bold text-lg">{facilityStatus.renewable_mix}%</p>
                </div>
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* Sample Metrics Row */}
      {sampleMetrics && sampleMetrics.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {sampleMetrics.map((metric, idx) => (
            <Card key={idx} className="p-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">{metric.label}</p>
                  <p className="font-bold text-lg">{metric.value}</p>
                </div>
                <TrendIcon trend={metric.trend} />
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* KPI Snapshot Grid */}
      {kpiSnapshot && Object.keys(kpiSnapshot).length > 0 && (
        <Card className="p-4">
          <h4 className="font-semibold mb-3 flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-primary" />
            Live KPI Snapshot
          </h4>
          <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
            {Object.entries(kpiSnapshot).map(([key, value]) => (
              <div key={key} className="text-center p-2 bg-muted/30 rounded-lg">
                <p className="text-xs text-muted-foreground capitalize">
                  {key.replace(/_/g, ' ')}
                </p>
                <p className="font-bold text-sm">
                  {typeof value === 'number' ? value.toLocaleString() : value}
                </p>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Recent Incidents */}
      {recentIncidents && recentIncidents.length > 0 && (
        <Card className="p-4">
          <h4 className="font-semibold mb-3 flex items-center gap-2">
            <Clock className="h-4 w-4 text-primary" />
            Recent Incidents
          </h4>
          <div className="space-y-2">
            {recentIncidents.map((incident) => (
              <div
                key={incident.id}
                className="flex items-center justify-between p-2 bg-muted/30 rounded-lg text-sm"
              >
                <div className="flex items-center gap-3">
                  <SeverityBadge severity={incident.severity} />
                  <span className="text-muted-foreground capitalize">
                    {incident.type.replace(/_/g, ' ')}
                  </span>
                </div>
                <div className="flex-1 mx-4 truncate">
                  {incident.summary}
                </div>
                <Badge variant="outline" className="shrink-0">
                  {incident.status}
                </Badge>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
