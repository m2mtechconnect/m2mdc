import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Brain, Database, Plug, Workflow, Activity, FileText, CheckCircle2, XCircle, Clock, CircleHelp } from 'lucide-react';
import { formatDate, formatRelativeTime } from '@/lib/formatters';
import { useNavigate } from 'react-router-dom';
import type { DeployedSystem } from '@/types/system';
import { modelDisplayLabel } from '@/lib/llm/modelLabels';

interface SystemConfigTabsProps {
  system: DeployedSystem;
  onEdit?: () => void;
}

function EvidenceUnavailable({ children }: { children: string }) {
  return <p className="text-sm text-muted-foreground p-3 rounded-md bg-muted/30">{children}</p>;
}

export function SystemConfigTabs({ system, onEdit }: SystemConfigTabsProps) {
  const navigate = useNavigate();

  return (
    <Card className="p-6">
      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="grid w-full grid-cols-3 lg:grid-cols-6">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="intelligence">Intelligence</TabsTrigger>
          <TabsTrigger value="tools">Tools</TabsTrigger>
          <TabsTrigger value="workflows">Workflows</TabsTrigger>
          <TabsTrigger value="runs">Runs</TabsTrigger>
          <TabsTrigger value="versions">Versions</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4 mt-4">
          <h4 className="text-sm font-semibold mb-3">System Information</h4>
          <div className="grid gap-3">
            <div className="flex justify-between items-center p-3 rounded-md bg-muted/50"><span className="text-sm text-muted-foreground">Created</span><span className="text-sm font-medium">{formatDate(system.createdAt)}</span></div>
            <div className="flex justify-between items-center p-3 rounded-md bg-muted/50"><span className="text-sm text-muted-foreground">Last Updated</span><span className="text-sm font-medium">{formatRelativeTime(system.updatedAt)}</span></div>
            <div className="flex justify-between items-center p-3 rounded-md bg-muted/50"><span className="text-sm text-muted-foreground">Department</span>{system.department ? <Badge variant="outline">{system.department}</Badge> : <span className="text-sm text-muted-foreground">Not assigned</span>}</div>
            <div className="flex justify-between items-center p-3 rounded-md bg-muted/50"><span className="text-sm text-muted-foreground">Type</span><Badge variant="outline">{system.type}</Badge></div>
          </div>
        </TabsContent>

        <TabsContent value="intelligence" className="space-y-4 mt-4">
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-sm font-semibold flex items-center gap-2"><Brain className="h-4 w-4 text-primary" />AI Model Configuration</h4>
            {onEdit && <Button size="sm" variant="outline" onClick={() => navigate(`/builder?systemId=${system.id}&step=2`)}>Edit</Button>}
          </div>
          <div className="space-y-3">
            <div className="flex justify-between items-center p-3 rounded-md bg-muted/50">
              <span className="text-sm text-muted-foreground">Model</span>
              {system.intelligence?.modelId ? <Badge variant="outline" className="font-mono">{modelDisplayLabel(system.intelligence.modelId)}</Badge> : <span className="text-sm text-muted-foreground">Unavailable</span>}
            </div>
            <div className="flex justify-between items-center p-3 rounded-md bg-muted/50">
              <span className="text-sm text-muted-foreground">Temperature</span>
              <span className="text-sm font-medium">{typeof system.intelligence?.temperature === 'number' ? system.intelligence.temperature : 'Unavailable'}</span>
            </div>
          </div>
          <div>
            <h4 className="text-sm font-semibold my-3 flex items-center gap-2"><Database className="h-4 w-4 text-primary" />Knowledge Sources</h4>
            {system.intelligence?.knowledgeSources === undefined ? (
              <EvidenceUnavailable>Knowledge-source evidence is unavailable on this view.</EvidenceUnavailable>
            ) : system.intelligence.knowledgeSources.length ? (
              <div className="space-y-2">
                {system.intelligence.knowledgeSources.map((source, idx) => (
                  <div key={`${source.name}-${idx}`} className="p-3 rounded-md bg-muted/50 text-sm">
                    <div className="flex items-center gap-2"><FileText className="h-4 w-4 text-primary" /><span className="font-medium">{source.name}</span></div>
                    <p className="text-xs text-muted-foreground mt-1">{source.type}</p>
                  </div>
                ))}
              </div>
            ) : <p className="text-sm text-muted-foreground p-3">No knowledge sources recorded.</p>}
          </div>
        </TabsContent>

        <TabsContent value="tools" className="space-y-4 mt-4">
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-sm font-semibold flex items-center gap-2"><Plug className="h-4 w-4 text-primary" />Connected Tools & Integrations</h4>
            {onEdit && <Button size="sm" variant="outline" onClick={() => navigate(`/builder?systemId=${system.id}&step=3`)}>Edit</Button>}
          </div>
          {system.tools === undefined ? (
            <EvidenceUnavailable>Tool and integration evidence is unavailable on this view.</EvidenceUnavailable>
          ) : system.tools.length ? (
            <div className="space-y-3">
              {system.tools.map((tool, idx) => (
                <Card key={`${tool.name}-${idx}`} className="p-4">
                  <div className="flex items-center justify-between">
                    <div><p className="font-medium">{tool.name}</p><p className="text-xs text-muted-foreground mt-1">{tool.provider}</p></div>
                    <Badge variant={tool.status === 'connected' ? 'default' : 'secondary'} className="text-xs">{tool.status}</Badge>
                  </div>
                  {tool.lastHealthCheck && <p className="text-xs text-muted-foreground mt-2">Last check: {formatRelativeTime(tool.lastHealthCheck)}</p>}
                </Card>
              ))}
            </div>
          ) : <p className="text-sm text-muted-foreground p-3">No tools recorded.</p>}
        </TabsContent>

        <TabsContent value="workflows" className="space-y-4 mt-4">
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-sm font-semibold flex items-center gap-2"><Workflow className="h-4 w-4 text-primary" />Workflow Triggers & Paths</h4>
            {onEdit && <Button size="sm" variant="outline" onClick={() => navigate(`/builder?systemId=${system.id}&step=4`)}>Edit</Button>}
          </div>
          {system.workflows === undefined ? (
            <EvidenceUnavailable>Workflow evidence is unavailable on this view.</EvidenceUnavailable>
          ) : system.workflows.length ? (
            <div className="space-y-3">
              {system.workflows.map((workflow, idx) => (
                <Card key={`${workflow.name}-${idx}`} className="p-4">
                  <div className="flex items-center justify-between mb-2"><p className="font-medium">{workflow.name}</p><Badge variant={workflow.enabled ? 'default' : 'secondary'}>{workflow.enabled ? 'Active' : 'Inactive'}</Badge></div>
                  <p className="text-xs text-muted-foreground mb-2">{workflow.trigger}</p>
                  <div className="text-xs text-muted-foreground">{workflow.path ?? 'No path recorded'}</div>
                </Card>
              ))}
            </div>
          ) : <p className="text-sm text-muted-foreground p-3">No workflows recorded.</p>}
        </TabsContent>

        <TabsContent value="runs" className="space-y-4 mt-4">
          <h4 className="text-sm font-semibold flex items-center gap-2 mb-4"><Activity className="h-4 w-4 text-primary" />Recent Runs & Logs</h4>
          {system.recentRuns === undefined ? (
            <EvidenceUnavailable>Recent run evidence is unavailable on this view.</EvidenceUnavailable>
          ) : system.recentRuns.length ? (
            <ScrollArea className="h-[400px]">
              <div className="space-y-2">
                {system.recentRuns.map((run) => {
                  const StatusIcon = run.status === 'success' ? CheckCircle2 : run.status === 'error' ? XCircle : CircleHelp;
                  return (
                    <Card key={run.id} className="p-4 cursor-pointer hover:shadow-md transition-smooth" onClick={() => navigate(`/analytics?tab=monitoring&run=${run.id}`)}>
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2"><StatusIcon className="h-4 w-4 text-muted-foreground" /><span className="text-sm font-medium">{run.status}</span></div>
                        <Badge variant="outline" className="text-xs">{typeof run.duration === 'number' ? `${run.duration}ms` : 'Duration unavailable'}</Badge>
                      </div>
                      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
                        <span>{formatRelativeTime(run.timestamp)}</span>
                        <span>{run.channel ?? 'Channel unavailable'}</span>
                        <span>{run.user ?? 'User unavailable'}</span>
                      </div>
                      {run.error && <p className="text-xs text-destructive mt-2">{run.error}</p>}
                    </Card>
                  );
                })}
              </div>
            </ScrollArea>
          ) : <p className="text-sm text-muted-foreground p-3">No runs recorded.</p>}
        </TabsContent>

        <TabsContent value="versions" className="space-y-4 mt-4">
          <h4 className="text-sm font-semibold mb-4">Version History</h4>
          {system.versions === undefined ? (
            <EvidenceUnavailable>Version-history evidence is unavailable on this view.</EvidenceUnavailable>
          ) : system.versions.length ? (
            <div className="space-y-2">
              {system.versions.map((version, idx) => (
                <Card key={`${version.version}-${idx}`} className="p-4">
                  <div className="flex items-center gap-2 mb-2"><Badge variant="outline" className="font-mono">{version.version}</Badge>{version.version === system.version && <Badge variant="default" className="text-xs">Current</Badge>}</div>
                  <div className="text-xs text-muted-foreground"><div className="flex items-center gap-2 mb-1"><Clock className="h-3 w-3" />Published: {formatDate(version.publishedAt)}</div><p>By: {version.publishedBy}</p></div>
                </Card>
              ))}
            </div>
          ) : <p className="text-sm text-muted-foreground p-3">No version history recorded.</p>}
        </TabsContent>
      </Tabs>
    </Card>
  );
}
