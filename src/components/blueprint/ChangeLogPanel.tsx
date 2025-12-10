/**
 * Change Log Panel
 * Tracks recent KPI shifts, workflow changes, and last update from Builder
 */

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  History,
  TrendingUp,
  TrendingDown,
  Minus,
  GitBranch,
  Settings,
  Bot,
  BarChart3,
  Clock,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { useDCTwinBuilderStore } from '@/stores/dcTwinBuilderStore';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';

interface ChangeLogEntry {
  id: string;
  timestamp: Date;
  type: 'kpi_shift' | 'workflow_change' | 'agent_update' | 'config_change';
  title: string;
  description: string;
  impact: 'positive' | 'negative' | 'neutral';
  details?: Record<string, any>;
}

export function ChangeLogPanel({ className }: { className?: string }) {
  const { lastSaved, overview, agents, kpis, workflows } = useDCTwinBuilderStore();
  const [isExpanded, setIsExpanded] = useState(true);

  // Generate mock change log based on current state
  // In production, this would come from an audit table
  const changeLog: ChangeLogEntry[] = [
    {
      id: '1',
      timestamp: new Date(Date.now() - 1000 * 60 * 15), // 15 min ago
      type: 'kpi_shift',
      title: 'PUE Target Updated',
      description: 'Target PUE adjusted from 1.4 to 1.35',
      impact: 'positive',
      details: { before: 1.4, after: 1.35, unit: '' },
    },
    {
      id: '2',
      timestamp: new Date(Date.now() - 1000 * 60 * 45), // 45 min ago
      type: 'agent_update',
      title: 'Thermal Guardian Enabled',
      description: 'Agent activated for thermal monitoring',
      impact: 'positive',
    },
    {
      id: '3',
      timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2), // 2 hours ago
      type: 'workflow_change',
      title: 'Cooling Response Workflow Modified',
      description: 'Added auto-scaling action to cooling workflow',
      impact: 'neutral',
    },
    {
      id: '4',
      timestamp: new Date(Date.now() - 1000 * 60 * 60 * 5), // 5 hours ago
      type: 'config_change',
      title: 'Sovereignty Compliance Enabled',
      description: 'Data residency requirements activated',
      impact: 'positive',
    },
    {
      id: '5',
      timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24), // 1 day ago
      type: 'kpi_shift',
      title: 'Renewable Target Increased',
      description: 'Target increased from 80% to 95%',
      impact: 'positive',
      details: { before: 80, after: 95, unit: '%' },
    },
  ];

  const getTypeIcon = (type: ChangeLogEntry['type']) => {
    switch (type) {
      case 'kpi_shift':
        return BarChart3;
      case 'workflow_change':
        return GitBranch;
      case 'agent_update':
        return Bot;
      case 'config_change':
        return Settings;
    }
  };

  const getTypeColor = (type: ChangeLogEntry['type']) => {
    switch (type) {
      case 'kpi_shift':
        return 'text-info bg-info/10';
      case 'workflow_change':
        return 'text-warning bg-warning/10';
      case 'agent_update':
        return 'text-primary bg-primary/10';
      case 'config_change':
        return 'text-muted-foreground bg-muted';
    }
  };

  const getImpactIcon = (impact: ChangeLogEntry['impact']) => {
    switch (impact) {
      case 'positive':
        return { icon: TrendingUp, color: 'text-success' };
      case 'negative':
        return { icon: TrendingDown, color: 'text-destructive' };
      case 'neutral':
        return { icon: Minus, color: 'text-muted-foreground' };
    }
  };

  return (
    <Card className={className}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm flex items-center gap-2">
            <History className="h-4 w-4" />
            Change Log
          </CardTitle>
          <div className="flex items-center gap-2">
            {lastSaved && (
              <Badge variant="outline" className="text-[10px]">
                <Clock className="h-3 w-3 mr-1" />
                Last saved: {formatDistanceToNow(new Date(lastSaved), { addSuffix: true })}
              </Badge>
            )}
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0"
              onClick={() => setIsExpanded(!isExpanded)}
            >
              {isExpanded ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>
      </CardHeader>

      {isExpanded && (
        <CardContent>
          <ScrollArea className="h-64">
            <div className="space-y-3">
              {changeLog.map((entry) => {
                const TypeIcon = getTypeIcon(entry.type);
                const typeColor = getTypeColor(entry.type);
                const { icon: ImpactIcon, color: impactColor } = getImpactIcon(entry.impact);

                return (
                  <div
                    key={entry.id}
                    className="flex gap-3 p-3 rounded-lg border bg-card hover:bg-muted/30 transition-colors"
                  >
                    {/* Type Icon */}
                    <div className={cn('p-2 rounded-lg shrink-0', typeColor)}>
                      <TypeIcon className="h-4 w-4" />
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="text-sm font-medium">{entry.title}</p>
                          <p className="text-xs text-muted-foreground">{entry.description}</p>
                        </div>
                        <ImpactIcon className={cn('h-4 w-4 shrink-0', impactColor)} />
                      </div>

                      {/* Details */}
                      {entry.details && (
                        <div className="mt-2 flex items-center gap-2 text-xs">
                          <span className="text-muted-foreground line-through">
                            {entry.details.before}{entry.details.unit}
                          </span>
                          <span className="text-muted-foreground">→</span>
                          <span className={impactColor}>
                            {entry.details.after}{entry.details.unit}
                          </span>
                        </div>
                      )}

                      {/* Timestamp */}
                      <p className="text-[10px] text-muted-foreground mt-1">
                        {formatDistanceToNow(entry.timestamp, { addSuffix: true })}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </ScrollArea>

          {/* Summary */}
          <div className="mt-3 pt-3 border-t flex items-center justify-between text-xs text-muted-foreground">
            <span>
              {changeLog.filter(e => e.impact === 'positive').length} improvements •{' '}
              {changeLog.filter(e => e.impact === 'neutral').length} updates
            </span>
            <Button variant="ghost" size="sm" className="h-6 text-xs">
              View Full History
            </Button>
          </div>
        </CardContent>
      )}
    </Card>
  );
}
