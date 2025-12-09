import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ArrowRight, CheckCircle2, XCircle, Clock, Rocket } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useState } from 'react';

interface AOCEnvironmentPipelineProps {
  agentId: string;
  currentVersion: string;
}

interface Environment {
  id: string;
  name: string;
  status: 'not_deployed' | 'deploying' | 'deployed' | 'failed';
  version?: string;
  deployedAt?: string;
  health?: string;
}

export function AOCEnvironmentPipeline({ agentId, currentVersion }: AOCEnvironmentPipelineProps) {
  const { toast } = useToast();
  const [promotingTo, setPromotingTo] = useState<string | null>(null);

  // Query runtime status across environments
  const { data: environments, refetch } = useQuery({
    queryKey: ['agent-environments', agentId],
    queryFn: async () => {
      const { data: runtimeStatuses } = await supabase
        .from('agent_runtime_status')
        .select('*')
        .eq('agent_id', agentId);

      const envOrder = ['dev', 'test', 'staging', 'prod'];
      const envMap: Record<string, Environment> = {};

      envOrder.forEach(name => {
        envMap[name] = {
          id: name,
          name: name.charAt(0).toUpperCase() + name.slice(1),
          status: 'not_deployed',
        };
      });

      runtimeStatuses?.forEach(rs => {
        if (envMap[rs.environment]) {
          envMap[rs.environment] = {
            ...envMap[rs.environment],
            status: rs.status === 'running' ? 'deployed' : rs.status === 'stopped' ? 'failed' : 'deploying',
            version: rs.current_version,
            deployedAt: rs.last_action_at || undefined,
            health: rs.health_status || undefined,
          };
        }
      });

      return envOrder.map(e => envMap[e]);
    },
  });

  const promoteToEnvironment = async (targetEnv: string) => {
    setPromotingTo(targetEnv);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      // Deploy to target environment via runtime action
      const { data, error } = await supabase.functions.invoke('aoc-runtime-action', {
        body: {
          agentId,
          action: 'run',
          environment: targetEnv,
        },
      });

      if (error) throw error;

      toast({
        title: '✅ Promoted',
        description: `Successfully promoted to ${targetEnv}`,
      });

      refetch();
    } catch (err: any) {
      toast({
        title: '❌ Promotion Failed',
        description: err.message,
        variant: 'destructive',
      });
    } finally {
      setPromotingTo(null);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'deployed':
        return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case 'failed':
        return <XCircle className="h-4 w-4 text-red-500" />;
      case 'deploying':
        return <Clock className="h-4 w-4 text-yellow-500 animate-pulse" />;
      default:
        return <Clock className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
      deployed: 'default',
      deploying: 'secondary',
      failed: 'destructive',
      not_deployed: 'outline',
    };
    return variants[status] || 'outline';
  };

  return (
    <Card className="p-4">
      <div className="flex items-center gap-2 mb-4">
        <Rocket className="h-4 w-4" />
        <h3 className="text-sm font-semibold">Deployment Pipeline</h3>
      </div>

      <div className="space-y-3">
        {environments?.map((env, idx) => (
          <div key={env.id}>
            <Card className="p-3 bg-accent/30">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  {getStatusIcon(env.status)}
                  <span className="text-sm font-medium">{env.name}</span>
                  <Badge variant={getStatusBadge(env.status)} className="text-xs">
                    {env.status.replace('_', ' ')}
                  </Badge>
                </div>
                {env.version && (
                  <Badge variant="outline" className="text-xs">
                    v{env.version}
                  </Badge>
                )}
              </div>

              {env.deployedAt && (
                <p className="text-xs text-muted-foreground mb-2">
                  Deployed {new Date(env.deployedAt).toLocaleString()}
                </p>
              )}

              {env.health && (
                <div className="flex items-center gap-1 mb-2">
                  <span className="text-xs text-muted-foreground">Health:</span>
                  <Badge variant={env.health === 'healthy' ? 'default' : 'destructive'} className="text-xs">
                    {env.health}
                  </Badge>
                </div>
              )}

              {idx < environments.length - 1 && env.status === 'deployed' && (
                <Button
                  size="sm"
                  variant="outline"
                  className="w-full mt-2"
                  onClick={() => promoteToEnvironment(environments[idx + 1].id)}
                  disabled={promotingTo === environments[idx + 1].id}
                >
                  <ArrowRight className="h-3 w-3 mr-1.5" />
                  Promote to {environments[idx + 1].name}
                </Button>
              )}
            </Card>

            {idx < environments.length - 1 && (
              <div className="flex justify-center py-1">
                <ArrowRight className="h-4 w-4 text-muted-foreground" />
              </div>
            )}
          </div>
        ))}
      </div>
    </Card>
  );
}
