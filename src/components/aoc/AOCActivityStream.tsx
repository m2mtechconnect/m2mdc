import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { RefreshCw, Radio } from 'lucide-react';
import { useState, useEffect } from 'react';
import { AOCSearchBar, FilterOptions } from './AOCSearchBar';

interface AOCActivityStreamProps {
  agentId: string;
}

export function AOCActivityStream({ agentId }: AOCActivityStreamProps) {
  const [isLive, setIsLive] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState<FilterOptions>({});

  const { data: logs, refetch } = useQuery({
    queryKey: ['aoc-activity-logs', agentId],
    queryFn: async () => {
      const query = supabase
        .from('agent_action_logs')
        .select('*')
        .eq('system_id', agentId)
        .order('created_at', { ascending: false })
        .limit(100);

      return (await query).data || [];
    },
    refetchInterval: isLive ? 2000 : false,
  });

  // Real-time subscription
  useEffect(() => {
    if (!isLive) return;

    const channel = supabase
      .channel(`aoc-logs-${agentId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'agent_action_logs',
          filter: `system_id=eq.${agentId}`,
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

  // Filter logs
  const filteredLogs = logs?.filter(log => {
    const matchesStatus = !filters.status || filters.status.length === 0 || filters.status.includes(log.status);
    const matchesSearch = !searchQuery || 
      log.action_key.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.error_message?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'success': return 'bg-green-500';
      case 'error': return 'bg-red-500';
      case 'running': return 'bg-blue-500';
      default: return 'bg-gray-500';
    }
  };

  return (
    <div className="h-full flex flex-col bg-card border-b">
      {/* Header */}
      <div className="p-3 border-b space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-semibold">Live Activity Stream</h3>
            {isLive && (
              <Badge variant="outline" className="gap-1">
                <Radio className="h-2 w-2 animate-pulse text-red-500" />
                Live
              </Badge>
            )}
            <Badge variant="secondary">{filteredLogs?.length || 0}</Badge>
          </div>
          <div className="flex gap-2">
            <Button
              variant={isLive ? 'default' : 'outline'}
              size="sm"
              onClick={() => setIsLive(!isLive)}
            >
              {isLive ? 'Pause' : 'Resume'}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => refetch()}
            >
              <RefreshCw className="h-3 w-3" />
            </Button>
          </div>
        </div>

        {/* Search and Filters */}
        <AOCSearchBar
          onSearch={setSearchQuery}
          onFilterChange={setFilters}
          placeholder="Search logs..."
        />
      </div>

      {/* Logs */}
      <ScrollArea className="flex-1">
        <div className="p-3 space-y-2">
          {!filteredLogs || filteredLogs.length === 0 ? (
            <div className="text-center py-8 text-sm text-muted-foreground">
              {searchQuery || (filters.status && filters.status.length > 0)
                ? 'No logs match your filters' 
                : 'No activity yet. Run the agent to see logs.'}
            </div>
          ) : (
            filteredLogs.map((log) => (
              <Card key={log.id} className="p-3">
                <div className="flex items-start gap-3">
                  <div className={`w-2 h-2 rounded-full mt-1.5 ${getStatusColor(log.status)}`} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <span className="text-xs font-medium truncate">
                        {log.action_key}
                      </span>
                      <span className="text-xs text-muted-foreground whitespace-nowrap">
                        {new Date(log.created_at).toLocaleTimeString()}
                      </span>
                    </div>
                    {log.error_message && (
                      <p className="text-xs text-red-500 mt-1">{log.error_message}</p>
                    )}
                    {log.duration_ms && (
                      <p className="text-xs text-muted-foreground mt-1">
                        {log.duration_ms}ms
                      </p>
                    )}
                  </div>
                </div>
              </Card>
            ))
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
