/**
 * Live Recommendations During Simulation
 * Inject suggestions, predicted failures, recommended interventions
 */

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Lightbulb, 
  AlertTriangle, 
  Wrench, 
  Clock,
  ChevronRight,
  Zap,
  ThermometerSun,
  Server,
  Shield
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { SIMULATION } from '@/ux';

interface Recommendation {
  id: string;
  type: 'suggestion' | 'prediction' | 'intervention';
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  description: string;
  predictedTime?: number; // seconds from now
  domain: string;
  confidence: number; // 0-100
  actions?: { label: string; action: () => void }[];
}

interface LiveRecommendationsProps {
  recommendations?: Recommendation[];
  currentTime?: number;
  className?: string;
}

const DOMAIN_ICONS: Record<string, React.ElementType> = {
  thermal: ThermometerSun,
  power: Zap,
  workload: Server,
  sovereignty: Shield,
};

// Mock recommendations for demo
const MOCK_RECOMMENDATIONS: Recommendation[] = [
  {
    id: 'rec-1',
    type: 'prediction',
    severity: 'high',
    title: 'Thermal Threshold Breach in 8 minutes',
    description: 'Rack R-14 inlet temperature trending toward 32°C. Current rate: +0.5°C/min.',
    predictedTime: 480,
    domain: 'thermal',
    confidence: 87,
  },
  {
    id: 'rec-2',
    type: 'intervention',
    severity: 'medium',
    title: 'Recommended: Redistribute GPU Load',
    description: 'Moving 15% of workload from Cluster A to Cluster B would reduce thermal stress by 18%.',
    domain: 'workload',
    confidence: 92,
    actions: [{ label: 'Apply', action: () => console.log('Apply intervention') }],
  },
  {
    id: 'rec-3',
    type: 'suggestion',
    severity: 'low',
    title: 'Cooling Efficiency Opportunity',
    description: 'Raising supply air temp by 1°C would save 3.2% cooling energy with minimal thermal impact.',
    domain: 'thermal',
    confidence: 78,
  },
  {
    id: 'rec-4',
    type: 'prediction',
    severity: 'critical',
    title: 'UPS Failover Risk Detected',
    description: 'Battery bank B showing degraded capacity. Failover time may exceed SLA during peak load.',
    predictedTime: 1200,
    domain: 'power',
    confidence: 65,
  },
];

export function LiveRecommendations({ 
  recommendations, 
  currentTime = 0,
  className 
}: LiveRecommendationsProps) {
  const recs = recommendations || MOCK_RECOMMENDATIONS;

  const getTypeIcon = (type: Recommendation['type']) => {
    switch (type) {
      case 'prediction': return AlertTriangle;
      case 'intervention': return Wrench;
      default: return Lightbulb;
    }
  };

  const getSeverityColor = (severity: Recommendation['severity']) => {
    switch (severity) {
      case 'critical': return 'text-destructive bg-destructive/10 border-destructive/20';
      case 'high': return 'text-warning bg-warning/10 border-warning/20';
      case 'medium': return 'text-info bg-info/10 border-info/20';
      default: return 'text-muted-foreground bg-muted border-border';
    }
  };

  const formatPredictedTime = (seconds: number) => {
    if (seconds < 60) return `${seconds}s`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
    return `${Math.floor(seconds / 3600)}h ${Math.floor((seconds % 3600) / 60)}m`;
  };

  return (
    <Card className={className}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <Lightbulb className="h-4 w-4 text-warning" />
            {SIMULATION.SECTIONS.LIVE_INSIGHTS}
          </CardTitle>
          <Badge variant="secondary" className="text-xs">
            {recs.length} active
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="p-0">
        <ScrollArea className="h-72">
          <div className="p-4 pt-2 space-y-3">
            {recs.map(rec => {
              const TypeIcon = getTypeIcon(rec.type);
              const DomainIcon = DOMAIN_ICONS[rec.domain] || Server;
              
              return (
                <div
                  key={rec.id}
                  className={cn(
                    "p-3 rounded-lg border transition-colors",
                    getSeverityColor(rec.severity)
                  )}
                >
                  <div className="flex items-start gap-3">
                    <div className="p-1.5 rounded-md bg-background/50">
                      <TypeIcon className="h-4 w-4" />
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium text-sm truncate">
                          {rec.title}
                        </span>
                      </div>
                      
                      <p className="text-xs opacity-80 mb-2">
                        {rec.description}
                      </p>
                      
                      <div className="flex items-center gap-3 text-xs">
                        <span className="flex items-center gap-1">
                          <DomainIcon className="h-3 w-3" />
                          {rec.domain}
                        </span>
                        
                        {rec.predictedTime && (
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            in {formatPredictedTime(rec.predictedTime)}
                          </span>
                        )}
                        
                        <span className="flex items-center gap-1">
                          <Badge variant="outline" className="h-4 px-1 text-[10px]">
                            {rec.confidence}% conf
                          </Badge>
                        </span>
                      </div>
                      
                      {rec.actions && rec.actions.length > 0 && (
                        <div className="flex gap-2 mt-2">
                          {rec.actions.map((action, i) => (
                            <Button
                              key={i}
                              size="sm"
                              variant="secondary"
                              className="h-6 text-xs"
                              onClick={action.action}
                            >
                              {action.label}
                              <ChevronRight className="h-3 w-3 ml-1" />
                            </Button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
