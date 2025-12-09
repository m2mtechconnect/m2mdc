import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Bell, BellOff, AlertTriangle, Info, AlertCircle } from 'lucide-react';
import { useState } from 'react';
import { useToast } from '@/hooks/use-toast';

interface AOCAlertsPanelProps {
  agentId: string;
}

interface Alert {
  id: string;
  type: 'error' | 'warning' | 'info';
  title: string;
  message: string;
  threshold: string;
  enabled: boolean;
  triggered: boolean;
  lastTriggered?: string;
}

export function AOCAlertsPanel({ agentId }: AOCAlertsPanelProps) {
  const { toast } = useToast();
  const [alerts, setAlerts] = useState<Alert[]>([
    {
      id: '1',
      type: 'error',
      title: 'Error Rate Threshold',
      message: 'Alert when error rate exceeds 5%',
      threshold: '5% errors',
      enabled: true,
      triggered: false,
    },
    {
      id: '2',
      type: 'warning',
      title: 'Response Time Warning',
      message: 'Alert when P95 latency exceeds 2s',
      threshold: '2000ms P95',
      enabled: true,
      triggered: false,
    },
    {
      id: '3',
      type: 'warning',
      title: 'Token Usage High',
      message: 'Alert when daily token usage exceeds 100K',
      threshold: '100K tokens/day',
      enabled: false,
      triggered: false,
    },
    {
      id: '4',
      type: 'info',
      title: 'Deployment Update',
      message: 'Notify on new deployments',
      threshold: 'On deployment',
      enabled: true,
      triggered: false,
    },
    {
      id: '5',
      type: 'error',
      title: 'Agent Offline',
      message: 'Alert when agent stops responding',
      threshold: '5min downtime',
      enabled: true,
      triggered: true,
      lastTriggered: '2 hours ago',
    },
  ]);

  const toggleAlert = (alertId: string) => {
    setAlerts(prev => 
      prev.map(a => 
        a.id === alertId ? { ...a, enabled: !a.enabled } : a
      )
    );
    toast({
      title: '✓ Alert Updated',
      description: 'Alert configuration saved',
    });
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'error': return AlertCircle;
      case 'warning': return AlertTriangle;
      case 'info': return Info;
      default: return Bell;
    }
  };

  const getColor = (type: string) => {
    switch (type) {
      case 'error': return 'text-red-500';
      case 'warning': return 'text-yellow-500';
      case 'info': return 'text-blue-500';
      default: return 'text-muted-foreground';
    }
  };

  const activeAlerts = alerts.filter(a => a.enabled).length;

  return (
    <div className="h-full flex flex-col bg-card">
      {/* Header */}
      <div className="p-4 border-b">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Bell className="h-4 w-4" />
            <h3 className="text-sm font-semibold">Alert Configuration</h3>
          </div>
          <Badge variant="secondary" className="text-xs">
            {activeAlerts} Active
          </Badge>
        </div>
        <p className="text-xs text-muted-foreground">
          Configure thresholds and notifications
        </p>
      </div>

      {/* Alerts List */}
      <div className="flex-1 overflow-auto p-4 space-y-3">
        {alerts.map((alert) => {
          const Icon = getIcon(alert.type);
          const color = getColor(alert.type);
          
          return (
            <Card key={alert.id} className="p-3">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <Icon className={`h-3.5 w-3.5 flex-shrink-0 ${color}`} />
                    <span className="text-sm font-medium truncate">
                      {alert.title}
                    </span>
                    {alert.triggered && (
                      <Badge variant="destructive" className="text-xs">
                        Triggered
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mb-2">
                    {alert.message}
                  </p>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs">
                      {alert.threshold}
                    </Badge>
                    {alert.lastTriggered && (
                      <span className="text-xs text-muted-foreground">
                        Last: {alert.lastTriggered}
                      </span>
                    )}
                  </div>
                </div>
                <Switch
                  checked={alert.enabled}
                  onCheckedChange={() => toggleAlert(alert.id)}
                />
              </div>
            </Card>
          );
        })}
      </div>

      {/* Footer */}
      <div className="p-4 border-t space-y-2">
        <Button variant="outline" size="sm" className="w-full">
          <Bell className="h-3.5 w-3.5 mr-2" />
          Configure Notification Channels
        </Button>
        <Button variant="ghost" size="sm" className="w-full">
          <BellOff className="h-3.5 w-3.5 mr-2" />
          Mute All Alerts (1 hour)
        </Button>
      </div>
    </div>
  );
}
