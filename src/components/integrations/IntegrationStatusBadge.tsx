import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { invokeEdgeFunction } from "@/hooks/useEdgeFunction";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, AlertCircle, XCircle, Plug } from "lucide-react";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";

interface IntegrationStatusBadgeProps {
  systemId: string;
}

export function IntegrationStatusBadge({ systemId }: IntegrationStatusBadgeProps) {
  const { data: statusData } = useQuery({
    queryKey: ['zapier-status-badge', systemId],
    queryFn: async () => {
      return await invokeEdgeFunction('zapier-integration-status', { systemId });
    },
    refetchInterval: 30000, // Refresh every 30s
  });

  if (!statusData?.summary) {
    return null;
  }

  const { connected, errors, expired, status } = statusData.summary;

  const getBadgeContent = () => {
    if (status === 'connected') {
      return {
        variant: 'default' as const,
        icon: <CheckCircle2 className="h-3 w-3" />,
        text: `Connected (${connected})`,
      };
    }
    if (status === 'error') {
      return {
        variant: 'destructive' as const,
        icon: <XCircle className="h-3 w-3" />,
        text: `Errors (${errors})`,
      };
    }
    if (status === 'expired') {
      return {
        variant: 'outline' as const,
        icon: <AlertCircle className="h-3 w-3" />,
        text: `Expired (${expired})`,
      };
    }
    return {
      variant: 'secondary' as const,
      icon: <Plug className="h-3 w-3" />,
      text: 'Not Connected',
    };
  };

  const badgeContent = getBadgeContent();

  return (
    <HoverCard>
      <HoverCardTrigger asChild>
        <Badge variant={badgeContent.variant} className="gap-1.5 cursor-pointer">
          {badgeContent.icon}
          Zapier: {badgeContent.text}
        </Badge>
      </HoverCardTrigger>
      <HoverCardContent className="w-80">
        <div className="space-y-2">
          <h4 className="text-sm font-semibold">Integration Status</h4>
          <div className="space-y-1 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Connected Apps:</span>
              <span className="font-medium">{connected}</span>
            </div>
            {expired > 0 && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Expired Tokens:</span>
                <span className="font-medium text-orange-500">{expired}</span>
              </div>
            )}
            {errors > 0 && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Errors:</span>
                <span className="font-medium text-destructive">{errors}</span>
              </div>
            )}
          </div>
          {statusData.connections && statusData.connections.length > 0 && (
            <>
              <div className="border-t pt-2 mt-2">
                <div className="text-xs font-medium text-muted-foreground mb-1">Connected Apps</div>
                <div className="space-y-1">
                  {statusData.connections.slice(0, 3).map((conn: any) => (
                    <div key={conn.id} className="text-xs flex items-center justify-between">
                      <span>{conn.display_name || 'Unknown'}</span>
                      <Badge variant="outline" className="text-xs">
                        {conn.status}
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      </HoverCardContent>
    </HoverCard>
  );
}