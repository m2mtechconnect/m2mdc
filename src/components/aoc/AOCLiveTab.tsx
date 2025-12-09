import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Activity, Search, Pause, Play, Download } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useState, useEffect, useRef } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface AOCLiveTabProps {
  agentId: string;
}

export function AOCLiveTab({ agentId }: AOCLiveTabProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [isPaused, setIsPaused] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [autoScroll, setAutoScroll] = useState(true);

  const useMock = import.meta.env.VITE_USE_MOCK_AOC === 'true' && import.meta.env.DEV;

  const { data: logs = [], refetch } = useQuery({
    queryKey: ['agent-activity-logs', agentId, filterType],
    queryFn: async () => {
      if (useMock) {
        const { mockAgentActivityLogs } = await import('@/lib/mock/aocMockData');
        let filtered = mockAgentActivityLogs;
        if (filterType !== 'all') {
          filtered = mockAgentActivityLogs.filter(log => log.log_type === filterType);
        }
        return filtered;
      }

      let query = supabase
        .from('agent_activity_logs')
        .select('*')
        .eq('agent_id', agentId)
        .order('created_at', { ascending: false })
        .limit(100);

      if (filterType !== 'all') {
        query = query.eq('log_type', filterType);
      }

      const { data, error } = await query;
      if (error) throw error;
      
      // Dev fallback: if no data and in dev mode, use mock
      if ((!data || data.length === 0) && import.meta.env.DEV) {
        console.warn('[AOC Demo] No activity logs found – falling back to mock');
        const { mockAgentActivityLogs } = await import('@/lib/mock/aocMockData');
        let filtered = mockAgentActivityLogs;
        if (filterType !== 'all') {
          filtered = mockAgentActivityLogs.filter(log => log.log_type === filterType);
        }
        return filtered;
      }
      
      return data || [];
    },
    refetchInterval: isPaused ? false : 2000,
  });

  // Real-time subscription
  useEffect(() => {
    if (isPaused) return;

    const channel = supabase
      .channel('agent-logs-realtime')
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
  }, [agentId, isPaused, refetch]);

  // Auto-scroll to bottom
  useEffect(() => {
    if (autoScroll && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logs, autoScroll]);

  const filteredLogs = logs.filter(log =>
    !searchQuery || 
    log.message.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getLogColor = (type: string) => {
    switch (type) {
      case 'error':
        return 'text-red-500 bg-red-500/10';
      case 'warning':
        return 'text-yellow-500 bg-yellow-500/10';
      case 'info':
        return 'text-blue-500 bg-blue-500/10';
      case 'success':
        return 'text-green-500 bg-green-500/10';
      default:
        return 'text-muted-foreground bg-muted/50';
    }
  };

  return (
    <div className="space-y-4">
      {/* Header Controls */}
      <Card className="p-4">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 flex-1">
            <Activity className="h-4 w-4" />
            <h3 className="text-sm font-semibold">Live Activity Stream</h3>
            <Badge variant={isPaused ? 'secondary' : 'default'} className="text-xs">
              {isPaused ? 'Paused' : 'Live'}
            </Badge>
          </div>

          <div className="flex items-center gap-2">
            <div className="relative flex-1 max-w-xs">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search logs..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 h-9"
              />
            </div>

            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger className="w-32 h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="error">Errors</SelectItem>
                <SelectItem value="warning">Warnings</SelectItem>
                <SelectItem value="info">Info</SelectItem>
                <SelectItem value="success">Success</SelectItem>
              </SelectContent>
            </Select>

            <Button
              size="sm"
              variant="outline"
              onClick={() => setIsPaused(!isPaused)}
            >
              {isPaused ? <Play className="h-4 w-4" /> : <Pause className="h-4 w-4" />}
            </Button>

            <Button size="sm" variant="outline">
              <Download className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </Card>

      {/* Log Stream */}
      <Card>
        <div 
          ref={scrollRef}
          className="h-[600px] overflow-auto p-4 space-y-2 font-mono text-xs"
          onScroll={(e) => {
            const target = e.target as HTMLDivElement;
            const isAtBottom = target.scrollHeight - target.scrollTop <= target.clientHeight + 50;
            setAutoScroll(isAtBottom);
          }}
        >
          {filteredLogs.length === 0 ? (
            <div className="flex items-center justify-center h-full text-muted-foreground">
              No activity logs found
            </div>
          ) : (
            filteredLogs.map((log) => (
              <div
                key={log.id}
                className={`p-3 rounded border ${getLogColor(log.log_type)}`}
              >
                <div className="flex items-start justify-between mb-1">
                  <Badge variant="outline" className="text-xs">
                    {log.log_type.toUpperCase()}
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    {formatDistanceToNow(new Date(log.created_at), { addSuffix: true })}
                  </span>
                </div>
                <p className="text-sm mb-1">{log.message}</p>
                {log.details && Object.keys(log.details).length > 0 && (
                  <details className="mt-2">
                    <summary className="text-xs cursor-pointer text-muted-foreground hover:text-foreground">
                      Details
                    </summary>
                    <pre className="mt-1 text-xs bg-background/50 p-2 rounded overflow-auto">
                      {JSON.stringify(log.details, null, 2)}
                    </pre>
                  </details>
                )}
              </div>
            ))
          )}
        </div>
      </Card>
    </div>
  );
}
