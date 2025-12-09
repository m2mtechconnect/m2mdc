import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { CheckCircle2, XCircle, AlertCircle } from 'lucide-react';

interface HealthStatus {
  gemini: { status: string; latency: number };
  vertex: { status: string; latency: number };
  zapier: { status: string; latency: number };
  region: string;
}

export const HealthBadges = () => {
  const { data: health } = useQuery({
    queryKey: ['health'],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke('health');
      if (error) throw error;
      
      // Handle REST envelope if present
      let result = data;
      if (data && typeof data === 'object' && 'success' in data && 'data' in data) {
        const envelope = data as { success: boolean; data: any };
        if (!envelope.success) {
          throw new Error('API returned error');
        }
        result = envelope.data;
      }
      
      return result as HealthStatus;
    },
    refetchInterval: 60000, // 60s cache
  });

  const getStatusIcon = (status: string) => {
    if (status === 'healthy') return <CheckCircle2 className="h-3 w-3" />;
    if (status === 'not_configured') return <AlertCircle className="h-3 w-3" />;
    return <XCircle className="h-3 w-3" />;
  };

  const getStatusColor = (status: string) => {
    if (status === 'healthy') return 'bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/30';
    if (status === 'not_configured') return 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30';
    return 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/30';
  };

  if (!health) return null;

  return (
    <TooltipProvider>
      <div className="flex items-center gap-2">
        <Tooltip>
          <TooltipTrigger>
            <Badge variant="outline" className={`gap-1 ${getStatusColor(health.gemini.status)}`}>
              {getStatusIcon(health.gemini.status)}
              Gemini
            </Badge>
          </TooltipTrigger>
          <TooltipContent>
            <p>{health.gemini.status === 'healthy' ? `${health.gemini.latency}ms` : 'Not configured'}</p>
          </TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger>
            <Badge variant="outline" className={`gap-1 ${getStatusColor(health.vertex.status)}`}>
              {getStatusIcon(health.vertex.status)}
              Vertex
            </Badge>
          </TooltipTrigger>
          <TooltipContent>
            <p>{health.vertex.status === 'healthy' ? `${health.vertex.latency}ms` : 'Not configured'}</p>
          </TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger>
            <Badge variant="secondary" className="gap-1">
              {getStatusIcon(health.zapier.status)}
              Zapier
            </Badge>
          </TooltipTrigger>
          <TooltipContent>
            <p>Available</p>
          </TooltipContent>
        </Tooltip>
      </div>
    </TooltipProvider>
  );
};