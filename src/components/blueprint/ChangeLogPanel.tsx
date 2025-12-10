/**
 * Change Log Panel
 * Tracks REAL builder changes with live store updates
 */

import { useState, useEffect } from 'react';
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
  RotateCcw,
  PlayCircle,
} from 'lucide-react';
import { useChangeLogStore, type ChangeLogEntry, type ChangeType } from '@/stores/changeLogStore';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';

export function ChangeLogPanel({ className }: { className?: string }) {
  const { entries, getRecentEntries, createRollbackEntry } = useChangeLogStore();
  const [isExpanded, setIsExpanded] = useState(true);
  
  // Get recent entries reactively
  const changeLog = getRecentEntries(20);

  const getTypeIcon = (type: ChangeType) => {
    switch (type) {
      case 'kpi_shift':
        return BarChart3;
      case 'workflow_change':
        return GitBranch;
      case 'agent_update':
        return Bot;
      case 'config_change':
        return Settings;
      case 'scenario_change':
        return PlayCircle;
      case 'rollback':
        return RotateCcw;
    }
  };

  const getTypeColor = (type: ChangeType) => {
    switch (type) {
      case 'kpi_shift':
        return 'text-info bg-info/10';
      case 'workflow_change':
        return 'text-warning bg-warning/10';
      case 'agent_update':
        return 'text-primary bg-primary/10';
      case 'config_change':
        return 'text-muted-foreground bg-muted';
      case 'scenario_change':
        return 'text-success bg-success/10';
      case 'rollback':
        return 'text-destructive bg-destructive/10';
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

  const handleRollback = (entryId: string) => {
    const rollbackId = createRollbackEntry(entryId);
    if (rollbackId) {
      console.log('[ChangeLog] Rollback created:', rollbackId);
    }
  };

  const positiveCount = changeLog.filter(e => e.impact === 'positive').length;
  const neutralCount = changeLog.filter(e => e.impact === 'neutral').length;

  return (
    <Card className={className}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm flex items-center gap-2">
            <History className="h-4 w-4" />
            Change Log
            {changeLog.length > 0 && (
              <Badge variant="secondary" className="text-[10px]">
                {changeLog.length} changes
              </Badge>
            )}
          </CardTitle>
          <div className="flex items-center gap-2">
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
          {changeLog.length === 0 ? (
            <div className="py-8 text-center text-sm text-muted-foreground">
              <History className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>No changes recorded yet.</p>
              <p className="text-xs mt-1">Edit your blueprint to see changes here.</p>
            </div>
          ) : (
            <ScrollArea className="h-64">
              <div className="space-y-3">
                {changeLog.map((entry) => {
                  const TypeIcon = getTypeIcon(entry.type);
                  const typeColor = getTypeColor(entry.type);
                  const { icon: ImpactIcon, color: impactColor } = getImpactIcon(entry.impact);

                  return (
                    <div
                      key={entry.id}
                      className="flex gap-3 p-3 rounded-lg border bg-card hover:bg-muted/30 transition-colors group"
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
                            {entry.domain && (
                              <Badge variant="outline" className="text-[9px] mt-1">
                                {entry.domain}
                              </Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-1">
                            <ImpactIcon className={cn('h-4 w-4 shrink-0', impactColor)} />
                            {entry.type !== 'rollback' && entry.oldValue !== undefined && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                                onClick={() => handleRollback(entry.id)}
                                title="Rollback this change"
                              >
                                <RotateCcw className="h-3 w-3" />
                              </Button>
                            )}
                          </div>
                        </div>

                        {/* Value Change Display */}
                        {entry.oldValue !== undefined && entry.newValue !== undefined && (
                          <div className="mt-2 flex items-center gap-2 text-xs">
                            <span className="text-muted-foreground line-through">
                              {typeof entry.oldValue === 'object' 
                                ? JSON.stringify(entry.oldValue).slice(0, 30) 
                                : String(entry.oldValue)}
                            </span>
                            <span className="text-muted-foreground">→</span>
                            <span className={impactColor}>
                              {typeof entry.newValue === 'object' 
                                ? JSON.stringify(entry.newValue).slice(0, 30) 
                                : String(entry.newValue)}
                            </span>
                          </div>
                        )}

                        {/* Timestamp */}
                        <p className="text-[10px] text-muted-foreground mt-1">
                          {formatDistanceToNow(new Date(entry.timestamp), { addSuffix: true })}
                          {entry.user && entry.user !== 'system' && ` by ${entry.user}`}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
          )}

          {/* Summary */}
          {changeLog.length > 0 && (
            <div className="mt-3 pt-3 border-t flex items-center justify-between text-xs text-muted-foreground">
              <span>
                {positiveCount} improvements • {neutralCount} updates
              </span>
              <Button variant="ghost" size="sm" className="h-6 text-xs">
                View Full History
              </Button>
            </div>
          )}
        </CardContent>
      )}
    </Card>
  );
}
