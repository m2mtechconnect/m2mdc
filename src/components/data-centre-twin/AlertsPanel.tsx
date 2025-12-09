/**
 * Alerts Panel - Shows active alerts for the facility
 * Uses Studio design system (light theme)
 */

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertTriangle, Bell, CheckCircle, Clock, XCircle } from 'lucide-react';
import type { FacilityAlert } from '@/types/dataCenterTwin';

interface AlertsPanelProps {
  alerts: FacilityAlert[];
  maxHeight?: string;
}

export function AlertsPanel({ alerts, maxHeight = '400px' }: AlertsPanelProps) {
  const activeAlerts = alerts.filter(a => a.status === 'active');
  const acknowledgedAlerts = alerts.filter(a => a.status === 'acknowledged');

  const statusBorder = activeAlerts.some(a => a.severity === 'critical') 
    ? 'border-destructive/30' 
    : activeAlerts.length > 0 
      ? 'border-warning/30' 
      : 'border-border';

  return (
    <Card className={`bg-card ${statusBorder}`}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm flex items-center gap-2">
            <Bell className="h-4 w-4 text-primary" />
            Active Alerts
          </CardTitle>
          <Badge variant="outline" className="font-mono text-xs">
            {activeAlerts.length} Active
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <ScrollArea style={{ height: maxHeight }}>
          <div className="space-y-2">
            {activeAlerts.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                <div className="p-3 rounded-full bg-success/10 mb-3">
                  <CheckCircle className="h-6 w-6 text-success" />
                </div>
                <p className="text-sm font-medium">No active alerts</p>
                <p className="text-xs text-muted-foreground">All systems operational</p>
              </div>
            ) : (
              activeAlerts.map((alert) => (
                <AlertItem key={alert.id} alert={alert} />
              ))
            )}
            
            {acknowledgedAlerts.length > 0 && (
              <>
                <div className="text-xs text-muted-foreground pt-4 pb-2 font-medium border-t border-border mt-4">
                  Acknowledged ({acknowledgedAlerts.length})
                </div>
                {acknowledgedAlerts.slice(0, 3).map((alert) => (
                  <AlertItem key={alert.id} alert={alert} muted />
                ))}
              </>
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}

interface AlertItemProps {
  alert: FacilityAlert;
  muted?: boolean;
}

function AlertItem({ alert, muted }: AlertItemProps) {
  const getSeverityIcon = (severity: FacilityAlert['severity']) => {
    switch (severity) {
      case 'critical': return <XCircle className="h-4 w-4 text-destructive" />;
      case 'warning': return <AlertTriangle className="h-4 w-4 text-warning" />;
      case 'info': return <Bell className="h-4 w-4 text-info" />;
    }
  };

  const domainColors: Record<string, string> = {
    thermal: 'bg-destructive/10 text-destructive border-destructive/20',
    power: 'bg-warning/10 text-warning border-warning/20',
    cooling: 'bg-info/10 text-info border-info/20',
    network: 'bg-info/10 text-info border-info/20',
    facility: 'bg-accent/10 text-accent border-accent/20',
    workload: 'bg-accent/10 text-accent border-accent/20',
    sovereignty: 'bg-primary/10 text-primary border-primary/20',
    financial: 'bg-success/10 text-success border-success/20',
  };

  return (
    <div 
      className={`p-3 rounded-lg border transition-all duration-200 ${
        muted 
          ? 'bg-muted/30 opacity-60 border-border/50' 
          : alert.severity === 'critical'
            ? 'bg-destructive/5 border-destructive/30 hover:border-destructive/50'
            : alert.severity === 'warning'
              ? 'bg-warning/5 border-warning/30 hover:border-warning/50'
              : 'bg-card border-border hover:border-primary/30'
      }`}
    >
      <div className="flex items-start gap-3">
        <div className="mt-0.5">
          {getSeverityIcon(alert.severity)}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="font-medium text-sm truncate text-card-foreground">{alert.title}</span>
          </div>
          <p className="text-xs text-muted-foreground line-clamp-2 mb-2">
            {alert.description}
          </p>
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant="outline" className={`text-[10px] ${domainColors[alert.domain.toLowerCase()] || 'bg-muted'}`}>
              {alert.domain}
            </Badge>
            <span className="text-xs text-muted-foreground flex items-center gap-1 font-mono">
              <Clock className="h-3 w-3" />
              {formatTimeAgo(alert.triggeredAt)}
            </span>
          </div>
        </div>
        {!muted && (
          <Button 
            variant="ghost" 
            size="sm" 
            className="shrink-0 h-7 px-2 text-xs hover:bg-primary/10 hover:text-primary"
          >
            Ack
          </Button>
        )}
      </div>
    </div>
  );
}

function formatTimeAgo(date: Date): string {
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const minutes = Math.floor(diff / 60000);
  
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}
