import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { History, GitBranch, RotateCcw, Eye, Download } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import { useAnalytics } from '@/hooks/useAnalytics';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { formatDistanceToNow } from 'date-fns';

interface AOCVersionHistoryProps {
  agentId: string;
}

export function AOCVersionHistory({ agentId }: AOCVersionHistoryProps) {
  const { toast } = useToast();
  const { trackEvent } = useAnalytics();
  const useMock = import.meta.env.VITE_USE_MOCK_AOC === 'true' && import.meta.env.DEV;

  const { data: versions = [] } = useQuery({
    queryKey: ['agent-versions', agentId],
    queryFn: async () => {
      if (useMock) {
        const { mockAgentVersions } = await import('@/lib/mock/aocMockData');
        return mockAgentVersions;
      }

      const { data, error } = await supabase
        .from('agent_versions')
        .select('*')
        .eq('agent_id', agentId)
        .order('published_at', { ascending: false })
        .limit(10);

      if (error) throw error;

      if ((!data || data.length === 0) && import.meta.env.DEV) {
        console.warn('[AOC Demo] No versions found – falling back to mock');
        const mod = await import('@/lib/mock/aocMockData');
        return mod.mockAgentVersions;
      }

      return data || [];
    },
  });

  const rollbackVersion = (version: string) => {
    trackEvent('version_rolled_back', { agentId, version });
    toast({
      title: '🔄 Rolling Back',
      description: `Reverting to version ${version}...`,
    });
  };

  const viewDetails = (version: string) => {
    trackEvent('version_promoted', { agentId, version });
    toast({
      title: '👁️ Version Details',
      description: `Opening details for version ${version}`,
    });
  };

  return (
    <div className="h-full flex flex-col bg-card">
      {/* Header */}
      <div className="p-4 border-b">
        <div className="flex items-center gap-2 mb-2">
          <History className="h-4 w-4" />
          <h3 className="text-sm font-semibold">Version History</h3>
        </div>
        <p className="text-xs text-muted-foreground">
          Track deployments and rollback if needed
        </p>
      </div>

      {/* Version Timeline */}
      <ScrollArea className="flex-1">
        <div className="p-4 space-y-3">
          {versions.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <History className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No versions deployed yet</p>
            </div>
          ) : (
            versions.map((version, idx) => {
              const isActive = idx === 0;
              const deployedEnvs = version.deployed_to_env || [];
              return (
                <Card key={version.id} className="p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <GitBranch className="h-4 w-4 text-primary" />
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="text-sm font-semibold">{version.version}</h4>
                          {isActive && (
                            <Badge variant="default" className="text-xs">
                              Active
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {version.published_by} • {formatDistanceToNow(new Date(version.published_at), { addSuffix: true })}
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-1 flex-wrap justify-end">
                      {deployedEnvs.map(env => (
                        <Badge key={env} variant="outline" className="text-xs">
                          {env}
                        </Badge>
                      ))}
                    </div>
                  </div>

                  {/* Commit Message */}
                  {version.commit_message && (
                    <div className="mb-3">
                      <p className="text-xs text-muted-foreground">{version.commit_message}</p>
                    </div>
                  )}

                  {/* Config Snapshot */}
                  {version.config_snapshot && (
                    <div className="mb-3">
                      <details className="text-xs">
                        <summary className="cursor-pointer hover:text-primary mb-1">Config Snapshot</summary>
                        <pre className="mt-1 p-2 rounded bg-muted overflow-x-auto text-[10px]">
                          {JSON.stringify(version.config_snapshot, null, 2)}
                        </pre>
                      </details>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      onClick={() => viewDetails(version.version)}
                    >
                      <Eye className="h-3 w-3 mr-1.5" />
                      Details
                    </Button>
                    {!isActive && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1"
                        onClick={() => rollbackVersion(version.version)}
                      >
                        <RotateCcw className="h-3 w-3 mr-1.5" />
                        Rollback
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-9 p-0"
                    >
                      <Download className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </Card>
              );
            })
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
