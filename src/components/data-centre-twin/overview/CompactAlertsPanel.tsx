/**
 * Compact Active Alerts Panel - Tight list layout
 */

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  AlertTriangle, Bell, CheckCircle, Clock, XCircle, 
  Info, ChevronRight
} from 'lucide-react';
import { CollapsibleSection } from '@/components/shared/CollapsibleSection';
import { cn } from '@/lib/utils';
import type { FacilityAlert } from '@/types/dataCenterTwin';

interface CompactAlertsPanelProps {
  alerts: FacilityAlert[];
  maxVisible?: number;
  onViewAllAlerts?: () => void;
  onAcknowledge?: (alertId: string) => void;
}

export function CompactAlertsPanel({ 
  alerts, 
  maxVisible = 3,
  onViewAllAlerts,
  onAcknowledge 
}: CompactAlertsPanelProps) {
  const activeAlerts = alerts.filter(a => a.status === 'active');
  const criticalAlerts = activeAlerts.filter(a => a.severity === 'critical');
  const warningAlerts = activeAlerts.filter(a => a.severity === 'warning');
  
  const visibleAlerts = activeAlerts.slice(0, maxVisible);
  const hasMore = activeAlerts.length > maxVisible;
  
  const getSeverityIcon = (severity: FacilityAlert['severity']) => {
    switch (severity) {
      case 'critical': return <XCircle className="h-3.5 w-3.5 text-destructive" />;
      case 'warning': return <AlertTriangle className="h-3.5 w-3.5 text-warning" />;
      case 'info': return <Info className="h-3.5 w-3.5 text-info" />;
    }
  };

  return (
    <CollapsibleSection
      title="Active Alerts"
      badge={criticalAlerts.length > 0 ? `${criticalAlerts.length} critical` : `${activeAlerts.length} active`}
      defaultOpen={true}
      icon={<Bell className="h-4 w-4 text-primary" />}
    >
      {/* Quick Summary */}
      <div className="flex items-center gap-2 mb-3">
        {criticalAlerts.length > 0 && (
          <Badge variant="destructive" className="gap-1 text-[10px]">
            <XCircle className="h-2.5 w-2.5" />
            {criticalAlerts.length} Critical
          </Badge>
        )}
        {warningAlerts.length > 0 && (
          <Badge className="bg-warning/10 text-warning border-warning/30 gap-1 text-[10px]">
            <AlertTriangle className="h-2.5 w-2.5" />
            {warningAlerts.length} Warning
          </Badge>
        )}
        {activeAlerts.length === 0 && (
          <div className="flex items-center gap-1.5 text-success text-xs">
            <CheckCircle className="h-3.5 w-3.5" />
            All systems operational
          </div>
        )}
      </div>
      
      {/* Alert List or Empty State */}
      {activeAlerts.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-6 text-muted-foreground">
          <div className="p-2.5 rounded-full bg-success/10 mb-2">
            <CheckCircle className="h-5 w-5 text-success" />
          </div>
          <p className="text-xs font-medium">No active alerts</p>
          <p className="text-[10px]">All systems operating normally</p>
        </div>
      ) : (
        <div className="space-y-2">
          {visibleAlerts.map((alert) => (
            <div
              key={alert.id}
              className={cn(
                'flex items-start gap-2 p-2 rounded-lg border transition-colors cursor-pointer hover:bg-muted/30',
                alert.severity === 'critical' && 'border-destructive/30 bg-destructive/5',
                alert.severity === 'warning' && 'border-warning/30 bg-warning/5',
                alert.severity === 'info' && 'border-border'
              )}
            >
              <div className="mt-0.5 shrink-0">
                {getSeverityIcon(alert.severity)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium truncate">{alert.title}</p>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-[10px] text-muted-foreground flex items-center gap-0.5 font-mono">
                    <Clock className="h-2.5 w-2.5" />
                    {formatTimeAgo(alert.triggeredAt)}
                  </span>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="shrink-0 h-6 px-2 text-[10px]"
                onClick={(e) => { e.stopPropagation(); onAcknowledge?.(alert.id); }}
              >
                Ack
              </Button>
            </div>
          ))}
          
          {hasMore && (
            <Button
              variant="ghost"
              size="sm"
              className="w-full text-xs text-muted-foreground gap-1"
              onClick={onViewAllAlerts}
            >
              View all {activeAlerts.length} alerts
              <ChevronRight className="h-3 w-3" />
            </Button>
          )}
        </div>
      )}
    </CollapsibleSection>
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
