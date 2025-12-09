import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { CheckCircle2, XCircle, Loader2 } from "lucide-react";

interface HealthStatus {
  gemini: { status: string; latency: number };
  vertex: { status: string; latency: number };
  zapier: { status: string; latency: number };
  region: string;
}

export function HealthCheck() {
  const { data: health, isLoading } = useQuery<HealthStatus>({
    queryKey: ['health'],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke('health', {
        method: 'POST',
      });
      if (error) throw error;
      return data as HealthStatus;
    },
    refetchInterval: 60000, // Check every minute
    retry: 3,
  });

  if (isLoading) {
    return (
      <div className="flex items-center gap-2">
        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
        <span className="text-xs text-muted-foreground">Checking health...</span>
      </div>
    );
  }

  if (!health) return null;

  const services = [
    { name: 'Gemini', status: health.gemini.status, latency: health.gemini.latency },
    { name: 'Vertex', status: health.vertex.status, latency: health.vertex.latency },
    { name: 'Zapier', status: health.zapier.status, latency: health.zapier.latency },
  ];

  const allHealthy = services.every(s => s.status === 'healthy' || s.status === 'available');

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="flex items-center gap-1.5">
            {allHealthy ? (
              <CheckCircle2 className="h-4 w-4 text-secondary" />
            ) : (
              <XCircle className="h-4 w-4 text-destructive" />
            )}
            <span className="text-xs text-muted-foreground hidden sm:inline">
              {health.region}
            </span>
          </div>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="space-y-2">
          <div className="font-semibold text-xs mb-2">System Health</div>
          {services.map(service => (
            <div key={service.name} className="flex items-center justify-between gap-4 text-xs">
              <span>{service.name}</span>
              <Badge 
                variant={service.status === 'healthy' || service.status === 'available' ? 'default' : 'destructive'}
                className="text-[10px]"
              >
                {service.status}
              </Badge>
            </div>
          ))}
          <div className="text-[10px] text-muted-foreground pt-1 border-t">
            Region: {health.region}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
