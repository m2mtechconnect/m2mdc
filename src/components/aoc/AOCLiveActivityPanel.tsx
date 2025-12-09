import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Activity,
  Search,
  Filter,
  Play,
  Pause,
  AlertCircle,
  Info,
  AlertTriangle,
  Zap,
  Workflow,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface AOCLiveActivityPanelProps {
  agentId: string;
}

export function AOCLiveActivityPanel({ agentId }: AOCLiveActivityPanelProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [isLive, setIsLive] = useState(true);
  const [selectedTypes, setSelectedTypes] = useState<string[]>([]);

  const { data: logs = [], refetch } = useQuery({
    queryKey: ['activity-logs', agentId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('agent_activity_logs')
        .select('*')
        .eq('agent_id', agentId)
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) throw error;
      return data || [];
    },
    refetchInterval: isLive ? 2000 : false,
  });

  // Subscribe to real-time updates
  useEffect(() => {
    if (!isLive) return;

    const channel = supabase
      .channel(`activity-logs-${agentId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'agent_activity_logs',
          filter: `agent_id=eq.${agentId}`,
        },
        () => {
          refetch();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [agentId, isLive, refetch]);

  const getLogIcon = (type: string) => {
    switch (type) {
      case 'error':
        return <AlertCircle className="h-4 w-4 text-destructive" />;
      case 'warning':
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      case 'info':
        return <Info className="h-4 w-4 text-blue-500" />;
      case 'tool_call':
        return <Zap className="h-4 w-4 text-purple-500" />;
      case 'workflow_event':
        return <Workflow className="h-4 w-4 text-green-500" />;
      default:
        return <Activity className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getLogColor = (type: string) => {
    switch (type) {
      case 'error':
        return 'border-l-destructive';
      case 'warning':
        return 'border-l-yellow-500';
      case 'info':
        return 'border-l-blue-500';
      case 'tool_call':
        return 'border-l-purple-500';
      case 'workflow_event':
        return 'border-l-green-500';
      default:
        return 'border-l-border';
    }
  };

  const filteredLogs = logs.filter((log) => {
    const matchesSearch =
      log.message.toLowerCase().includes(searchTerm.toLowerCase()) ||
      JSON.stringify(log.details).toLowerCase().includes(searchTerm.toLowerCase());

    const matchesType = selectedTypes.length === 0 || selectedTypes.includes(log.log_type);

    return matchesSearch && matchesType;
  });

  const logTypes = Array.from(new Set(logs.map((log) => log.log_type)));

  return (
    <Card className="p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Activity className="h-5 w-5 text-primary" />
          <h3 className="text-lg font-semibold">Live Activity Stream</h3>
          {isLive && (
            <Badge variant="outline" className="gap-1 animate-pulse">
              <span className="h-2 w-2 rounded-full bg-green-500"></span>
              Live
            </Badge>
          )}
        </div>

        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => setIsLive(!isLive)}
            className="gap-2"
          >
            {isLive ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
            {isLive ? 'Pause' : 'Resume'}
          </Button>
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center gap-2 mb-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search logs..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
          />
        </div>

        <Button size="sm" variant="outline" className="gap-2">
          <Filter className="h-4 w-4" />
          Filter
        </Button>
      </div>

      {/* Log Types Filter */}
      <div className="flex items-center gap-2 mb-4 flex-wrap">
        {logTypes.map((type) => (
          <Badge
            key={type}
            variant={selectedTypes.includes(type) ? 'default' : 'outline'}
            className="cursor-pointer"
            onClick={() => {
              setSelectedTypes((prev) =>
                prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type]
              );
            }}
          >
            {type}
          </Badge>
        ))}
      </div>

      {/* Logs List */}
      <ScrollArea className="h-[500px]">
        <div className="space-y-2">
          {filteredLogs.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Activity className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No activity logs yet</p>
            </div>
          ) : (
            filteredLogs.map((log) => (
              <Card
                key={log.id}
                className={`p-3 border-l-4 ${getLogColor(log.log_type)} hover:shadow-md transition-shadow`}
              >
                <div className="flex items-start gap-3">
                  <div className="mt-1">{getLogIcon(log.log_type)}</div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <Badge variant="outline" className="text-xs">
                        {log.log_type}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(log.created_at), { addSuffix: true })}
                      </span>
                    </div>

                    <p className="text-sm font-medium mb-1">{log.message}</p>

                    {log.details && Object.keys(log.details).length > 0 && (
                      <details className="text-xs text-muted-foreground mt-2">
                        <summary className="cursor-pointer hover:text-foreground">
                          View details
                        </summary>
                        <pre className="mt-2 p-2 rounded bg-muted overflow-x-auto">
                          {JSON.stringify(log.details, null, 2)}
                        </pre>
                      </details>
                    )}
                  </div>
                </div>
              </Card>
            ))
          )}
        </div>
      </ScrollArea>
    </Card>
  );
}