import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Brain,
  Database,
  Plug,
  Workflow,
  Activity,
  ExternalLink,
  FileText,
  Shield,
  Play,
  CheckCircle2,
  XCircle,
  Clock,
} from 'lucide-react';
import { formatDate, formatRelativeTime } from '@/lib/formatters';
import { useNavigate } from 'react-router-dom';
import type { DeployedSystem } from '@/types/system';

interface SystemConfigTabsProps {
  system: DeployedSystem;
  onEdit?: () => void;
}

/**
 * Tabbed interface for viewing system configuration, tools, workflows, runs, and versions
 */
export function SystemConfigTabs({ system, onEdit }: SystemConfigTabsProps) {
  const navigate = useNavigate();

  return (
    <Card className="p-6">
      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="intelligence">Intelligence</TabsTrigger>
          <TabsTrigger value="tools">Tools</TabsTrigger>
          <TabsTrigger value="workflows">Workflows</TabsTrigger>
          <TabsTrigger value="runs">Runs</TabsTrigger>
          <TabsTrigger value="versions">Versions</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4 mt-4">
          <div>
            <h4 className="text-sm font-semibold mb-3">System Information</h4>
            <div className="grid gap-3">
              <div className="flex justify-between items-center p-3 rounded-md bg-muted/50">
                <span className="text-sm text-muted-foreground">Created</span>
                <span className="text-sm font-medium">{formatDate(system.createdAt)}</span>
              </div>
              <div className="flex justify-between items-center p-3 rounded-md bg-muted/50">
                <span className="text-sm text-muted-foreground">Last Updated</span>
                <span className="text-sm font-medium">{formatRelativeTime(system.updatedAt)}</span>
              </div>
              <div className="flex justify-between items-center p-3 rounded-md bg-muted/50">
                <span className="text-sm text-muted-foreground">Department</span>
                {system.department ? (
                  <Badge variant="outline">{system.department}</Badge>
                ) : (
                  <span className="text-sm text-muted-foreground">Not assigned</span>
                )}
              </div>
              <div className="flex justify-between items-center p-3 rounded-md bg-muted/50">
                <span className="text-sm text-muted-foreground">Type</span>
                <Badge variant="outline">{system.type}</Badge>
              </div>
            </div>
          </div>

          {system.intakeOrigin && (
            <div>
              <h4 className="text-sm font-semibold mb-3">Intake Origin</h4>
              <div className="p-4 rounded-md bg-muted/50 space-y-2">
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-primary" />
                  <span className="text-sm font-medium">{system.intakeOrigin.type}</span>
                </div>
                {system.intakeOrigin.url && (
                  <Button
                    variant="link"
                    size="sm"
                    className="p-0 h-auto text-xs"
                    onClick={() => window.open(system.intakeOrigin?.url, '_blank')}
                  >
                    <ExternalLink className="h-3 w-3 mr-1" />
                    View Source
                  </Button>
                )}
              </div>
            </div>
          )}
        </TabsContent>

        {/* Intelligence Tab */}
        <TabsContent value="intelligence" className="space-y-4 mt-4">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-sm font-semibold flex items-center gap-2">
                <Brain className="h-4 w-4 text-primary" />
                AI Model Configuration
              </h4>
              {onEdit && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => navigate(`/builder?systemId=${system.id}&step=2`)}
                >
                  Edit
                </Button>
              )}
            </div>
            <div className="space-y-3">
              <div className="flex justify-between items-center p-3 rounded-md bg-muted/50">
                <span className="text-sm text-muted-foreground">Model</span>
                <Badge variant="outline" className="font-mono">
                  {system.intelligence?.modelId || 'Gemini 2.5 Flash'}
                </Badge>
              </div>
              <div className="flex justify-between items-center p-3 rounded-md bg-muted/50">
                <span className="text-sm text-muted-foreground">Temperature</span>
                <span className="text-sm font-medium">
                  {system.intelligence?.temperature || 0.7}
                </span>
              </div>
            </div>
          </div>

          <div>
            <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
              <Database className="h-4 w-4 text-primary" />
              Knowledge Sources
            </h4>
            <div className="space-y-2">
              {system.intelligence?.knowledgeSources?.length ? (
                system.intelligence.knowledgeSources.map((source, idx) => (
                  <div key={idx} className="p-3 rounded-md bg-muted/50 text-sm">
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4 text-primary" />
                      <span className="font-medium">{source.name}</span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">{source.type}</p>
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground p-3">No knowledge sources configured</p>
              )}
            </div>
          </div>
        </TabsContent>

        {/* Tools Tab */}
        <TabsContent value="tools" className="space-y-4 mt-4">
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-sm font-semibold flex items-center gap-2">
              <Plug className="h-4 w-4 text-primary" />
              Connected Tools & Integrations
            </h4>
            {onEdit && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => navigate(`/builder?systemId=${system.id}&step=3`)}
              >
                Edit
              </Button>
            )}
          </div>
          <div className="space-y-3">
            {system.tools?.length ? (
              system.tools.map((tool, idx) => (
                <Card key={idx} className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">{tool.name}</p>
                      <p className="text-xs text-muted-foreground mt-1">{tool.provider}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge
                        variant={tool.status === 'connected' ? 'default' : 'secondary'}
                        className="text-xs"
                      >
                        {tool.status}
                      </Badge>
                      <Button size="sm" variant="ghost">
                        <Play className="h-3 w-3 mr-1" />
                        Test
                      </Button>
                    </div>
                  </div>
                  {tool.lastHealthCheck && (
                    <p className="text-xs text-muted-foreground mt-2">
                      Last check: {formatRelativeTime(tool.lastHealthCheck)}
                    </p>
                  )}
                </Card>
              ))
            ) : (
              <p className="text-sm text-muted-foreground p-3">No tools configured</p>
            )}
          </div>
        </TabsContent>

        {/* Workflows Tab */}
        <TabsContent value="workflows" className="space-y-4 mt-4">
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-sm font-semibold flex items-center gap-2">
              <Workflow className="h-4 w-4 text-primary" />
              Workflow Triggers & Paths
            </h4>
            {onEdit && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => navigate(`/builder?systemId=${system.id}&step=4`)}
              >
                Edit
              </Button>
            )}
          </div>
          <div className="space-y-3">
            {system.workflows?.length ? (
              system.workflows.map((workflow, idx) => (
                <Card key={idx} className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <p className="font-medium">{workflow.name}</p>
                    <Badge variant={workflow.enabled ? 'default' : 'secondary'}>
                      {workflow.enabled ? 'Active' : 'Inactive'}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mb-2">{workflow.trigger}</p>
                  <div className="text-xs text-muted-foreground">
                    {workflow.path || 'No path configured'}
                  </div>
                </Card>
              ))
            ) : (
              <p className="text-sm text-muted-foreground p-3">No workflows configured</p>
            )}
          </div>
        </TabsContent>

        {/* Runs Tab */}
        <TabsContent value="runs" className="space-y-4 mt-4">
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-sm font-semibold flex items-center gap-2">
              <Activity className="h-4 w-4 text-primary" />
              Recent Runs & Logs
            </h4>
          </div>
          <ScrollArea className="h-[400px]">
            <div className="space-y-2">
              {system.recentRuns?.length ? (
                system.recentRuns.map((run) => (
                  <Card
                    key={run.id}
                    className="p-4 cursor-pointer hover:shadow-md transition-smooth"
                    onClick={() => navigate(`/analytics?tab=monitoring&run=${run.id}`)}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        {run.status === 'success' ? (
                          <CheckCircle2 className="h-4 w-4 text-green-500" />
                        ) : (
                          <XCircle className="h-4 w-4 text-destructive" />
                        )}
                        <span className="text-sm font-medium">{run.channel}</span>
                      </div>
                      <Badge variant="outline" className="text-xs">
                        {run.duration}ms
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>{formatRelativeTime(run.timestamp)}</span>
                      <span>{run.user || 'System'}</span>
                    </div>
                    {run.error && (
                      <p className="text-xs text-destructive mt-2">{run.error}</p>
                    )}
                  </Card>
                ))
              ) : (
                <p className="text-sm text-muted-foreground p-3">No runs yet</p>
              )}
            </div>
          </ScrollArea>
        </TabsContent>

        {/* Versions Tab */}
        <TabsContent value="versions" className="space-y-4 mt-4">
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-sm font-semibold">Version History</h4>
          </div>
          <div className="space-y-2">
            {system.versions?.length ? (
              system.versions.map((version, idx) => (
                <Card key={idx} className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="font-mono">
                        {version.version}
                      </Badge>
                      {version.version === system.version && (
                        <Badge variant="default" className="text-xs">
                          Current
                        </Badge>
                      )}
                    </div>
                    <Button size="sm" variant="ghost">
                      Rollback
                    </Button>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    <div className="flex items-center gap-2 mb-1">
                      <Clock className="h-3 w-3" />
                      Published: {formatDate(version.publishedAt)}
                    </div>
                    <p>By: {version.publishedBy}</p>
                  </div>
                </Card>
              ))
            ) : (
              <p className="text-sm text-muted-foreground p-3">No version history</p>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </Card>
  );
}
