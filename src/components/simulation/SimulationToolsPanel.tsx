/**
 * Enhanced Tools for Simulation section
 * With simulation context tags, status badges, and hover effects
 */

import { memo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Cpu, Zap, Wind, Globe, Leaf, ChevronRight,
  Activity, CheckCircle, AlertTriangle, Clock
} from 'lucide-react';
import { CollapsibleSection } from '@/components/shared/CollapsibleSection';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface SimulationToolsPanelProps {
  twinId?: string;
  isSimulationActive: boolean;
  activeScenarioId?: string;
  onOpenTool?: (toolId: string) => void;
}

interface SimTool {
  id: string;
  name: string;
  description: string;
  subtitle: string;
  icon: React.ReactNode;
  color: string;
  status: 'running' | 'ready' | 'requires-data';
  contextTags: string[];
}

const tools: SimTool[] = [
  {
    id: 'gpu-telemetry',
    name: 'GPU Telemetry Explorer',
    description: 'Real-time GPU thermal load & clock anomalies',
    subtitle: 'Open in Simulation Context',
    icon: <Cpu className="h-5 w-5" />,
    color: 'text-accent',
    status: 'ready',
    contextTags: ['thermal', 'workload'],
  },
  {
    id: 'power-quality',
    name: 'Power Quality Monitor',
    description: 'UPS performance, phase imbalance, and battery decay',
    subtitle: 'Open in Simulation Context',
    icon: <Zap className="h-5 w-5" />,
    color: 'text-warning',
    status: 'ready',
    contextTags: ['power', 'facility'],
  },
  {
    id: 'cooling-optimizer',
    name: 'Cooling Optimizer',
    description: 'CRAC/CRAH efficiency tuning and airflow modeling',
    subtitle: 'Open in Simulation Context',
    icon: <Wind className="h-5 w-5" />,
    color: 'text-info',
    status: 'running',
    contextTags: ['cooling', 'thermal'],
  },
  {
    id: 'sovereignty-inspector',
    name: 'Sovereignty Inspector',
    description: 'Jurisdiction mapping, data routing, compliance drift',
    subtitle: 'Open in Simulation Context',
    icon: <Globe className="h-5 w-5" />,
    color: 'text-primary',
    status: 'ready',
    contextTags: ['sovereignty'],
  },
  {
    id: 'carbon-analyzer',
    name: 'Carbon & Cost Analyzer',
    description: 'Carbon emissions cost forecasting and mitigation',
    subtitle: 'Open in Simulation Context',
    icon: <Leaf className="h-5 w-5" />,
    color: 'text-success',
    status: 'requires-data',
    contextTags: ['carbon', 'financial'],
  },
];

const statusConfig = {
  running: {
    icon: <Activity className="h-3 w-3" />,
    label: 'Running',
    className: 'bg-success/10 text-success border-success/30',
  },
  ready: {
    icon: <CheckCircle className="h-3 w-3" />,
    label: 'Ready',
    className: 'bg-primary/10 text-primary border-primary/30',
  },
  'requires-data': {
    icon: <Clock className="h-3 w-3" />,
    label: 'Needs Data',
    className: 'bg-warning/10 text-warning border-warning/30',
  },
};

export const SimulationToolsPanel = memo(function SimulationToolsPanel({
  twinId,
  isSimulationActive,
  activeScenarioId,
  onOpenTool
}: SimulationToolsPanelProps) {
  return (
    <CollapsibleSection
      title="Tools for this Simulation"
      badge={`${tools.length} tools`}
      defaultOpen={true}
      icon={<Activity className="h-5 w-5 text-primary" />}
    >
      <p className="text-xs text-muted-foreground mb-4">
        Launch domain-specific views with simulation context applied
      </p>
      
      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        {tools.map((tool, index) => {
          const status = statusConfig[tool.status];
          const isActive = tool.status === 'running' && isSimulationActive;
          
          return (
            <motion.div
              key={tool.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              whileHover={{ y: -3, scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
            >
              <Card 
                className={cn(
                  'bg-card border-border cursor-pointer transition-all duration-200',
                  'hover:shadow-lg hover:border-primary/30',
                  isActive && 'border-success/30 ring-1 ring-success/20'
                )}
                onClick={() => onOpenTool?.(tool.id)}
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className={cn('p-2 rounded-lg bg-muted/50', tool.color)}>
                      {tool.icon}
                    </div>
                    <Badge 
                      variant="outline" 
                      className={cn('text-[10px] gap-0.5', status.className)}
                    >
                      {status.icon}
                      {status.label}
                    </Badge>
                  </div>
                  
                  <div className="space-y-1 mb-3">
                    <h4 className="text-sm font-semibold leading-tight">{tool.name}</h4>
                    <p className="text-[11px] text-muted-foreground line-clamp-2">
                      {tool.description}
                    </p>
                  </div>
                  
                  {/* Context Tags */}
                  <div className="flex flex-wrap gap-1 mb-3">
                    {tool.contextTags.map(tag => (
                      <Badge 
                        key={tag} 
                        variant="outline" 
                        className="text-[9px] h-4 px-1.5 bg-muted/50"
                      >
                        {tag}
                      </Badge>
                    ))}
                  </div>
                  
                  <div className="flex items-center justify-between pt-2 border-t border-border">
                    <span className="text-[10px] text-muted-foreground">
                      {tool.subtitle}
                    </span>
                    <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </div>
    </CollapsibleSection>
  );
});
