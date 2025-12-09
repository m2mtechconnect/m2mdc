/**
 * Alerts Panel - Shows active alerts for the facility
 */

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { AlertTriangle, Bell, CheckCircle, Clock, XCircle } from 'lucide-react';
import type { FacilityAlert } from '@/types/dataCenterTwin';

interface AlertsPanelProps {
  alerts: FacilityAlert[];
  maxHeight?: string;
}

export function AlertsPanel({ alerts, maxHeight = '400px' }: AlertsPanelProps) {
  const activeAlerts = alerts.filter(a => a.status === 'active');
  const acknowledgedAlerts = alerts.filter(a => a.status === 'acknowledged');
  
  const getSeverityIcon = (severity: FacilityAlert['severity']) => {
    switch (severity) {
      case 'critical': return <XCircle className="h-4 w-4 text-destructive" />;
      case 'warning': return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      case 'info': return <Bell className="h-4 w-4 text-blue-500" />;
    }
  };
  
  const getSeverityBadge = (severity: FacilityAlert['severity']) => {
    switch (severity) {
      case 'critical': return <Badge variant="destructive">Critical</Badge>;
      case 'warning': return <Badge className="bg-yellow-500/10 text-yellow-600 border-yellow-500/20">Warning</Badge>;
      case 'info': return <Badge variant="secondary">Info</Badge>;
    }
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Bell className="h-4 w-4" />
            Active Alerts
          </CardTitle>
          <Badge variant="outline">
            {activeAlerts.length} Active
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <ScrollArea style={{ height: maxHeight }}>
          <div className="space-y-1 p-4 pt-0">
            {activeAlerts.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                <CheckCircle className="h-8 w-8 mb-2 text-green-500" />
                <p className="text-sm">No active alerts</p>
              </div>
            ) : (
              activeAlerts.map((alert) => (
                <AlertItem key={alert.id} alert={alert} />
              ))
            )}
            
            {acknowledgedAlerts.length > 0 && (
              <>
                <div className="text-xs text-muted-foreground pt-4 pb-2 font-medium">
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
      case 'warning': return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      case 'info': return <Bell className="h-4 w-4 text-blue-500" />;
    }
  };

  return (
    <div className={`p-3 rounded-lg border ${muted ? 'bg-muted/30 opacity-60' : 'bg-card'} hover:bg-muted/50 transition-colors`}>
      <div className="flex items-start gap-3">
        <div className="mt-0.5">
          {getSeverityIcon(alert.severity)}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="font-medium text-sm truncate">{alert.title}</span>
          </div>
          <p className="text-xs text-muted-foreground line-clamp-2">
            {alert.description}
          </p>
          <div className="flex items-center gap-2 mt-2">
            <Badge variant="outline" className="text-xs">
              {alert.domain}
            </Badge>
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {formatTimeAgo(alert.triggeredAt)}
            </span>
          </div>
        </div>
        {!muted && (
          <Button variant="ghost" size="sm" className="shrink-0">
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
