/**
 * Version Snapshot Panel
 * Shows version history and diff capabilities
 */

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  GitBranch, Clock, Hash,
  Plus, Eye, History
} from 'lucide-react';

interface Version {
  id: string;
  version: string;
  configHash: string;
  commitMessage: string;
  createdAt: Date;
  createdBy: string;
  changes: string[];
}

interface VersionSnapshotProps {
  currentVersion: string;
  versionHistory: Version[];
  builderState: any;
  onCreateSnapshot: (commitMessage: string) => void;
}

export function VersionSnapshot({
  currentVersion,
  versionHistory,
  builderState,
  onCreateSnapshot
}: VersionSnapshotProps) {
  const [commitMessage, setCommitMessage] = useState('');
  const [showDiff, setShowDiff] = useState(false);

  const generateAutoMessage = () => {
    const parts = [];
    if (builderState?.modelConfig?.model) parts.push(`Model: ${builderState.modelConfig.model}`);
    if (builderState?.workflow?.actions?.length) parts.push(`${builderState.workflow.actions.length} workflows`);
    if (builderState?.workflow?.integrations?.length) parts.push(`${builderState.workflow.integrations.length} integrations`);
    return parts.length > 0 ? `Configure ${parts.join(', ')}` : 'Initial configuration';
  };

  const handleCreateSnapshot = () => {
    const message = commitMessage || generateAutoMessage();
    onCreateSnapshot(message);
    setCommitMessage('');
  };

  const generateConfigHash = () => {
    // Simple hash representation
    const str = JSON.stringify(builderState || {});
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash).toString(16).substring(0, 8);
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <GitBranch className="h-5 w-5 text-primary" />
            <CardTitle className="text-lg">Version Control</CardTitle>
            <Badge variant="outline">v{currentVersion || '1.0.0'}</Badge>
          </div>
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm" className="gap-2">
                <History className="h-4 w-4" />
                View History
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Version History</DialogTitle>
              </DialogHeader>
              <ScrollArea className="h-[400px]">
                <div className="space-y-3">
                  {versionHistory.length > 0 ? versionHistory.map((version) => (
                    <div
                      key={version.id}
                      className="p-3 rounded-lg border hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <Badge variant="secondary">v{version.version}</Badge>
                          <span className="text-xs text-muted-foreground font-mono">
                            #{version.configHash}
                          </span>
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {version.createdAt.toLocaleDateString()}
                        </span>
                      </div>
                      <p className="text-sm mb-2">{version.commitMessage}</p>
                      {version.changes.length > 0 && (
                        <div className="text-xs text-muted-foreground">
                          Changes: {version.changes.join(', ')}
                        </div>
                      )}
                    </div>
                  )) : (
                    <div className="text-center py-8 text-muted-foreground">
                      <History className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      <p>No version history yet</p>
                      <p className="text-xs">Create your first snapshot to start tracking changes</p>
                    </div>
                  )}
                </div>
              </ScrollArea>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Current State */}
        <div className="p-3 rounded-lg bg-muted/50 border">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">Current Configuration</span>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Hash className="h-3 w-3" />
              <span className="font-mono">{generateConfigHash()}</span>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4 text-xs">
            <div>
              <span className="text-muted-foreground">Model:</span>{' '}
              <span className="font-medium">{builderState?.modelConfig?.model || 'Not set'}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Workflows:</span>{' '}
              <span className="font-medium">{builderState?.workflow?.actions?.length || 0}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Integrations:</span>{' '}
              <span className="font-medium">{builderState?.workflow?.integrations?.length || 0}</span>
            </div>
          </div>
        </div>

        {/* Create Snapshot */}
        <div className="space-y-3">
          <Label className="text-sm">Commit Message (optional)</Label>
          <div className="flex gap-2">
            <Input
              placeholder={generateAutoMessage()}
              value={commitMessage}
              onChange={(e) => setCommitMessage(e.target.value)}
              className="flex-1"
            />
            <Button onClick={handleCreateSnapshot} className="gap-2">
              <Plus className="h-4 w-4" />
              Create Snapshot
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            A snapshot will be automatically created when you deploy. You can also create one now to save your current progress.
          </p>
        </div>

        {/* Previous Version Comparison */}
        {versionHistory.length > 0 && (
          <Dialog open={showDiff} onOpenChange={setShowDiff}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm" className="w-full gap-2">
                <Eye className="h-4 w-4" />
                View Diff from Previous Version
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-3xl">
              <DialogHeader>
                <DialogTitle>Configuration Diff</DialogTitle>
              </DialogHeader>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h4 className="text-sm font-medium mb-2">Previous (v{versionHistory[0]?.version})</h4>
                  <div className="p-3 rounded-lg bg-muted/50 text-xs font-mono">
                    {/* Simplified diff view */}
                    <p className="text-destructive">- {versionHistory[0]?.changes?.join('\n- ') || 'No changes recorded'}</p>
                  </div>
                </div>
                <div>
                  <h4 className="text-sm font-medium mb-2">Current (v{currentVersion})</h4>
                  <div className="p-3 rounded-lg bg-muted/50 text-xs font-mono">
                    <p className="text-success">+ Model: {builderState?.modelConfig?.model}</p>
                    <p className="text-success">+ Workflows: {builderState?.workflow?.actions?.length || 0}</p>
                    <p className="text-success">+ Integrations: {builderState?.workflow?.integrations?.length || 0}</p>
                  </div>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </CardContent>
    </Card>
  );
}
