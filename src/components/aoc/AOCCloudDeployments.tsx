import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Cloud, Server, ExternalLink, StopCircle, Play } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAnalytics } from '@/hooks/useAnalytics';
import { useState } from 'react';

interface AOCCloudDeploymentsProps {
  agentId: string;
}

export function AOCCloudDeployments({ agentId }: AOCCloudDeploymentsProps) {
  const { toast } = useToast();
  const { trackEvent } = useAnalytics();
  const [actioningId, setActioningId] = useState<string | null>(null);

  const useMock = false /* PR-0.1 B7: VITE_USE_MOCK_AOC removed from allowlist */;

  const { data: deployments = [] } = useQuery({
    queryKey: ['cloud-deployments', agentId],
    queryFn: async () => {
      if (useMock) {
        const { mockCloudDeployments } = await import('@/lib/mock/aocMockData');
        return mockCloudDeployments;
      }

      const { data, error } = await supabase
        .from('cloud_deployments')
        .select('*')
        .eq('agent_id', agentId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      if ((!data || data.length === 0) && import.meta.env.DEV) {
        console.warn('[AOC Demo] No cloud deployments found – falling back to mock');
        const mod = await import('@/lib/mock/aocMockData');
        return mod.mockCloudDeployments;
      }

      return data || [];
    },
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'deployed':
        return 'bg-green-500/10 text-green-500';
      case 'deploying':
        return 'bg-blue-500/10 text-blue-500';
      case 'failed':
        return 'bg-destructive/10 text-destructive';
      case 'stopped':
        return 'bg-gray-500/10 text-gray-500';
      default:
        return 'bg-yellow-500/10 text-yellow-500';
    }
  };

  const getProviderLogo = (provider: string) => {
    const logos: Record<string, string> = {
      aws: '☁️',
      azure: '🔷',
      gcp: '🌐',
    };
    return logos[provider] || '☁️';
  };

  const handleCloudAction = async (deploymentId: string, action: string, provider: string) => {
    setActioningId(deploymentId);
    trackEvent('cloud_action', { agentId, deploymentId, action, provider });
    toast({
      title: `${action === 'stop' ? '🛑' : '🚀'} Cloud Action`,
      description: `${action === 'stop' ? 'Stopping' : 'Opening'} ${provider.toUpperCase()} deployment...`,
    });
    setTimeout(() => setActioningId(null), 1500);
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Cloud className="h-5 w-5 text-primary" />
          <h3 className="text-lg font-semibold">Cloud Deployments</h3>
        </div>
        <Button size="sm" className="gap-2">
          <Play className="h-4 w-4" />
          New Deployment
        </Button>
      </div>

      {/* Deployment Cards */}
      {deployments.length === 0 ? (
        <Card className="p-12 text-center">
          <Cloud className="h-12 w-12 mx-auto mb-3 opacity-50" />
          <p className="text-sm text-muted-foreground mb-4">No cloud deployments yet</p>
          <Button variant="outline">Deploy to Cloud</Button>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {deployments.map((deployment) => (
            <Card key={deployment.id} className="p-4">
              {/* Provider Header */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <span className="text-2xl">{getProviderLogo(deployment.provider)}</span>
                  <div>
                    <p className="font-semibold uppercase text-sm">{deployment.provider}</p>
                    <p className="text-xs text-muted-foreground">{deployment.region}</p>
                  </div>
                </div>
                <Badge className={getStatusColor(deployment.status)}>
                  {deployment.status}
                </Badge>
              </div>

              {/* Deployment Info */}
              <div className="space-y-2 mb-4">
                {deployment.instance_id && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Instance</span>
                    <span className="font-mono text-xs">{deployment.instance_id}</span>
                  </div>
                )}

                {deployment.compute_tier && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Compute</span>
                    <span className="font-medium">{deployment.compute_tier}</span>
                  </div>
                )}

                {deployment.cost_estimate && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Est. Cost</span>
                    <span className="font-medium">${deployment.cost_estimate}/mo</span>
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2">
                <Button 
                  size="sm" 
                  variant="outline" 
                  className="flex-1 gap-1"
                  onClick={() => handleCloudAction(deployment.id, 'console', deployment.provider)}
                  disabled={actioningId === deployment.id}
                >
                  <ExternalLink className="h-3 w-3" />
                  Console
                </Button>
                {deployment.status === 'deployed' && (
                  <Button 
                    size="sm" 
                    variant="outline" 
                    className="gap-1"
                    onClick={() => handleCloudAction(deployment.id, 'stop', deployment.provider)}
                    disabled={actioningId === deployment.id}
                  >
                    <StopCircle className="h-3 w-3" />
                    Stop
                  </Button>
                )}
              </div>

              {/* Resources */}
              {deployment.resources && Object.keys(deployment.resources).length > 0 && (
                <div className="mt-4 pt-4 border-t">
                  <p className="text-xs font-medium mb-2">Connected Resources</p>
                  <div className="flex flex-wrap gap-1">
                    {Object.keys(deployment.resources).map((resource) => (
                      <Badge key={resource} variant="secondary" className="text-xs">
                        {resource}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}