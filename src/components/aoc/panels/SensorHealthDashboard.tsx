import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  Activity, 
  AlertTriangle, 
  CheckCircle2, 
  XCircle, 
  TrendingUp, 
  TrendingDown,
  Minus
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface SensorMetrics {
  total: number;
  healthy: number;
  warning: number;
  critical: number;
  offline: number;
  uptime: number;
  avgResponseTime: number;
  alertsToday: number;
}

interface SensorAlert {
  id: string;
  sensorName: string;
  severity: 'warning' | 'critical';
  message: string;
  timestamp: string;
  acknowledged: boolean;
}

interface SensorHealthDashboardProps {
  twinId: string;
  metrics?: SensorMetrics;
  recentAlerts?: SensorAlert[];
}

export function SensorHealthDashboard({ 
  twinId, 
  metrics: propMetrics,
  recentAlerts: propAlerts 
}: SensorHealthDashboardProps) {
  
  // Mock data - in production, fetch from digital_twins and sensor logs
  const metrics: SensorMetrics = propMetrics || {
    total: 24,
    healthy: 18,
    warning: 4,
    critical: 1,
    offline: 1,
    uptime: 98.5,
    avgResponseTime: 45,
    alertsToday: 7,
  };

  const recentAlerts: SensorAlert[] = propAlerts || [
    {
      id: 'a1',
      sensorName: 'Runway Pressure Sensor #4',
      severity: 'critical',
      message: 'Pressure exceeded safe threshold (95 PSI)',
      timestamp: new Date(Date.now() - 300000).toISOString(),
      acknowledged: false,
    },
    {
      id: 'a2',
      sensorName: 'Terminal Power Monitor',
      severity: 'warning',
      message: 'Power consumption at 85% capacity',
      timestamp: new Date(Date.now() - 600000).toISOString(),
      acknowledged: false,
    },
    {
      id: 'a3',
      sensorName: 'Gate A Temperature',
      severity: 'warning',
      message: 'Temperature fluctuation detected',
      timestamp: new Date(Date.now() - 1800000).toISOString(),
      acknowledged: true,
    },
  ];

  const healthPercentage = (metrics.healthy / metrics.total) * 100;
  const uptimeTrend = metrics.uptime > 95 ? 'up' : metrics.uptime > 90 ? 'stable' : 'down';

  return (
    <div className="space-y-4">
      {/* Overall Health Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-muted-foreground">System Health</span>
              {uptimeTrend === 'up' ? (
                <TrendingUp className="h-4 w-4 text-green-500" />
              ) : uptimeTrend === 'down' ? (
                <TrendingDown className="h-4 w-4 text-red-500" />
              ) : (
                <Minus className="h-4 w-4 text-yellow-500" />
              )}
            </div>
            <div className="text-3xl font-bold mb-1">
              {healthPercentage.toFixed(0)}%
            </div>
            <Progress value={healthPercentage} className="h-2" />
            <p className="text-xs text-muted-foreground mt-2">
              {metrics.healthy}/{metrics.total} sensors healthy
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-muted-foreground">Uptime</span>
              <Activity className="h-4 w-4 text-primary" />
            </div>
            <div className="text-3xl font-bold mb-1">
              {metrics.uptime.toFixed(1)}%
            </div>
            <Progress value={metrics.uptime} className="h-2" />
            <p className="text-xs text-muted-foreground mt-2">
              Last 30 days
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-muted-foreground">Avg Response</span>
              <CheckCircle2 className="h-4 w-4 text-green-500" />
            </div>
            <div className="text-3xl font-bold mb-1">
              {metrics.avgResponseTime}ms
            </div>
            <Progress value={(1000 - metrics.avgResponseTime) / 10} className="h-2" />
            <p className="text-xs text-muted-foreground mt-2">
              Target: &lt; 100ms
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-muted-foreground">Alerts Today</span>
              <AlertTriangle className={cn(
                "h-4 w-4",
                metrics.alertsToday > 10 ? "text-red-500" : 
                metrics.alertsToday > 5 ? "text-yellow-500" : 
                "text-green-500"
              )} />
            </div>
            <div className="text-3xl font-bold mb-1">
              {metrics.alertsToday}
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              {metrics.critical} critical, {metrics.warning} warnings
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Sensor Status Breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Sensor Status Breakdown</CardTitle>
            <CardDescription>Real-time sensor health distribution</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                  <span className="text-sm">Healthy</span>
                </div>
                <div className="flex items-center gap-3">
                  <Progress value={(metrics.healthy / metrics.total) * 100} className="w-24 h-2" />
                  <Badge variant="outline" className="text-green-500 border-green-500">
                    {metrics.healthy}
                  </Badge>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-yellow-500" />
                  <span className="text-sm">Warning</span>
                </div>
                <div className="flex items-center gap-3">
                  <Progress value={(metrics.warning / metrics.total) * 100} className="w-24 h-2" />
                  <Badge variant="outline" className="text-yellow-500 border-yellow-500">
                    {metrics.warning}
                  </Badge>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <XCircle className="h-4 w-4 text-red-500" />
                  <span className="text-sm">Critical</span>
                </div>
                <div className="flex items-center gap-3">
                  <Progress value={(metrics.critical / metrics.total) * 100} className="w-24 h-2" />
                  <Badge variant="outline" className="text-red-500 border-red-500">
                    {metrics.critical}
                  </Badge>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <XCircle className="h-4 w-4 text-gray-500" />
                  <span className="text-sm">Offline</span>
                </div>
                <div className="flex items-center gap-3">
                  <Progress value={(metrics.offline / metrics.total) * 100} className="w-24 h-2" />
                  <Badge variant="outline" className="text-gray-500 border-gray-500">
                    {metrics.offline}
                  </Badge>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Recent Alerts */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Alerts</CardTitle>
            <CardDescription>Latest sensor alerts and warnings</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {recentAlerts.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <CheckCircle2 className="h-8 w-8 mx-auto mb-2 text-green-500" />
                  <p className="text-sm">No recent alerts</p>
                </div>
              ) : (
                recentAlerts.map(alert => (
                  <div 
                    key={alert.id}
                    className={cn(
                      "p-3 rounded-lg border",
                      alert.severity === 'critical' ? "border-red-500/20 bg-red-500/5" : "border-yellow-500/20 bg-yellow-500/5",
                      alert.acknowledged && "opacity-50"
                    )}
                  >
                    <div className="flex items-start justify-between mb-1">
                      <div className="flex items-center gap-2">
                        {alert.severity === 'critical' ? (
                          <XCircle className="h-4 w-4 text-red-500 flex-shrink-0" />
                        ) : (
                          <AlertTriangle className="h-4 w-4 text-yellow-500 flex-shrink-0" />
                        )}
                        <span className="text-sm font-medium">{alert.sensorName}</span>
                      </div>
                      {alert.acknowledged && (
                        <Badge variant="outline" className="text-xs">
                          Acknowledged
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground pl-6">
                      {alert.message}
                    </p>
                    <p className="text-xs text-muted-foreground pl-6 mt-1">
                      {new Date(alert.timestamp).toLocaleString()}
                    </p>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
