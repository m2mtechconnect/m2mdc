/**
 * DC Incident Timeline Component
 * Displays recent incidents including carbon and financial events
 */

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  AlertTriangle, Thermometer, Zap, Wind, DollarSign, Leaf, 
  Globe, Shield, Activity, CheckCircle2, Clock
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { DomainType } from '@/types/dataCenterTwin';

export interface Incident {
  id: string;
  timestamp: Date;
  domain: DomainType;
  severity: 'info' | 'warning' | 'critical';
  title: string;
  description: string;
  status: 'active' | 'acknowledged' | 'resolved';
  resolvedAt?: Date;
  metadata?: Record<string, any>;
}

interface DCIncidentTimelineProps {
  incidents: Incident[];
  maxItems?: number;
  compact?: boolean;
}

const domainIcons: Record<DomainType, React.ReactNode> = {
  thermal_hardware: <Thermometer className="h-3.5 w-3.5" />,
  power_ups: <Zap className="h-3.5 w-3.5" />,
  cooling: <Wind className="h-3.5 w-3.5" />,
  network: <Activity className="h-3.5 w-3.5" />,
  facility_safety: <Shield className="h-3.5 w-3.5" />,
  workload_gpu: <Activity className="h-3.5 w-3.5" />,
  sovereignty: <Globe className="h-3.5 w-3.5" />,
  financial_carbon: <DollarSign className="h-3.5 w-3.5" />,
};

const severityColors = {
  info: 'bg-muted text-muted-foreground border-border',
  warning: 'bg-warning/10 text-warning border-warning/30',
  critical: 'bg-destructive/10 text-destructive border-destructive/30',
};

function formatTimeAgo(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  
  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  
  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays}d ago`;
}

export function DCIncidentTimeline({ 
  incidents, 
  maxItems = 10,
  compact = false 
}: DCIncidentTimelineProps) {
  const sortedIncidents = [...incidents]
    .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
    .slice(0, maxItems);
  
  if (compact) {
    return (
      <div className="space-y-2">
        {sortedIncidents.map((incident) => (
          <div 
            key={incident.id}
            className={cn(
              'flex items-center justify-between p-2 rounded-lg border',
              severityColors[incident.severity]
            )}
          >
            <div className="flex items-center gap-2">
              {domainIcons[incident.domain]}
              <span className="text-xs truncate max-w-[200px]">{incident.title}</span>
            </div>
            <span className="text-[10px] text-muted-foreground">
              {formatTimeAgo(incident.timestamp)}
            </span>
          </div>
        ))}
      </div>
    );
  }

  return (
    <Card className="bg-card border-border">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-primary" />
            Recent Incidents
          </CardTitle>
          <Badge variant="outline" className="text-xs">
            {incidents.filter(i => i.status === 'active').length} Active
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[300px] pr-4">
          <div className="space-y-3">
            {sortedIncidents.map((incident) => (
              <div 
                key={incident.id}
                className={cn(
                  'p-3 rounded-lg border transition-colors',
                  severityColors[incident.severity]
                )}
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded bg-background/50">
                      {domainIcons[incident.domain]}
                    </div>
                    <div>
                      <p className="text-sm font-medium">{incident.title}</p>
                      <p className="text-xs text-muted-foreground capitalize">
                        {incident.domain.replace('_', ' ')}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {incident.status === 'resolved' ? (
                      <CheckCircle2 className="h-3.5 w-3.5 text-success" />
                    ) : (
                      <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                    )}
                    <span className="text-[10px] text-muted-foreground">
                      {formatTimeAgo(incident.timestamp)}
                    </span>
                  </div>
                </div>
                
                <p className="text-xs text-muted-foreground mb-2">
                  {incident.description}
                </p>
                
                {/* Metadata badges for carbon/financial incidents */}
                {incident.metadata && (
                  <div className="flex gap-1.5 flex-wrap">
                    {incident.metadata.emissionsImpact && (
                      <Badge variant="outline" className="text-[10px] bg-success/10 text-success">
                        <Leaf className="h-2.5 w-2.5 mr-1" />
                        {incident.metadata.emissionsImpact}
                      </Badge>
                    )}
                    {incident.metadata.costImpact && (
                      <Badge variant="outline" className="text-[10px] bg-warning/10 text-warning">
                        <DollarSign className="h-2.5 w-2.5 mr-1" />
                        {incident.metadata.costImpact}
                      </Badge>
                    )}
                    {incident.metadata.region && (
                      <Badge variant="outline" className="text-[10px]">
                        {incident.metadata.region}
                      </Badge>
                    )}
                  </div>
                )}
              </div>
            ))}
            
            {sortedIncidents.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                <CheckCircle2 className="h-8 w-8 mx-auto mb-2 text-success" />
                <p className="text-sm">No recent incidents</p>
              </div>
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}

// Generate mock carbon/financial incidents for demo
export function generateCarbonFinancialIncidents(): Incident[] {
  const now = new Date();
  
  return [
    {
      id: 'cf-1',
      timestamp: new Date(now.getTime() - 15 * 60000),
      domain: 'financial_carbon',
      severity: 'warning',
      title: 'Carbon price spike detected',
      description: 'Regional carbon pricing increased by 15% affecting operating costs.',
      status: 'active',
      metadata: {
        costImpact: '+$2,400/day',
        region: 'CA-AB',
      },
    },
    {
      id: 'cf-2',
      timestamp: new Date(now.getTime() - 45 * 60000),
      domain: 'financial_carbon',
      severity: 'info',
      title: 'Renewable mix improved',
      description: 'Grid renewable percentage increased from 85% to 92%.',
      status: 'resolved',
      resolvedAt: new Date(now.getTime() - 30 * 60000),
      metadata: {
        emissionsImpact: '-8% CO₂',
        region: 'CA-QC',
      },
    },
    {
      id: 'cf-3',
      timestamp: new Date(now.getTime() - 2 * 3600000),
      domain: 'financial_carbon',
      severity: 'critical',
      title: 'Cost per GPU-hour threshold exceeded',
      description: 'GPU-hour costs rose above $4.50 threshold due to cooling inefficiency.',
      status: 'acknowledged',
      metadata: {
        costImpact: '+$0.85/GPU-hr',
      },
    },
    {
      id: 'cf-4',
      timestamp: new Date(now.getTime() - 4 * 3600000),
      domain: 'financial_carbon',
      severity: 'warning',
      title: 'Daily emissions target exceeded',
      description: 'Projected daily emissions 12% above target budget.',
      status: 'active',
      metadata: {
        emissionsImpact: '+480 kg CO₂',
      },
    },
  ];
}
