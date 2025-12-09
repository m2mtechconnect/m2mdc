import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, XCircle, Clock, Activity } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface IntegrationActivityLogProps {
  systemId: string;
  limit?: number;
}

export function IntegrationActivityLog({ systemId, limit = 10 }: IntegrationActivityLogProps) {
  const { data: logs, isLoading } = useQuery({
    queryKey: ['agent-action-logs', systemId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('agent_action_logs')
        .select('*')
        .eq('system_id', systemId)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw error;
      return data;
    },
  });

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Recent Activity
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-muted-foreground">Loading...</div>
        </CardContent>
      </Card>
    );
  }

  if (!logs || logs.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Recent Activity
          </CardTitle>
          <CardDescription>Integration actions will appear here</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-muted-foreground">No activity yet</div>
        </CardContent>
      </Card>
    );
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success':
        return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case 'error':
        return <XCircle className="h-4 w-4 text-destructive" />;
      default:
        return <Clock className="h-4 w-4 text-orange-500" />;
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Activity className="h-5 w-5" />
          Recent Activity
        </CardTitle>
        <CardDescription>Last {logs.length} integration actions</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {logs.map((log) => (
            <div key={log.id} className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
              <div className="mt-0.5">{getStatusIcon(log.status)}</div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-medium text-sm">{log.action_key}</span>
                  <Badge variant={log.status === 'success' ? 'default' : 'destructive'} className="text-xs">
                    {log.status}
                  </Badge>
                </div>
                {log.error_message && (
                  <p className="text-xs text-destructive">{log.error_message}</p>
                )}
                <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                  <span>{formatDistanceToNow(new Date(log.created_at), { addSuffix: true })}</span>
                  {log.duration_ms && <span>• {log.duration_ms}ms</span>}
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}