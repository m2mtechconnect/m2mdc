/**
 * Enhanced Alerts Panel with severity tiers and domain grouping
 */

import { useState, useMemo } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { 
  AlertTriangle, Bell, CheckCircle, Clock, XCircle, 
  ChevronDown, ChevronRight, Info, Thermometer, Zap, Wind,
  Network, Shield, Cpu, Globe, Leaf
} from 'lucide-react';
import { CollapsibleSection } from '@/components/shared/CollapsibleSection';
import type { FacilityAlert } from '@/types/dataCenterTwin';
import { cn } from '@/lib/utils';

interface EnhancedAlertsPanelProps {
  alerts: FacilityAlert[];
  onAcknowledge?: (alertId: string) => void;
  onViewRCA?: (alertId: string) => void;
}

const domainIcons: Record<string, React.ReactNode> = {
  thermal: <Thermometer className="h-3.5 w-3.5" />,
  power: <Zap className="h-3.5 w-3.5" />,
  cooling: <Wind className="h-3.5 w-3.5" />,
  network: <Network className="h-3.5 w-3.5" />,
  facility: <Shield className="h-3.5 w-3.5" />,
  workload: <Cpu className="h-3.5 w-3.5" />,
  sovereignty: <Globe className="h-3.5 w-3.5" />,
  carbon: <Leaf className="h-3.5 w-3.5" />,
  financial: <Leaf className="h-3.5 w-3.5" />,
};

export function EnhancedAlertsPanel({ alerts, onAcknowledge, onViewRCA }: EnhancedAlertsPanelProps) {
  const [selectedAlert, setSelectedAlert] = useState<FacilityAlert | null>(null);
  const [expandedDomains, setExpandedDomains] = useState<Set<string>>(new Set(['thermal', 'power', 'cooling']));
  
  const activeAlerts = alerts.filter(a => a.status === 'active');
  const criticalAlerts = activeAlerts.filter(a => a.severity === 'critical');
  const warningAlerts = activeAlerts.filter(a => a.severity === 'warning');
  const infoAlerts = activeAlerts.filter(a => a.severity === 'info');
  
  // Group alerts by domain
  const alertsByDomain = useMemo(() => {
    const grouped: Record<string, FacilityAlert[]> = {};
    activeAlerts.forEach(alert => {
      const domain = alert.domain.toLowerCase();
      if (!grouped[domain]) grouped[domain] = [];
      grouped[domain].push(alert);
    });
    return grouped;
  }, [activeAlerts]);
  
  const toggleDomain = (domain: string) => {
    setExpandedDomains(prev => {
      const next = new Set(prev);
      if (next.has(domain)) next.delete(domain);
      else next.add(domain);
      return next;
    });
  };
  
  const getSeverityIcon = (severity: FacilityAlert['severity']) => {
    switch (severity) {
      case 'critical': return <XCircle className="h-4 w-4 text-destructive" />;
      case 'warning': return <AlertTriangle className="h-4 w-4 text-warning" />;
      case 'info': return <Info className="h-4 w-4 text-info" />;
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
    carbon: 'bg-success/10 text-success border-success/20',
  };
  
  return (
    <CollapsibleSection
      title="Active Alerts"
      badge={`${criticalAlerts.length} critical`}
      defaultOpen={true}
      icon={<Bell className="h-5 w-5 text-primary" />}
    >
      {/* Severity Summary */}
      <div className="flex items-center gap-3 mb-4">
        {criticalAlerts.length > 0 && (
          <Badge variant="destructive" className="gap-1">
            <XCircle className="h-3 w-3" />
            {criticalAlerts.length} Critical
          </Badge>
        )}
        {warningAlerts.length > 0 && (
          <Badge className="bg-warning/10 text-warning border-warning/30 gap-1">
            <AlertTriangle className="h-3 w-3" />
            {warningAlerts.length} Warning
          </Badge>
        )}
        {infoAlerts.length > 0 && (
          <Badge variant="outline" className="gap-1">
            <Info className="h-3 w-3" />
            {infoAlerts.length} Info
          </Badge>
        )}
        {activeAlerts.length === 0 && (
          <div className="flex items-center gap-2 text-success text-sm">
            <CheckCircle className="h-4 w-4" />
            All systems operational
          </div>
        )}
      </div>
      
      <ScrollArea className="h-[350px] pr-2">
        <div className="space-y-2">
          {Object.entries(alertsByDomain).map(([domain, domainAlerts]) => (
            <div key={domain} className="rounded-lg border border-border overflow-hidden">
              {/* Domain Header */}
              <button
                className="w-full flex items-center justify-between p-3 bg-muted/30 hover:bg-muted/50 transition-colors"
                onClick={() => toggleDomain(domain)}
              >
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className={cn('gap-1', domainColors[domain])}>
                    {domainIcons[domain]}
                    {domain.charAt(0).toUpperCase() + domain.slice(1)}
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    {domainAlerts.length} alert{domainAlerts.length !== 1 ? 's' : ''}
                  </span>
                </div>
                {expandedDomains.has(domain) ? (
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                )}
              </button>
              
              {/* Domain Alerts */}
              {expandedDomains.has(domain) && (
                <div className="divide-y divide-border">
                  {domainAlerts.map((alert) => (
                    <div
                      key={alert.id}
                      className={cn(
                        'p-3 transition-colors hover:bg-muted/20 cursor-pointer',
                        alert.severity === 'critical' && 'bg-destructive/5',
                        alert.severity === 'warning' && 'bg-warning/5'
                      )}
                      onClick={() => setSelectedAlert(alert)}
                    >
                      <div className="flex items-start gap-3">
                        <div className="mt-0.5 shrink-0">
                          {getSeverityIcon(alert.severity)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{alert.title}</p>
                          <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">
                            {alert.description}
                          </p>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-[10px] text-muted-foreground flex items-center gap-1 font-mono">
                              <Clock className="h-2.5 w-2.5" />
                              {formatTimeAgo(alert.triggeredAt)}
                            </span>
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="shrink-0 h-7 px-2 text-xs"
                          onClick={(e) => { e.stopPropagation(); onAcknowledge?.(alert.id); }}
                        >
                          Ack
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
          
          {activeAlerts.length === 0 && (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <div className="p-3 rounded-full bg-success/10 mb-3">
                <CheckCircle className="h-6 w-6 text-success" />
              </div>
              <p className="text-sm font-medium">No active alerts</p>
              <p className="text-xs">All systems operating normally</p>
            </div>
          )}
        </div>
      </ScrollArea>
      
      {/* RCA Modal */}
      <Dialog open={!!selectedAlert} onOpenChange={() => setSelectedAlert(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {selectedAlert && getSeverityIcon(selectedAlert.severity)}
              Root Cause Analysis
            </DialogTitle>
          </DialogHeader>
          
          {selectedAlert && (
            <div className="space-y-4">
              <div className="p-4 rounded-lg bg-muted/30 border border-border">
                <p className="font-medium mb-1">{selectedAlert.title}</p>
                <p className="text-sm text-muted-foreground">{selectedAlert.description}</p>
              </div>
              
              <div className="space-y-3">
                <div>
                  <p className="text-sm font-medium mb-2">Probable Causes</p>
                  <ul className="space-y-1 text-sm text-muted-foreground">
                    <li className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-destructive" />
                      High inlet temperature in adjacent rack
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-warning" />
                      Airflow obstruction from cable management
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-info" />
                      CRAC unit operating at reduced capacity
                    </li>
                  </ul>
                </div>
                
                <div>
                  <p className="text-sm font-medium mb-2">Recommended Actions</p>
                  <ul className="space-y-1 text-sm text-muted-foreground">
                    <li className="flex items-center gap-2">
                      <CheckCircle className="h-3 w-3 text-success" />
                      Increase CRAC B fan speed by 10%
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle className="h-3 w-3 text-success" />
                      Check blanking panels in R17
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle className="h-3 w-3 text-success" />
                      Review workload placement
                    </li>
                  </ul>
                </div>
              </div>
              
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setSelectedAlert(null)}>
                  Close
                </Button>
                <Button onClick={() => { onViewRCA?.(selectedAlert.id); setSelectedAlert(null); }}>
                  Apply Fix
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
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
