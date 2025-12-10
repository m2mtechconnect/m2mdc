/**
 * Enhanced Data Centre Tools Panel with visual identity and status
 */

import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Cpu, Zap, Wind, Globe, Leaf, ChevronRight,
  Activity, AlertTriangle, CheckCircle, TrendingUp
} from 'lucide-react';
import { CollapsibleSection } from '@/components/shared/CollapsibleSection';
import { cn } from '@/lib/utils';

interface DCTool {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  color: string;
  status: 'healthy' | 'warning' | 'alert';
  statusLabel: string;
  metric?: string;
}

interface EnhancedDCToolsPanelProps {
  twinId?: string;
  onOpenTool?: (toolId: string) => void;
}

const tools: DCTool[] = [
  {
    id: 'gpu-telemetry',
    name: 'GPU Telemetry Explorer',
    description: 'Real-time GPU thermal load & clock anomalies',
    icon: <Cpu className="h-5 w-5" />,
    color: 'text-accent',
    status: 'warning',
    statusLabel: 'Heat Stress Detected',
    metric: '78°C avg',
  },
  {
    id: 'power-quality',
    name: 'Power Quality Monitor',
    description: 'UPS performance, phase imbalance, and battery decay',
    icon: <Zap className="h-5 w-5" />,
    color: 'text-warning',
    status: 'healthy',
    statusLabel: 'All Systems Normal',
    metric: '99.2% uptime',
  },
  {
    id: 'cooling-optimizer',
    name: 'Cooling Optimizer',
    description: 'CRAC/CRAH efficiency tuning and airflow modeling',
    icon: <Wind className="h-5 w-5" />,
    color: 'text-info',
    status: 'healthy',
    statusLabel: 'Balanced (98%)',
    metric: 'PUE 1.38',
  },
  {
    id: 'sovereignty-inspector',
    name: 'Sovereignty & Compliance Inspector',
    description: 'Jurisdiction mapping, data routing, compliance drift',
    icon: <Globe className="h-5 w-5" />,
    color: 'text-primary',
    status: 'warning',
    statusLabel: 'Compliance Drift (9% ↑)',
    metric: '91% compliant',
  },
  {
    id: 'carbon-analyzer',
    name: 'Carbon & Cost Analyzer',
    description: 'Carbon emissions cost forecasting and mitigation actions',
    icon: <Leaf className="h-5 w-5" />,
    color: 'text-success',
    status: 'healthy',
    statusLabel: 'On Target',
    metric: '2.4t CO₂/day',
  },
];

const statusConfig = {
  healthy: {
    icon: <CheckCircle className="h-3.5 w-3.5" />,
    className: 'bg-success/10 text-success border-success/30',
  },
  warning: {
    icon: <AlertTriangle className="h-3.5 w-3.5" />,
    className: 'bg-warning/10 text-warning border-warning/30',
  },
  alert: {
    icon: <Activity className="h-3.5 w-3.5" />,
    className: 'bg-destructive/10 text-destructive border-destructive/30',
  },
};

export function EnhancedDCToolsPanel({ twinId, onOpenTool }: EnhancedDCToolsPanelProps) {
  return (
    <CollapsibleSection
      title="Data Centre Tools"
      badge={`${tools.length} tools`}
      defaultOpen={true}
      icon={<Activity className="h-5 w-5 text-primary" />}
    >
      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        {tools.map((tool) => {
          const status = statusConfig[tool.status];
          
          return (
            <Card 
              key={tool.id}
              className="bg-card border-border hover:border-primary/30 transition-all cursor-pointer group"
              onClick={() => onOpenTool?.(tool.id)}
            >
              <CardContent className="p-4">
                <div className="flex items-start justify-between mb-3">
                  <div className={cn('p-2 rounded-lg bg-muted/50', tool.color)}>
                    {tool.icon}
                  </div>
                  <Badge variant="outline" className={cn('text-[10px] gap-0.5', status.className)}>
                    {status.icon}
                  </Badge>
                </div>
                
                <div className="space-y-1 mb-3">
                  <h4 className="text-sm font-medium leading-tight">{tool.name}</h4>
                  <p className="text-[11px] text-muted-foreground line-clamp-2">
                    {tool.description}
                  </p>
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="text-[10px]">
                    <span className={cn('font-medium', status.className.split(' ').find(c => c.startsWith('text-')))}>
                      {tool.statusLabel}
                    </span>
                    {tool.metric && (
                      <span className="text-muted-foreground ml-2 font-mono">{tool.metric}</span>
                    )}
                  </div>
                  <ChevronRight className="h-3.5 w-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </CollapsibleSection>
  );
}
