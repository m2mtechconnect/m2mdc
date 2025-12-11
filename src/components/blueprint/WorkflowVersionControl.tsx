/**
 * Workflow Version Control Panel
 * Track workflow changes, support rollback, show version history
 */

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  GitBranch, 
  RotateCcw, 
  Clock, 
  User, 
  ChevronRight,
  CheckCircle2,
  AlertCircle,
  Diff
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface WorkflowVersion {
  id: string;
  version: string;
  timestamp: Date;
  author: string;
  changes: string[];
  status: 'current' | 'previous' | 'archived';
  triggersChanged?: boolean;
  actionsChanged?: boolean;
}

interface WorkflowVersionControlProps {
  workflowId?: string;
  workflowName?: string;
  versions?: WorkflowVersion[];
  onRollback?: (versionId: string) => void;
  onCompare?: (versionA: string, versionB: string) => void;
  className?: string;
}

/**
 * WORKFLOW VERSION HISTORY - Industry-Accurate DC Operations
 * Based on DCIM workflow versioning and change management best practices
 * Sources: Uptime Institute, ITIL v4, ASHRAE TC 9.9 guidelines
 */
const DC_WORKFLOW_VERSIONS: WorkflowVersion[] = [
  {
    id: 'v3',
    version: '3.0.0',
    timestamp: new Date(Date.now() - 1000 * 60 * 30), // 30 min ago
    author: 'Thermal Guardian Agent',
    changes: ['Raised inlet temp threshold from 25°C to 27°C per ASHRAE A1 update', 'Added H100 GPU thermal throttling trigger at 83°C'],
    status: 'current',
    triggersChanged: true,
    actionsChanged: false,
  },
  {
    id: 'v2',
    version: '2.1.0',
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24), // 1 day ago
    author: 'DC Operator',
    changes: ['Optimized CRAH supply air setpoint to 22.5°C', 'Added PagerDuty escalation for P1 thermal events'],
    status: 'previous',
    triggersChanged: false,
    actionsChanged: true,
  },
  {
    id: 'v1',
    version: '2.0.0',
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24 * 7), // 7 days ago
    author: 'DC Administrator',
    changes: ['Configured hot aisle containment zone monitoring', 'Integrated with BMS for automated cooling response'],
    status: 'previous',
    triggersChanged: true,
    actionsChanged: true,
  },
  {
    id: 'v0',
    version: '1.0.0',
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24 * 30), // 30 days ago
    author: 'System',
    changes: ['Initial workflow from Uptime Institute Tier III thermal response template'],
    status: 'archived',
    triggersChanged: true,
    actionsChanged: true,
  },
];

export function WorkflowVersionControl({
  workflowId,
  workflowName = 'Thermal Alert Workflow',
  versions,
  onRollback,
  onCompare,
  className
}: WorkflowVersionControlProps) {
  const [selectedVersion, setSelectedVersion] = useState<string | null>(null);
  const [compareMode, setCompareMode] = useState(false);
  const [compareVersions, setCompareVersions] = useState<string[]>([]);
  
  const versionList = versions || DC_WORKFLOW_VERSIONS;
  const currentVersion = versionList.find(v => v.status === 'current');

  const formatTimestamp = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 1000 / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return date.toLocaleDateString();
  };

  const handleVersionClick = (versionId: string) => {
    if (compareMode) {
      if (compareVersions.includes(versionId)) {
        setCompareVersions(compareVersions.filter(v => v !== versionId));
      } else if (compareVersions.length < 2) {
        setCompareVersions([...compareVersions, versionId]);
      }
    } else {
      setSelectedVersion(selectedVersion === versionId ? null : versionId);
    }
  };

  const handleRollback = (versionId: string) => {
    if (onRollback) {
      onRollback(versionId);
    } else {
      console.log('Rollback to version:', versionId);
    }
  };

  const handleCompare = () => {
    if (compareVersions.length === 2 && onCompare) {
      onCompare(compareVersions[0], compareVersions[1]);
    }
  };

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <GitBranch className="h-4 w-4 text-primary" />
            Version Control
          </CardTitle>
          <div className="flex items-center gap-2">
            <Button
              variant={compareMode ? "default" : "outline"}
              size="sm"
              onClick={() => {
                setCompareMode(!compareMode);
                setCompareVersions([]);
              }}
              className="h-7 text-xs"
            >
              <Diff className="h-3 w-3 mr-1" />
              Compare
            </Button>
          </div>
        </div>
        <p className="text-sm text-muted-foreground">{workflowName}</p>
      </CardHeader>

      <CardContent className="p-0">
        {compareMode && (
          <div className="px-4 py-2 bg-muted/50 border-b border-border text-xs text-muted-foreground">
            Select 2 versions to compare ({compareVersions.length}/2 selected)
            {compareVersions.length === 2 && (
              <Button
                size="sm"
                variant="secondary"
                className="ml-2 h-5 text-xs"
                onClick={handleCompare}
              >
                Compare Now
              </Button>
            )}
          </div>
        )}

        <ScrollArea className="h-72">
          <div className="p-4 space-y-2">
            {versionList.map((version, index) => (
              <div
                key={version.id}
                className={cn(
                  "p-3 rounded-lg border transition-all cursor-pointer",
                  version.status === 'current' 
                    ? 'border-primary/50 bg-primary/5' 
                    : 'border-border hover:border-primary/30',
                  selectedVersion === version.id && 'ring-2 ring-primary/20',
                  compareVersions.includes(version.id) && 'ring-2 ring-info/50 bg-info/5'
                )}
                onClick={() => handleVersionClick(version.id)}
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Badge 
                      variant={version.status === 'current' ? 'default' : 'secondary'}
                      className="text-xs"
                    >
                      v{version.version}
                    </Badge>
                    {version.status === 'current' && (
                      <Badge variant="outline" className="text-xs text-success border-success/30">
                        <CheckCircle2 className="h-3 w-3 mr-1" />
                        Current
                      </Badge>
                    )}
                    {version.status === 'archived' && (
                      <Badge variant="outline" className="text-xs text-muted-foreground">
                        Archived
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Clock className="h-3 w-3" />
                    {formatTimestamp(version.timestamp)}
                  </div>
                </div>

                <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
                  <User className="h-3 w-3" />
                  {version.author}
                  {version.triggersChanged && (
                    <Badge variant="outline" className="text-[10px] h-4">Triggers</Badge>
                  )}
                  {version.actionsChanged && (
                    <Badge variant="outline" className="text-[10px] h-4">Actions</Badge>
                  )}
                </div>

                <ul className="text-xs text-muted-foreground space-y-0.5">
                  {version.changes.slice(0, 2).map((change, i) => (
                    <li key={i} className="flex items-start gap-1">
                      <ChevronRight className="h-3 w-3 mt-0.5 flex-shrink-0" />
                      <span className="line-clamp-1">{change}</span>
                    </li>
                  ))}
                  {version.changes.length > 2 && (
                    <li className="text-primary text-[10px]">
                      +{version.changes.length - 2} more changes
                    </li>
                  )}
                </ul>

                {selectedVersion === version.id && version.status !== 'current' && !compareMode && (
                  <div className="mt-3 pt-3 border-t border-border flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 text-xs"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRollback(version.id);
                      }}
                    >
                      <RotateCcw className="h-3 w-3 mr-1" />
                      Rollback to this version
                    </Button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
