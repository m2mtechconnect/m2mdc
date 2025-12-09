/**
 * Alerts Panel - Shows active alerts for the facility
 * Uses DC UI components for consistent NOC aesthetics
 */

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { DCCard, DCStatusBadge, DCEventBadge } from '@/components/dc-ui';
import { AlertTriangle, Bell, CheckCircle, Clock, XCircle } from 'lucide-react';
import type { FacilityAlert } from '@/types/dataCenterTwin';

interface AlertsPanelProps {
  alerts: FacilityAlert[];
  maxHeight?: string;
}

export function AlertsPanel({ alerts, maxHeight = '400px' }: AlertsPanelProps) {
  const activeAlerts = alerts.filter(a => a.status === 'active');
  const acknowledgedAlerts = alerts.filter(a => a.status === 'acknowledged');

  return (
    <DCCard
      title="Active Alerts"
      icon={<Bell className="h-4 w-4" />}
      status={activeAlerts.some(a => a.severity === 'critical') ? 'critical' : activeAlerts.length > 0 ? 'warning' : 'normal'}
      headerAction={
        <Badge variant="outline" className="font-mono text-xs">
          {activeAlerts.length} Active
        </Badge>
      }
    >
      <ScrollArea style={{ height: maxHeight }}>
        <div className="space-y-2">
          {activeAlerts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
              <div className="p-3 rounded-full bg-dc-success/20 mb-3">
                <CheckCircle className="h-6 w-6 text-dc-success" />
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
              <div className="text-xs text-muted-foreground pt-4 pb-2 font-medium border-t border-dc-border mt-4">
                Acknowledged ({acknowledgedAlerts.length})
              </div>
              {acknowledgedAlerts.slice(0, 3).map((alert) => (
                <AlertItem key={alert.id} alert={alert} muted />
              ))}
            </>
          )}
        </div>
      </ScrollArea>
    </DCCard>
  );
}

interface AlertItemProps {
  alert: FacilityAlert;
  muted?: boolean;
}

function AlertItem({ alert, muted }: AlertItemProps) {
  const getSeverityIcon = (severity: FacilityAlert['severity']) => {
    switch (severity) {
      case 'critical': return <XCircle className="h-4 w-4 text-dc-critical" />;
      case 'warning': return <AlertTriangle className="h-4 w-4 text-dc-warning" />;
      case 'info': return <Bell className="h-4 w-4 text-dc-sovereignty" />;
    }
  };

  const mapDomainToEventType = (domain: string): 'thermal' | 'power' | 'cooling' | 'network' | 'security' | 'gpu' | 'sovereignty' => {
    const domainMap: Record<string, 'thermal' | 'power' | 'cooling' | 'network' | 'security' | 'gpu' | 'sovereignty'> = {
      'thermal': 'thermal',
      'power': 'power',
      'cooling': 'cooling',
      'network': 'network',
      'facility': 'security',
      'workload': 'gpu',
      'sovereignty': 'sovereignty',
      'financial': 'power',
    };
    return domainMap[domain.toLowerCase()] || 'security';
  };

  return (
    <div 
      className={`p-3 rounded-lg border transition-all duration-200 ${
        muted 
          ? 'bg-dc-surface/30 opacity-60 border-dc-border/50' 
          : alert.severity === 'critical'
            ? 'bg-dc-critical/5 border-dc-critical/30 hover:border-dc-critical/50'
            : alert.severity === 'warning'
              ? 'bg-dc-warning/5 border-dc-warning/30 hover:border-dc-warning/50'
              : 'bg-dc-surface border-dc-border hover:border-dc-primary/30'
      }`}
    >
      <div className="flex items-start gap-3">
        <div className="mt-0.5">
          {getSeverityIcon(alert.severity)}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="font-medium text-sm truncate">{alert.title}</span>
          </div>
          <p className="text-xs text-muted-foreground line-clamp-2 mb-2">
            {alert.description}
          </p>
          <div className="flex items-center gap-2 flex-wrap">
            <DCEventBadge type={mapDomainToEventType(alert.domain)} />
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
            className="shrink-0 h-7 px-2 text-xs hover:bg-dc-primary/20 hover:text-dc-primary"
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
